/** Bridge the existing Code City session to the same-origin ORC browser boundary. */
export async function createOrcBrowserSession(accessToken, fetcher = fetch) {
  if (!accessToken) throw new Error('Sign in again before opening ORC.');
  let response;
  try {
    response = await fetcher('/orc/session', {
      method: 'POST', mode: 'same-origin', credentials: 'same-origin', redirect: 'error',
      cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', 'X-CodeCity-User-Token': accessToken },
      body: '{}',
    });
  } catch {
    throw new Error('ORC could not be reached. Try again shortly.');
  }
  if (response.status === 401) throw new Error('Sign in again before opening ORC.');
  if (response.status === 403) throw Object.assign(new Error('Your ORC access is locked. Enter its code again.'), { code: 'workspace_locked' });
  if (!response.ok) throw new Error('ORC is not available yet. Your other workspace is unaffected.');
  const result = await response.json().catch(() => null);
  if (result?.ok !== true || result.location !== '/orc/' || !Number.isInteger(result.expires_in)
      || result.expires_in < 1 || result.expires_in > 900) {
    throw new Error('ORC could not establish a secure session. Try again shortly.');
  }
}
