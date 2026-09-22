import { getMailgunConfig } from './inquiry-notifications.ts';

export class WorkspaceError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes)).map((v) => v.toString(16).padStart(2, '0')).join('');
export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function hashCode(code: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(code), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 600_000 }, key, 256));
}
export function validCode(code: unknown): code is string {
  return typeof code === 'string' && code.length >= 10 && code.length <= 128 && code.trim() === code;
}
export async function matchesCode(code: unknown, record: { salt: string; code_hash: string }) {
  if (typeof code !== 'string' || code.length > 128) return false;
  const actual = await hashCode(code, record.salt);
  let mismatch = actual.length ^ record.code_hash.length;
  for (let i = 0; i < actual.length; i++) mismatch |= actual.charCodeAt(i) ^ (record.code_hash.charCodeAt(i) || 0);
  return mismatch === 0;
}
export function sessionId(token: string): string {
  // Call ONLY after Supabase auth.getUser(token) has verified this exact JWT.
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const id = JSON.parse(atob(payload)).session_id;
    if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
  } catch { /* Fail closed on malformed or sessionless tokens. */ }
  throw new WorkspaceError('Sign in again to access your projects.', 401);
}
export function canAdmin(profile: { role?: string; is_active?: boolean } | null) {
  return Boolean(profile?.is_active && ['owner', 'admin'].includes(profile.role || ''));
}
export function grantValid(grant: { revision: string; expires_at: string } | null, revision: string | undefined, now = Date.now()) {
  return Boolean(revision && grant?.revision === revision && Date.parse(grant.expires_at) > now);
}

export async function notifyWorkspaceAccess(email: string, action: 'unlocked' | 'code changed', fetcher = fetch) {
  const config = getMailgunConfig();
  if (!config) throw new WorkspaceError('Access notifications are not configured. Ask the owner to connect Mailgun.', 503);
  const form = new FormData();
  form.set('from', config.from);
  form.set('to', 'dev@codecity.ai');
  form.set('subject', `Code City · Trade City ${action}`);
  form.set('text', `Trade City ${action} by ${email} at ${new Date().toISOString()}.\n\nYour private access code is never included in email.\nReview your workspace at https://codecity.ai/sign-in`);
  let response: Response;
  try {
    response = await fetcher(`${config.apiBase}/v3/${encodeURIComponent(config.domain)}/messages`, {
      method: 'POST', headers: { Authorization: `Basic ${btoa(`api:${config.apiKey}`)}` },
      body: form, signal: AbortSignal.timeout(8_000),
    });
  } catch { throw new WorkspaceError('Mailgun is unavailable. Please try again shortly.', 503); }
  if (!response.ok) throw new WorkspaceError('Mailgun did not accept the access notification. Please try again shortly.', 503);
}

