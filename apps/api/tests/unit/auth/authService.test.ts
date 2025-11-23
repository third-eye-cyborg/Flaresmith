import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../../../src/services/auth/authService';
import { users, sessions, identityProviderLinks } from '../../../db/schema';

// Provide required signing key env for JWT generation inside tests
process.env.AUTH_JWT_SIGNING_KEY = 'unit-test-signing-key';

// Lightweight functional mocks for drizzle-orm comparison helpers.
// We only need minimal semantics used by AuthService queries.
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual: any = await importOriginal();
  const buildGetterPredicate = (preds: Array<(get: (col: any) => any) => boolean>) => {
    return (get: (col: any) => any) => preds.every(p => p(get));
  };
  return {
    ...actual,
    eq: (col: any, val: any) => (get: (c: any) => any) => get(col) === val,
    and: (...preds: Array<(get: (col: any) => any) => boolean>) => buildGetterPredicate(preds),
    isNull: (col: any) => (get: (c: any) => any) => get(col) == null
  };
});

// Lightweight in-memory mock of required Drizzle APIs used by AuthService
function createMockDb() {
  const tables: any = { users: [], sessions: [], identity_provider_links: [] };
  const resolveTable = (table: any) => table === users ? tables.users : table === sessions ? tables.sessions : tables.identity_provider_links;
  return {
    insert(table: any) {
      return {
        values: (vals: any) => {
          const arr = resolveTable(table);
            const row = { ...vals };
            if (!row.id) row.id = crypto.randomUUID();
            arr.push(row); // side-effect occurs immediately (works even if .returning() not chained)
            return {
              returning: () => [row]
            };
        }
      };
    },
    select() {
      let fromArr: any[] = [];
      return {
        from: (table: any) => {
          fromArr = resolveTable(table);
          return {
            where: (pred: any) => ({
              limit: (n: number) => {
                return fromArr.filter((r) => {
                  // Support functional predicate produced by our mocked eq/and/isNull
                  if (typeof pred === 'function') {
                    const get = (col: any) => {
                      const name: string = col.name;
                      if (name in r) return r[name];
                      // Convert snake_case to camelCase for our in-memory representation
                      const camel = name.replace(/_([a-z])/g, (_,g) => g.toUpperCase());
                      return r[camel];
                    };
                    return pred(get);
                  }
                  // Fallback: return all rows (should not happen often)
                  return true;
                }).slice(0, n);
              }
            }),
            limit: (n: number) => fromArr.slice(0, n)
          };
        }
      };
    },
    update(table: any) {
      return {
        set: (vals: any) => ({
          where: (pred: any) => {
            const arr = resolveTable(table);
            arr.forEach((row) => {
              const get = (col: any) => {
                const name: string = col.name;
                if (name in row) return row[name];
                const camel = name.replace(/_([a-z])/g, (_,g) => g.toUpperCase());
                return row[camel];
              };
              const match = typeof pred === 'function' ? pred(get) : true;
              if (match) Object.assign(row, vals);
            });
          }
        })
      };
    },
    delete(table: any) {
      return {
        where: (pred: any) => {
          const arr = resolveTable(table);
          for (let i = arr.length - 1; i >= 0; i--) {
            const row = arr[i];
            const get = (col: any) => {
              const name: string = col.name;
              if (name in row) return row[name];
              const camel = name.replace(/_([a-z])/g, (_,g) => g.toUpperCase());
              return row[camel];
            };
            const match = typeof pred === 'function' ? pred(get) : true;
            if (match) arr.splice(i, 1);
          }
        }
      };
    },
    _tables: tables,
    query: {
      users: {
        findFirst: async ({ where }: any) => tables.users.find((u) => typeof where === 'function' ? where({ email: { name: 'email' } }, { eq: (col: any, val: any) => u.email === val }) : true)
      }
    },
  };
}

describe('AuthService unit', () => {
  const db = createMockDb();
  const service = new AuthService(db as any);
  const email = 'unit@example.com'; const password = 'Str0ng!Pass123';
  let userId = ''; let refreshToken = ''; let sessionId = '';

  it('registerEmailPassword creates user & provider link', async () => {
    const user = await service.registerEmailPassword({ email, password });
    userId = user.id; expect(user.email).toBe(email); expect(db._tables.identity_provider_links.length).toBe(1);
  });

  it('authenticateEmailPassword succeeds', async () => {
    const user = await service.authenticateEmailPassword({ email, password }); expect(user.id).toBe(userId);
  });

  it('createSession issues tokens with TTLs', async () => {
    const tokens = await service.createSession({ userId }); refreshToken = tokens.refreshToken; sessionId = tokens.sessionId;
    expect(tokens.accessToken).toBeDefined(); expect(tokens.refreshToken).toBeDefined();
    const accessDelta = tokens.accessExpiresAt.getTime() - Date.now();
    expect(accessDelta).toBeGreaterThan(14*60*1000); // ~15m less buffer
  });

  it('refreshSession rotates tokens & revokes old session', async () => {
    const newTokens = await service.refreshSession({ refreshToken });
    expect(newTokens.sessionId).not.toBe(sessionId);
    const old = db._tables.sessions.find((s: any) => s.id === sessionId);
    expect(old.revokedAt).toBeDefined();
    refreshToken = newTokens.refreshToken; sessionId = newTokens.sessionId;
  });

  it('refresh reuse error', async () => {
    // Create a fresh session to isolate reuse scenario
    const fresh = await service.createSession({ userId });
    const tokenToReuse = fresh.refreshToken;
    // First refresh succeeds (rotates token)
    await service.refreshSession({ refreshToken: tokenToReuse });
    // Second refresh attempt with the SAME (already used) token should fail
    let err: any; try { await service.refreshSession({ refreshToken: tokenToReuse }); } catch (e) { err = e; }
    expect(err).toBeDefined();
  });

  it('revokeSession marks revokedAt', async () => {
    const t = await service.createSession({ userId });
    await service.revokeSession(t.sessionId);
    const row = db._tables.sessions.find((s: any) => s.id === t.sessionId);
    expect(row.revokedAt).toBeDefined();
  });

  it('revokeAllSessions revokes all active sessions', async () => {
    await service.createSession({ userId });
    await service.createSession({ userId });
    await service.revokeAllSessions(userId);
    const active = db._tables.sessions.filter((s: any) => !s.revokedAt);
    expect(active.length).toBe(0);
  });
});