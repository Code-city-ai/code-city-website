import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import {
  MailgunWebhookRejection,
  readBoundedJsonBody,
  verifyAndNormalizeMailgunWebhook,
} from '../_shared/mailgun-webhooks.ts';

const jsonResponse = (body: Record<string, unknown>, status: number) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  },
);

const readServerConfiguration = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() || '';
  const signingKey = Deno.env.get('MAILGUN_WEBHOOK_SIGNING_KEY')?.trim() || '';

  if (!serviceRoleKey || !signingKey || serviceRoleKey.length > 2_000 || signingKey.length > 512) {
    return null;
  }
  if (/[\r\n]/.test(serviceRoleKey) || /[\r\n]/.test(signingKey)) return null;

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) return null;
    return { supabaseUrl: parsedUrl.toString().replace(/\/$/, ''), serviceRoleKey, signingKey };
  } catch {
    return null;
  }
};

const publicReconciliationResult = (value: unknown) => {
  const result = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const state = typeof result.result === 'string' && result.result.length <= 40
    ? result.result
    : 'recorded';
  return {
    ok: true,
    state,
    applied: result.applied === true,
  };
};

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405);
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return jsonResponse({ error: 'Webhook rejected.' }, 406);
    }

    const configuration = readServerConfiguration();
    if (!configuration) {
      console.error('Mailgun webhook server configuration is incomplete.');
      return jsonResponse({ error: 'Webhook processing is unavailable.' }, 500);
    }

    try {
      const payload = await readBoundedJsonBody(request);
      const event = await verifyAndNormalizeMailgunWebhook(payload, configuration.signingKey);
      const supabaseAdmin = createClient(
        configuration.supabaseUrl,
        configuration.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
          },
        },
      );

      const { data, error } = await supabaseAdmin.rpc('reconcile_mailgun_delivery_event', {
        p_token_hash: event.tokenHash,
        p_event_id: event.eventId,
        p_domain: event.domain,
        p_delivery_id: event.deliveryId,
        p_recipient: event.recipient,
        p_provider_message_id: event.providerMessageId,
        p_event_type: event.eventType,
        p_severity: event.severity,
        p_provider_event_at: event.providerEventAt,
        p_failure_detail: event.failureDetail,
      });

      if (error) {
        console.error('Mailgun webhook reconciliation failed.', { code: error.code });
        return jsonResponse({ error: 'Webhook processing failed.' }, 500);
      }

      return jsonResponse(publicReconciliationResult(data), 200);
    } catch (error) {
      if (error instanceof MailgunWebhookRejection) {
        return jsonResponse({ error: 'Webhook rejected.' }, 406);
      }
      console.error('Mailgun webhook processing failed.', {
        reason: error instanceof Error ? error.name : 'UNKNOWN',
      });
      return jsonResponse({ error: 'Webhook processing failed.' }, 500);
    }
  },
};
