import { withSupabase } from 'npm:@supabase/server@1.4.1';
import {
  processInquiryNotificationBatch,
  type NotificationBatchResult,
} from '../_shared/inquiry-notifications.ts';

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

const publicResult = (result: NotificationBatchResult) => ({
  ok: true,
  state: result.state,
  configured: result.configured,
  claimed: result.claimed,
  accepted: result.accepted,
  failed: result.failed,
  stale: result.stale,
  finalizationErrors: result.finalizationErrors,
  workerErrors: result.workerErrors,
});

export default {
  fetch: withSupabase(
    { auth: 'secret:code_city_notifications' },
    async (request, context) => {
      if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

      try {
        const result = await processInquiryNotificationBatch(context.supabaseAdmin);
        return jsonResponse(publicResult(result), 200);
      } catch (error) {
        console.error('Notification worker batch failed', {
          reason: error instanceof Error ? error.message : 'UNKNOWN',
        });
        return jsonResponse({ error: 'Notification processing could not be completed.' }, 500);
      }
    },
  ),
};
