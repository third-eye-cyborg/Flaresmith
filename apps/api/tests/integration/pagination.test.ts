import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, paginateOrderedItems } from '../../src/routes/projects/pagination';

// Polyfill for atob/btoa if not present (Vitest/node environment)
if (typeof globalThis.atob === 'undefined') {
  // @ts-ignore
  globalThis.atob = (b64: string) => Buffer.from(b64, 'base64').toString('utf8');
}
if (typeof globalThis.btoa === 'undefined') {
  // @ts-ignore
  globalThis.btoa = (raw: string) => Buffer.from(raw, 'utf8').toString('base64');
}

interface Item { id: string; createdAt: string }

function makeItem(id: string, createdAt: string): Item {
  return { id, createdAt };
}

// Build a deterministic ordered dataset DESC by createdAt then id
// Newest timestamps first; for identical createdAt, higher lexical id should appear first before lower
const rawItems: Item[] = [
  makeItem('f', '2025-11-22T10:10:06.000Z'),
  makeItem('e', '2025-11-22T10:10:06.000Z'),
  makeItem('d', '2025-11-22T10:09:05.000Z'),
  makeItem('c', '2025-11-22T10:08:04.000Z'),
  makeItem('b', '2025-11-22T10:07:03.000Z'),
  makeItem('a', '2025-11-22T10:06:02.000Z'),
];

// Ensure ordering matches production logic (createdAt DESC, id DESC for tie)
const ordered = [...rawItems].sort((x, y) => {
  const t = new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
  if (t !== 0) return t;
  return y.id.localeCompare(x.id); // id DESC
});

describe('FR-025 pagination cursor behavior', () => {
  it('initial page returns first N items and nextCursor present when more remain', () => {
    const { items, hasMore, nextCursor } = paginateOrderedItems(ordered, 3);
    expect(items.map((i: Item) => i.id)).toEqual(['f', 'e', 'd']);
    expect(hasMore).toBe(true);
    expect(nextCursor).toBeTruthy();
  });

  it('next page starts strictly after last item of prior page', () => {
    const first = paginateOrderedItems(ordered, 2);
    const second = paginateOrderedItems(ordered, 2, first.nextCursor!);
    expect(first.items.map((i: Item) => i.id)).toEqual(['f', 'e']);
    expect(second.items.map((i: Item) => i.id)).toEqual(['d', 'c']);
    // Ensure no overlap
    const overlap = first.items.filter((a: Item) => second.items.some((b: Item) => b.id === a.id));
    expect(overlap.length).toBe(0);
  });

  it('exhausting pages yields hasMore false and null cursor', () => {
    let cursor: string | undefined;
    let collected: string[] = [];
    for (let i = 0; i < 10; i++) { // safety loop
      const { items, hasMore, nextCursor } = paginateOrderedItems(ordered, 2, cursor);
      collected.push(...items.map((i: Item) => i.id));
      if (!hasMore) {
        expect(nextCursor).toBeNull();
        break;
      }
      cursor = nextCursor || undefined;
    }
    expect(collected.sort()).toEqual(ordered.map(i => i.id).sort());
  });

  it('decodeCursor throws on malformed payload', () => {
    // Random invalid base64
    expect(() => decodeCursor('not_base64')).toThrow('INVALID_CURSOR');
    // Valid base64 but missing fields
    const bad = Buffer.from(JSON.stringify({ nope: 1 }), 'utf8').toString('base64');
    expect(() => decodeCursor(bad)).toThrow('INVALID_CURSOR');
  });

  it('encodeCursor -> decodeCursor round-trip', () => {
    const cur = encodeCursor('xyz', '2025-11-22T00:00:00.000Z');
    const parsed = decodeCursor(cur);
    expect(parsed).toEqual({ id: 'xyz', createdAt: '2025-11-22T00:00:00.000Z' });
  });

  it('cursor beyond end returns empty page without error', () => {
    // Construct a cursor pointing after the last item (createdAt older & id smaller)
    const artificial = encodeCursor('0', '2025-11-22T05:00:00.000Z'); // older than all dataset times? Actually earlier than oldest -> means page after last
    const { items, hasMore, nextCursor } = paginateOrderedItems(ordered, 2, artificial);
    expect(items.length).toBe(0);
    expect(hasMore).toBe(false);
    expect(nextCursor).toBeNull();
  });
});
