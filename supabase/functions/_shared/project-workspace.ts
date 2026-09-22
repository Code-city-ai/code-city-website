import { getMailgunConfig } from './inquiry-notifications.ts';

export class WorkspaceError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'workspace_request_invalid') {
    super(message); this.status = status; this.code = code;
  }
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
  throw new WorkspaceError('Sign in again to access your projects.', 401, 'workspace_session_invalid');
}
export function canAdmin(profile: { role?: string; is_active?: boolean } | null) {
  return Boolean(profile?.is_active && ['owner', 'admin'].includes(profile.role || ''));
}
export function canAccessProject(profile: { role?: string; is_active?: boolean } | null, project: string) {
  return project === 'trade-city' ? canAdmin(profile)
    : project === 'code-city' && Boolean(profile?.is_active && ['owner', 'admin', 'agent', 'viewer'].includes(profile.role || ''));
}
export function grantValid(grant: { revision: string; expires_at: string } | null, revision: string | undefined, now = Date.now()) {
  return Boolean(revision && grant?.revision === revision && Date.parse(grant.expires_at) > now);
}

export async function notifyWorkspaceAccess(email: string, action: 'access requested' | 'code changed', fetcher = fetch, project = 'trade-city') {
  const config = getMailgunConfig();
  if (!config) throw new WorkspaceError('Access notifications are not configured. Ask the owner to connect Mailgun.', 503);
  const projectName = project === 'code-city' ? 'Code City' : 'Trade City';
  const form = new FormData();
  form.set('from', config.from);
  form.set('to', 'dev@codecity.ai');
  form.set('subject', `Code City · ${projectName} ${action}`);
  form.set('text', `${projectName} ${action} by ${email} at ${new Date().toISOString()}.\n\nYour private access code is never included in email.\nReview your workspace at https://codecity.ai/sign-in`);
  let response: Response;
  try {
    response = await fetcher(`${config.apiBase}/v3/${encodeURIComponent(config.domain)}/messages`, {
      method: 'POST', headers: { Authorization: `Basic ${btoa(`api:${config.apiKey}`)}` },
      body: form, signal: AbortSignal.timeout(8_000),
    });
  } catch { throw new WorkspaceError('Mailgun is unavailable. Please try again shortly.', 503); }
  if (!response.ok) throw new WorkspaceError('Mailgun did not accept the access notification. Please try again shortly.', 503);
}

