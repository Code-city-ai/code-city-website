import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  MAILGUN_WEBHOOK_MAX_BODY_BYTES,
  MailgunWebhookRejection,
  readBoundedJsonBody,
  verifyAndNormalizeMailgunWebhook,
} from '../../supabase/functions/_shared/mailgun-webhooks.ts';

const NOW_MILLISECONDS = Date.UTC(2026, 7, 28, 18, 0, 0);
const SIGNING_KEY = 'unit-test-mailgun-signing-key';
const TIMESTAMP = String(Math.floor(NOW_MILLISECONDS / 1000));
const TOKEN = 'unit-test-webhook-token-that-is-not-persisted';
const DELIVERY_ID = 'd97113b5-a64c-4ab1-9a27-d13d9a1dd550';

const signatureFor = (timestamp, token, signingKey = SIGNING_KEY) => createHmac(
  'sha256',
  signingKey,
).update(`${timestamp}${token}`).digest('hex');

const payloadFor = ({
  event = 'delivered',
  severity,
  domain = 'mg.codecity.ai',
  recipient = 'dev@codecity.ai',
  deliveryId = DELIVERY_ID,
  timestamp = TIMESTAMP,
  token = TOKEN,
  signature = signatureFor(timestamp, token),
} = {}) => ({
  signature: { timestamp, token, signature },
  'event-data': {
    id: 'evt_mailgun_123',
    timestamp: Number(timestamp) + 0.125,
    event,
    ...(severity ? { severity } : {}),
    domain: { name: domain },
    recipient,
    message: { headers: { 'message-id': '<provider-message@mg.codecity.ai>' } },
    'user-variables': { delivery_id: deliveryId },
    'delivery-status': {
      description: '  upstream\nmailbox   response  ',
    },
  },
});

const assertRejected = async (payload, nowMilliseconds = NOW_MILLISECONDS) => {
  await assert.rejects(
    verifyAndNormalizeMailgunWebhook(payload, SIGNING_KEY, nowMilliseconds),
    MailgunWebhookRejection,
  );
};

test('valid signed delivered webhooks normalize only reconciliation fields', async () => {
  const normalized = await verifyAndNormalizeMailgunWebhook(
    payloadFor(),
    SIGNING_KEY,
    NOW_MILLISECONDS,
  );

  assert.deepEqual(normalized, {
    tokenHash: 'ea565fd6750a82bbd95409375939314545c5acf4a6f10c563f0a2f11ba89a8f9',
    eventId: 'evt_mailgun_123',
    domain: 'mg.codecity.ai',
    deliveryId: DELIVERY_ID,
    recipient: 'dev@codecity.ai',
    providerMessageId: '<provider-message@mg.codecity.ai>',
    eventType: 'delivered',
    severity: null,
    providerEventAt: '2026-08-28T18:00:00.125Z',
    failureDetail: null,
  });
  assert.equal('signature' in normalized, false);
  assert.equal('token' in normalized, false);
  assert.equal('payload' in normalized, false);
});

test('invalid, tampered, expired, and future signatures are rejected', async () => {
  const invalidSignature = payloadFor();
  invalidSignature.signature.signature = '0'.repeat(64);
  await assertRejected(invalidSignature);

  const tampered = payloadFor();
  tampered.signature.token = `${TOKEN}-tampered`;
  await assertRejected(tampered);

  const expiredTimestamp = String(Number(TIMESTAMP) - 86_401);
  await assertRejected(payloadFor({
    timestamp: expiredTimestamp,
    signature: signatureFor(expiredTimestamp, TOKEN),
  }));

  const futureTimestamp = String(Number(TIMESTAMP) + 301);
  await assertRejected(payloadFor({
    timestamp: futureTimestamp,
    signature: signatureFor(futureTimestamp, TOKEN),
  }));
});

test('unapproved domains, recipients, and malformed delivery ids are rejected', async () => {
  await assertRejected(payloadFor({ domain: 'codecity.ai' }));
  await assertRejected(payloadFor({ recipient: 'attacker@example.com' }));
  await assertRejected(payloadFor({ deliveryId: 'not-a-delivery-uuid' }));
});

test('legacy string-form domains remain compatible with signed events already in flight', async () => {
  const payload = payloadFor();
  payload['event-data'].domain = 'mg.codecity.ai';

  const normalized = await verifyAndNormalizeMailgunWebhook(
    payload,
    SIGNING_KEY,
    NOW_MILLISECONDS,
  );
  assert.equal(normalized.domain, 'mg.codecity.ai');
});

test('temporary and permanent failures retain only bounded sanitized detail', async () => {
  const temporary = await verifyAndNormalizeMailgunWebhook(
    payloadFor({ event: 'failed', severity: 'temporary' }),
    SIGNING_KEY,
    NOW_MILLISECONDS,
  );
  assert.equal(temporary.eventType, 'failed');
  assert.equal(temporary.severity, 'temporary');
  assert.equal(temporary.failureDetail, 'upstream mailbox response');

  const permanent = await verifyAndNormalizeMailgunWebhook(
    payloadFor({
      event: 'failed',
      severity: 'permanent',
      recipient: 'aytamzid@airdropja.com',
    }),
    SIGNING_KEY,
    NOW_MILLISECONDS,
  );
  assert.equal(permanent.severity, 'permanent');
  assert.equal(permanent.recipient, 'aytamzid@airdropja.com');
  assert.equal(permanent.failureDetail, 'upstream mailbox response');
});

test('request bodies are read with a hard byte bound before JSON parsing', async () => {
  const validRequest = new Request('https://example.invalid/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  });
  assert.deepEqual(await readBoundedJsonBody(validRequest), { ok: true });

  const oversizedRequest = new Request('https://example.invalid/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(MAILGUN_WEBHOOK_MAX_BODY_BYTES) }),
  });
  await assert.rejects(readBoundedJsonBody(oversizedRequest), MailgunWebhookRejection);
});

test('the Edge Function persists only normalized RPC arguments and never logs payloads', async () => {
  const source = await readFile(
    new URL('../../supabase/functions/mailgun-webhook/index.ts', import.meta.url),
    'utf8',
  );
  const expectedArguments = [
    'p_token_hash',
    'p_event_id',
    'p_domain',
    'p_delivery_id',
    'p_recipient',
    'p_provider_message_id',
    'p_event_type',
    'p_severity',
    'p_provider_event_at',
    'p_failure_detail',
  ];
  for (const argument of expectedArguments) assert.match(source, new RegExp(`${argument}:`));
  assert.match(source, /request\.method !== 'POST'/);
  assert.match(source, /MailgunWebhookRejection[\s\S]*406/);
  assert.match(source, /publicReconciliationResult\(data\)/);
  assert.doesNotMatch(source, /reconciliation:\s*data/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*(?:payload|signature|token|event)/i);
});
