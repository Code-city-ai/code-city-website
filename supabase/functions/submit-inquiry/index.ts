import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

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

type InquiryPayload = {
  name?: unknown;
  email?: unknown;
  organization?: unknown;
  projectType?: unknown;
  budgetRange?: unknown;
  message?: unknown;
  sourceUrl?: unknown;
  website?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  utmTerm?: unknown;
  referrer?: unknown;
};

type StoredInquiry = {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  project_type: string;
  budget_range: string | null;
  message: string;
  source_url: string | null;
};

const NOTIFICATION_RECIPIENTS = [
  'dev@codecity.ai',
  'aytamzid@airdropja.com',
];

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

const escapeHtml = (value: string | null) => (value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const emailSubject = (inquiry: StoredInquiry) => {
  const kind = inquiry.project_type === 'product-support' ? 'Support request' : 'Project inquiry';
  const identity = inquiry.organization || inquiry.name;
  return `[Code City] ${kind} — ${identity}`.replace(/[\r\n]+/g, ' ').slice(0, 180);
};

const emailHtml = (inquiry: StoredInquiry) => {
  const rows = [
    ['Name', inquiry.name],
    ['Email', inquiry.email],
    ['Organization / product', inquiry.organization],
    ['Type', inquiry.project_type.replace(/-/g, ' ')],
    ['Investment range', inquiry.budget_range?.replace(/-/g, ' ') || null],
    ['Source', inquiry.source_url],
  ].filter(([, value]) => value);

  return `<!doctype html>
<html><body style="margin:0;background:#0b0d12;color:#f4f0e8;font-family:Arial,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:36px 24px">
    <p style="margin:0 0 22px;color:#ff5a36;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Code City · New inbound request</p>
    <h1 style="margin:0 0 28px;font-size:30px;line-height:1.1">${escapeHtml(inquiry.organization || inquiry.name)}</h1>
    <div style="border:1px solid #2d323c;border-radius:16px;overflow:hidden">
      ${rows.map(([label, value]) => `<div style="padding:14px 18px;border-bottom:1px solid #2d323c"><span style="display:block;color:#8f98a8;font-size:11px;letter-spacing:.1em;text-transform:uppercase">${escapeHtml(label)}</span><strong style="display:block;margin-top:5px;font-size:15px">${escapeHtml(value)}</strong></div>`).join('')}
      <div style="padding:18px"><span style="display:block;color:#8f98a8;font-size:11px;letter-spacing:.1em;text-transform:uppercase">Message</span><div style="margin-top:8px;white-space:pre-wrap;line-height:1.65">${escapeHtml(inquiry.message)}</div></div>
    </div>
    <p style="margin:22px 0 0;color:#8f98a8;font-size:12px">Inquiry ID: ${escapeHtml(inquiry.id)}</p>
  </div>
</body></html>`;
};

const sendMailgunNotification = async (inquiry: StoredInquiry) => {
  const apiKey = Deno.env.get('MAILGUN_API_KEY');
  const domain = Deno.env.get('MAILGUN_DOMAIN');
  const from = Deno.env.get('MAILGUN_FROM');
  const apiBase = (Deno.env.get('MAILGUN_API_BASE') || 'https://api.mailgun.net').replace(/\/$/, '');

  if (!apiKey || !domain || !from) {
    return { status: 'configuration_required' as const, error: 'Mailgun server secrets are not configured.' };
  }

  const form = new FormData();
  form.set('from', from);
  for (const recipient of NOTIFICATION_RECIPIENTS) form.append('to', recipient);
  form.set('h:Reply-To', inquiry.email);
  form.set('subject', emailSubject(inquiry));
  form.set('html', emailHtml(inquiry));
  form.set('text', [
    emailSubject(inquiry),
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    inquiry.organization ? `Organization / product: ${inquiry.organization}` : null,
    `Type: ${inquiry.project_type}`,
    inquiry.budget_range ? `Investment range: ${inquiry.budget_range}` : null,
    inquiry.source_url ? `Source: ${inquiry.source_url}` : null,
    '',
    inquiry.message,
    '',
    `Inquiry ID: ${inquiry.id}`,
  ].filter((line) => line !== null).join('\n'));

  let response: Response;
  try {
    response = await fetch(`${apiBase}/v3/${encodeURIComponent(domain)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}` },
      body: form,
    });
  } catch {
    console.error('Mailgun inquiry notification request failed');
    return { status: 'failed' as const, error: 'Mailgun could not be reached.' };
  }

  if (!response.ok) {
    console.error('Mailgun inquiry notification failed', { status: response.status });
    return { status: 'failed' as const, error: `Mailgun returned HTTP ${response.status}.` };
  }

  return { status: 'sent' as const, error: null };
};

