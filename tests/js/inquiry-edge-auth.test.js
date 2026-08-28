import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('public inquiry calls use a publishable key without pretending it is a JWT', async () => {
  const clientSource = await readProjectFile('src/lib/inquiries.js');

  assert.match(clientSource, /apikey:\s*anonKey/);
  assert.doesNotMatch(clientSource, /Authorization:\s*`Bearer\s+\$\{anonKey\}`/);
});

test('submit-inquiry verifies publishable keys inside the function', async () => {
  const [config, functionSource] = await Promise.all([
    readProjectFile('supabase/config.toml'),
    readProjectFile('supabase/functions/submit-inquiry/index.ts'),
  ]);

  assert.match(config, /\[functions\.submit-inquiry\]\s+verify_jwt\s*=\s*false/);
  assert.match(functionSource, /withSupabase\(\s*\{\s*auth:\s*'publishable',\s*cors:\s*'disabled'\s*\}/);
  assert.match(functionSource, /const supabase = context\.supabaseAdmin/);
  assert.doesNotMatch(functionSource, /createClient\(/);
});

test('notification retries require the dedicated valid named secret key', async () => {
  const [config, functionSource, schedulerMigration] = await Promise.all([
    readProjectFile('supabase/config.toml'),
    readProjectFile('supabase/functions/process-inquiry-notifications/index.ts'),
    readProjectFile('supabase/migrations/20260828200000_schedule_inquiry_notification_worker.sql'),
  ]);

  assert.match(config, /\[functions\.process-inquiry-notifications\]\s+verify_jwt\s*=\s*false/);
  assert.match(functionSource, /auth:\s*'secret:code_city_notifications'/);
  assert.doesNotMatch(functionSource, /secret:code-city-notifications/);
  assert.match(schedulerMigration, /where name = 'code_city_notifications_secret_key'/);
});

test('Mailgun webhooks use provider signatures instead of Supabase JWTs', async () => {
  const [config, functionSource] = await Promise.all([
    readProjectFile('supabase/config.toml'),
    readProjectFile('supabase/functions/mailgun-webhook/index.ts'),
  ]);

  assert.match(config, /\[functions\.mailgun-webhook\]\s+verify_jwt\s*=\s*false/);
  assert.match(functionSource, /MAILGUN_WEBHOOK_SIGNING_KEY/);
  assert.match(functionSource, /reconcile_mailgun_delivery_event/);
  assert.doesNotMatch(functionSource, /MAILGUN_API_KEY/);
});
