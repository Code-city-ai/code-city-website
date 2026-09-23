import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Webhook } from 'standardwebhooks';
import { authEmailHandler } from '../../supabase/functions/_shared/auth-email.ts';

// Synthetic signing material and token hashes; this suite never sends email.
const secret = `whsec_${Buffer.from('test-only-signing-key-32-bytes!!!!').toString('base64')}`;
const authOrigin = 'https://yfpcjxkyjftkekwkekrz.supabase.co';
const hash = 'a'.repeat(56);
const secondHash = 'b'.repeat(56);
const fixture = (action = 'recovery', overrides = {}) => ({
  user: { email: 'dev@codecity.ai', new_email: 'tradecity.MC@proton.me' },
  email_data: {
    email_action_type: action, token_hash: hash, token: '123456',
    redirect_to: 'https://codecity.ai/sign-in', site_url: 'https://attacker.example',
    ...overrides,
  },
});
const signedRequest = (payload, options = {}) => {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const timestamp = options.timestamp ?? new Date();
  const headers = {
    'content-type': 'application/json',
    'webhook-id': 'msg_test_auth_email',
    'webhook-timestamp': `${Math.floor(timestamp.getTime() / 1000)}`,
    'webhook-signature': new Webhook(secret).sign('msg_test_auth_email', timestamp, body),
    ...options.headers,
  };
  return new Request(`${authOrigin}/functions/v1/auth-email`, {
    method: 'POST', headers, body: options.body ?? body,
  });
};
const context = (overrides = {}) => {
  const deliveries = [];
  const options = {
    verify: (body, headers, key) => new Webhook(key).verify(body, headers),
    hookSecret: `v1,${secret}`,
    supabaseUrl: authOrigin,
    mailgunConfig: {
      apiKey: 'test-mailgun-api-key', domain: 'mg.example.test',
      from: 'Code City <noreply@example.test>', apiBase: 'https://api.mailgun.net',
    },
    fetch: async (url, request) => {
      deliveries.push({ url, request, fields: Object.fromEntries(request.body.entries()) });
      return Response.json({ id: 'test-only-message-id' });
    },
    ...overrides,
  };
  return { deliveries, options, handle: (request) => authEmailHandler(request, options) };
};
const linkIn = (delivery) => new URL(delivery.fields.text.split('\n').find((line) => line.startsWith(authOrigin)));

test('signed recovery and invite use fixed password setup link and existing Mailgun API without tracking', async () => {
  for (const action of ['recovery', 'invite']) {
    const ctx = context();
    const response = await ctx.handle(signedRequest(fixture(action, { redirect_to: 'https://attacker.example/steal' })));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {});
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(ctx.deliveries.length, 1);
    const delivery = ctx.deliveries[0];
    const link = linkIn(delivery);
    assert.equal(link.origin, authOrigin);
    assert.equal(link.pathname, '/auth/v1/verify');
    assert.equal(link.searchParams.get('redirect_to'), 'https://codecity.ai/admin/set-password');
    assert.equal(link.searchParams.get('token'), hash);
    assert.equal(link.searchParams.get('type'), action);
    assert.equal(delivery.url, 'https://api.mailgun.net/v3/mg.example.test/messages');
    assert.equal(delivery.fields.to, 'dev@codecity.ai');
    assert.equal(delivery.fields['o:tracking'], 'no');
    assert.equal(delivery.fields['o:tracking-clicks'], 'no');
    assert.equal(delivery.fields['o:tracking-opens'], 'no');
    assert.match(delivery.fields.text, /save your new password in Dashlane, Proton Pass, or another password manager/);
    assert.match(delivery.fields.text, /Code City will never email your password/);
    assert.equal(delivery.request.redirect, 'error');
    assert.ok(delivery.request.signal instanceof AbortSignal);
    assert.equal(delivery.request.headers.Authorization, `Basic ${btoa('api:test-mailgun-api-key')}`);
    assert.ok(!delivery.fields.text.includes('123456'));
    assert.ok(!delivery.fields.text.includes('attacker.example'));
  }
});