const allowedBrokers = new Set(['paper', 'alpaca', 'coinbase', 'kraken', 'oanda', 'robinhood', 'webull']);
const allowedPeriods = new Set(['today', '7d', '30d', '90d', 'all']);
export function readPaths(broker: unknown, period: unknown) {
  if (typeof broker !== 'string' || !allowedBrokers.has(broker) || typeof period !== 'string' || !allowedPeriods.has(period)) {
    throw new WorkspaceError('Choose a supported account and reporting period.');
  }
  return {
    portfolio: `/positions/pnl?broker=${broker}&refresh_prices=false`,
    performance: `/analytics/performance?broker=${broker}&period=${period}`,
    nova: '/ai/nova/status',
  };
}
export async function readTradeCity(broker: unknown, period: unknown, fetcher = fetch) {
  const paths = readPaths(broker, period);
  const rawUrl = Deno.env.get('TRADECITY_WEB_BACKEND_URL');
  const token = Deno.env.get('TRADECITY_WEB_READ_TOKEN');
  if (!rawUrl || !token) throw new WorkspaceError('Trade City is not connected to this workspace yet. Contact the owner to connect the backend.', 503);
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new WorkspaceError('The Trade City connection needs attention.', 503); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new WorkspaceError('The Trade City connection needs attention.', 503);
  }
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => {
    try {
      const response = await fetcher(`${url.origin}${path}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000), redirect: 'error',
      });
      if (!response.ok) return [key, { data: null, error: `Trade City returned HTTP ${response.status}.` }];
      return [key, { data: await response.json(), error: null }];
    } catch { return [key, { data: null, error: 'Trade City could not be reached.' }]; }
  }));
  return { ...Object.fromEntries(entries), fetched_at: new Date().toISOString(), broker, period };
}

// Dependency-injected core: the entry point supplies a verified user and a server-only client.
export async function workspaceAction(admin: any, user: { id: string; email?: string }, sid: string, body: any) {
  const checked = (result: any) => { if (result.error) throw new WorkspaceError('Project access is unavailable. Please retry or contact the owner.', 503); return result.data; };
  const activeSession = checked(await admin.rpc('project_workspace_session_active', { p_user_id: user.id, p_session_id: sid }));
  if (activeSession !== true) throw new WorkspaceError('Your session has expired. Sign in again.', 401);
  const profile = checked(await admin.from('admin_profiles').select('role,is_active').eq('user_id', user.id).maybeSingle());
  if (!canAdmin(profile)) throw new WorkspaceError('An active administrator account is required.', 403);
  const action = body?.action;
  if (!['status', 'unlock', 'configure', 'lock', 'snapshot'].includes(action)) throw new WorkspaceError('Unknown workspace action.');
  const allowed = checked(await admin.rpc('consume_project_workspace_attempt', { p_user_id: user.id, p_bucket: ['unlock', 'configure'].includes(action) ? 'code' : 'read' }));
  if (allowed !== true) throw new WorkspaceError('Too many attempts. Wait before trying again.', 429);
  const record = checked(await admin.from('project_workspace_codes').select('*').eq('project', 'trade-city').maybeSingle());
  const grant = checked(await admin.from('project_workspace_grants').select('revision,expires_at').eq('user_id', user.id).eq('session_id', sid).eq('project', 'trade-city').maybeSingle());
  const unlocked = grantValid(grant, record?.revision);
  const owner = profile.role === 'owner';
  if (action === 'status') return { configured: Boolean(record), unlocked, owner, expires_at: unlocked ? grant.expires_at : null };
  if (action === 'lock') {
    checked(await admin.from('project_workspace_grants').delete().eq('user_id', user.id).eq('session_id', sid).eq('project', 'trade-city'));
    return { unlocked: false };
  }
  if (action === 'configure') {
    if (!owner) throw new WorkspaceError('Only the workspace owner can set the access code.', 403);
    if (!validCode(body.code)) throw new WorkspaceError('Use 10–128 characters, with no spaces at the beginning or end.');
    if (record && !await matchesCode(body.current_code, record)) throw new WorkspaceError('The current code was not accepted.', 403);
    const salt = newSalt();
    const update = { project: 'trade-city', salt, code_hash: await hashCode(body.code, salt), revision: crypto.randomUUID(), updated_by: user.id, updated_at: new Date().toISOString() };
    const changed = checked(record
      ? await admin.from('project_workspace_codes').update(update).eq('project', 'trade-city').eq('revision', record.revision).select('revision').maybeSingle()
      : await admin.from('project_workspace_codes').insert(update).select('revision').single());
    if (!changed) throw new WorkspaceError('The code changed in another session. Reload and try again.', 409);
    // The code rotation is durable even if email fails; never tell the owner to retry an old code.
    let notification = 'accepted';
    try { await notifyWorkspaceAccess(user.email || user.id, 'code changed'); } catch { notification = 'failed'; }
    return { configured: true, unlocked: false, owner, notification };
  }
  if (action === 'unlock') {
    if (!record) throw new WorkspaceError('The owner needs to set the project access code first.', 409);
    if (!await matchesCode(body.code, record)) throw new WorkspaceError('The access code was not accepted.', 403);
    await notifyWorkspaceAccess(user.email || user.id, 'unlocked');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    checked(await admin.from('project_workspace_grants').upsert({ user_id: user.id, session_id: sid, project: 'trade-city', revision: record.revision, expires_at }, { onConflict: 'user_id,session_id,project' }));
    return { configured: true, unlocked: true, owner, expires_at, notification: 'accepted' };
  }
  if (!unlocked) throw new WorkspaceError('Enter your access code to open Trade City.', 403);
  return readTradeCity(body.broker || 'paper', body.period || '30d');
}