// Dependency-injected core: the entry point supplies a verified user and a server-only client.
export async function workspaceAction(admin: any, user: { id: string; email?: string }, sid: string, body: any) {
  const checked = (result: any) => { if (result.error) throw new WorkspaceError('Project access is unavailable. Please retry or contact the owner.', 503); return result.data; };
  const project = body?.project;
  if (!['trade-city', 'code-city'].includes(project)) throw new WorkspaceError('Unknown project.');
  const activeSession = checked(await admin.rpc('project_workspace_session_active', { p_user_id: user.id, p_session_id: sid }));
  if (activeSession !== true) throw new WorkspaceError('Your session has expired. Sign in again.', 401, 'workspace_session_invalid');
  const profile = checked(await admin.from('admin_profiles').select('role,is_active').eq('user_id', user.id).maybeSingle());
  if (!canAccessProject(profile, project)) throw new WorkspaceError('An active administrator account is required.', 403, 'workspace_role_denied');
  const action = body?.action;
  if (!['status', 'unlock', 'configure', 'lock', 'authorize'].includes(action)) throw new WorkspaceError('Unknown workspace action.');
  const allowed = action === 'lock' || checked(await admin.rpc('consume_project_workspace_attempt', { p_user_id: user.id, p_bucket: ['unlock', 'configure'].includes(action) ? 'code' : 'read' }));
  if (allowed !== true) throw new WorkspaceError('Too many attempts. Wait before trying again.', 429, 'workspace_rate_limited');
  const record = checked(await admin.from('project_workspace_codes').select('*').eq('project', project).maybeSingle());
  const grant = checked(await admin.from('project_workspace_grants').select('revision,expires_at').eq('user_id', user.id).eq('session_id', sid).eq('project', project).maybeSingle());
  const unlocked = grantValid(grant, record?.revision);
  const owner = profile.role === 'owner';
  if (action === 'status') return { configured: Boolean(record), unlocked, owner, expires_at: unlocked ? grant.expires_at : null };
  if (action === 'lock') {
    checked(await admin.rpc('lock_project_workspace', { p_user_id: user.id, p_session_id: sid, p_project: project }));
    return { unlocked: false };
  }
  if (action === 'configure') {
    if (!owner) throw new WorkspaceError('Only the workspace owner can set the access code.', 403);
    if (!validCode(body.code)) throw new WorkspaceError('Use 10–128 characters, with no spaces at the beginning or end.');
    if (record && !await matchesCode(body.current_code, record)) throw new WorkspaceError('The current code was not accepted.', 403);
    const salt = newSalt();
    const update = { project, salt, code_hash: await hashCode(body.code, salt), revision: crypto.randomUUID(), updated_by: user.id, updated_at: new Date().toISOString() };
    const changed = checked(record
      ? await admin.from('project_workspace_codes').update(update).eq('project', project).eq('revision', record.revision).select('revision').maybeSingle()
      : await admin.from('project_workspace_codes').insert(update).select('revision').single());
    if (!changed) throw new WorkspaceError('The code changed in another session. Reload and try again.', 409);
    // The code rotation is durable even if email fails; never tell the owner to retry an old code.
    let notification = 'accepted';
    try { await notifyWorkspaceAccess(user.email || user.id, 'code changed', fetch, project); } catch { notification = 'failed'; }
    return { configured: true, unlocked: false, owner, notification };
  }
  if (action === 'unlock') {
    if (!record) throw new WorkspaceError('The owner needs to set this project access code first.', 409);
    const scope = { p_user_id: user.id, p_session_id: sid, p_project: project, p_revision: record.revision };
    const generation = checked(await admin.rpc('begin_project_workspace_unlock', scope));
    if (!generation) throw new WorkspaceError('Project access changed. Reload and try again.', 409, 'workspace_locked');
    if (!await matchesCode(body.code, record)) throw new WorkspaceError('The access code was not accepted.', 403);
    await notifyWorkspaceAccess(user.email || user.id, 'access requested', fetch, project);
    const expires_at = checked(await admin.rpc('complete_project_workspace_unlock', { ...scope, p_generation: generation }));
    if (!expires_at) throw new WorkspaceError('Project access was locked or changed while verifying. Enter the code again.', 409, 'workspace_locked');
    return { configured: true, unlocked: true, owner, expires_at, notification: 'accepted' };
  }
  if (!unlocked) throw new WorkspaceError('Enter your access code to open this project.', 403, 'workspace_locked');
  return { authorized: true, user_id: user.id, session_id: sid, expires_at: grant.expires_at };
}

async function readWorkspaceBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new WorkspaceError('Send a JSON request.', 415);
  }
  const maximumBytes = 2048;
  if (Number(request.headers.get('content-length')) > maximumBytes) throw new WorkspaceError('Request too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new WorkspaceError('Valid JSON is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        throw new WorkspaceError('Request too large.', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const combined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(combined)); }
  catch { throw new WorkspaceError('Valid JSON is required.'); }
}

// The injected factory is server-owned; neither keys nor upstream URLs come from callers.
export function workspaceHandler(createAdmin: (request: Request) => any, origins: string[]) {
  return async (request: Request) => {
    const origin = request.headers.get('Origin') || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !origins.includes(origin)) return reply({ error: 'Origin not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
    try {
      const token = request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
      if (!token || token.length > 8192) throw new WorkspaceError('Sign in to access your projects.', 401, 'workspace_session_invalid');
      const body = await readWorkspaceBody(request);
      const admin = await createAdmin(request);
      const { data, error } = await admin.auth.getUser(token);
      if (error?.status >= 500) throw new WorkspaceError('Identity verification is unavailable. Please retry.', 503);
      if (error || !data.user) throw new WorkspaceError('Your session has expired. Sign in again.', 401, 'workspace_session_invalid');
      // Decode session_id only after Auth has verified this exact supplied token.
      return reply(await workspaceAction(admin, data.user, sessionId(token), body));
    } catch (error) {
      if (error instanceof WorkspaceError) return reply({ error: error.message, code: error.code }, error.status);
      return reply({ error: 'Project access is unavailable. Please retry or contact the owner.', code: 'workspace_unavailable' }, 503);
    }
  };
}

// Reuse the site's modern Supabase server context; the handler separately verifies
// the exact user bearer. A publishable key alone never authorizes project access.
export function workspaceContextAdmin(resolveContext: any) {
  return async (request: Request) => {
    const { data: context, error } = await resolveContext(request, { auth: 'publishable' });
    if (error) {
      const credentialRejected = error.status === 401 || error.status === 403;
      throw new WorkspaceError(credentialRejected ? 'The website connection could not be authenticated.' : 'Project access is unavailable. Please retry.', credentialRejected ? 401 : 503);
    }
    if (!context?.supabaseAdmin) throw new WorkspaceError('Project access is not configured.', 503);
    return context.supabaseAdmin;
  };
}