test('all three approved administrators can receive setup mail, and nobody else can', async () => {
  for (const email of ['dev@codecity.ai', 'Hugosan8210@gmail.com', 'tradecity.MC@proton.me']) {
    const payload = fixture('invite');
    payload.user.email = email;
    const ctx = context();
    assert.equal((await ctx.handle(signedRequest(payload))).status, 200);
    assert.equal(ctx.deliveries.length, 1);
    assert.equal(ctx.deliveries[0].fields.to, email);
    assert.match(ctx.deliveries[0].fields.text, /Dashlane, Proton Pass/);
  }
  for (const action of ['signup', 'recovery', 'invite', 'magiclink', 'email_change']) {
    const payload = fixture(action);
    payload.user.email = 'outsider@example.test';
    const ctx = context();
    assert.equal((await ctx.handle(signedRequest(payload))).status, 422);
    assert.equal(ctx.deliveries.length, 0);
  }
  const payload = fixture('email_change', { token_hash_new: secondHash });
  payload.user.new_email = 'outsider@example.test';
  const ctx = context();
  assert.equal((await ctx.handle(signedRequest(payload))).status, 422);
  assert.equal(ctx.deliveries.length, 0);
});

test('signup and magiclink retain correct verification types and safe Code City destinations', async () => {
  for (const action of ['signup', 'magiclink']) {
    for (const redirect of ['', 'https://codecity.ai/sign-in', 'https://codecity.ai/admin/set-password']) {
      const ctx = context();
      const response = await ctx.handle(signedRequest(fixture(action, { redirect_to: redirect })));
      assert.equal(response.status, 200);
      const link = linkIn(ctx.deliveries[0]);
      assert.equal(link.searchParams.get('type'), action);
      assert.equal(link.searchParams.get('redirect_to'), redirect || 'https://codecity.ai/sign-in');
    }
  }
});

test('signed email changes cannot transfer an approved identity to another inbox', async () => {
  for (const payload of [
    fixture('email_change'),
    fixture('email_change', { token_hash_new: secondHash, token_new: '654321' }),
    { ...fixture('email_change'), user: { email: 'dev@codecity.ai', new_email: 'outsider@example.test' } },
  ]) {
    const ctx = context();
    const response = await ctx.handle(signedRequest(payload));
    assert.equal(response.status, 422);
    assert.equal(ctx.deliveries.length, 0);
  }
});

test('real StandardWebhooks rejects body alteration, bad keys, expired and future signatures', async () => {
  const input = fixture();
  const variants = [
    signedRequest(input, { body: JSON.stringify({ ...input, user: { email: 'attacker@example.test' } }) }),
    signedRequest(input, { headers: { 'webhook-signature': 'v1,ZmFrZQ==' } }),
    signedRequest(input, { timestamp: new Date(Date.now() - 301_000) }),
    signedRequest(input, { timestamp: new Date(Date.now() + 301_000) }),
    signedRequest(input, { headers: { 'webhook-id': 'different-id' } }),
    signedRequest(input, { headers: { 'webhook-signature': '' } }),
    signedRequest(input, { headers: { 'webhook-signature': 'x'.repeat(1025) } }),
  ];
  for (const request of variants) {
    const ctx = context();
    assert.equal((await ctx.handle(request)).status, 401);
    assert.equal(ctx.deliveries.length, 0);
  }
});

test('versioned signature list accepts the matching current key', async () => {
  const request = signedRequest(fixture());
  request.headers.set('webhook-signature', `v1,ZmFrZQ== ${request.headers.get('webhook-signature')}`);
  const ctx = context({ hookSecret: secret });
  assert.equal((await ctx.handle(request)).status, 200);
});

