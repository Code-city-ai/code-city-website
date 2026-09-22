import assert from 'node:assert/strict';
import test from 'node:test';
import { canAdmin, grantValid, hashCode, matchesCode, newSalt, notifyWorkspaceAccess, readPaths, readTradeCity, sessionId, validCode, workspaceAction } from '../../supabase/functions/_shared/project-workspace.ts';

const env = { MAILGUN_API_KEY: 'test-private-mailgun', MAILGUN_DOMAIN: 'mg.example.test', MAILGUN_FROM: 'Code City <notify@example.test>', TRADECITY_WEB_BACKEND_URL: 'https://trade.example.test', TRADECITY_WEB_READ_TOKEN: 'test-private-backend' };
globalThis.Deno = { env: { get: (key) => env[key] } };
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'owner@example.test' };
const sid = '22222222-2222-4222-8222-222222222222';
const code = 'my-owner-code-2026';
function database(role = 'owner') {
  const rows = { admin_profiles: [{ user_id: user.id, role, is_active: true }], project_workspace_codes: [], project_workspace_grants: [] };
  let attempts = 0;
  return { rows, rpc: async (name, args) => ({ data: name === 'project_workspace_session_active' || args.p_bucket !== 'code' || ++attempts <= 5, error: null }), from(table) {
    const filters = []; let operation = 'read'; let payload;
    const query = { select() { return query; }, eq(k, v) { filters.push([k, v]); return query; }, maybeSingle() { return query; }, single() { return query; },
      insert(v) { operation = 'insert'; payload = v; return query; }, update(v) { operation = 'update'; payload = v; return query; }, upsert(v) { operation = 'upsert'; payload = v; return query; }, delete() { operation = 'delete'; return query; },
      then(resolve) {
        const match = (row) => filters.every(([k,v]) => row[k] === v);
        let row = rows[table].find(match);
        if (operation === 'insert') { row = { ...payload }; rows[table].push(row); }
        if (operation === 'update' && row) Object.assign(row, payload);
        if (operation === 'upsert') { row = rows[table].find((r) => r.session_id === payload.session_id && r.user_id === payload.user_id); if (row) Object.assign(row, payload); else { row = { ...payload }; rows[table].push(row); } }
        if (operation === 'delete') rows[table] = rows[table].filter((r) => !match(r));
        return Promise.resolve(resolve({ data: row || null, error: null }));
      } };
    return query;
  } };
}

