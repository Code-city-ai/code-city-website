import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { processInquiryNotificationBatch } from '../_shared/inquiry-notifications.ts';

const DEFAULT_ORIGINS = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'https://codecity.ai',
  'https://www.codecity.ai',
  'https://code-city-website.vercel.app',
]);

const PROJECT_TYPES = new Set([
  'new-product',
  'existing-product',
  'mobile-app',
  'growth-system',
  'not-sure',
  'product-support',
]);

const BUDGET_RANGES = new Set([
  'under-10k',
  '10k-25k',
  '25k-75k',
  '75k-plus',
  'undecided',
]);

// The public contract is character-based. A 64 KB transport ceiling safely
// accommodates every bounded field in multibyte UTF-8 without letting an
// oversized or unknown JSON body reach parsing and database work.
const MAX_REQUEST_BYTES = 64_000;

type InquiryPayload = {
  name?: unknown;
  email?: unknown;
  organization?: unknown;
  projectType?: unknown;
  budgetRange?: unknown;
  message?: unknown;
  sourceUrl?: unknown;
  website?: unknown;
  submissionId?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  utmTerm?: unknown;
  gclid?: unknown;
  fbclid?: unknown;
  msclkid?: unknown;
  ttclid?: unknown;
  campaignExternalId?: unknown;
  adsetExternalId?: unknown;
  adExternalId?: unknown;
  attributionPresent?: unknown;
  attributionCapturedAt?: unknown;
  referrer?: unknown;
};

const jsonResponse = (body: Record<string, unknown>, status: number, origin: string) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    },
  },
);

const cleanOptionalString = (value: unknown, maxLength: number) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('INVALID_INPUT');
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new Error('INVALID_INPUT');
  return cleaned || null;
};

const cleanRequiredString = (value: unknown, minLength: number, maxLength: number) => {
  if (typeof value !== 'string') throw new Error('INVALID_INPUT');
  const cleaned = value.trim();
  if (cleaned.length < minLength || cleaned.length > maxLength) throw new Error('INVALID_INPUT');
  return cleaned;
};

const cleanOptionalUuid = (value: unknown) => {
  const cleaned = cleanOptionalString(value, 36);
  if (!cleaned) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned)) {
    throw new Error('INVALID_INPUT');
  }
  return cleaned.toLowerCase();
};

const cleanTelemetryString = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, maxLength) || null;
};

const cleanTelemetryUuid = (value: unknown) => {
  const cleaned = cleanTelemetryString(value, 36);
  return cleaned && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleaned)
    ? cleaned.toLowerCase()
    : null;
};

const cleanOptionalBoolean = (value: unknown) => {
  return typeof value === 'boolean' ? value : null;
};

const cleanOptionalTimestamp = (value: unknown) => {
  const cleaned = cleanTelemetryString(value, 50);
  if (!cleaned) return null;
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = Date.now();
  if (parsed.getTime() < now - 31 * 24 * 60 * 60 * 1000 || parsed.getTime() > now + 5 * 60 * 1000) {
    return null;
  }
  return parsed.toISOString();
};

const cleanSourceUrl = (value: unknown) => {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.search = '';
    url.hash = '';
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
};

const cleanReferrer = (value: unknown) => {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.search = '';
    url.hash = '';
    return url.toString().slice(0, 1000);
  } catch {
    return null;
  }
};

const allowedOrigins = () => {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...configured]);
};