test('redirect injection and off-origin destinations fail before delivery', async () => {
  for (const redirect of [
    'https://attacker.example/', 'https://codecity.ai.attacker.example/sign-in',
    'https://codecity.ai@attacker.example/sign-in', 'https://attacker@codecity.ai/sign-in',
    'http://codecity.ai/sign-in', '//attacker.example', 'https://codecity.ai:8443/sign-in',
    'https://codecity.ai/sign-in?next=https://attacker.example',
    'https://codecity.ai/sign-in#https://attacker.example',
    'https://codecity.ai/unknown-path', 'https://codecity.ai\\@attacker.example',
  ]) {
    const ctx = context();
    assert.equal((await ctx.handle(signedRequest(fixture('magiclink', { redirect_to: redirect })))).status, 422, redirect);
    assert.equal(ctx.deliveries.length, 0);
  }
});

test('malformed signed payloads, recipients, hashes and unsupported actions fail clearly', async () => {
  const variants = [null, [], {}, { user: {} }, fixture('reauthentication'), fixture('password_changed'),
    fixture('signup', { token_hash: '' }), fixture('signup', { token_hash: 'https://attacker.example' }),
    { ...fixture('signup'), user: { email: 'a@example.test,b@example.test' } },
    { ...fixture('email_change'), user: { email: 'dev@codecity.ai' } },
  ];
  for (const payload of variants) {
    const ctx = context();
    assert.equal((await ctx.handle(signedRequest(payload))).status, 422);
    assert.equal(ctx.deliveries.length, 0);
  }
  assert.equal((await context().handle(signedRequest('{malformed json'))).status, 401);
});

test('provider rejection and network failure expose no response, credential, or link data', async () => {
  for (const fetch of [
    async () => new Response('provider-secret token_hash request details', { status: 401 }),
    async () => { throw new Error(`network error test-mailgun-api-key ${hash}`); },
    async () => { throw new DOMException('Timed out', 'TimeoutError'); },
  ]) {
    const ctx = context({ fetch });
    const response = await ctx.handle(signedRequest(fixture()));
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: { http_code: 502, message: 'Auth email provider could not accept the message.' } });
  }
});

test('missing configuration and wrong Auth project fail closed', async () => {
  for (const override of [
    { hookSecret: '' }, { hookSecret: 'whsec_weak' }, { mailgunConfig: null },
    { supabaseUrl: '' }, { supabaseUrl: 'https://xqhyuecxiscrofhokyvc.supabase.co' },
  ]) {
    const ctx = context(override);
    assert.equal((await ctx.handle(signedRequest(fixture()))).status, 503);
    assert.equal(ctx.deliveries.length, 0);
  }
});

test('method, media type, declared and streamed body limits are enforced without delivery', async () => {
  for (const method of ['GET', 'PUT', 'OPTIONS']) {
    const response = await context().handle(new Request(authOrigin, { method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
  }
  for (const request of [
    signedRequest(fixture(), { headers: { 'content-length': '65537' } }),
    signedRequest('x'.repeat(65537)),
    signedRequest('é'.repeat(40000)),
  ]) {
    const ctx = context();
    assert.equal((await ctx.handle(request)).status, 413);
    assert.equal(ctx.deliveries.length, 0);
  }
  const request = signedRequest(fixture(), { headers: { 'content-type': 'text/plain' } });
  assert.equal((await context().handle(request)).status, 415);
});

test('deployed adapter uses the same pinned verifier and signature authority with JWT gateway disabled', () => {
  const adapter = readFileSync(new URL('../../supabase/functions/auth-email/index.ts', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../../supabase/config.toml', import.meta.url), 'utf8');
  assert.match(adapter, /npm:standardwebhooks@1\.0\.0/);
  assert.match(adapter, /new Webhook\(secret\)\.verify\(body, headers\)/);
  assert.match(config, /\[functions\.auth-email\]\s+verify_jwt = false/);
});
