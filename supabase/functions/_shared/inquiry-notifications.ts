import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.112.3';

const APPROVED_RECIPIENTS = new Set([
  'dev@codecity.ai',
  'aytamzid@airdropja.com',
]);

const WORKER_WORK_ITEM_TITLE = 'Automate inquiry notification retries';
const MAILGUN_WORK_ITEM_TITLE = 'Connect Mailgun notification delivery';
const MAILGUN_CONFIGURATION_ERROR = 'Mailgun server secrets are not configured.';

export type StoredInquiry = {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  project_type: string;
  budget_range: string | null;
  message: string;
  source_url: string | null;
  notification_status?: string;
};

export type ClaimedInquiryDelivery = Omit<StoredInquiry, 'id' | 'notification_status'> & {
  delivery_id: string;
  inquiry_id: string;
  recipient: string;
  attempt_number: number;
  created_at: string;
};

export type MailgunConfig = {
  apiKey: string;
  domain: string;
  from: string;
  apiBase: string;
};

export type NotificationBatchResult = {
  state: 'configuration_required' | 'idle' | 'processed';
  configured: boolean;
  claimed: number;
  accepted: number;
  failed: number;
  stale: number;
  finalizationErrors: number;
  workerErrors: number;
};

type MailgunDeliveryResult = {
  status: 'accepted' | 'failed';
  error: string | null;
  providerMessageId: string | null;
};

type DeliveryOutcome = {
  outcome: 'accepted' | 'failed' | 'stale' | 'finalization_error';
};

export type ProcessBatchOptions = {
  batchSize?: number;
  maxAttempts?: number;
  staleAfterSeconds?: number;
  baseBackoffSeconds?: number;
  inquiryId?: string | null;
  mailgunConfig?: MailgunConfig | null;
  updateWorkerLedger?: boolean;
};

const emptyBatchResult = (
  state: NotificationBatchResult['state'],
  configured: boolean,
): NotificationBatchResult => ({
  state,
  configured,
  claimed: 0,
  accepted: 0,
  failed: 0,
  stale: 0,
  finalizationErrors: 0,
  workerErrors: 0,
});

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
  ].filter((row): row is [string, string] => typeof row[1] === 'string' && row[1].length > 0);

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

const emailText = (inquiry: StoredInquiry) => [
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
].filter((line) => line !== null).join('\n');

export const getMailgunConfig = (): MailgunConfig | null => {
  const apiKey = Deno.env.get('MAILGUN_API_KEY')?.trim() || '';
  const domain = Deno.env.get('MAILGUN_DOMAIN')?.trim().toLowerCase() || '';
  const from = Deno.env.get('MAILGUN_FROM')?.trim() || '';
  const rawApiBase = (Deno.env.get('MAILGUN_API_BASE') || 'https://api.mailgun.net').trim();

  if (!apiKey || !domain || !from) return null;
  if (/[\r\n]/.test(apiKey) || /[\r\n/@]/.test(domain) || /[\r\n]/.test(from)) return null;
  if (apiKey.length > 500 || domain.length > 253 || from.length > 320) return null;

  try {
    const apiBase = new URL(rawApiBase);
    if (apiBase.protocol !== 'https:') return null;
    if (!['api.mailgun.net', 'api.eu.mailgun.net'].includes(apiBase.hostname)) return null;
    if (apiBase.username || apiBase.password || apiBase.search || apiBase.hash) return null;
    return {
      apiKey,
      domain,
      from,
      apiBase: apiBase.toString().replace(/\/$/, ''),
    };
  } catch {
    return null;
  }
};

