import assert from 'node:assert/strict';
import test from 'node:test';
import { canAdmin, canAccessProject, grantValid, hashCode, matchesCode, newSalt, notifyWorkspaceAccess, sessionId, validCode, workspaceAction, workspaceHandler, workspaceContextAdmin } from '../../supabase/functions/_shared/project-workspace.ts';

const env = { MAILGUN_API_KEY: 'test-private-mailgun', MAILGUN_DOMAIN: 'mg.example.test', MAILGUN_FROM: 'Code City <notify@example.test>' };
globalThis.Deno = { env: { get: (key) => env[key] } };
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'dev@codecity.ai' };
const sid = '22222222-2222-4222-8222-222222222222';
const code = 'my-owner-code-2026';
function database(role = 'owner') {
  const rows = { admin_profiles: [{ user_id: user.id, role, is_active: true, identity_email: user.email }], project_workspace_codes: [], project_workspace_grants: [] };
  let attempts = 0;
  return { rows, rpc: async (name, args) => {
    const profile = rows.admin_profiles.find((row) => row.user_id === args.p_user_id);
    const record = rows.project_workspace_codes.find((row) => row.project === args.p_project);
    let grant = rows.project_workspace_grants.find((row) => row.user_id === args.p_user_id && row.session_id === args.p_session_id && row.project === args.p_project);
    let data = null;
    if (name === 'project_workspace_session_active') data = true;
    if (name === 'consume_project_workspace_attempt') data = args.p_bucket !== 'code' || ++attempts <= 5;
    if (name === 'begin_project_workspace_unlock' || name === 'lock_project_workspace') {
      if (record && (name === 'lock_project_workspace' || record.revision === args.p_revision)) {
        const update = { user_id: args.p_user_id, session_id: args.p_session_id, project: args.p_project, revision: record.revision, generation: crypto.randomUUID(), expires_at:'-infinity' };
        if (grant) Object.assign(grant, update); else { grant=update; rows.project_workspace_grants.push(grant); }
        if (name === 'begin_project_workspace_unlock') data = grant.generation;
      }
    }
    if (name === 'complete_project_workspace_unlock' && grant?.generation === args.p_generation && grant.revision === args.p_revision && record?.revision === args.p_revision && canAccessProject(profile, args.p_project)) {
      data = new Date(Date.now()+3600000).toISOString();grant.expires_at=data;
    }
    return { data, error:null };
  }, from(table) {
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
        return Promise.resolve(resolve({ data: row ? {...row} : null, error: null }));
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
test('only the three approved Auth emails may use an existing profile or grant', async () => {
  for (const email of ['dev@codecity.ai', 'Hugosan8210@gmail.com', 'tradecity.MC@proton.me']) {
    const db = database(email === 'dev@codecity.ai' ? 'owner' : 'admin');
    db.rows.admin_profiles[0].identity_email = email.toLowerCase();
    const status = await workspaceAction(db, { ...user, email }, sid, { project: 'trade-city', action: 'status' });
    assert.equal(status.configured, false);
    assert.equal(status.owner, email === 'dev@codecity.ai');
    if (email !== 'dev@codecity.ai') {
      await assert.rejects(
        () => workspaceAction(db, { ...user, email }, sid, { project: 'trade-city', action: 'configure', code }),
        /Only the workspace owner/,
      );
      assert.equal(db.rows.project_workspace_codes.length, 0);
    }
  }
  for (const email of ['Hugosan8210@gmail.com', 'tradecity.MC@proton.me']) {
    const db = database('owner');
    db.rows.project_workspace_codes.push({ project: 'trade-city', revision: 'existing' });
    db.rows.project_workspace_grants.push({ user_id: user.id, session_id: sid, project: 'trade-city', revision: 'existing', expires_at: '2099-01-01' });
    await assert.rejects(
      () => workspaceAction(db, { ...user, email }, sid, { project: 'trade-city', action: 'authorize' }),
      (error) => error.status === 403 && error.code === 'workspace_role_denied',
    );
  }
  const db = database();
  for (const email of ['outsider@example.test', 'dev+other@codecity.ai', ' dev@codecity.ai', undefined]) {
    for (const project of ['code-city', 'orc', 'trade-city']) {
      await assert.rejects(
        () => workspaceAction(db, { ...user, email }, sid, { project, action: 'status' }),
        (error) => error.status === 403 && error.code === 'workspace_role_denied',
      );
    }
  }
});
test('an approved-to-approved Auth email swap cannot inherit a bound admin profile or grant', async () => {
  const db = database('admin');
  db.rows.admin_profiles[0].identity_email = 'hugosan8210@gmail.com';
  db.rows.project_workspace_codes.push({ project: 'trade-city', revision: 'existing' });
  const grant = { user_id: user.id, session_id: sid, project: 'trade-city', revision: 'existing', expires_at: '2099-01-01' };
  db.rows.project_workspace_grants.push(grant);
  const original = { ...user, email: 'Hugosan8210@gmail.com' };
  const changed = { ...user, email: 'tradecity.MC@proton.me' };
  assert.equal((await workspaceAction(db, original, sid, { project: 'trade-city', action: 'authorize' })).authorized, true);
  for (const action of ['status', 'authorize']) {
    await assert.rejects(
      () => workspaceAction(db, changed, sid, { project: 'trade-city', action }),
      (error) => error.status === 403 && error.code === 'workspace_role_denied',
    );
  }
  assert.equal(grant.expires_at, '2099-01-01');
});
test('sessionless tokens are rejected', () => {
  assert.throws(() => sessionId('bad'), /Sign in/);
  const jwt = `a.${Buffer.from(JSON.stringify({ session_id: sid })).toString('base64url')}.c`;
  assert.equal(sessionId(jwt), sid);

});
test('Mailgun uses only the owner recipient and never sends the fixed code', async () => {
  let request;
  await notifyWorkspaceAccess(user.email, 'access requested', async (url, options) => { request = { url, options }; return new Response('{}', { status: 200 }); });
  assert.equal(request.options.body.get('to'), 'dev@codecity.ai');
  assert.ok(!request.options.body.get('text').includes(code));
  assert.match(request.options.headers.Authorization, /^Basic /);
  await assert.rejects(() => notifyWorkspaceAccess(user.email, 'access requested', async () => new Response('{}',{ status:401 })), /did not accept/);
});
test('workspace notifications forbid redirects and tracking and discard provider bodies', async () => {
  for (const status of [200, 302, 401]) {
    let cancelled = false;
    let request;
    const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status });
    const send = async (_url, options) => { request = options; return response; };
    if (status === 200) await notifyWorkspaceAccess(user.email, 'access requested', send, 'orc');
    else await assert.rejects(() => notifyWorkspaceAccess(user.email, 'access requested', send, 'orc'), /did not accept/);
    assert.equal(request.redirect, 'error');
    for (const field of ['o:tracking', 'o:tracking-clicks', 'o:tracking-opens']) assert.equal(request.body.get(field), 'no');
    assert.equal(cancelled, true);
  }
});
test('configure, unlock, cross-session denial, rotation, role removal and rate limit', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ id:'test-message' }));
  const db = database();
  assert.deepEqual(await workspaceAction(db,user,sid,{ project:'trade-city', action:'status' }), { configured:false,unlocked:false,owner:true,expires_at:null });
  await assert.rejects(() => workspaceAction(db,user,sid,{ project:'trade-city', action:'authorize' }), /Enter your access code/);
  await workspaceAction(db,user,sid,{ project:'trade-city', action:'configure',code });
  assert.equal(db.rows.project_workspace_codes[0].code_hash.includes(code),false);
  await assert.rejects(() => workspaceAction(db,user,sid,{ project:'trade-city', action:'unlock',code:'wrong' }), /not accepted/);
  await workspaceAction(db,user,sid,{ project:'trade-city', action:'unlock',code });
  assert.equal((await workspaceAction(db,user,sid,{ project:'trade-city', action:'status' })).unlocked,true);
  assert.equal((await workspaceAction(db,user,'33333333-3333-4333-8333-333333333333',{ project:'trade-city', action:'status' })).unlocked,false);
  await workspaceAction(db,user,sid,{ project:'trade-city', action:'configure',current_code:code,code:'replacement-code-2026' });
  assert.equal((await workspaceAction(db,user,sid,{ project:'trade-city', action:'status' })).unlocked,false);
  await workspaceAction(db,user,sid,{ project:'trade-city', action:'unlock',code:'replacement-code-2026' });
  await assert.rejects(() => workspaceAction(db,user,sid,{ project:'trade-city', action:'unlock',code:'replacement-code-2026' }), /Too many attempts/);
  await workspaceAction(db,user,sid,{ project:'trade-city', action:'lock' });
  assert.equal(grantValid(db.rows.project_workspace_grants[0],db.rows.project_workspace_codes[0].revision),false);
  db.rows.admin_profiles[0].is_active = false;
  await assert.rejects(() => workspaceAction(db,user,sid,{ project:'trade-city', action:'status' }), /active administrator/);
});
test('admins cannot set codes, and failed email delivery cannot grant access', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}',{status:503}));
  const db = database('admin');
  await assert.rejects(() => workspaceAction(db,user,sid,{ project:'trade-city', action:'configure',code }), /Only the workspace owner/);
  const salt = newSalt(); db.rows.project_workspace_codes.push({project:'trade-city',salt,code_hash:await hashCode(code,salt),revision:'revision'});
  await assert.rejects(() => workspaceAction(db,user,sid,{ project:'trade-city', action:'unlock',code }), /Mailgun/);
  assert.equal(grantValid(db.rows.project_workspace_grants[0],db.rows.project_workspace_codes[0].revision),false);
});
test('code setup reports durable success separately from notification failure', async (t) => {
  t.mock.method(globalThis,'fetch',async()=>new Response('{}',{status:500}));
  const db=database(); const result=await workspaceAction(db,user,sid,{project:'trade-city',action:'configure',code});
  assert.equal(result.configured,true); assert.equal(result.notification,'failed'); assert.equal(result.unlocked,false);
});

