export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | false
  | ClassValue[]
  | { [key: string]: unknown };

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
    } else if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else if (typeof value === 'object') {
      for (const [key, ok] of Object.entries(value)) {
        if (ok) out.push(key);
      }
    }
  }
  return out.join(' ');
}