export const sendMailgunNotification = async (
  inquiry: StoredInquiry,
  recipient: string,
  deliveryId: string,
  config: MailgunConfig,
): Promise<MailgunDeliveryResult> => {
  if (!APPROVED_RECIPIENTS.has(recipient)) {
    return {
      status: 'failed',
      error: 'The notification recipient is not approved.',
      providerMessageId: null,
    };
  }

  const form = new FormData();
  form.set('from', config.from);
  form.set('to', recipient);
  // This database delivery UUID is stable across retries and webhook reconciliation.
  form.set('h:X-Code-City-Delivery-ID', deliveryId);
  form.set('v:delivery_id', deliveryId);
  form.set('h:Reply-To', inquiry.email);
  form.set('subject', emailSubject(inquiry));
  form.set('html', emailHtml(inquiry));
  form.set('text', emailText(inquiry));

  let response: Response;
  try {
    response = await fetch(`${config.apiBase}/v3/${encodeURIComponent(config.domain)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`api:${config.apiKey}`)}` },
      body: form,
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return {
      status: 'failed',
      error: 'Mailgun could not be reached within the delivery window.',
      providerMessageId: null,
    };
  }

  if (!response.ok) {
    return {
      status: 'failed',
      error: `Mailgun returned HTTP ${response.status}.`,
      providerMessageId: null,
    };
  }

  const responseBody = await response.json().catch(() => ({})) as { id?: unknown };
  return {
    status: 'accepted',
    error: null,
    providerMessageId: typeof responseBody.id === 'string' ? responseBody.id.slice(0, 500) : null,
  };
};

const updateWorkerWorkItem = async (
  supabase: SupabaseClient,
  status: 'blocked' | 'in_progress',
  blockedReason: string | null,
) => {
  const { error } = await supabase
    .from('portal_work_items')
    .update({ status, blocked_reason: blockedReason })
    .eq('title', WORKER_WORK_ITEM_TITLE);
  if (error) console.error('Notification worker ledger update failed', { code: error.code });
};

const updateMailgunWorkItem = async (
  supabase: SupabaseClient,
  status: 'blocked' | 'in_progress',
  blockedReason: string | null,
) => {
  const { error } = await supabase
    .from('portal_work_items')
    .update({ status, blocked_reason: blockedReason })
    .eq('title', MAILGUN_WORK_ITEM_TITLE);
  if (error) console.error('Mailgun work-item update failed', { code: error.code });
};

const updateMailgunIntegration = async (
  supabase: SupabaseClient,
  status: 'connected' | 'needs_configuration' | 'error',
  lastError: string | null,
  acceptedAt?: string,
) => {
  const update: {
    status: 'connected' | 'needs_configuration' | 'error';
    last_error: string | null;
    last_sync_at?: string;
  } = { status, last_error: lastError };

  // Omitting last_sync_at on configuration/provider failures preserves the last
  // verified provider acceptance instead of erasing useful operational proof.
  if (acceptedAt) update.last_sync_at = acceptedAt;

  const { error } = await supabase
    .from('marketing_integrations')
    .update(update)
    .eq('slug', 'mailgun');
  if (error) console.error('Mailgun integration health update failed', { code: error.code });
};

const processClaimedDelivery = async (
  supabase: SupabaseClient,
  delivery: ClaimedInquiryDelivery,
  config: MailgunConfig,
): Promise<DeliveryOutcome> => {
  const inquiry: StoredInquiry = {
    id: delivery.inquiry_id,
    name: delivery.name,
    email: delivery.email,
    organization: delivery.organization,
    project_type: delivery.project_type,
    budget_range: delivery.budget_range,
    message: delivery.message,
    source_url: delivery.source_url,
  };

  let providerResult: MailgunDeliveryResult;
  try {
    providerResult = await sendMailgunNotification(
      inquiry,
      delivery.recipient,
      delivery.delivery_id,
      config,
    );
  } catch {
    providerResult = {
      status: 'failed',
      error: 'The notification worker encountered an unexpected delivery error.',
      providerMessageId: null,
    };
  }

  const { data: finalized, error: finalizeError } = await supabase.rpc(
    'finalize_inquiry_notification_delivery',
    {
      p_delivery_id: delivery.delivery_id,
      p_attempt_number: delivery.attempt_number,
      p_status: providerResult.status,
      p_provider_message_id: providerResult.providerMessageId,
      p_error: providerResult.error,
    },
  );

  if (finalizeError) {
    console.error('Notification delivery finalization failed', { code: finalizeError.code });
    return { outcome: 'finalization_error' };
  }
  if (finalized !== true) return { outcome: 'stale' };
  return { outcome: providerResult.status };
};