test('a revoked Auth session cannot use a still-signed JWT or existing grant', async () => {
  const db=database(); db.rpc=async()=>({data:false,error:null});
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'trade-city',action:'status'}), /session has expired/);
});

test('authorize exposes only the verified principal and rejects missing, stale, cross-session and wrong-project grants', async () => {
  const db = database();
  const expires_at = new Date(Date.now() + 3600000).toISOString();
  db.rows.project_workspace_codes.push({ project:'trade-city', revision:'current' });
  db.rows.project_workspace_grants.push({ user_id:user.id, session_id:sid, project:'trade-city', revision:'current', expires_at });
  const body = { project:'trade-city', action:'authorize' };
  assert.deepEqual(await workspaceAction(db,user,sid,body), { authorized:true,owner:true,user_id:user.id,session_id:sid,expires_at });
  await assert.rejects(() => workspaceAction(db,user,'other-session',body), (error) => error.status === 403 && error.code === 'workspace_locked');
  await assert.rejects(() => workspaceAction(db,user,sid,{...body,project:'another-project'}), /Unknown project/);
  await assert.rejects(() => workspaceAction(db,user,sid,{action:'authorize'}), /Unknown project/);
  db.rows.project_workspace_grants[0].revision = 'old';
  await assert.rejects(() => workspaceAction(db,user,sid,body), /Enter your access code/);
  db.rows.project_workspace_grants[0].revision = 'current';
  db.rows.project_workspace_grants[0].expires_at = '2001-01-01';
  await assert.rejects(() => workspaceAction(db,user,sid,body), /Enter your access code/);
  db.rows.project_workspace_grants[0].expires_at = expires_at;
  db.rows.admin_profiles[0].role = 'agent';
  await assert.rejects(() => workspaceAction(db,user,sid,body), (error) => error.code === 'workspace_role_denied');
});

