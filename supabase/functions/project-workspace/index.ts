import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { sessionId, workspaceAction, WorkspaceError } from '../_shared/project-workspace.ts';

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') || '';
  const origins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://codecity.ai').split(',').map((item) => item.trim());
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : 'https://codecity.ai',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.includes(origin)) return reply({ error: 'Origin not allowed.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  try {
    const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new WorkspaceError('Sign in to access your projects.', 401);
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new WorkspaceError('Project access is not configured.', 503);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw new WorkspaceError('Your session has expired. Sign in again.', 401);
    const sid = sessionId(token);
    const text = await request.text();
    if (text.length > 2048) throw new WorkspaceError('Request too large.', 413);
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new WorkspaceError('Valid JSON is required.'); }
    return reply(await workspaceAction(admin, data.user, sid, body));
  } catch (error) {
    if (error instanceof WorkspaceError) return reply({ error: error.message }, error.status);
    return reply({ error: 'Project access is unavailable. Please retry or contact the owner.' }, 503);
  }
});
