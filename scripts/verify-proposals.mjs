/** Local UI fixture only. Never deployed; no real credentials, storage or database calls. */
import { readFile } from 'node:fs/promises';
import { createServer as createHTTPServer } from 'node:http';
import { createServer as createViteServer } from 'vite';

const apiPort = 54432;
const webPort = 4182;
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'owner@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const payload = { sub: user.id, role: 'authenticated', email: user.email, session_id: '22222222-2222-4222-8222-222222222222', exp: Math.floor(Date.now() / 1000) + 86400 };
const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.local-fixture-only`;
const role = process.env.FIXTURE_ROLE || 'owner';

// Optional real PDFs for a realistic preview; otherwise a one-page placeholder.
const placeholderPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 58>>stream\nBT /F1 22 Tf 72 700 Td (Local fixture proposal) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const files = new Map();
const seedId = '33333333-3333-4333-8333-333333333333';
files.set(`${seedId}/en-1.pdf`, process.env.FIXTURE_PROPOSAL_EN ? await readFile(process.env.FIXTURE_PROPOSAL_EN) : placeholderPdf);
files.set(`${seedId}/zh-1.pdf`, process.env.FIXTURE_PROPOSAL_ZH ? await readFile(process.env.FIXTURE_PROPOSAL_ZH) : placeholderPdf);
let proposals = [{
  id: seedId, title: 'Dealership Management System', client_label: 'Dealership Partner',
  summary: 'Custom dealership system in four phases, English and Chinese editions.',
  files: [{ language: 'en', path: `${seedId}/en-1.pdf`, bytes: files.get(`${seedId}/en-1.pdf`).length }, { language: 'zh', path: `${seedId}/zh-1.pdf`, bytes: files.get(`${seedId}/zh-1.pdf`).length }],
  created_at: '2026-10-14T12:00:00Z',
}];

const api = createHTTPServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', `http://127.0.0.1:${webPort}`);
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, accept-profile, content-profile, x-upsert, cache-control');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const url = new URL(req.url, `http://127.0.0.1:${apiPort}`);
  const reply = (body, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  const path = decodeURIComponent(url.pathname);

  if (path.startsWith('/auth/v1/token')) { reply({ access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 86400, expires_at: payload.exp, user }); return; }
  if (path.startsWith('/auth/v1/user')) { reply(user); return; }
  if (path.startsWith('/auth/v1/logout')) { reply({}); return; }
  if (path.startsWith('/rest/v1/admin_profiles')) { reply({ user_id: user.id, full_name: 'Local fixture owner', role, is_active: true, last_seen_at: null }); return; }
  if (path.startsWith('/functions/v1/project-workspace')) {
    // The CRM gate is already unlocked in this fixture so the proposals page opens directly.
    reply({ owner: true, configured: true, unlocked: true, expires_at: new Date(Date.now() + 3600000).toISOString() }); return;
  }
  if (path === '/rest/v1/proposals') {
    if (role !== 'owner' && role !== 'admin') { reply([]); return; }
    const idFilter = url.searchParams.get('id')?.replace(/^eq\./, '');
    if (req.method === 'GET') { reply(proposals); return; }
    if (req.method === 'POST') {
      const body = JSON.parse(raw.toString() || '{}');
      const row = { id: crypto.randomUUID(), files: [], summary: null, created_at: new Date().toISOString(), ...body };
      proposals = [row, ...proposals];
      reply((req.headers.accept || '').includes('vnd.pgrst.object') ? { id: row.id } : [{ id: row.id }], 201); return;
    }
    if (req.method === 'PATCH') { const body = JSON.parse(raw.toString() || '{}'); proposals = proposals.map((row) => row.id === idFilter ? { ...row, ...body } : row); res.statusCode = 204; res.end(); return; }
    if (req.method === 'DELETE') { proposals = proposals.filter((row) => row.id !== idFilter); res.statusCode = 204; res.end(); return; }
  }
  const signPrefix = '/storage/v1/object/sign/proposals/';
  if (path.startsWith(signPrefix)) {
    const key = path.slice(signPrefix.length);
    if (req.method === 'POST') { reply({ signedURL: `/object/sign/proposals/${key}?token=local-fixture` }); return; }
    const file = files.get(key);
    if (!file) { reply({ error: 'Object not found' }, 404); return; }
    res.statusCode = 200; res.setHeader('Content-Type', 'application/pdf'); res.end(file); return;
  }
  const objectPrefix = '/storage/v1/object/proposals/';
  if (path.startsWith(objectPrefix) && req.method === 'POST') { const key = path.slice(objectPrefix.length); files.set(key, raw); reply({ Id: key, Key: `proposals/${key}` }); return; }
  if (path === '/storage/v1/object/proposals' && req.method === 'DELETE') { for (const key of JSON.parse(raw.toString() || '{}').prefixes || []) files.delete(key); reply([]); return; }
  reply({ error: 'Fixture route not implemented' }, 404);
});
await new Promise((resolve, reject) => { api.once('error', reject); api.listen(apiPort, '127.0.0.1', resolve); });
process.env.VITE_SUPABASE_URL = `http://127.0.0.1:${apiPort}`;
process.env.VITE_SUPABASE_ANON_KEY = 'public-local-fixture-key';
const vite = await createViteServer({ server: { host: '127.0.0.1', port: webPort, strictPort: true }, plugins: [{ name: 'local-fixture-label', transformIndexHtml() { return [{ tag: 'div', attrs: { style: 'position:relative;text-align:center;background:#493415;color:#fff1d9;font:11px system-ui;padding:8px;pointer-events:none' }, children: 'LOCAL PROPOSALS TEST · NO REAL ACCOUNT, DATABASE OR STORAGE', injectTo: 'body-prepend' }]; } }] });
await vite.listen();
console.log(`Local fixture: http://127.0.0.1:${webPort}/sign-in then /admin/proposals. Email owner@example.test, any test password. Role: ${role} (set FIXTURE_ROLE=agent to see the locked state). No live services are contacted.`);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await vite.close(); api.close(); process.exit(0); });