test('authorize derives owner from the verified profile, never from caller claims', async () => {
  const db = database();
  const expires_at = new Date(Date.now() + 3600000).toISOString();
  db.rows.project_workspace_codes.push({ project:'trade-city', revision:'current' });
  db.rows.project_workspace_grants.push({ user_id:user.id, session_id:sid, project:'trade-city', revision:'current', expires_at });
  const body = { project:'trade-city', action:'authorize', owner:true };
  assert.equal((await workspaceAction(db,user,sid,body)).owner, true);
  db.rows.admin_profiles[0].role = 'admin';
  assert.deepEqual(await workspaceAction(db,user,sid,body), {
    authorized:true, owner:false, user_id:user.id, session_id:sid, expires_at,
  });
});

test('locking remains available after the shared read rate limit is exhausted', async () => {
  const db=database();
  db.rpc=async (name)=>({data:name==='project_workspace_session_active',error:null});
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'trade-city',action:'status'}), /Too many attempts/);
  assert.deepEqual(await workspaceAction(db,user,sid,{project:'trade-city',action:'lock'}), {unlocked:false});
});

test('HTTP handler verifies the exact bearer before decoding its session, including wrong-project tokens', async () => {
  const db=database();
  const jwt=`a.${Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')}.signed`;
  let seenToken; let reject=false;
  db.auth={getUser:async(token)=>{seenToken=token;return reject?{data:{user:null},error:{status:401}}:{data:{user},error:null};}};
  const handler=workspaceHandler(()=>db,['https://codecity.ai']);
  const makeRequest=(token=jwt,body={action:'status',project:'trade-city'},extra={})=>new Request('https://codecity.example.test/function',{
    method:'POST',headers:{'content-type':'application/json',Origin:'https://codecity.ai',Authorization:`Bearer ${token}`,apikey:'test-publishable',...extra},body:JSON.stringify(body),
  });
  const status=await handler(makeRequest());
  assert.equal(status.status,200);assert.equal(seenToken,jwt);
  assert.equal(status.headers.get('Cache-Control'),'no-store');
  assert.equal(status.headers.get('Access-Control-Allow-Origin'),'https://codecity.ai');
  reject=true;
  assert.equal((await handler(makeRequest('foreign-project-token'))).status,401);
  assert.equal(seenToken,'foreign-project-token');
  reject=false;
  assert.equal((await handler(makeRequest('malformed'))).status,401);
  assert.equal((await handler(makeRequest(jwt,{action:'status',project:'trade-city'},{Origin:'https://evil.example'}))).status,403);
  assert.equal((await handler(makeRequest(jwt,{}, {Authorization:''}))).status,401);
  assert.equal((await handler(makeRequest(jwt,{code:'x'.repeat(3000)}))).status,413);
  assert.equal((await handler(makeRequest(jwt,{}, {'content-type':'text/plain'}))).status,415);
  assert.equal((await handler(new Request('https://example.test',{method:'GET'}))).status,405);
});

