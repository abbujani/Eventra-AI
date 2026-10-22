/** Small, dependency-free id generator. */
export function generateId(prefix = ''): string {
  const cryptoObj = globalThis.crypto;
  const uuid =
    cryptoObj && typeof cryptoObj.randomUUID === 'function'
      ? cryptoObj.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return prefix ? `${prefix}_${uuid}` : uuid;
}
