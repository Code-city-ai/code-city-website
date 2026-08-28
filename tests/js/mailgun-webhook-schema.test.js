import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260828223000_reconcile_mailgun_webhooks.sql',
  import.meta.url,
);

test('Mailgun event persistence is narrow, replay-safe, and staff protected', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /create table public\.mailgun_webhook_events/);
  assert.match(sql, /unique \(token_hash\)/);
  assert.match(sql, /unique \(domain, event_id\)/);
  assert.match(sql, /alter table public\.mailgun_webhook_events force row level security/);
  assert.match(sql, /create policy mailgun_webhook_events_staff_select/);
  assert.doesNotMatch(sql, /raw_payload|raw_signature|payload jsonb|signature text/i);
});

test('Mailgun reconciliation is service-only and cannot regress terminal delivery state', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /create or replace function public\.reconcile_mailgun_delivery_event/);
  assert.match(sql, /auth\.role\(\)\) is distinct from 'service_role'/);
  assert.match(sql, /grant execute on function public\.reconcile_mailgun_delivery_event[\s\S]*to service_role/);
  assert.match(sql, /v_delivery\.status in \('delivered', 'bounced'\)/);
  assert.match(sql, /p_event_type = 'failed' and p_severity = 'temporary'[\s\S]*ignored_temporary/);
  assert.match(sql, /p_event_type = 'failed' and p_severity = 'permanent' then 'bounced'/);
  assert.match(sql, /perform public\.refresh_inquiry_notification_status\(v_delivery\.inquiry_id\)/);
});
