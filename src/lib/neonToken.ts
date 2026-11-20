/** Shape check only. Authentication always requires server-side JWT verification. */
export function isCompactJwt(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 16384 &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

export async function resolveNeonToken(
  getSessionToken: () => Promise<unknown>,
  getExplicitToken: () => Promise<unknown>,
): Promise<string | null> {
  try {
    const token = await getSessionToken();
    if (isCompactJwt(token)) return token;
  } catch { /* Some SDK/session responses omit the JWT response header. */ }
  try {
    const token = await getExplicitToken();
    return isCompactJwt(token) ? token : null;
  } catch { return null; }
}
