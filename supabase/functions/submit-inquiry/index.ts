import { createClient } from 'npm:@supabase/supabase-js@2.112.3';

const LOCAL_ORIGINS = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'https://code-city-ai.github.io',
]);

const PROJECT_TYPES = new Set([
  'new-product',
  'existing-product',
  'mobile-app',
  'growth-system',
  'not-sure',
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

const allowedOrigins = () => {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return new Set([...LOCAL_ORIGINS, ...configured]);
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
  const responseOrigin = originAllowed ? requestOrigin : 'https://code-city-ai.github.io';

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

    const { error: insertError } = await supabase.from('project_inquiries').insert({
      name,
      email,
      organization,
      project_type: projectType,
      budget_range: budgetRange,
      message,
      source_url: sourceUrl,
    });

    if (insertError) {
      console.error('Inquiry insert failed', { code: insertError.code });
      throw new Error('DATABASE_ERROR');
    }

    return jsonResponse({ ok: true }, 201, responseOrigin);
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
