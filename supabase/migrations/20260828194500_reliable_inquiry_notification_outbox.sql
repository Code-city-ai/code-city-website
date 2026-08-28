-- Durable inquiry intake and Mailgun outbox claiming.
--
-- The public website remains unable to read or write either table directly.
-- Both RPCs are server-only and must be called with the Supabase service role.

create index if not exists inquiry_notification_deliveries_retry_queue_idx
  on public.inquiry_notification_deliveries (status, last_attempt_at, created_at, id)
  include (attempts)
  where provider = 'mailgun'
    and recipient in ('dev@codecity.ai', 'aytamzid@airdropja.com')
    and status in ('queued', 'failed', 'attempting');

alter table public.inquiry_notification_deliveries
  drop constraint if exists inquiry_notification_deliveries_mailgun_recipient_allowed;
alter table public.inquiry_notification_deliveries
  add constraint inquiry_notification_deliveries_mailgun_recipient_allowed check (
    provider <> 'mailgun'
    or recipient in ('dev@codecity.ai', 'aytamzid@airdropja.com')
  );

create or replace function public.create_inquiry_with_notification_outbox(
  p_submission_key uuid,
  p_name text,
  p_email text,
  p_project_type text,
  p_message text,
  p_organization text default null,
  p_budget_range text default null,
  p_source_url text default null,
  p_attribution_captured_at timestamptz default null,
  p_visitor_key uuid default null,
  p_session_key uuid default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_gclid text default null,
  p_fbclid text default null,
  p_msclkid text default null,
  p_ttclid text default null,
  p_campaign_external_id text default null,
  p_adset_external_id text default null,
  p_ad_external_id text default null,
  p_referrer text default null
)
returns table (
  inquiry_id uuid,
  duplicate boolean,
  notification_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inquiry_id uuid;
  v_inserted boolean := false;
  v_notification_status text;
  v_existing public.project_inquiries%rowtype;
begin
  if p_submission_key is null then
    raise exception using
      errcode = '22023',
      message = 'p_submission_key is required for idempotent inquiry intake';
  end if;

  insert into public.project_inquiries as inquiry (
    submission_key,
    name,
    email,
    organization,
    project_type,
    budget_range,
    message,
    source_url,
    attribution_captured_at,
    visitor_key,
    session_key,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    gclid,
    fbclid,
    msclkid,
    ttclid,
    campaign_external_id,
    adset_external_id,
    ad_external_id,
    referrer,
    notification_status,
    notification_error
  )
  values (
    p_submission_key,
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(p_organization), ''),
    btrim(p_project_type),
    nullif(btrim(p_budget_range), ''),
    btrim(p_message),
    nullif(btrim(p_source_url), ''),
    p_attribution_captured_at,
    p_visitor_key,
    p_session_key,
    nullif(btrim(p_utm_source), ''),
    nullif(btrim(p_utm_medium), ''),
    nullif(btrim(p_utm_campaign), ''),
    nullif(btrim(p_utm_content), ''),
    nullif(btrim(p_utm_term), ''),
    nullif(btrim(p_gclid), ''),
    nullif(btrim(p_fbclid), ''),
    nullif(btrim(p_msclkid), ''),
    nullif(btrim(p_ttclid), ''),
    nullif(btrim(p_campaign_external_id), ''),
    nullif(btrim(p_adset_external_id), ''),
    nullif(btrim(p_ad_external_id), ''),
    nullif(btrim(p_referrer), ''),
    'not_attempted',
    null
  )
  on conflict (submission_key) where submission_key is not null
  do nothing
  returning inquiry.id, inquiry.notification_status
    into v_inquiry_id, v_notification_status;

  v_inserted := found;

  if not v_inserted then
    select pi.*
      into v_existing
    from public.project_inquiries as pi
    where pi.submission_key = p_submission_key;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'Inquiry idempotency conflict could not be resolved';
    end if;

    if row(
      v_existing.name,
      v_existing.email,
      v_existing.organization,
      v_existing.project_type,
      v_existing.budget_range,
      v_existing.message
    ) is distinct from row(
      btrim(p_name),
      lower(btrim(p_email)),
      nullif(btrim(p_organization), ''),
      btrim(p_project_type),
      nullif(btrim(p_budget_range), ''),
      btrim(p_message)
    ) then
      raise exception using
        errcode = '22023',
        message = 'p_submission_key is already bound to a different inquiry payload';
    end if;

    v_inquiry_id := v_existing.id;
    v_notification_status := v_existing.notification_status;
  end if;

  insert into public.inquiry_notification_deliveries (
    inquiry_id,
    provider,
    recipient,
    status
  )
  select
    v_inquiry_id,
    'mailgun',
    recipients.recipient,
    'queued'
  from unnest(array[
    'dev@codecity.ai'::text,
    'aytamzid@airdropja.com'::text
  ]) as recipients(recipient)
  on conflict (inquiry_id, provider, recipient) do nothing;

  return query
  select v_inquiry_id, not v_inserted, v_notification_status;
