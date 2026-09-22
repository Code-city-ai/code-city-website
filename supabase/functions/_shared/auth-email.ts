import { getMailgunConfig, type MailgunConfig } from './inquiry-notifications.ts';

const CODE_CITY_ORIGIN = 'https://codecity.ai';
const CODE_CITY_AUTH_ORIGIN = 'https://yfpcjxkyjftkekwkekrz.supabase.co';
const PASSWORD_REDIRECT = `${CODE_CITY_ORIGIN}/admin/set-password`;
const BODY_LIMIT = 64 * 1024;
const ACTIONS = new Set(['signup', 'recovery', 'invite', 'magiclink', 'email_change']);

type EmailMessage = { to: string; subject: string; text: string };
export type AuthEmailOptions = {
  verify: (body: string, headers: Record<string, string>, secret: string) => unknown;
  hookSecret?: string;
  supabaseUrl?: string;
  mailgunConfig?: MailgunConfig | null;
  fetch?: typeof fetch;
};

const failure = (status: number, message: string) => Response.json(
  { error: { http_code: status, message } },
  { status, headers: { 'Cache-Control': 'no-store' } },
);

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object');
  return value as Record<string, unknown>;
};

const emailAddress = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 254 ||
    !/^[^\s<>(),;:"\\@]+@[^\s<>(),;:"\\@]+\.[^\s<>(),;:"\\@]+$/.test(value)) {
    throw new Error('Invalid recipient');
  }
  return value;
};

const tokenHash = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(value)) {
    throw new Error('Invalid token hash');
  }
  return value;
};

const redirectFor = (action: string, value: unknown): string => {
  if (action === 'recovery' || action === 'invite') return PASSWORD_REDIRECT;
  if (value === undefined || value === null || value === '') return `${CODE_CITY_ORIGIN}/sign-in`;
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\\]/.test(value)) {
    throw new Error('Invalid redirect');
  }
  const redirect = new URL(value);
  if (redirect.origin !== CODE_CITY_ORIGIN || redirect.username || redirect.password) {
    throw new Error('Invalid redirect');
  }
  // Auth credentials only return to routes owned by this application. Query/fragment
  // forwarding is unnecessary here and could carry a second redirect destination.
  if (!['/', '/sign-in', '/admin', '/admin/set-password', '/trade-city/'].includes(redirect.pathname) ||
    redirect.search || redirect.hash) throw new Error('Invalid redirect');
  return redirect.href;
};

const messagesFor = (payload: unknown, supabaseUrl: string): EmailMessage[] => {
  if (supabaseUrl.replace(/\/$/, '') !== CODE_CITY_AUTH_ORIGIN) throw new Error('Wrong Auth project');
  const input = record(payload);
  const user = record(input.user);
  const data = record(input.email_data);
  const action = data.email_action_type;
  if (typeof action !== 'string' || !ACTIONS.has(action)) throw new Error('Unsupported email action');
  const redirect = redirectFor(action, data.redirect_to);
  const linkFor = (hash: unknown) => {
    const link = new URL('/auth/v1/verify', CODE_CITY_AUTH_ORIGIN);
    link.searchParams.set('token', tokenHash(hash));
    link.searchParams.set('type', action);
    link.searchParams.set('redirect_to', redirect);
    return link.href;
  };
  const compose = (recipient: unknown, hash: unknown, subject: string, instruction: string) => ({
    to: emailAddress(recipient),
    subject: `Code City — ${subject}`,
    text: `${instruction}\n\n${linkFor(hash)}\n\nThis link is private and can only be used once. If you did not request this, ignore this email.\n\nCode City\n${CODE_CITY_ORIGIN}`,
  });
  if (action === 'email_change') {
    // Supabase deliberately reverses the hash field names for this action.
    const messages = [compose(user.new_email, data.token_hash, 'Confirm your new email',
      'Confirm this email address for your Code City account:')];
    if (data.token_hash_new !== undefined && data.token_hash_new !== null && data.token_hash_new !== '') {
      messages.unshift(compose(user.email, data.token_hash_new, 'Confirm your email change',
        'Approve the requested email address change for your Code City account:'));
    }
    return messages;
  }
  const copy: Record<string, [string, string]> = {
    signup: ['Confirm your email', 'Confirm your email address to continue to Code City:'],
    recovery: ['Set your password', 'Set or reset your Code City password using this secure link:'],
    invite: ['Your Code City invitation', 'Accept your Code City invitation and set your password:'],
    magiclink: ['Sign in', 'Use this secure link to sign in to Code City:'],
  };
  return [compose(user.email, data.token_hash, ...copy[action])];
};

const readBody = async (request: Request): Promise<string> => {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > BODY_LIMIT)) {
    throw new RangeError('Body too large');
  }
  if (!request.body) throw new Error('Missing body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) {
        await reader.cancel();
        throw new RangeError('Body too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

export const authEmailHandler = async (request: Request, options: AuthEmailOptions): Promise<Response> => {
  if (request.method !== 'POST') {
    const response = failure(405, 'Only POST is supported.');
    response.headers.set('Allow', 'POST');
    return response;
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return failure(415, 'A JSON request is required.');
  }
  const secret = (options.hookSecret ?? Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '').trim().replace(/^v1,/, '');
  if (!/^whsec_[A-Za-z0-9+/]{43,}={0,2}$/.test(secret) || secret.length > 512) {
    return failure(503, 'Auth email signing is not configured.');
  }
  const headers: Record<string, string> = {};
  for (const name of ['webhook-id', 'webhook-timestamp', 'webhook-signature']) {
    const value = request.headers.get(name);
    if (!value || value.length > 1024) return failure(401, 'Invalid webhook signature.');
    headers[name] = value;
  }
  let body: string;
  try { body = await readBody(request); } catch (error) {
    return failure(error instanceof RangeError ? 413 : 400, 'Invalid webhook body.');
  }
  let payload: unknown;
  try { payload = options.verify(body, headers, secret); } catch {
    return failure(401, 'Invalid webhook signature.');
  }
  const supabaseUrl = options.supabaseUrl ?? Deno.env.get('SUPABASE_URL') ?? '';
  if (supabaseUrl.replace(/\/$/, '') !== CODE_CITY_AUTH_ORIGIN) {
    return failure(503, 'Auth email project is not configured.');
  }
  let messages: EmailMessage[];
  try { messages = messagesFor(payload, supabaseUrl); } catch {
    return failure(422, 'Unsupported or invalid Auth email request.');
  }
  const config = options.mailgunConfig === undefined ? getMailgunConfig() : options.mailgunConfig;
  if (!config) return failure(503, 'Auth email delivery is not configured.');
  const send = options.fetch ?? fetch;
  try {
    // Both secure-email-change messages share one deadline, below the Auth hook's timeout.
    const signal = AbortSignal.timeout(4000);
    await Promise.all(messages.map(async (message) => {
      const form = new FormData();
      form.set('from', config.from);
      form.set('to', message.to);
      form.set('subject', message.subject);
      form.set('text', message.text);
      form.set('o:tracking', 'no');
      form.set('o:tracking-clicks', 'no');
      form.set('o:tracking-opens', 'no');
      const response = await send(`${config.apiBase}/v3/${encodeURIComponent(config.domain)}/messages`, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`api:${config.apiKey}`)}` },
        body: form,
        signal,
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Delivery failed');
      await response.body?.cancel();
    }));
  } catch {
    return failure(502, 'Auth email provider could not accept the message.');
  }
  return Response.json({}, { headers: { 'Cache-Control': 'no-store' } });
};
