import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attributionFingerprint,
  emptyAttribution,
  normalizeAttributionValue,
  normalizeReferrer,
  normalizeSourceUrl,
  parseAttribution,
  resolveAttributionSession,
} from '../../src/lib/attribution.js';

test('captures a complete attributed touch without inheriting missing fields', () => {
  const first = parseAttribution('?utm_source=google&utm_medium=cpc&utm_campaign=launch&utm_content=hero', '', '2026-08-28T12:00:00.000Z');
  const next = parseAttribution('?utm_source=linkedin&utm_campaign=enterprise', '', '2026-08-28T12:05:00.000Z');

  assert.equal(first.utmContent, 'hero');
  assert.equal(next.utmSource, 'linkedin');
  assert.equal(next.utmMedium, '');
  assert.equal(next.utmContent, '');
  assert.notEqual(first.fingerprint, next.fingerprint);
});

test('infers source for Google, Microsoft, and TikTok click identifiers', () => {
  assert.equal(parseAttribution('?gclid=CaseSensitiveABC').utmSource, 'google');
  assert.equal(parseAttribution('?msclkid=Ms-Case-123').utmSource, 'microsoft_ads');
  assert.equal(parseAttribution('?ttclid=TikTok-Case-123').utmSource, 'tiktok');
});

test('does not claim that fbclid alone is paid Meta traffic', () => {
  const touch = parseAttribution('?fbclid=OpaqueValue');
  assert.equal(touch.attributionPresent, true);
  assert.equal(touch.utmSource, '');
  assert.equal(touch.utmMedium, '');
});

test('preserves opaque click identifier case', () => {
  const touch = parseAttribution('?gclid=AbC-123-XyZ&msclkid=KeepThisCase');
  assert.equal(touch.gclid, 'AbC-123-XyZ');
  assert.equal(touch.msclkid, 'KeepThisCase');
});

test('represents a direct touch with a stable empty fingerprint', () => {
  const direct = emptyAttribution('https://example.com/');
  assert.equal(direct.attributionPresent, false);
  assert.equal(direct.fingerprint, attributionFingerprint(null));
  assert.equal(direct.referrer, 'https://example.com/');
});

test('strips query strings and fragments from referrers before persistence', () => {
  assert.equal(
    normalizeReferrer('https://example.com/search?q=private-token#result'),
    'https://example.com/search',
  );
  assert.equal(normalizeReferrer('javascript:alert(1)'), '');
});

test('strips campaign parameters from inquiry source URLs before transport', () => {
  assert.equal(
    normalizeSourceUrl(`https://codecity.ai/contact?utm_campaign=${'x'.repeat(1000)}#form`),
    'https://codecity.ai/contact',
  );
});

test('bounds optional campaign fields without changing opaque identifier case', () => {
  assert.equal(normalizeAttributionValue('utmSource', 'x'.repeat(500)).length, 120);
  assert.equal(normalizeAttributionValue('gclid', `AbC${'X'.repeat(500)}`).length, 255);
  assert.ok(normalizeAttributionValue('gclid', 'AbC-123').startsWith('AbC'));
});

test('reuses the original capture time when the same campaign persists in an active session', () => {
  const firstTouch = {
    ...parseAttribution('?utm_source=google&utm_campaign=launch', '', '2026-08-28T12:00:00.000Z'),
    sessionId: 'session-1',
    version: 2,
  };
  const resolved = resolveAttributionSession({
    currentSession: { id: 'session-1', startedAt: 100, lastActivityAt: 200 },
    storedTouch: firstTouch,
    incomingTouch: parseAttribution('?utm_source=google&utm_campaign=launch', '', '2026-08-28T12:05:00.000Z'),
    now: 300,
    newSessionId: 'session-2',
    timeoutMs: 1_000,
  });

  assert.equal(resolved.session.id, 'session-1');
  assert.equal(resolved.touch.attributionCapturedAt, '2026-08-28T12:00:00.000Z');
  assert.equal(resolved.touchOccurred, false);
  assert.equal(resolved.isNew, false);
});

test('starts a new session and records a new touch when the campaign changes', () => {
  const firstTouch = {
    ...parseAttribution('?utm_source=google&utm_campaign=launch', '', '2026-08-28T12:00:00.000Z'),
    sessionId: 'session-1',
    version: 2,
  };
  const resolved = resolveAttributionSession({
    currentSession: { id: 'session-1', startedAt: 100, lastActivityAt: 200 },
    storedTouch: firstTouch,
    incomingTouch: parseAttribution('?utm_source=linkedin&utm_campaign=enterprise', '', '2026-08-28T12:05:00.000Z'),
    now: 300,
    newSessionId: 'session-2',
    timeoutMs: 1_000,
  });

  assert.equal(resolved.session.id, 'session-2');
  assert.equal(resolved.touch.utmSource, 'linkedin');
  assert.equal(resolved.touchOccurred, true);
  assert.equal(resolved.isNew, true);
});

test('does not carry a paid touch into an expired direct session', () => {
  const storedTouch = {
    ...parseAttribution('?gclid=PaidClick', '', '2026-08-28T12:00:00.000Z'),
    sessionId: 'session-1',
    version: 2,
  };
  const resolved = resolveAttributionSession({
    currentSession: { id: 'session-1', startedAt: 100, lastActivityAt: 200 },
    storedTouch,
    incomingTouch: parseAttribution('', 'https://example.com/', '2026-08-28T13:00:00.000Z'),
    now: 2_000,
    newSessionId: 'session-2',
    timeoutMs: 1_000,
  });

  assert.equal(resolved.session.id, 'session-2');
  assert.equal(resolved.touch.attributionPresent, false);
  assert.equal(resolved.touch.gclid, '');
  assert.equal(resolved.touchOccurred, false);
});

test('keeps a new direct session independent from an old paid touch', () => {
  const resolved = resolveAttributionSession({
    currentSession: null,
    storedTouch: {
      ...parseAttribution('?gclid=OldPaidClick', '', '2026-08-28T12:00:00.000Z'),
      sessionId: 'old-session',
      version: 2,
    },
    incomingTouch: parseAttribution('', '', '2026-08-28T13:00:00.000Z'),
    now: 1_000,
    newSessionId: 'new-session',
    timeoutMs: 1_000,
  });

  assert.equal(resolved.session.id, 'new-session');
  assert.equal(resolved.touch.attributionPresent, false);
  assert.equal(resolved.touch.attributionCapturedAt, null);
  assert.equal(resolved.touchOccurred, false);
});