end;
$$;

revoke all on function public.create_inquiry_with_notification_outbox(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.create_inquiry_with_notification_outbox(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

comment on function public.create_inquiry_with_notification_outbox(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) is
  'Service-only idempotent inquiry intake. Atomically stores one inquiry, rejects submission-key reuse with changed inquiry content, and queues exactly the two approved Code City Mailgun recipients without resetting existing delivery evidence.';

create or replace function public.refresh_inquiry_notification_status(p_inquiry_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total integer;
  v_accepted integer;
  v_delivered integer;
  v_failed integer;
  v_bounced integer;
  v_queued integer;
  v_attempting integer;
  v_delivery_error text;
  v_status text;
begin
  -- The parent-row lock serializes rollups from concurrent per-recipient workers.
  perform 1 from public.project_inquiries where id = p_inquiry_id for update;
  if not found then return null; end if;

  select
    count(*),
    count(*) filter (where status = 'accepted'),
    count(*) filter (where status = 'delivered'),
    count(*) filter (where status = 'failed'),
    count(*) filter (where status = 'bounced'),
    count(*) filter (where status = 'queued'),
    count(*) filter (where status = 'attempting'),
    max(last_error) filter (where status in ('failed', 'bounced', 'queued'))
  into v_total, v_accepted, v_delivered, v_failed, v_bounced, v_queued, v_attempting, v_delivery_error
  from public.inquiry_notification_deliveries
  where inquiry_id = p_inquiry_id
    and provider = 'mailgun'
    and recipient in ('dev@codecity.ai', 'aytamzid@airdropja.com');

  v_status := case
    when v_total > 0 and v_delivered = v_total then 'sent'
    when v_total > 0 and v_accepted + v_delivered = v_total then 'accepted'
    when v_attempting > 0 then 'sending'
    when v_failed + v_bounced > 0 then 'failed'
    when v_queued > 0 then 'configuration_required'
    else 'not_attempted'
  end;

  update public.project_inquiries
  set
    notification_status = v_status,
    notification_error = case when v_status in ('accepted', 'sent') then null else left(v_delivery_error, 500) end,
    notified_at = case when v_status in ('accepted', 'sent') then coalesce(notified_at, clock_timestamp()) else notified_at end
  where id = p_inquiry_id;

  return v_status;
end;
$$;

revoke all on function public.refresh_inquiry_notification_status(uuid) from public, anon, authenticated;
grant execute on function public.refresh_inquiry_notification_status(uuid) to service_role;

comment on function public.refresh_inquiry_notification_status(uuid) is
  'Service-only serialized rollup from per-recipient delivery state to the inquiry notification summary.';

create or replace function public.mark_inquiry_notification_configuration_required(p_inquiry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_has_pending boolean;
  v_max_attempts constant integer := 5;
begin
  perform 1 from public.project_inquiries where id = p_inquiry_id for update;
  if not found then return false; end if;

  if exists (
    select 1
    from public.inquiry_notification_deliveries as delivery
    where delivery.inquiry_id = p_inquiry_id
      and delivery.provider = 'mailgun'
      and delivery.status = 'attempting'
  ) then
    perform public.refresh_inquiry_notification_status(p_inquiry_id);
    return false;
  end if;

  select exists (
    select 1
    from public.inquiry_notification_deliveries as delivery
    where delivery.inquiry_id = p_inquiry_id
      and delivery.provider = 'mailgun'
      and delivery.recipient in ('dev@codecity.ai', 'aytamzid@airdropja.com')
      and delivery.status in ('queued', 'failed')
      and delivery.attempts < v_max_attempts
  ) into v_has_pending;

  if not v_has_pending then
    perform public.refresh_inquiry_notification_status(p_inquiry_id);
    return false;
  end if;

  update public.project_inquiries
  set
    notification_status = 'configuration_required',
    notification_error = 'Mailgun server secrets are not configured.'
  where id = p_inquiry_id;

  return true;
end;
$$;

revoke all on function public.mark_inquiry_notification_configuration_required(uuid) from public, anon, authenticated;
grant execute on function public.mark_inquiry_notification_configuration_required(uuid) to service_role;

comment on function public.mark_inquiry_notification_configuration_required(uuid) is
  'Service-only Mailgun configuration gate. Leaves queued attempts untouched so credentials can be added without exhausting delivery retries.';

create or replace function public.claim_inquiry_notification_deliveries(
  p_batch_size integer default 10,
  p_max_attempts integer default 5,
  p_stale_after_seconds integer default 300,
  p_base_backoff_seconds integer default 60,
  p_inquiry_id uuid default null
)
returns table (
  delivery_id uuid,
  inquiry_id uuid,
  recipient text,
  attempt_number integer,
  name text,
  email text,
  organization text,
  project_type text,
  budget_range text,
  message text,
  source_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_exhausted record;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 50 then
    raise exception using
      errcode = '22023',
      message = 'p_batch_size must be between 1 and 50';
  end if;

  if p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 10 then
    raise exception using
      errcode = '22023',
      message = 'p_max_attempts must be between 1 and 10';
  end if;

  if p_stale_after_seconds is null
    or p_stale_after_seconds < 60
    or p_stale_after_seconds > 3600
  then
    raise exception using
      errcode = '22023',
      message = 'p_stale_after_seconds must be between 60 and 3600';
  end if;

  if p_base_backoff_seconds is null
    or p_base_backoff_seconds < 10
    or p_base_backoff_seconds > 3600
  then
    raise exception using
      errcode = '22023',
      message = 'p_base_backoff_seconds must be between 10 and 3600';
  end if;

  -- A worker that died on its final lease must not leave the row indefinitely
  -- in attempting. This normalization does not make the row retryable again.
  for v_exhausted in
    with exhausted as (
      update public.inquiry_notification_deliveries as delivery
      set
        status = 'failed',
        last_error = coalesce(delivery.last_error, 'Maximum notification delivery attempts reached.'),
        failed_at = coalesce(delivery.failed_at, v_now),
        updated_at = v_now
      where delivery.attempts >= p_max_attempts
        and delivery.provider = 'mailgun'
        and delivery.recipient in ('dev@codecity.ai', 'aytamzid@airdropja.com')
        and (p_inquiry_id is null or delivery.inquiry_id = p_inquiry_id)
        and (
          delivery.status = 'queued'
          or (
            delivery.status = 'attempting'
            and (
              delivery.last_attempt_at is null
              or delivery.last_attempt_at <= v_now - make_interval(secs => p_stale_after_seconds)
            )
          )
        )
      returning delivery.inquiry_id
    )
    select distinct exhausted.inquiry_id from exhausted
  loop
    perform public.refresh_inquiry_notification_status(v_exhausted.inquiry_id);
  end loop;

  return query
  with candidates as materialized (
    select deliveries.id
    from public.inquiry_notification_deliveries as deliveries
    where deliveries.attempts < p_max_attempts
      and deliveries.provider = 'mailgun'
      and (p_inquiry_id is null or deliveries.inquiry_id = p_inquiry_id)
      and deliveries.recipient in ('dev@codecity.ai', 'aytamzid@airdropja.com')
      and (
        (
          deliveries.status in ('queued', 'failed')
          and (
            deliveries.last_attempt_at is null
            or deliveries.last_attempt_at <= v_now - make_interval(
              secs => least(
                  86400::numeric,
                  p_base_backoff_seconds::numeric
                    * power(2::numeric, greatest(deliveries.attempts - 1, 0))
                )::double precision
            )
          )
        )
        or (
          deliveries.status = 'attempting'
          and (
            deliveries.last_attempt_at is null
            or deliveries.last_attempt_at <= v_now - make_interval(secs => p_stale_after_seconds)
          )
        )
      )
    order by
      coalesce(deliveries.last_attempt_at, deliveries.created_at),
      deliveries.created_at,
      deliveries.id
    for update of deliveries skip locked
    limit p_batch_size
  ),
  claimed as (
    update public.inquiry_notification_deliveries as deliveries
    set
      status = 'attempting',
      attempts = deliveries.attempts + 1,
      last_attempt_at = v_now,
      last_error = null,
      failed_at = null,
      updated_at = v_now
    from candidates
    where deliveries.id = candidates.id
    returning
      deliveries.id,
      deliveries.inquiry_id,
      deliveries.recipient,
      deliveries.attempts
  ),
  refreshed_parents as (
    update public.project_inquiries as inquiry
    set
      notification_status = 'sending',
      notification_error = null
    where inquiry.id in (select distinct claimed.inquiry_id from claimed)
    returning inquiry.id
  )
  select
    claimed.id,
    claimed.inquiry_id,
    claimed.recipient,
    claimed.attempts,
    inquiries.name,
    inquiries.email,
    inquiries.organization,
    inquiries.project_type,
    inquiries.budget_range,
    inquiries.message,
    inquiries.source_url,
    inquiries.created_at
  from claimed
  join public.project_inquiries as inquiries
    on inquiries.id = claimed.inquiry_id
  cross join (select count(*) from refreshed_parents) as parent_refresh
  order by claimed.id;
end;
$$;

revoke all on function public.claim_inquiry_notification_deliveries(
  integer,
  integer,
  integer,
  integer,
  uuid
) from public, anon, authenticated;
grant execute on function public.claim_inquiry_notification_deliveries(
  integer,
  integer,
  integer,
  integer,
  uuid
) to service_role;

comment on function public.claim_inquiry_notification_deliveries(
  integer,
  integer,
  integer,
  integer,
  uuid
) is
  'Service-only nonblocking Mailgun outbox claim. Uses row locks with SKIP LOCKED, stale-lease recovery, capped exponential backoff, and a bounded attempt count. Network delivery must occur after commit, and finalization must compare delivery_id plus attempt_number against the still-attempting row.';

create or replace function public.finalize_inquiry_notification_delivery(
  p_delivery_id uuid,
  p_attempt_number integer,
  p_status text,
  p_provider_message_id text default null,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inquiry_id uuid;
  v_now timestamptz := clock_timestamp();
  v_updated integer;
begin
  if p_status not in ('accepted', 'failed', 'queued')
    or p_attempt_number is null
    or p_attempt_number < 1
    or char_length(coalesce(p_provider_message_id, '')) > 500
    or char_length(coalesce(p_error, '')) > 500
  then
    raise exception using errcode = '22023', message = 'Invalid notification finalization payload';
  end if;

  update public.inquiry_notification_deliveries as delivery
  set
    status = p_status,
    provider_message_id = case when p_status = 'accepted' then nullif(p_provider_message_id, '') else delivery.provider_message_id end,
    last_error = case when p_status = 'accepted' then null else nullif(p_error, '') end,
    accepted_at = case when p_status = 'accepted' then v_now else delivery.accepted_at end,
    failed_at = case when p_status = 'failed' then v_now when p_status = 'accepted' then null else delivery.failed_at end,
    updated_at = v_now
  where delivery.id = p_delivery_id
    and delivery.status = 'attempting'
    and delivery.attempts = p_attempt_number
  returning delivery.inquiry_id into v_inquiry_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then return false; end if;

  perform public.refresh_inquiry_notification_status(v_inquiry_id);

  return true;
end;
$$;

revoke all on function public.finalize_inquiry_notification_delivery(
  uuid, integer, text, text, text
) from public, anon, authenticated;
grant execute on function public.finalize_inquiry_notification_delivery(
  uuid, integer, text, text, text
) to service_role;

comment on function public.finalize_inquiry_notification_delivery(
  uuid, integer, text, text, text
) is
  'Service-only compare-and-set finalizer for one leased notification delivery. Rejects stale workers and maintains the inquiry-level notification summary.';

comment on index public.inquiry_notification_deliveries_retry_queue_idx is
  'Partial worker-queue index for retryable or stale Mailgun delivery claims.';