const allowedOrigins = () => {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...configured]);
};

const hashClientAddress = async (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientAddress = forwarded || request.headers.get('cf-connecting-ip') || 'unknown';
  const salt = Deno.env.get('RATE_LIMIT_SALT') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const bytes = new TextEncoder().encode(`${salt}:${clientAddress}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
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
  if (contentLength > 12_000) return jsonResponse({ error: 'Request is too large.' }, 413, responseOrigin);

  try {
    const payload = await request.json() as InquiryPayload;

    if (typeof payload.website === 'string' && payload.website.trim()) {
      return jsonResponse({ ok: true }, 200, responseOrigin);
    }

    const name = cleanRequiredString(payload.name, 2, 120);
    const email = cleanRequiredString(payload.email, 3, 254).toLowerCase();
    const organization = cleanOptionalString(payload.organization, 160);
    const projectType = cleanRequiredString(payload.projectType, 2, 40);
    const budgetRange = cleanOptionalString(payload.budgetRange, 40);
    const message = cleanRequiredString(payload.message, 20, 3000);
    const sourceUrl = cleanOptionalString(payload.sourceUrl, 500);
    const visitorKey = cleanOptionalUuid(payload.visitorId);
    const sessionKey = cleanOptionalUuid(payload.sessionId);
    const utmSource = cleanOptionalString(payload.utmSource, 120);
    const utmMedium = cleanOptionalString(payload.utmMedium, 120);
    const utmCampaign = cleanOptionalString(payload.utmCampaign, 190);
    const utmContent = cleanOptionalString(payload.utmContent, 190);
    const utmTerm = cleanOptionalString(payload.utmTerm, 190);
    const referrer = cleanOptionalString(payload.referrer, 1000);

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

    const { data: storedInquiry, error: insertError } = await supabase.from('project_inquiries').insert({
      name,
      email,
      organization,
      project_type: projectType,
      budget_range: budgetRange,
      message,
      source_url: sourceUrl,
      visitor_key: visitorKey,
      session_key: sessionKey,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      referrer,
    }).select('id, name, email, organization, project_type, budget_range, message, source_url').single<StoredInquiry>();

    if (insertError) {
      console.error('Inquiry insert failed', { code: insertError.code });
      throw new Error('DATABASE_ERROR');
    }

    const notification = await sendMailgunNotification(storedInquiry);
    const { error: notificationUpdateError } = await supabase
      .from('project_inquiries')
      .update({
        notification_status: notification.status,
        notification_error: notification.error,
        notified_at: notification.status === 'sent' ? new Date().toISOString() : null,
      })
      .eq('id', storedInquiry.id);

    if (notificationUpdateError) {
      console.error('Inquiry notification status update failed', { code: notificationUpdateError.code });
    }

    await supabase.from('marketing_integrations').update({
      status: notification.status === 'sent' ? 'connected' : notification.status === 'failed' ? 'error' : 'needs_configuration',
      last_sync_at: notification.status === 'sent' ? new Date().toISOString() : null,
      last_error: notification.error,
    }).eq('slug', 'mailgun');

    return jsonResponse({ ok: true, inquiryId: storedInquiry.id, notification: notification.status }, 201, responseOrigin);
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_INPUT') {
      return jsonResponse({ error: 'Please check the form and try again.' }, 400, responseOrigin);
    }

    console.error('Inquiry request failed', {
      reason: error instanceof Error ? error.message : 'UNKNOWN',
    });
    return jsonResponse({ error: 'We could not send your inquiry. Please try again.' }, 500, responseOrigin);
  }
});
