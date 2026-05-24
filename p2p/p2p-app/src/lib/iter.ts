import * as openpgp from "openpgp";

type PaginatedFetch<T> = (cursor?: string) => Promise<{ items: T[]; next_cursor?: string }>;

/** Yield all items from a cursor-paginated source */
export async function* paginate<T>(fetch: PaginatedFetch<T>): AsyncIterableIterator<T> {
  let cursor: string | undefined;
  while (true) {
    const page = await fetch(cursor);
    for (const item of page.items) yield item;
    if (!page.next_cursor) break;
    cursor = page.next_cursor;
  }
}

/** Collect all items from an async iterator */
export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iter) items.push(item);
  return items;
}

/** Yield up to `limit` items from an async iterator */
export async function* take<T>(iter: AsyncIterable<T>, limit: number): AsyncIterableIterator<T> {
  let i = 0;
  for await (const item of iter) {
    if (i++ >= limit) break;
    yield item;
  }
}

/** Map items through an async transformation */
export async function* mapAsync<T, U>(
  iter: AsyncIterable<T>,
  fn: (item: T) => Promise<U>,
): AsyncIterableIterator<U> {
  for await (const item of iter) yield fn(item);
}

/**
 * Merge a local async iterable with peer async iterables.
 * Yield each unique item exactly once (by key equality).
 * When `more` is true, fetch from peers and call `onNew` for unseen items.
 */
export async function* mergeLocalAndPeers<T>(
  local: AsyncIterable<T>,
  peers: Generator<AsyncIterable<T>>,
  keyFn: (item: T) => string | Promise<string>,
  onNew?: (item: T) => void | Promise<void>,
  more = false,
): AsyncIterableIterator<T> {
  const seen = new Map<string, T>();

  async function store(item: T): Promise<boolean> {
    const k = await keyFn(item);
    if (seen.has(k)) return false;
    seen.set(k, item);
    onNew?.(item);
    return true;
  }

  // Always yield local items first
  for await (const item of local) {
    if (await store(item)) yield item;
  }

  if (!more) return;

  // Merge peer items, skip duplicates
  for (const peer of peers) {
    for await (const item of peer) {
      if (await store(item)) yield item;
    }
  }
}

/**
 * Merge local results with peer results, then map to a class wrapper.
 * Returns the first result (for single-lookup patterns).
 */
export async function mergeAndWrapFirst<T, C>(
  local: T[] | Promise<T[]>,
  peers: Generator<Promise<T[]>>,
  keyFn: (item: T) => string | Promise<string>,
  onNew?: (item: T) => void | Promise<void>,
  wrap?: (item: T) => C,
  more = true,
): Promise<C | undefined> {
  let results: T[] = [];

  // Dedup helper
  const seen = new Set<string>();
  async function dedup(item: T) {
    const k = await keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    onNew?.(item);
    results.push(item);
    return true;
  }

  // Process local results
  const localItems = await local;
  for (const item of localItems) {
    await dedup(item);
  }

  // Process peer results if requested
  if (more) {
    for (const peer of peers) {
      const items = await peer;
      for (const item of items) {
        await dedup(item);
      }
    }
  }

  if (results.length === 0) return undefined;
  return wrap ? wrap(results[0]) : (results[0] as unknown as C);
}
