/**
 * neon-http returns rows as an array; postgres-js returns { rows }.
 * Normalise once here so query modules never care which driver is active.
 */
export function toRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const r = (result as { rows?: unknown })?.rows;
  return Array.isArray(r) ? (r as T[]) : [];
}

export const num = (v: unknown): number => Number(v ?? 0);
export const str = (v: unknown): string => String(v ?? "");