test('HTTP authorize fails closed for storage and Auth outages without exposing internal detail', async () => {
  const jwt=`a.${Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')}.signed`;
  const request=()=>new Request('https://example.test',{method:'POST',headers:{Authorization:`Bearer ${jwt}`,'content-type':'application/json'},body:JSON.stringify({project:'trade-city',action:'authorize'})});
  const db=database();db.auth={getUser:async()=>({data:{user},error:null})};
  db.rpc=async()=>({data:null,error:{message:'private database connection'}});
  const response=await workspaceHandler(()=>db,[])(request());
  assert.equal(response.status,503);assert.ok(!(await response.text()).includes('private database'));
  db.auth.getUser=async()=>({data:{user:null},error:{status:503}});
  assert.equal((await workspaceHandler(()=>db,[])(request())).status,503);
});

test('HTTP content type must be JSON, not a prefix match; parameters remain supported', async () => {
  const jwt = `a.${Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')}.signed`;
  const db = database();
  let verifications = 0;
  db.auth = { getUser: async () => { verifications++; return { data: { user }, error: null }; } };
  const handler = workspaceHandler(() => db, []);
  const request = (contentType) => new Request('https://example.test', {
    method: 'POST', headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': contentType },
    body: JSON.stringify({ project: 'trade-city', action: 'status' }),
  });
  for (const type of ['application/jsonp', 'application/json-invalid', 'application/json-seq']) {
    assert.equal((await handler(request(type))).status, 415);
  }
  assert.equal(verifications, 0);
  for (const type of ['application/json', 'Application/JSON; charset=utf-8', 'application/json ; charset=UTF-8']) {
    assert.equal((await handler(request(type))).status, 200);
  }
  assert.equal(verifications, 3);
});

