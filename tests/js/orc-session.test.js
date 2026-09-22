import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrcBrowserSession } from '../../src/admin/lib/orc-session.js';

const valid = { ok: true, location: '/orc/', expires_in: 900 };

test('ORC exchange sends only the existing session to its fixed same-origin boundary', async () => {
  let calls = 0;
  await createOrcBrowserSession('synthetic-test-session', async (url, options) => {
    calls++;
    assert.equal(url, '/orc/session');
    assert.equal(options.method, 'POST');
    assert.equal(options.mode, 'same-origin');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.body, '{}');
    assert.equal(options.headers['X-CodeCity-User-Token'], 'synthetic-test-session');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(valid);
  });
  assert.equal(calls, 1);
});

test('missing session never contacts the server', async () => {
  await assert.rejects(createOrcBrowserSession('', () => assert.fail('must not fetch')), /Sign in again/);
});

test('auth, grant, deployment and network failures stop ORC navigation', async () => {
  for (const [status, message] of [[401, /Sign in again/], [403, /access is locked/], [404, /not available/], [503, /not available/]]) {
    await assert.rejects(createOrcBrowserSession('test', async () => new Response('', { status })), message);
  }
  await assert.rejects(createOrcBrowserSession('test', async () => new Response('', { status: 403 })), { code: 'workspace_locked' });
  await assert.rejects(createOrcBrowserSession('test', async () => { throw new Error('private upstream detail'); }), /could not be reached/);
});

test('HTML fallbacks, hostile redirect targets, malformed or excessive sessions are rejected', async () => {
  const invalid = [{ ...valid, location: 'https://example.test/' }, { ...valid, expires_in: 901 }, { ...valid, expires_in: 0 }, { ...valid, expires_in: '900' }, { ...valid, ok: false }, null];
  for (const body of invalid) await assert.rejects(createOrcBrowserSession('test', async () => Response.json(body)), /secure session/);
  await assert.rejects(createOrcBrowserSession('test', async () => new Response('<html>Website fallback</html>')), /secure session/);
});
