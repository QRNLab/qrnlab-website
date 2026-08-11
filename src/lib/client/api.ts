export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}
