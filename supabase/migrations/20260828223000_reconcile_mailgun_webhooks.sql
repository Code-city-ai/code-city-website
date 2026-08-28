-- Signed Mailgun webhook ingestion and durable delivery reconciliation.
--
-- The public Edge Function verifies Mailgun's HTTP webhook signature before it
-- reaches this service-only RPC. This database boundary still validates every
-- normalized field, records a replay-safe event ledger, and serializes each
-- delivery transition in one short transaction.

alter table public.inquiry_notification_deliveries
  add column if not exists provider_event_at timestamptz,
  add column if not exists provider_event_id text;

alter table public.inquiry_notification_deliveries
  add constraint inquiry_notification_deliveries_provider_event_id_length
  check (provider_event_id is null or char_length(provider_event_id) <= 500);

create index if not exists inquiry_notification_deliveries_provider_event_idx
  on public.inquiry_notification_deliveries (provider, provider_event_id)
  where provider_event_id is not null;

create table public.mailgun_webhook_events (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,
  event_id text not null,
  domain text not null,
  delivery_id uuid not null,
  recipient text not null,
  provider_message_id text,
  event_type text not null,
  severity text,
  provider_event_at timestamptz not null,
  failure_detail text,
  processing_result text not null default 'received',
  applied_status text,
  received_at timestamptz not null default clock_timestamp(),
  processed_at timestamptz,
  constraint mailgun_webhook_events_token_hash_unique unique (token_hash),
  constraint mailgun_webhook_events_domain_event_unique unique (domain, event_id),
  constraint mailgun_webhook_events_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint mailgun_webhook_events_domain_allowed check (domain = 'mg.codecity.ai'),
  constraint mailgun_webhook_events_recipient_allowed check (
    recipient in ('dev@codecity.ai', 'aytamzid@airdropja.com')
  ),
  constraint mailgun_webhook_events_type_allowed check (event_type in ('accepted', 'delivered', 'failed')),
  constraint mailgun_webhook_events_severity_allowed check (
    (event_type in ('accepted', 'delivered') and severity is null)
    or (event_type = 'failed' and severity in ('temporary', 'permanent'))
  ),
  constraint mailgun_webhook_events_processing_result_allowed check (
    processing_result in (
      'received',
      'applied',
      'ignored_temporary',
      'ignored_out_of_order',
      'ignored_terminal',
      'unmatched_delivery',
      'mismatched_delivery'
    )
  ),
  constraint mailgun_webhook_events_applied_status_allowed check (
    applied_status is null or applied_status in ('accepted', 'delivered', 'bounced')
  ),
  constraint mailgun_webhook_events_lengths check (
    char_length(event_id) between 1 and 500
    and char_length(domain) between 3 and 253
    and char_length(recipient) between 3 and 254
    and (provider_message_id is null or char_length(provider_message_id) <= 500)
    and (failure_detail is null or char_length(failure_detail) <= 500)
  )
);

create index mailgun_webhook_events_delivery_time_idx
  on public.mailgun_webhook_events (delivery_id, provider_event_at desc, received_at desc);

create index mailgun_webhook_events_processing_result_idx
  on public.mailgun_webhook_events (processing_result, received_at desc);

alter table public.mailgun_webhook_events enable row level security;
alter table public.mailgun_webhook_events force row level security;

revoke all on table public.mailgun_webhook_events from public, anon, authenticated;
grant select on table public.mailgun_webhook_events to authenticated;
grant select, insert, update, delete on table public.mailgun_webhook_events to service_role;

create policy mailgun_webhook_events_staff_select on public.mailgun_webhook_events
  for select to authenticated
  using ((select public.is_code_city_staff()));

