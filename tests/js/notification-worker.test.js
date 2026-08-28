import assert from 'node:assert/strict';
import test from 'node:test';

import { processInquiryNotificationBatch } from '../../supabase/functions/_shared/inquiry-notifications.ts';

const INQUIRY_ID = '11111111-1111-4111-8111-111111111111';

const delivery = (id, recipient) => ({
  delivery_id: id,
  inquiry_id: INQUIRY_ID,
  recipient,
  attempt_number: 1,
  name: 'Test Customer',
  email: 'customer@example.com',
  organization: 'Test Company',
  project_type: 'new-product',
  budget_range: '10k-25k',
  message: 'A sufficiently detailed test inquiry.',
  source_url: 'https://codecity.ai/contact',
  created_at: '2026-08-28T12:00:00.000Z',
});

const mailgunConfig = {
  apiKey: 'key-test',
  domain: 'mg.codecity.ai',
  from: 'Code City <dev@codecity.ai>',
  apiBase: 'https://api.mailgun.net',
};

const fakeSupabase = ({ claimed = [], rpcOverride } = {}) => {
  const rpcCalls = [];
  const updates = [];

  return {
    rpcCalls,
    updates,
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      if (rpcOverride) {
        const overridden = await rpcOverride(name, args, rpcCalls);
        if (overridden) return overridden;
      }
      if (name === 'claim_inquiry_notification_deliveries') return { data: claimed, error: null };
      if (name === 'mark_inquiry_notification_configuration_required') return { data: true, error: null };
      if (name === 'finalize_inquiry_notification_delivery') return { data: true, error: null };
      throw new Error(`Unexpected RPC: ${name}`);
    },
    from: (table) => ({
      update: (values) => ({
        eq: async (column, value) => {
          updates.push({ table, values, column, value });
          return { error: null };
        },
      }),
    }),
  };
};

test('missing Mailgun configuration marks only the scoped inquiry and consumes no attempt', async () => {
  const supabase = fakeSupabase();
  const result = await processInquiryNotificationBatch(supabase, {
    inquiryId: INQUIRY_ID,
    mailgunConfig: null,
    updateWorkerLedger: false,
  });

  assert.equal(result.state, 'configuration_required');
  assert.deepEqual(supabase.rpcCalls.map(({ name }) => name), [
    'mark_inquiry_notification_configuration_required',
  ]);
  assert.ok(supabase.updates.some(({ table, value }) => table === 'portal_work_items' && value === 'Connect Mailgun notification delivery'));
  assert.ok(!supabase.updates.some(({ table, value }) => table === 'portal_work_items' && value === 'Automate inquiry notification retries'));
});

test('public intake claims only its inquiry and delivers to the two approved recipients', async () => {
  const claimed = [
    delivery('22222222-2222-4222-8222-222222222222', 'dev@codecity.ai'),
    delivery('33333333-3333-4333-8333-333333333333', 'aytamzid@airdropja.com'),
  ];
  const supabase = fakeSupabase({ claimed });
  const fetchCalls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return new Response(JSON.stringify({ id: '<provider-id>' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await processInquiryNotificationBatch(supabase, {
      batchSize: 2,
      inquiryId: INQUIRY_ID,
      mailgunConfig,
      updateWorkerLedger: false,
    });

    assert.equal(result.accepted, 2);
    const claim = supabase.rpcCalls.find(({ name }) => name === 'claim_inquiry_notification_deliveries');
    assert.equal(claim.args.p_inquiry_id, INQUIRY_ID);
    assert.equal(claim.args.p_batch_size, 2);
    assert.deepEqual(fetchCalls.map(({ options }) => options.body.get('to')).sort(), [
      'aytamzid@airdropja.com',
      'dev@codecity.ai',
    ]);
    assert.equal(supabase.rpcCalls.filter(({ name }) => name === 'finalize_inquiry_notification_delivery').length, 2);
    assert.ok(!supabase.updates.some(({ table, value }) => table === 'portal_work_items' && value === 'Automate inquiry notification retries'));
    const mailgunLedger = supabase.updates.find(({ table, value }) => (
      table === 'portal_work_items' && value === 'Connect Mailgun notification delivery'
    ));
    assert.equal(mailgunLedger.values.status, 'completed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('an idle scheduled run completes only the worker ledger', async () => {
  const supabase = fakeSupabase();
  const result = await processInquiryNotificationBatch(supabase, { mailgunConfig });

  assert.equal(result.state, 'idle');
  const workerLedger = supabase.updates.find(({ table, value }) => (
    table === 'portal_work_items' && value === 'Automate inquiry notification retries'
  ));
  assert.equal(workerLedger.values.status, 'completed');
  assert.ok(!supabase.updates.some(({ table, value }) => (
    table === 'portal_work_items' && value === 'Connect Mailgun notification delivery'
  )));
});

test('one unexpected delivery failure does not prevent another claim from finalizing', async () => {
  const claimed = [
    delivery('44444444-4444-4444-8444-444444444444', 'dev@codecity.ai'),
    delivery('55555555-5555-4555-8555-555555555555', 'aytamzid@airdropja.com'),
  ];
  const supabase = fakeSupabase({
    claimed,
    rpcOverride: async (name, args) => {
      if (name === 'finalize_inquiry_notification_delivery' && args.p_delivery_id === claimed[0].delivery_id) {
        throw new Error('simulated finalization crash');
      }
      return null;
    },
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: '<provider-id>' }), { status: 200 });

  try {
    const result = await processInquiryNotificationBatch(supabase, {
      mailgunConfig,
      updateWorkerLedger: false,
    });

    assert.equal(result.workerErrors, 1);
    assert.equal(result.accepted, 1);
    assert.equal(supabase.rpcCalls.filter(({ name }) => name === 'finalize_inquiry_notification_delivery').length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
