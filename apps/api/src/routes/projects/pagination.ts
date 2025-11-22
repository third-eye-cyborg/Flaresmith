/**
 * Pagination helper module (FR-025)
 * Decoupled from route & database to enable isolated unit testing
 */

// Cursor helpers extracted for testability
export function encodeCursor(id: string, createdAt: string) {
  const payload = JSON.stringify({ id, createdAt });
  if (typeof btoa !== 'undefined') return btoa(payload);
  return Buffer.from(payload, 'utf8').toString('base64');
}

export function decodeCursor(cursor: string): { id: string; createdAt: string } {
  try {
    const decoded = typeof atob !== 'undefined'
      ? atob(cursor)
      : Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed.id || !parsed.createdAt) throw new Error('Malformed cursor payload');
    return parsed;
  } catch (e) {
    throw new Error('INVALID_CURSOR');
  }
}

// Pure pagination over an in-memory ordered array (already sorted DESC createdAt,id)
export function paginateOrderedItems<T extends { id: string; createdAt: string }>(
  items: T[],
  limit: number,
  cursor?: string
) {
  let startIndex = 0;
  if (cursor) {
    const c = decodeCursor(cursor);
    // items are DESC; find first item that is "after" cursor in DESC ordering
    startIndex = items.findIndex(
      (it) =>
        new Date(it.createdAt).getTime() < new Date(c.createdAt).getTime() ||
        (it.createdAt === c.createdAt && it.id < c.id)
    );
    if (startIndex === -1) {
      // Cursor points beyond end; return empty page
      return { items: [], hasMore: false, nextCursor: null };
    }
  }
  const slice = items.slice(startIndex, startIndex + limit + 1);
  const hasMore = slice.length > limit;
  const pageItems = hasMore ? slice.slice(0, limit) : slice;
  let nextCursor: string | null = null;
  if (hasMore && pageItems.length) {
    const last = pageItems[pageItems.length - 1]!;
    nextCursor = encodeCursor(last.id, last.createdAt);
  }
  return { items: pageItems, hasMore, nextCursor };
}