create or replace function public.reconcile_mailgun_delivery_event(
  p_token_hash text,
  p_event_id text,
  p_domain text,
  p_delivery_id uuid,
  p_recipient text,
  p_provider_message_id text,
  p_event_type text,
  p_severity text,
  p_provider_event_at timestamptz,
  p_failure_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_row_id uuid;
  v_delivery public.inquiry_notification_deliveries%rowtype;
  v_result text;
  v_target_status text;
  v_normalized_message_id text;
  v_stored_message_id text;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;

  p_token_hash := lower(btrim(coalesce(p_token_hash, '')));
  p_event_id := btrim(coalesce(p_event_id, ''));
  p_domain := lower(btrim(coalesce(p_domain, '')));
  p_recipient := lower(btrim(coalesce(p_recipient, '')));
  p_provider_message_id := nullif(btrim(coalesce(p_provider_message_id, '')), '');
  p_event_type := lower(btrim(coalesce(p_event_type, '')));
  p_severity := nullif(lower(btrim(coalesce(p_severity, ''))), '');
  p_failure_detail := nullif(left(btrim(coalesce(p_failure_detail, '')), 500), '');

  if p_token_hash !~ '^[0-9a-f]{64}$'
    or char_length(p_event_id) not between 1 and 500
    or p_domain <> 'mg.codecity.ai'
    or p_delivery_id is null
    or p_recipient not in ('dev@codecity.ai', 'aytamzid@airdropja.com')
    or char_length(coalesce(p_provider_message_id, '')) > 500
    or p_event_type not in ('accepted', 'delivered', 'failed')
    or (
      (p_event_type in ('accepted', 'delivered') and p_severity is not null)
      or (p_event_type = 'failed' and p_severity not in ('temporary', 'permanent'))
    )
    or p_provider_event_at is null
    or p_provider_event_at < clock_timestamp() - interval '31 days'
    or p_provider_event_at > clock_timestamp() + interval '5 minutes'
  then
    raise exception using errcode = '22023', message = 'Invalid normalized Mailgun event';
  end if;

  insert into public.mailgun_webhook_events (
    token_hash,
    event_id,
    domain,
    delivery_id,
    recipient,
    provider_message_id,
    event_type,
    severity,
    provider_event_at,
    failure_detail
  ) values (
    p_token_hash,
    p_event_id,
    p_domain,
    p_delivery_id,
    p_recipient,
    p_provider_message_id,
    p_event_type,
    p_severity,
    p_provider_event_at,
    p_failure_detail
  )
  on conflict do nothing
  returning id into v_event_row_id;

  if v_event_row_id is null then
    return jsonb_build_object(
      'result', 'duplicate',
      'applied', false,
      'deliveryId', p_delivery_id
    );
  end if;

  select delivery.*
  into v_delivery
  from public.inquiry_notification_deliveries as delivery
  where delivery.id = p_delivery_id
  for update;

  if not found then
    update public.mailgun_webhook_events
    set processing_result = 'unmatched_delivery', processed_at = clock_timestamp()
    where id = v_event_row_id;

    return jsonb_build_object(
      'result', 'unmatched_delivery',
      'applied', false,
      'deliveryId', p_delivery_id
    );
  end if;

  v_normalized_message_id := lower(btrim(coalesce(p_provider_message_id, ''), '<>'));
  v_stored_message_id := lower(btrim(coalesce(v_delivery.provider_message_id, ''), '<>'));

  if v_delivery.provider <> 'mailgun'
    or lower(v_delivery.recipient) <> p_recipient
    or (
      v_stored_message_id <> ''
      and v_normalized_message_id <> ''
      and v_stored_message_id <> v_normalized_message_id
    )
  then
    update public.mailgun_webhook_events
    set processing_result = 'mismatched_delivery', processed_at = clock_timestamp()
    where id = v_event_row_id;

    return jsonb_build_object(
      'result', 'mismatched_delivery',
      'applied', false,
      'deliveryId', p_delivery_id
    );
  end if;

  if v_delivery.provider_event_at is not null
    and p_provider_event_at < v_delivery.provider_event_at
  then
    v_result := 'ignored_out_of_order';
  elsif v_delivery.status in ('delivered', 'bounced') then
    v_result := 'ignored_terminal';
  elsif p_event_type = 'failed' and p_severity = 'temporary' then
    v_result := 'ignored_temporary';
  else
    v_result := 'applied';
    v_target_status := case
      when p_event_type = 'accepted' then 'accepted'
      when p_event_type = 'delivered' then 'delivered'
      when p_event_type = 'failed' and p_severity = 'permanent' then 'bounced'
      else null
    end;

    update public.inquiry_notification_deliveries
    set
      status = v_target_status,
      provider_message_id = coalesce(p_provider_message_id, provider_message_id),
      provider_event_id = p_event_id,
      provider_event_at = p_provider_event_at,
      last_error = case when v_target_status = 'bounced' then p_failure_detail else null end,
      accepted_at = case
        when v_target_status in ('accepted', 'delivered') then coalesce(accepted_at, p_provider_event_at)
        else accepted_at
      end,
      delivered_at = case when v_target_status = 'delivered' then p_provider_event_at else delivered_at end,
      failed_at = case when v_target_status = 'bounced' then p_provider_event_at else null end,
      updated_at = clock_timestamp()
    where id = p_delivery_id;

    perform public.refresh_inquiry_notification_status(v_delivery.inquiry_id);
  end if;

  update public.mailgun_webhook_events
  set
    processing_result = v_result,
    applied_status = case when v_result = 'applied' then v_target_status else null end,
    processed_at = clock_timestamp()
  where id = v_event_row_id;

  return jsonb_build_object(
    'result', v_result,
    'applied', v_result = 'applied',
    'deliveryId', p_delivery_id,
    'inquiryId', v_delivery.inquiry_id,
    'status', case when v_result = 'applied' then v_target_status else v_delivery.status end
  );
end;
$$;

revoke all on function public.reconcile_mailgun_delivery_event(
  text, text, text, uuid, text, text, text, text, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.reconcile_mailgun_delivery_event(
  text, text, text, uuid, text, text, text, text, timestamptz, text
) to service_role;

comment on table public.mailgun_webhook_events is
  'Narrow signed Mailgun event ledger. Stores replay hashes and normalized delivery metadata only; raw payloads and signatures are never retained.';
comment on function public.reconcile_mailgun_delivery_event(
  text, text, text, uuid, text, text, text, text, timestamptz, text
) is
  'Service-only, replay-safe Mailgun delivery reconciliation. Serializes delivery updates, prevents terminal or out-of-order regression, and refreshes the inquiry-level notification status.';

insert into public.portal_work_items (
  area,
  title,
  description,
  status,
  priority,
  blocked_reason,
  sort_order
)
select
  'Email',
  'Reconcile Mailgun delivery events',
  'Verify signed Mailgun delivery events, prevent replay, and reconcile accepted, delivered, temporary-failure, and permanent-bounce evidence into the inquiry outbox.',
  'in_progress',
  'critical',
  'Deploy the webhook function, store the separate Mailgun signing key, register the domain webhooks, and verify a real dual-recipient delivery.',
  27
where not exists (
  select 1
  from public.portal_work_items
  where title = 'Reconcile Mailgun delivery events'
);

update public.marketing_integrations
set
  public_config = public_config || jsonb_build_object(
    'delivery_reconciliation', 'signed_webhooks',
    'webhook_events', jsonb_build_array('accepted', 'delivered', 'temporary_fail', 'permanent_fail')
  ),
  updated_at = clock_timestamp()
where slug = 'mailgun';
