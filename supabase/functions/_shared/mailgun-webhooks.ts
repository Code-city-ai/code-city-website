export const MAILGUN_WEBHOOK_MAX_BODY_BYTES = 256 * 1024;
export const MAILGUN_WEBHOOK_MAX_AGE_SECONDS = 24 * 60 * 60;
export const MAILGUN_WEBHOOK_MAX_FUTURE_SECONDS = 5 * 60;

export const MAILGUN_WEBHOOK_DOMAIN = 'mg.codecity.ai';

export const MAILGUN_WEBHOOK_RECIPIENTS = new Set([
  'dev@codecity.ai',
  'aytamzid@airdropja.com',
]);

const DELIVERY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_SHA256_PATTERN = /^[0-9a-f]{64}$/i;

export type MailgunWebhookEventType = 'accepted' | 'delivered' | 'failed';
export type MailgunWebhookSeverity = 'temporary' | 'permanent' | null;

export type NormalizedMailgunWebhookEvent = {
  tokenHash: string;
  eventId: string;
  domain: string;
  deliveryId: string;
  recipient: string;
  providerMessageId: string;
  eventType: MailgunWebhookEventType;
  severity: MailgunWebhookSeverity;
  providerEventAt: string;
  failureDetail: string | null;
};

export class MailgunWebhookRejection extends Error {
  constructor(message = 'The Mailgun webhook request was rejected.') {
    super(message);
    this.name = 'MailgunWebhookRejection';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const requireRecord = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) throw new MailgunWebhookRejection();
  return value;
};

const requireBoundedString = (
  value: unknown,
  maxLength: number,
  pattern?: RegExp,
): string => {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new MailgunWebhookRejection();
  }
  if (/[\r\n\0]/.test(value) || (pattern && !pattern.test(value))) {
    throw new MailgunWebhookRejection();
  }
  return value;
};

const textEncoder = new TextEncoder();

const bytesToHex = (bytes: Uint8Array) => Array.from(
  bytes,
  (byte) => byte.toString(16).padStart(2, '0'),
).join('');

const hexToBytes = (hex: string) => {
  if (!HEX_SHA256_PATTERN.test(hex)) throw new MailgunWebhookRejection();
  const result = new Uint8Array(hex.length / 2);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return result;
};

// Both inputs are a fixed 32 bytes before this function is called. The loop
// intentionally never returns early, so a mismatched byte does not reveal its
// position through comparison timing.
const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};

const importHmacKey = (signingKey: string) => crypto.subtle.importKey(
  'raw',
  textEncoder.encode(signingKey),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign'],
);

export const hashMailgunWebhookToken = async (token: string) => bytesToHex(
  new Uint8Array(await crypto.subtle.digest('SHA-256', textEncoder.encode(token))),
);

export const verifyMailgunWebhookSignature = async (
  timestamp: string,
  token: string,
  suppliedSignature: string,
  signingKey: string,
  nowMilliseconds = Date.now(),
) => {
  requireBoundedString(timestamp, 20, /^\d+$/);
  requireBoundedString(token, 1024);
  requireBoundedString(suppliedSignature, 64, HEX_SHA256_PATTERN);
  requireBoundedString(signingKey, 512);

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(nowMilliseconds / 1000);
  if (!Number.isSafeInteger(timestampSeconds) || timestampSeconds <= 0) {
    throw new MailgunWebhookRejection();
  }
  if (
    nowSeconds - timestampSeconds > MAILGUN_WEBHOOK_MAX_AGE_SECONDS
    || timestampSeconds - nowSeconds > MAILGUN_WEBHOOK_MAX_FUTURE_SECONDS
  ) {
    throw new MailgunWebhookRejection();
  }

  const key = await importHmacKey(signingKey);
  const expectedSignature = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(`${timestamp}${token}`),
  ));
  const suppliedSignatureBytes = hexToBytes(suppliedSignature);

  if (!constantTimeEqual(expectedSignature, suppliedSignatureBytes)) {
    throw new MailgunWebhookRejection();
  }
};

const normalizeFailureDetail = (eventData: Record<string, unknown>) => {
  const deliveryStatus = isRecord(eventData['delivery-status'])
    ? eventData['delivery-status']
    : null;
  const candidates = [
    deliveryStatus?.description,
    deliveryStatus?.message,
    eventData.reason,
  ];
  const detail = candidates.find((value) => typeof value === 'string');
  if (typeof detail !== 'string') return null;

  const normalized = detail
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  return normalized || null;
};

