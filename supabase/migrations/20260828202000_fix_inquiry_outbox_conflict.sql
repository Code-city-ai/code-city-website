-- Resolve the output-column/table-column ambiguity in the outbox upsert.
-- The named constraint keeps the idempotent two-recipient insert explicit.

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
  on conflict on constraint inquiry_notification_deliveries_unique do nothing;

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