test('code hashes are salted; exact code works and near matches fail', async () => {
  const salt = newSalt(); const hash = await hashCode(code, salt);
  assert.notEqual(hash, await hashCode(code, newSalt()));
  assert.equal(await matchesCode(code, { salt, code_hash: hash }), true);
  assert.equal(await matchesCode(code + '!', { salt, code_hash: hash }), false);
  assert.equal(validCode('1234'), false); assert.equal(validCode(' ' + code), false);
  assert.equal(validCode(code), true);
});
test('roles, expiry, and code revisions fail closed', () => {
  assert.equal(canAdmin({ role: 'viewer', is_active: true }), false);
  assert.equal(canAdmin({ role: 'admin', is_active: false }), false);
  assert.equal(grantValid({ revision: 'a', expires_at: '2001-01-01' }, 'a'), false);
  assert.equal(grantValid({ revision: 'a', expires_at: '2099-01-01' }, 'b'), false);
  assert.equal(grantValid({ revision: 'a', expires_at: '2099-01-01' }, 'a'), true);
});
test('sessionless tokens and arbitrary proxy paths are rejected', () => {
  assert.throws(() => sessionId('bad'), /Sign in/);
  const jwt = `a.${Buffer.from(JSON.stringify({ session_id: sid })).toString('base64url')}.c`;
  assert.equal(sessionId(jwt), sid);
  assert.throws(() => readPaths('../orders/execute', 'all'));
  assert.throws(() => readPaths('paper', '../'));
  assert.deepEqual(Object.keys(readPaths('paper', '30d')), ['portfolio','performance','nova']);
  assert.match(readPaths('paper','30d').portfolio, /refresh_prices=false/);
});
test('Mailgun uses only the owner recipient and never sends the fixed code', async () => {
  let request;
  await notifyWorkspaceAccess(user.email, 'unlocked', async (url, options) => { request = { url, options }; return new Response('{}', { status: 200 }); });
  assert.equal(request.options.body.get('to'), 'dev@codecity.ai');
  assert.ok(!request.options.body.get('text').includes(code));
  assert.match(request.options.headers.Authorization, /^Basic /);
  await assert.rejects(() => notifyWorkspaceAccess(user.email, 'unlocked', async () => new Response('{}',{ status:401 })), /did not accept/);
});
test('backend is a fixed GET-only read surface and secrets never appear in responses', async () => {
  const calls = [];
  const result = await readTradeCity('paper', '30d', async (url, options) => { calls.push({ url, options }); return Response.json({ broker: 'paper' }); });
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => c.options.method === undefined && c.options.redirect === 'error'));
  assert.ok(calls.every((c) => c.options.headers.Authorization === 'Bearer test-private-backend'));
  assert.ok(!JSON.stringify(result).includes(env.TRADECITY_WEB_READ_TOKEN));
  const failed = await readTradeCity('paper', '30d', async () => new Response('private exception',{ status:500 }));
  assert.equal(failed.portfolio.data, null); assert.ok(!JSON.stringify(failed).includes('private exception'));
});
test('configure, unlock, cross-session denial, rotation, role removal and rate limit', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ id:'test-message' }));
  const db = database();
  assert.deepEqual(await workspaceAction(db,user,sid,{ action:'status' }), { configured:false,unlocked:false,owner:true,expires_at:null });
  await assert.rejects(() => workspaceAction(db,user,sid,{ action:'snapshot' }), /Enter your access code/);
  await workspaceAction(db,user,sid,{ action:'configure',code });
  assert.equal(db.rows.project_workspace_codes[0].code_hash.includes(code),false);
  await assert.rejects(() => workspaceAction(db,user,sid,{ action:'unlock',code:'wrong' }), /not accepted/);
  await workspaceAction(db,user,sid,{ action:'unlock',code });
  assert.equal((await workspaceAction(db,user,sid,{ action:'status' })).unlocked,true);
  assert.equal((await workspaceAction(db,user,'33333333-3333-4333-8333-333333333333',{ action:'status' })).unlocked,false);
  await workspaceAction(db,user,sid,{ action:'configure',current_code:code,code:'replacement-code-2026' });
  assert.equal((await workspaceAction(db,user,sid,{ action:'status' })).unlocked,false);
  await workspaceAction(db,user,sid,{ action:'unlock',code:'replacement-code-2026' });
  await assert.rejects(() => workspaceAction(db,user,sid,{ action:'unlock',code:'replacement-code-2026' }), /Too many attempts/);
  await workspaceAction(db,user,sid,{ action:'lock' });
  assert.equal(db.rows.project_workspace_grants.length,0);
  db.rows.admin_profiles[0].is_active = false;
  await assert.rejects(() => workspaceAction(db,user,sid,{ action:'status' }), /active administrator/);
});
test('admins cannot set codes, and failed email delivery cannot grant access', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}',{status:503}));
  const db = database('admin');
  await assert.rejects(() => workspaceAction(db,user,sid,{ action:'configure',code }), /Only the workspace owner/);
  const salt = newSalt(); db.rows.project_workspace_codes.push({project:'trade-city',salt,code_hash:await hashCode(code,salt),revision:'revision'});
  await assert.rejects(() => workspaceAction(db,user,sid,{ action:'unlock',code }), /Mailgun/);
  assert.equal(db.rows.project_workspace_grants.length,0);
});
test('code setup reports durable success separately from notification failure', async (t) => {
  t.mock.method(globalThis,'fetch',async()=>new Response('{}',{status:500}));
  const db=database(); const result=await workspaceAction(db,user,sid,{action:'configure',code});
  assert.equal(result.configured,true); assert.equal(result.notification,'failed'); assert.equal(result.unlocked,false);
});

test('a revoked Auth session cannot use a still-signed JWT or existing grant', async () => {
  const db=database(); db.rpc=async()=>({data:false,error:null});
  await assert.rejects(()=>workspaceAction(db,user,sid,{action:'status'}), /session has expired/);
});