const normalizeEventType = (eventData: Record<string, unknown>) => {
  const eventType = requireBoundedString(eventData.event, 30).toLowerCase();
  if (!['accepted', 'delivered', 'failed'].includes(eventType)) {
    throw new MailgunWebhookRejection();
  }

  if (eventType !== 'failed') {
    return {
      eventType: eventType as 'accepted' | 'delivered',
      severity: null,
      failureDetail: null,
    };
  }

  const severity = requireBoundedString(eventData.severity, 20).toLowerCase();
  if (!['temporary', 'permanent'].includes(severity)) {
    throw new MailgunWebhookRejection();
  }
  return {
    eventType: 'failed' as const,
    severity: severity as 'temporary' | 'permanent',
    failureDetail: normalizeFailureDetail(eventData),
  };
};

const normalizeProviderTimestamp = (value: unknown) => {
  const timestamp = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)
      ? Number(value)
      : Number.NaN;
  const milliseconds = timestamp * 1000;
  if (!Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(milliseconds)) {
    throw new MailgunWebhookRejection();
  }
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) throw new MailgunWebhookRejection();
  return date.toISOString();
};

const normalizeMailgunEvent = (
  eventDataValue: unknown,
  tokenHash: string,
): NormalizedMailgunWebhookEvent => {
  const eventData = requireRecord(eventDataValue);
  // Current Mailgun payloads identify the sending domain as
  // `domain: { name: "..." }`. Accept the former string form as well so the
  // verifier remains compatible with provider events already in retry queues.
  const domainValue = isRecord(eventData.domain)
    ? eventData.domain.name
    : eventData.domain;
  const domain = requireBoundedString(domainValue, 253).trim().toLowerCase();
  if (domain !== MAILGUN_WEBHOOK_DOMAIN) throw new MailgunWebhookRejection();

  const recipient = requireBoundedString(eventData.recipient, 320).trim().toLowerCase();
  if (!MAILGUN_WEBHOOK_RECIPIENTS.has(recipient)) throw new MailgunWebhookRejection();

  const userVariables = requireRecord(eventData['user-variables']);
  const deliveryId = requireBoundedString(
    userVariables.delivery_id,
    36,
    DELIVERY_ID_PATTERN,
  ).toLowerCase();

  const message = requireRecord(eventData.message);
  const headers = requireRecord(message.headers);
  const providerMessageId = requireBoundedString(headers['message-id'], 500);
  const eventId = requireBoundedString(eventData.id, 500);
  const providerEventAt = normalizeProviderTimestamp(eventData.timestamp);
  const event = normalizeEventType(eventData);

  return {
    tokenHash,
    eventId,
    domain,
    deliveryId,
    recipient,
    providerMessageId,
    eventType: event.eventType,
    severity: event.severity,
    providerEventAt,
    failureDetail: event.failureDetail,
  };
};

export const verifyAndNormalizeMailgunWebhook = async (
  payloadValue: unknown,
  signingKey: string,
  nowMilliseconds = Date.now(),
) => {
  const payload = requireRecord(payloadValue);
  const signature = requireRecord(payload.signature);
  const timestamp = requireBoundedString(signature.timestamp, 20, /^\d+$/);
  const token = requireBoundedString(signature.token, 1024);
  const suppliedSignature = requireBoundedString(
    signature.signature,
    64,
    HEX_SHA256_PATTERN,
  );

  await verifyMailgunWebhookSignature(
    timestamp,
    token,
    suppliedSignature,
    signingKey,
    nowMilliseconds,
  );
  const tokenHash = await hashMailgunWebhookToken(token);
  return normalizeMailgunEvent(payload['event-data'], tokenHash);
};

export const readBoundedJsonBody = async (
  request: Request,
  maximumBytes = MAILGUN_WEBHOOK_MAX_BODY_BYTES,
): Promise<unknown> => {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0 || declaredBytes > maximumBytes) {
      throw new MailgunWebhookRejection();
    }
  }

  if (!request.body) throw new MailgunWebhookRejection();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maximumBytes) throw new MailgunWebhookRejection();
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    throw new MailgunWebhookRejection();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MailgunWebhookRejection();
  }
};