export const processInquiryNotificationBatch = async (
  supabase: SupabaseClient,
  options: ProcessBatchOptions = {},
): Promise<NotificationBatchResult> => {
  const batchSize = options.batchSize ?? 20;
  const maxAttempts = options.maxAttempts ?? 5;
  const staleAfterSeconds = options.staleAfterSeconds ?? 300;
  const baseBackoffSeconds = options.baseBackoffSeconds ?? 60;
  const inquiryId = options.inquiryId ?? null;
  const config = options.mailgunConfig === undefined ? getMailgunConfig() : options.mailgunConfig;
  const shouldUpdateWorkerLedger = options.updateWorkerLedger ?? true;
  const recordWorkerState = (
    status: 'blocked' | 'in_progress',
    blockedReason: string | null,
  ) => shouldUpdateWorkerLedger
    ? updateWorkerWorkItem(supabase, status, blockedReason)
    : Promise.resolve();

  if (!config) {
    const updates: Array<Promise<unknown>> = [
      updateMailgunIntegration(
        supabase,
        'needs_configuration',
        MAILGUN_CONFIGURATION_ERROR,
      ),
      updateMailgunWorkItem(supabase, 'blocked', MAILGUN_CONFIGURATION_ERROR),
      recordWorkerState(
        'blocked',
        'Mailgun server secrets are required. Queued deliveries remain retryable and no attempts are consumed.',
      ),
    ];
    if (inquiryId) {
      updates.push((async () => {
        const { error } = await supabase.rpc(
          'mark_inquiry_notification_configuration_required',
          { p_inquiry_id: inquiryId },
        );
        if (error) console.error('Inquiry notification configuration state update failed', { code: error.code });
      })());
    }
    await Promise.all(updates);
    return emptyBatchResult('configuration_required', false);
  }

  const { data, error } = await supabase.rpc('claim_inquiry_notification_deliveries', {
    p_batch_size: batchSize,
    p_max_attempts: maxAttempts,
    p_stale_after_seconds: staleAfterSeconds,
    p_base_backoff_seconds: baseBackoffSeconds,
    p_inquiry_id: inquiryId,
  });

  if (error) {
    await Promise.all([
      updateMailgunIntegration(supabase, 'error', 'The notification queue could not be claimed.'),
      updateMailgunWorkItem(
        supabase,
        'in_progress',
        'The latest notification run could not claim the delivery queue. Automatic retry remains enabled.',
      ),
      recordWorkerState(
        'in_progress',
        'The latest worker run could not claim the notification queue. Automatic retry remains enabled.',
      ),
    ]);
    throw new Error('NOTIFICATION_QUEUE_CLAIM_FAILED');
  }

  const claimed = (data || []) as ClaimedInquiryDelivery[];
  if (claimed.length === 0) {
    await Promise.all([
      updateMailgunWorkItem(supabase, 'in_progress', null),
      recordWorkerState('in_progress', null),
    ]);
    return emptyBatchResult('idle', true);
  }

  const settlements = await Promise.allSettled(
    claimed.map((delivery) => processClaimedDelivery(supabase, delivery, config)),
  );

  const result: NotificationBatchResult = {
    state: 'processed',
    configured: true,
    claimed: claimed.length,
    accepted: 0,
    failed: 0,
    stale: 0,
    finalizationErrors: 0,
    workerErrors: 0,
  };

  for (const settlement of settlements) {
    if (settlement.status === 'rejected') {
      result.workerErrors += 1;
      continue;
    }
    if (settlement.value.outcome === 'accepted') result.accepted += 1;
    if (settlement.value.outcome === 'failed') result.failed += 1;
    if (settlement.value.outcome === 'stale') result.stale += 1;
    if (settlement.value.outcome === 'finalization_error') result.finalizationErrors += 1;
  }

  const unresolved = result.failed + result.stale + result.finalizationErrors + result.workerErrors;
  const acceptedAt = result.accepted > 0 ? new Date().toISOString() : undefined;
  if (unresolved > 0) {
    await Promise.all([
      updateMailgunIntegration(
        supabase,
        'error',
        `The latest notification batch completed with ${unresolved} unresolved ${unresolved === 1 ? 'delivery' : 'deliveries'}.`,
        acceptedAt,
      ),
      updateMailgunWorkItem(
        supabase,
        'in_progress',
        'The latest Mailgun batch has unresolved deliveries. Automatic retry remains active.',
      ),
      recordWorkerState(
        'in_progress',
        'The latest batch had unresolved deliveries. Retry and stale-lease recovery remain active.',
      ),
    ]);
  } else {
    await Promise.all([
      updateMailgunIntegration(supabase, 'connected', null, acceptedAt),
      updateMailgunWorkItem(supabase, 'in_progress', null),
      recordWorkerState('in_progress', null),
    ]);
  }

  return result;
};