test('HTTP authorization ignores caller identity and expiry claims; reads cannot refresh or replay an expired grant', async () => {
  const otherUser = { id: '44444444-4444-4444-8444-444444444444', email: 'other@example.test' };
  const jwt = `a.${Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')}.signed`;
  const db = database();
  db.rows.admin_profiles.push({ user_id: otherUser.id, role: 'admin', is_active: true });
  const expires_at = new Date(Date.now() + 60_000).toISOString();
  db.rows.project_workspace_codes.push({ project: 'orc', revision: 'current' });
  const grant = { user_id: user.id, session_id: sid, project: 'orc', revision: 'current', expires_at };
  db.rows.project_workspace_grants.push(grant);
  let principal = otherUser;
  db.auth = { getUser: async () => ({ data: { user: principal }, error: null }) };
  const handler = workspaceHandler(() => db, []);
  const request = (action = 'authorize') => new Request('https://example.test', {
    method: 'POST', headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: 'orc', action, user_id: user.id, session_id: sid, revision: 'current', expires_at: '2099-01-01', authorized: true }),
  });
  assert.equal((await handler(request())).status, 403);
  principal = user;
  for (const action of ['status', 'authorize', 'authorize']) {
    const response = await handler(request(action));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).expires_at, expires_at);
    assert.equal(grant.expires_at, expires_at);
  }
  grant.expires_at = '2001-01-01';
  assert.equal((await handler(request())).status, 403);
  assert.equal((await (await handler(request('status'))).json()).unlocked, false);
  assert.equal(grant.expires_at, '2001-01-01');
});

test('Mailgun failure never grants access or exposes private input in HTTP responses and logs', async (t) => {
  const jwt = `a.${Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')}.signed`;
  const logs = [];
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, (...args) => logs.push(args));
  t.mock.method(globalThis, 'fetch', async () => { throw new Error([code, jwt, env.MAILGUN_API_KEY].join(' ')); });
  const db = database();
  const salt = newSalt();
  db.rows.project_workspace_codes.push({ project: 'orc', salt, code_hash: await hashCode(code, salt), revision: 'current' });
  db.auth = { getUser: async () => ({ data: { user }, error: null }) };
  const response = await workspaceHandler(() => db, [])(new Request('https://example.test', {
    method: 'POST', headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: 'orc', action: 'unlock', code }),
  }));
  assert.equal(response.status, 503);
  const output = await response.text();
  for (const secret of [code, jwt, env.MAILGUN_API_KEY]) assert.ok(!output.includes(secret));
  assert.deepEqual(logs, []);
  assert.equal(grantValid(db.rows.project_workspace_grants[0], 'current'), false);
});

test('modern Supabase context validates the publishable key before exact user verification; preflight needs no credentials', async () => {
  const jwt=`a.${Buffer.from(JSON.stringify({session_id:sid})).toString('base64url')}.signed`;
  const request=()=>new Request('https://example.test',{method:'POST',headers:{Authorization:`Bearer ${jwt}`,apikey:'public-test-key','content-type':'application/json',Origin:'https://codecity.ai'},body:JSON.stringify({project:'trade-city',action:'status'})});
  const db=database(); const steps=[]; let rejectKey=false;
  db.auth={getUser:async(token)=>{steps.push('user');assert.equal(token,jwt);return {data:{user},error:null};}};
  const resolveContext=async(req,options)=>{
    steps.push('context');assert.equal(req.headers.get('apikey'),'public-test-key');assert.deepEqual(options,{auth:'publishable'});
    return rejectKey?{data:null,error:{status:401,message:'private context error'}}:{data:{supabaseAdmin:db},error:null};
  };
  const handler=workspaceHandler(workspaceContextAdmin(resolveContext),['https://codecity.ai']);
  const preflight=await handler(new Request('https://example.test',{method:'OPTIONS',headers:{Origin:'https://codecity.ai'}}));
  assert.equal(preflight.status,204);assert.deepEqual(steps,[]);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://codecity.ai');
  assert.equal((await handler(request())).status,200);assert.deepEqual(steps,['context','user']);
  steps.length=0;rejectKey=true;
  const denied=await handler(request());assert.equal(denied.status,401);assert.deepEqual(steps,['context']);
  assert.ok(!(await denied.text()).includes('private context error'));
});

