import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  summarizeTrackedSessionConversions,
  trackedSessionConversionRate,
} from '../../src/admin/lib/marketingMetrics.js';

const readProjectFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('conversion reporting uses converted sessions from the tracked-session cohort', () => {
  const summary = summarizeTrackedSessionConversions([
    { sessions: '7', converted_sessions: '2', inquiries: '4' },
    { sessions: 3, converted_sessions: 1, inquiries: 8 },
  ]);

  assert.deepEqual(summary, { trackedSessions: 10, convertedSessions: 3 });
  assert.equal(trackedSessionConversionRate(summary.convertedSessions, summary.trackedSessions), '30.0');
  assert.equal(trackedSessionConversionRate(5, 3), '100.0');
  assert.equal(trackedSessionConversionRate(1, 0), '0.0');
});

test('the inquiry fallback preserves the original browser session start end to end', async () => {
  const [browserTracking, edgeFunction, migration] = await Promise.all([
    readProjectFile('src/lib/marketing.js'),
    readProjectFile('supabase/functions/submit-inquiry/index.ts'),
    readProjectFile('supabase/migrations/20260828210000_fix_marketing_attribution_acceptance.sql'),
  ]);

  assert.match(browserTracking, /sessionStartedAt: context\.sessionStartedAt \|\| null/);
  assert.match(edgeFunction, /sessionStartedAt\?: unknown/);
  assert.match(edgeFunction, /const sessionStartedAt = visitorKey && sessionKey/);
  assert.match(edgeFunction, /new Date\(attributionCapturedAt\)\.getTime\(\) < new Date\(sessionStartedAt\)\.getTime\(\) - 5 \* 60 \* 1000/);
  assert.match(edgeFunction, /p_session_started_at: sessionStartedAt/);
  assert.match(migration, /add column if not exists session_started_at timestamptz/);
  assert.match(migration, /project_inquiries_session_identity_required/);
  assert.match(migration, /project_inquiries_attribution_after_session_start/);
  assert.match(migration, /p_session_started_at timestamptz default null/);
  assert.match(migration, /source_url,\s+session_started_at,\s+attribution_captured_at/);
  assert.match(migration, /coalesce\(\s+v_inquiry\.session_started_at,/);
});

test('the marketing view exposes pixel governance and uses the cohort field returned by SQL', async () => {
  const [screen, portal, migration] = await Promise.all([
    readProjectFile('src/admin/pages/Marketing.jsx'),
    readProjectFile('src/admin/lib/portal.js'),
    readProjectFile('supabase/migrations/20260828210000_fix_marketing_attribution_acceptance.sql'),
  ]);

  assert.match(screen, /'Analytics', 'Advertising', 'Attribution', 'Privacy'/);
  assert.match(screen, /Converted sessions/);
  assert.match(screen, /% of tracked sessions/);
  assert.match(screen, /trackedSessionConversionRate\(row\.converted_sessions, row\.sessions\)/);
  assert.match(portal, /summarizeTrackedSessionConversions\(funnelRows\)/);
  assert.doesNotMatch(portal, /formSubmits:/);
  assert.match(migration, /converted_sessions bigint/);
  assert.match(migration, /count\(\*\) filter \(where coalesce\(session_engagement\.converted, false\)\)/);
  assert.match(migration, /grant execute on function public\.get_marketing_funnel/);
});
