/** Per-request promise dedup for GraphQL resolver/service calls. */
export function getOrCreate<T>(
  map: Map<string, Promise<unknown>>,
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const hit = map.get(key) as Promise<T> | undefined;
  if (hit) return hit;
  const promise = factory();
  map.set(key, promise as Promise<unknown>);
  return promise;
}