test('lock fences an unlock waiting for Mailgun; only a fresh later unlock can grant access', async (t) => {
  const db=database();
  const salt=newSalt();
  db.rows.project_workspace_codes.push({project:'trade-city',salt,code_hash:await hashCode(code,salt),revision:crypto.randomUUID()});
  let releaseMail;
  let enterMail;
  const mailEntered=new Promise((resolve)=>{enterMail=resolve;});
  const mailReleased=new Promise((resolve)=>{releaseMail=resolve;});
  t.mock.method(globalThis,'fetch',async()=>{enterMail();await mailReleased;return Response.json({id:'fixture-message'});});
  const pending=workspaceAction(db,user,sid,{project:'trade-city',action:'unlock',code});
  await mailEntered;
  const previousGeneration=db.rows.project_workspace_grants[0].generation;
  assert.deepEqual(await workspaceAction(db,user,sid,{project:'trade-city',action:'lock'}),{unlocked:false});
  assert.notEqual(db.rows.project_workspace_grants[0].generation,previousGeneration);
  releaseMail();
  await assert.rejects(()=>pending,(error)=>error.status===409 && error.code==='workspace_locked');
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'trade-city',action:'authorize'}), /Enter your access code/);
  assert.equal((await workspaceAction(db,user,sid,{project:'trade-city',action:'unlock',code})).unlocked,true);
  assert.equal((await workspaceAction(db,user,sid,{project:'trade-city',action:'authorize'})).authorized,true);
});

test('role removal during Mailgun verification prevents the pending grant', async (t) => {
  const db=database();const salt=newSalt();
  db.rows.project_workspace_codes.push({project:'trade-city',salt,code_hash:await hashCode(code,salt),revision:crypto.randomUUID()});
  t.mock.method(globalThis,'fetch',async()=>{db.rows.admin_profiles[0].is_active=false;return Response.json({id:'fixture-message'});});
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'trade-city',action:'unlock',code}),(error)=>error.status===409);
  assert.equal(grantValid(db.rows.project_workspace_grants[0],db.rows.project_workspace_codes[0].revision),false);
});

test('project codes and grants remain separate; Code City preserves existing viewer access while Trade City requires admin', async (t) => {
  t.mock.method(globalThis,'fetch',async()=>Response.json({id:'fixture-message'}));
  const db=database();
  await workspaceAction(db,user,sid,{project:'trade-city',action:'configure',code});
  await workspaceAction(db,user,sid,{project:'code-city',action:'configure',code:'client-workspace-code'});
  await workspaceAction(db,user,sid,{project:'code-city',action:'unlock',code:'client-workspace-code'});
  assert.equal((await workspaceAction(db,user,sid,{project:'code-city',action:'authorize'})).authorized,true);
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'trade-city',action:'authorize'}), /Enter your access code/);
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'trade-city',action:'unlock',code:'client-workspace-code'}), /not accepted/);
  db.rows.admin_profiles[0].role='viewer';
  assert.equal((await workspaceAction(db,user,sid,{project:'code-city',action:'authorize'})).authorized,true);
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'trade-city',action:'status'}), /active administrator/);
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'code-city',action:'configure',code:'attempted-overwrite'}), /Only the workspace owner/);
});