const hashClientAddress = async (request: Request) => {
  const cloudflareAddress = request.headers.get('cf-connecting-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  const clientAddress = cloudflareAddress || forwarded || 'unknown';
  const salt = Deno.env.get('RATE_LIMIT_SALT') || '';
  if (salt.length < 32) throw new Error('MISSING_SERVER_CONFIG');
  const bytes = new TextEncoder().encode(`${salt}:${clientAddress}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const readLimitedBody = async (request: Request) => {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      byteLength += value.byteLength;
      if (byteLength > MAX_REQUEST_BYTES) {
        await reader.cancel('Request body exceeds the accepted size.').catch(() => {});
        throw new Error('REQUEST_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('INVALID_INPUT');
  }
};

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('origin')?.replace(/\/$/, '') || '';
  const origins = allowedOrigins();
  const originAllowed = origins.has(requestOrigin);
  const responseOrigin = originAllowed ? requestOrigin : 'https://codecity.ai';

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: originAllowed ? 204 : 403,
      headers: {
        'Access-Control-Allow-Origin': responseOrigin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
      },
    });
  }

  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, responseOrigin);
  if (!originAllowed) return jsonResponse({ error: 'Origin not allowed.' }, 403, responseOrigin);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) return jsonResponse({ error: 'Request is too large.' }, 413, responseOrigin);

  try {
    const body = await readLimitedBody(request);

    let decoded: unknown;
    try {
      decoded = JSON.parse(body);
    } catch {
      throw new Error('INVALID_INPUT');
    }
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      throw new Error('INVALID_INPUT');
    }
    const payload = decoded as InquiryPayload;

    if (typeof payload.website === 'string' && payload.website.trim()) {
      return jsonResponse({ ok: true }, 200, responseOrigin);
    }

    const name = cleanRequiredString(payload.name, 2, 120);
    const email = cleanRequiredString(payload.email, 3, 254).toLowerCase();
    const organization = cleanOptionalString(payload.organization, 160);
    const projectType = cleanRequiredString(payload.projectType, 2, 40);
    const budgetRange = cleanOptionalString(payload.budgetRange, 40);
    const message = cleanRequiredString(payload.message, 20, 3000);
    const sourceUrl = cleanSourceUrl(payload.sourceUrl);
    const submissionKey = cleanOptionalUuid(payload.submissionId) || crypto.randomUUID();
    const visitorKey = cleanTelemetryUuid(payload.visitorId);
    const sessionKey = cleanTelemetryUuid(payload.sessionId);
    const rawUtmSource = cleanTelemetryString(payload.utmSource, 120);
    const utmMedium = cleanTelemetryString(payload.utmMedium, 120);
    const utmCampaign = cleanTelemetryString(payload.utmCampaign, 190);
    const utmContent = cleanTelemetryString(payload.utmContent, 190);
    const utmTerm = cleanTelemetryString(payload.utmTerm, 190);
    const gclid = cleanTelemetryString(payload.gclid, 255);
    const fbclid = cleanTelemetryString(payload.fbclid, 255);
    const msclkid = cleanTelemetryString(payload.msclkid, 255);
    const ttclid = cleanTelemetryString(payload.ttclid, 255);
    const campaignExternalId = cleanTelemetryString(payload.campaignExternalId, 255);
    const adsetExternalId = cleanTelemetryString(payload.adsetExternalId, 255);
    const adExternalId = cleanTelemetryString(payload.adExternalId, 255);
    const suppliedAttributionPresent = cleanOptionalBoolean(payload.attributionPresent);
    const attributionPresent = Boolean(
      suppliedAttributionPresent
      || rawUtmSource || utmMedium || utmCampaign || utmContent || utmTerm
      || gclid || fbclid || msclkid || ttclid || campaignExternalId || adsetExternalId || adExternalId
    );
    const attributionCapturedAt = attributionPresent
      ? cleanOptionalTimestamp(payload.attributionCapturedAt) || new Date().toISOString()
      : null;
    const utmSource = rawUtmSource || (gclid ? 'google' : msclkid ? 'microsoft_ads' : ttclid ? 'tiktok' : null);
    const referrer = cleanReferrer(payload.referrer);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_INPUT');
    if (!PROJECT_TYPES.has(projectType)) throw new Error('INVALID_INPUT');
    if (budgetRange && !BUDGET_RANGES.has(budgetRange)) throw new Error('INVALID_INPUT');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('MISSING_SERVER_CONFIG');

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ipHash = await hashClientAddress(request);
    const { data: rateAllowed, error: rateError } = await supabase.rpc(
      'check_project_inquiry_rate_limit',
      { p_ip_hash: ipHash, p_max_requests: 5 },
    );

    if (rateError) {
      console.error('Inquiry rate-limit check failed', { code: rateError.code });
      throw new Error('DATABASE_ERROR');
    }

    if (!rateAllowed) return jsonResponse({ error: 'Please wait before sending another inquiry.' }, 429, responseOrigin);

    const { data: intakeRows, error: intakeError } = await supabase.rpc(
      'create_inquiry_with_notification_outbox',
      {
        p_submission_key: submissionKey,
        p_name: name,
        p_email: email,
        p_project_type: projectType,
        p_message: message,
        p_organization: organization,
        p_budget_range: budgetRange,
        p_source_url: sourceUrl,
        p_attribution_captured_at: attributionCapturedAt,
        p_visitor_key: visitorKey,
        p_session_key: sessionKey,
        p_utm_source: utmSource,
        p_utm_medium: utmMedium,
        p_utm_campaign: utmCampaign,
        p_utm_content: utmContent,
        p_utm_term: utmTerm,
        p_gclid: gclid,
        p_fbclid: fbclid,
        p_msclkid: msclkid,
        p_ttclid: ttclid,
        p_campaign_external_id: campaignExternalId,
        p_adset_external_id: adsetExternalId,
        p_ad_external_id: adExternalId,
        p_referrer: referrer,
      },
    );

    if (intakeError) {
      console.error('Atomic inquiry intake failed', { code: intakeError.code });
      if (intakeError.code === '22023') throw new Error('INVALID_INPUT');
      throw new Error('DATABASE_ERROR');
    }

    const intake = (intakeRows as Array<{
      inquiry_id: string;
      duplicate: boolean;
      notification_status: string;
    }> | null)?.[0];
    if (!intake?.inquiry_id) throw new Error('DATABASE_ERROR');

    const { data: conversionRecorded, error: conversionError } = await supabase.rpc('record_inquiry_conversion', {
      p_inquiry_id: intake.inquiry_id,
    });
    if (conversionError || conversionRecorded !== true) {
      console.error('Inquiry conversion recording failed', { code: conversionError?.code || 'NOT_RECORDED' });
    }

    // Storage is the acceptance boundary. An immediate Mailgun attempt is best
    // effort because the durable outbox and scheduled worker own eventual
    // delivery; a transient worker failure must not make the customer create a
    // duplicate inquiry.
    try {
      await processInquiryNotificationBatch(supabase, {
        batchSize: 2,
        inquiryId: intake.inquiry_id,
        updateWorkerLedger: false,
      });
    } catch (notificationError) {
      console.error('Immediate inquiry notification attempt failed', {
        reason: notificationError instanceof Error ? notificationError.message : 'UNKNOWN',
      });
    }

    const { data: persistedNotification, error: persistedNotificationError } = await supabase
      .from('project_inquiries')
      .select('notification_status, notification_error')
      .eq('id', intake.inquiry_id)
      .single<{ notification_status: string; notification_error: string | null }>();
    if (persistedNotificationError || !persistedNotification) {
      console.error('Persisted notification status lookup failed', { code: persistedNotificationError?.code || 'NOT_FOUND' });
    }

    const notificationStatus = persistedNotification?.notification_status || intake.notification_status || 'not_attempted';
    return jsonResponse({
      ok: true,
      inquiryId: intake.inquiry_id,
      notification: notificationStatus,
      duplicate: intake.duplicate,
    }, intake.duplicate ? 200 : 201, responseOrigin);
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') {
      return jsonResponse({ error: 'Request is too large.' }, 413, responseOrigin);
    }
    if (error instanceof Error && error.message === 'INVALID_INPUT') {
      return jsonResponse({ error: 'Please check the form and try again.' }, 400, responseOrigin);
    }

    console.error('Inquiry request failed', {
      reason: error instanceof Error ? error.message : 'UNKNOWN',
    });
    return jsonResponse({ error: 'We could not send your inquiry. Please try again.' }, 500, responseOrigin);
  }
});