test('ORC reuses owner setup and Mailgun while codes, grants and rotation stay project scoped', async (t) => {
  const notices=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{notices.push(options.body);return Response.json({id:'fixture-message'});});
  const db=database();
  const orcCode='owner-orc-code-2026';
  await workspaceAction(db,user,sid,{project:'orc',action:'configure',code:orcCode});
  assert.equal(notices[0].get('subject'),'Code City · ORC code changed');
  assert.equal(notices[0].get('to'),'dev@codecity.ai');
  assert.ok(!notices[0].get('text').includes(orcCode));
  for(const project of ['trade-city','code-city']){
    const salt=newSalt();
    db.rows.project_workspace_codes.push({project,salt,code_hash:await hashCode(code,salt),revision:crypto.randomUUID()});
  }
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'orc',action:'unlock',code}),/not accepted/);
  await workspaceAction(db,user,sid,{project:'orc',action:'unlock',code:orcCode});
  assert.equal(notices[1].get('subject'),'Code City · ORC access requested');
  assert.equal((await workspaceAction(db,user,sid,{project:'orc',action:'authorize'})).authorized,true);
  for(const project of ['trade-city','code-city']){
    await assert.rejects(()=>workspaceAction(db,user,sid,{project,action:'authorize'}),/Enter your access code/);
    const record=db.rows.project_workspace_codes.find((item)=>item.project===project);
    db.rows.project_workspace_grants.push({user_id:user.id,session_id:sid,project,revision:record.revision,expires_at:new Date(Date.now()+3600000).toISOString()});
  }
  await workspaceAction(db,user,sid,{project:'orc',action:'configure',current_code:orcCode,code:'replacement-orc-code'});
  await assert.rejects(()=>workspaceAction(db,user,sid,{project:'orc',action:'authorize'}),/Enter your access code/);
  for(const project of ['trade-city','code-city']) assert.equal((await workspaceAction(db,user,sid,{project,action:'authorize'})).authorized,true);
});

test('ORC requires an active owner/admin; admins cannot configure and CRM staff permissions remain separate', async () => {
  for(const role of ['owner','admin','agent','viewer']){
    assert.equal(canAccessProject({role,is_active:true},'orc'),['owner','admin'].includes(role));
    assert.equal(canAccessProject({role,is_active:false},'orc'),false);
    assert.equal(canAccessProject({role,is_active:true},'code-city'),true);
  }
  assert.equal(canAccessProject({role:'owner',is_active:true},'unknown'),false);
  assert.equal(canAccessProject({role:'owner',is_active:true},'__proto__'),false);
  const admin=database('admin');
  await assert.rejects(()=>workspaceAction(admin,user,sid,{project:'orc',action:'configure',code}),/Only the workspace owner/);
  for(const role of ['agent','viewer']){
    const db=database(role);
    for(const action of ['status','authorize','configure','unlock','lock']){
      await assert.rejects(()=>workspaceAction(db,user,sid,{project:'orc',action,code}),(error)=>error.status===403 && error.code==='workspace_role_denied');
    }
  }
});

test('ORC authorization cannot reuse another project, session, stale revision or revoked identity', async () => {
  const db=database();
  const expires_at=new Date(Date.now()+3600000).toISOString();
  db.rows.project_workspace_codes.push({project:'orc',revision:'orc-current'},{project:'trade-city',revision:'trade-current'});
  db.rows.project_workspace_grants.push({user_id:user.id,session_id:sid,project:'trade-city',revision:'trade-current',expires_at});
  const body={project:'orc',action:'authorize'};
  await assert.rejects(()=>workspaceAction(db,user,sid,body),(error)=>error.code==='workspace_locked');
  const grant={user_id:user.id,session_id:sid,project:'orc',revision:'orc-current',expires_at};
  db.rows.project_workspace_grants.push(grant);
  assert.deepEqual(await workspaceAction(db,user,sid,body),{authorized:true,owner:true,user_id:user.id,session_id:sid,expires_at});
  await assert.rejects(()=>workspaceAction(db,user,'33333333-3333-4333-8333-333333333333',body),(error)=>error.code==='workspace_locked');
  grant.revision='old';await assert.rejects(()=>workspaceAction(db,user,sid,body),(error)=>error.code==='workspace_locked');
  grant.revision='orc-current';grant.expires_at='2001-01-01';
  await assert.rejects(()=>workspaceAction(db,user,sid,body),(error)=>error.code==='workspace_locked');
  grant.expires_at=expires_at;db.rows.admin_profiles[0].is_active=false;
  await assert.rejects(()=>workspaceAction(db,user,sid,body),(error)=>error.code==='workspace_role_denied');
  db.rows.admin_profiles[0].is_active=true;
  const rpc=db.rpc;db.rpc=(name,args)=>name==='project_workspace_session_active'?Promise.resolve({data:false,error:null}):rpc(name,args);
  await assert.rejects(()=>workspaceAction(db,user,sid,body),(error)=>error.code==='workspace_session_invalid');
});
