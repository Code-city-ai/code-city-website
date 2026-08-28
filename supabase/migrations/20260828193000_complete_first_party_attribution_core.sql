-- Reliable first-party attribution, idempotent inquiry intake, and delivery evidence.

alter table public.project_inquiries
  add column if not exists submission_key uuid,
  add column if not exists attribution_captured_at timestamptz,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists msclkid text,
  add column if not exists ttclid text,
  add column if not exists campaign_external_id text,
  add column if not exists adset_external_id text,
  add column if not exists ad_external_id text,
  add column if not exists marketing_conversion_status text not null default 'pending',
  add column if not exists marketing_conversion_attempted_at timestamptz,
  add column if not exists marketing_conversion_recorded_at timestamptz,
  add column if not exists marketing_conversion_error text;

create unique index if not exists project_inquiries_submission_key_unique_idx
  on public.project_inquiries (submission_key)
  where submission_key is not null;
drop index if exists public.project_inquiries_paid_click_idx;
create index if not exists project_inquiries_gclid_idx
  on public.project_inquiries (gclid, created_at desc) where gclid is not null;
create index if not exists project_inquiries_fbclid_idx
  on public.project_inquiries (fbclid, created_at desc) where fbclid is not null;
create index if not exists project_inquiries_msclkid_idx
  on public.project_inquiries (msclkid, created_at desc) where msclkid is not null;
create index if not exists project_inquiries_ttclid_idx
  on public.project_inquiries (ttclid, created_at desc) where ttclid is not null;

alter table public.project_inquiries
  drop constraint if exists project_inquiries_ad_identity_lengths;
alter table public.project_inquiries
  add constraint project_inquiries_ad_identity_lengths check (
    (gclid is null or char_length(gclid) <= 255)
    and (fbclid is null or char_length(fbclid) <= 255)
    and (msclkid is null or char_length(msclkid) <= 255)
    and (ttclid is null or char_length(ttclid) <= 255)
    and (campaign_external_id is null or char_length(campaign_external_id) <= 255)
    and (adset_external_id is null or char_length(adset_external_id) <= 255)
    and (ad_external_id is null or char_length(ad_external_id) <= 255)
    and (marketing_conversion_error is null or char_length(marketing_conversion_error) <= 500)
  );

alter table public.project_inquiries
  drop constraint if exists project_inquiries_marketing_conversion_status_allowed;
alter table public.project_inquiries
  add constraint project_inquiries_marketing_conversion_status_allowed check (
    marketing_conversion_status in ('pending', 'recorded', 'failed', 'not_applicable')
  );

alter table public.project_inquiries
  drop constraint if exists project_inquiries_notification_status_allowed;
alter table public.project_inquiries
  add constraint project_inquiries_notification_status_allowed check (
    notification_status in ('not_attempted', 'configuration_required', 'sending', 'accepted', 'sent', 'failed')
  );

alter table public.marketing_visitors
  add column if not exists first_touch_at timestamptz,
  add column if not exists last_touch_at timestamptz,
  add column if not exists last_touch_path text,
  add column if not exists last_touch_referrer text,
  add column if not exists first_touch_gclid text,
  add column if not exists first_touch_fbclid text,
  add column if not exists first_touch_msclkid text,
  add column if not exists first_touch_ttclid text,
  add column if not exists first_touch_campaign_external_id text,
  add column if not exists first_touch_adset_external_id text,
  add column if not exists first_touch_ad_external_id text,
  add column if not exists last_touch_gclid text,
  add column if not exists last_touch_fbclid text,
  add column if not exists last_touch_msclkid text,
  add column if not exists last_touch_ttclid text,
  add column if not exists last_touch_campaign_external_id text,
  add column if not exists last_touch_adset_external_id text,
  add column if not exists last_touch_ad_external_id text;

alter table public.marketing_sessions
  add column if not exists attribution_captured_at timestamptz,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists msclkid text,
  add column if not exists ttclid text,
  add column if not exists campaign_external_id text,
  add column if not exists adset_external_id text,
  add column if not exists ad_external_id text;

alter table public.marketing_visitors
  drop constraint if exists marketing_visitors_ad_identity_lengths;
alter table public.marketing_visitors
  add constraint marketing_visitors_ad_identity_lengths check (
    char_length(coalesce(first_touch_gclid, '')) <= 255
    and char_length(coalesce(first_touch_fbclid, '')) <= 255
    and char_length(coalesce(first_touch_msclkid, '')) <= 255
    and char_length(coalesce(first_touch_ttclid, '')) <= 255
    and char_length(coalesce(first_touch_campaign_external_id, '')) <= 255
    and char_length(coalesce(first_touch_adset_external_id, '')) <= 255
    and char_length(coalesce(first_touch_ad_external_id, '')) <= 255
    and char_length(coalesce(last_touch_gclid, '')) <= 255
    and char_length(coalesce(last_touch_fbclid, '')) <= 255
    and char_length(coalesce(last_touch_msclkid, '')) <= 255
    and char_length(coalesce(last_touch_ttclid, '')) <= 255
    and char_length(coalesce(last_touch_campaign_external_id, '')) <= 255
    and char_length(coalesce(last_touch_adset_external_id, '')) <= 255
    and char_length(coalesce(last_touch_ad_external_id, '')) <= 255
  );

alter table public.marketing_sessions
  drop constraint if exists marketing_sessions_ad_identity_lengths;
alter table public.marketing_sessions
  add constraint marketing_sessions_ad_identity_lengths check (
    char_length(coalesce(gclid, '')) <= 255
    and char_length(coalesce(fbclid, '')) <= 255
    and char_length(coalesce(msclkid, '')) <= 255
    and char_length(coalesce(ttclid, '')) <= 255
    and char_length(coalesce(campaign_external_id, '')) <= 255
    and char_length(coalesce(adset_external_id, '')) <= 255
    and char_length(coalesce(ad_external_id, '')) <= 255
  );

-- Repair any historical mismatch before enforcing the session-to-visitor invariant.
update public.marketing_events as event
set visitor_id = session.visitor_id
from public.marketing_sessions as session
where event.session_id = session.id
  and event.visitor_id is distinct from session.visitor_id;

alter table public.marketing_sessions
  drop constraint if exists marketing_sessions_id_visitor_unique;
alter table public.marketing_sessions
  add constraint marketing_sessions_id_visitor_unique unique (id, visitor_id);

alter table public.marketing_events
  alter column visitor_id drop not null,
  alter column session_id drop not null,
  add column if not exists origin text not null default 'browser';

alter table public.marketing_events
  drop constraint if exists marketing_events_origin_allowed;
alter table public.marketing_events
  add constraint marketing_events_origin_allowed check (origin in ('browser', 'server'));

create unique index if not exists marketing_events_inquiry_conversion_unique_idx
  on public.marketing_events (inquiry_id, event_name)
  where inquiry_id is not null;

alter table public.marketing_events
  drop constraint if exists marketing_events_session_visitor_fkey;
alter table public.marketing_events
  add constraint marketing_events_session_visitor_fkey
  foreign key (session_id, visitor_id)
  references public.marketing_sessions (id, visitor_id)
  on delete cascade;

create table if not exists public.inquiry_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.project_inquiries (id) on delete cascade,
  provider text not null default 'mailgun',
  recipient text not null,
  status text not null default 'queued',
  provider_message_id text,
  attempts integer not null default 0,
  last_error text,
  last_attempt_at timestamptz,
  accepted_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiry_notification_deliveries_unique unique (inquiry_id, provider, recipient),
  constraint inquiry_notification_deliveries_provider_allowed check (provider in ('mailgun')),
  constraint inquiry_notification_deliveries_status_allowed check (
    status in ('queued', 'attempting', 'accepted', 'delivered', 'failed', 'bounced')
  ),
  constraint inquiry_notification_deliveries_recipient_length check (char_length(recipient) between 3 and 254),
  constraint inquiry_notification_deliveries_attempts_nonnegative check (attempts >= 0),
  constraint inquiry_notification_deliveries_error_length check (last_error is null or char_length(last_error) <= 500),
  constraint inquiry_notification_deliveries_message_id_length check (provider_message_id is null or char_length(provider_message_id) <= 500)
);

create index if not exists inquiry_notification_deliveries_status_idx
  on public.inquiry_notification_deliveries (status, last_attempt_at);

drop trigger if exists inquiry_notification_deliveries_set_updated_at on public.inquiry_notification_deliveries;
create trigger inquiry_notification_deliveries_set_updated_at
before update on public.inquiry_notification_deliveries
for each row execute function public.set_portal_updated_at();

alter table public.inquiry_notification_deliveries enable row level security;
alter table public.inquiry_notification_deliveries force row level security;
revoke all on table public.inquiry_notification_deliveries from anon, authenticated;
grant select on table public.inquiry_notification_deliveries to authenticated;
grant select, insert, update, delete on table public.inquiry_notification_deliveries to service_role;

drop policy if exists inquiry_notification_deliveries_staff_select on public.inquiry_notification_deliveries;
create policy inquiry_notification_deliveries_staff_select on public.inquiry_notification_deliveries
  for select to authenticated using ((select public.is_code_city_staff()));

create or replace function public.record_marketing_event_v2(
  p_event_id uuid,
  p_visitor_key uuid,
  p_session_key uuid,
  p_event_name text,
  p_occurred_at timestamptz,
  p_path text default null,
  p_referrer text default null,
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
  p_attribution_present boolean default false,
  p_device_type text default 'unknown',
  p_ip_hash text default null,
  p_properties jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visitor_id uuid;
  v_session_id uuid;
  v_window_started_at timestamptz;
  v_request_count integer;
  v_inserted integer;
  v_has_attribution boolean;
begin
  if p_event_name not in (
    'page_viewed', 'session_started', 'session_engaged', 'cta_clicked',
    'contact_form_started', 'contact_form_submitted', 'support_form_started',
    'support_form_submitted', 'inquiry_submitted'
  ) then
    return false;
  end if;

  if p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    return false;
  end if;

  if char_length(coalesce(p_path, '')) > 500
    or char_length(coalesce(p_referrer, '')) > 1000
    or char_length(coalesce(p_utm_source, '')) > 120
    or char_length(coalesce(p_utm_medium, '')) > 120
    or char_length(coalesce(p_utm_campaign, '')) > 190
    or char_length(coalesce(p_utm_content, '')) > 190
    or char_length(coalesce(p_utm_term, '')) > 190
    or char_length(coalesce(p_gclid, '')) > 255
    or char_length(coalesce(p_fbclid, '')) > 255
    or char_length(coalesce(p_msclkid, '')) > 255
    or char_length(coalesce(p_ttclid, '')) > 255
    or char_length(coalesce(p_campaign_external_id, '')) > 255
    or char_length(coalesce(p_adset_external_id, '')) > 255
    or char_length(coalesce(p_ad_external_id, '')) > 255
    or octet_length(coalesce(p_properties, '{}'::jsonb)::text) > 4096
  then
    return false;
  end if;

  if p_device_type not in ('desktop', 'mobile', 'tablet', 'bot', 'unknown') then
    p_device_type := 'unknown';
  end if;

  v_has_attribution := coalesce(p_attribution_present, false);

  v_window_started_at := date_bin(
    interval '10 minutes',
    clock_timestamp(),
    timestamptz '2000-01-01 00:00:00+00'
  );

  insert into public.marketing_event_rate_limits (ip_hash, window_started_at, request_count, last_request_at)
  values (p_ip_hash, v_window_started_at, 1, clock_timestamp())
  on conflict (ip_hash, window_started_at)
  do update set
    request_count = public.marketing_event_rate_limits.request_count + 1,
    last_request_at = clock_timestamp()
  returning request_count into v_request_count;

  if v_request_count > 120 then
    return false;
  end if;

  insert into public.marketing_visitors (
    visitor_key,
    first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content, first_touch_term,
    first_touch_path, first_touch_referrer, first_touch_at,
    first_touch_gclid, first_touch_fbclid, first_touch_msclkid, first_touch_ttclid,
    first_touch_campaign_external_id, first_touch_adset_external_id, first_touch_ad_external_id,
    last_touch_source, last_touch_medium, last_touch_campaign, last_touch_content, last_touch_term,
    last_touch_path, last_touch_referrer, last_touch_at,
    last_touch_gclid, last_touch_fbclid, last_touch_msclkid, last_touch_ttclid,
    last_touch_campaign_external_id, last_touch_adset_external_id, last_touch_ad_external_id,
    first_seen_at, last_seen_at
  ) values (
    p_visitor_key,
    nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''), nullif(p_utm_content, ''), nullif(p_utm_term, ''),
    p_path, p_referrer, case when v_has_attribution then p_occurred_at else null end,
    nullif(p_gclid, ''), nullif(p_fbclid, ''), nullif(p_msclkid, ''), nullif(p_ttclid, ''),
    nullif(p_campaign_external_id, ''), nullif(p_adset_external_id, ''), nullif(p_ad_external_id, ''),
    nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''), nullif(p_utm_content, ''), nullif(p_utm_term, ''),
    p_path, p_referrer, case when v_has_attribution then p_occurred_at else null end,
    nullif(p_gclid, ''), nullif(p_fbclid, ''), nullif(p_msclkid, ''), nullif(p_ttclid, ''),
    nullif(p_campaign_external_id, ''), nullif(p_adset_external_id, ''), nullif(p_ad_external_id, ''),
    p_occurred_at, p_occurred_at
  )
  on conflict (visitor_key) do update set
    first_touch_source = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_source else public.marketing_visitors.first_touch_source end,
    first_touch_medium = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_medium else public.marketing_visitors.first_touch_medium end,
    first_touch_campaign = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_campaign else public.marketing_visitors.first_touch_campaign end,
    first_touch_content = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_content else public.marketing_visitors.first_touch_content end,
    first_touch_term = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_term else public.marketing_visitors.first_touch_term end,
    first_touch_path = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_path else public.marketing_visitors.first_touch_path end,
    first_touch_referrer = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_referrer else public.marketing_visitors.first_touch_referrer end,
    first_touch_at = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_at else public.marketing_visitors.first_touch_at end,
    first_touch_gclid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_gclid else public.marketing_visitors.first_touch_gclid end,
    first_touch_fbclid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_fbclid else public.marketing_visitors.first_touch_fbclid end,
    first_touch_msclkid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_msclkid else public.marketing_visitors.first_touch_msclkid end,
    first_touch_ttclid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_ttclid else public.marketing_visitors.first_touch_ttclid end,
    first_touch_campaign_external_id = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_campaign_external_id else public.marketing_visitors.first_touch_campaign_external_id end,
    first_touch_adset_external_id = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_adset_external_id else public.marketing_visitors.first_touch_adset_external_id end,
    first_touch_ad_external_id = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_ad_external_id else public.marketing_visitors.first_touch_ad_external_id end,
    last_touch_source = case when v_has_attribution then excluded.last_touch_source else public.marketing_visitors.last_touch_source end,
    last_touch_medium = case when v_has_attribution then excluded.last_touch_medium else public.marketing_visitors.last_touch_medium end,
    last_touch_campaign = case when v_has_attribution then excluded.last_touch_campaign else public.marketing_visitors.last_touch_campaign end,
    last_touch_content = case when v_has_attribution then excluded.last_touch_content else public.marketing_visitors.last_touch_content end,
    last_touch_term = case when v_has_attribution then excluded.last_touch_term else public.marketing_visitors.last_touch_term end,
    last_touch_path = case when v_has_attribution then excluded.last_touch_path else public.marketing_visitors.last_touch_path end,
    last_touch_referrer = case when v_has_attribution then excluded.last_touch_referrer else public.marketing_visitors.last_touch_referrer end,
    last_touch_at = case when v_has_attribution then excluded.last_touch_at else public.marketing_visitors.last_touch_at end,
    last_touch_gclid = case when v_has_attribution then excluded.last_touch_gclid else public.marketing_visitors.last_touch_gclid end,
    last_touch_fbclid = case when v_has_attribution then excluded.last_touch_fbclid else public.marketing_visitors.last_touch_fbclid end,
    last_touch_msclkid = case when v_has_attribution then excluded.last_touch_msclkid else public.marketing_visitors.last_touch_msclkid end,
    last_touch_ttclid = case when v_has_attribution then excluded.last_touch_ttclid else public.marketing_visitors.last_touch_ttclid end,
    last_touch_campaign_external_id = case when v_has_attribution then excluded.last_touch_campaign_external_id else public.marketing_visitors.last_touch_campaign_external_id end,
    last_touch_adset_external_id = case when v_has_attribution then excluded.last_touch_adset_external_id else public.marketing_visitors.last_touch_adset_external_id end,
    last_touch_ad_external_id = case when v_has_attribution then excluded.last_touch_ad_external_id else public.marketing_visitors.last_touch_ad_external_id end,
    last_seen_at = greatest(public.marketing_visitors.last_seen_at, excluded.last_seen_at)
  returning id into v_visitor_id;

  insert into public.marketing_sessions (
    session_key, visitor_id, started_at, last_activity_at, landing_path, referrer,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, fbclid, msclkid, ttclid, campaign_external_id, adset_external_id, ad_external_id, attribution_captured_at,
    device_type
  ) values (
    p_session_key, v_visitor_id, p_occurred_at, p_occurred_at, p_path, p_referrer,
    nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''), nullif(p_utm_content, ''), nullif(p_utm_term, ''),
    nullif(p_gclid, ''), nullif(p_fbclid, ''), nullif(p_msclkid, ''), nullif(p_ttclid, ''),
    nullif(p_campaign_external_id, ''), nullif(p_adset_external_id, ''), nullif(p_ad_external_id, ''),
    case when v_has_attribution then p_occurred_at else null end,
    p_device_type
  )
  on conflict (session_key) do update set
    last_activity_at = greatest(public.marketing_sessions.last_activity_at, excluded.last_activity_at),
    utm_source = case when v_has_attribution then excluded.utm_source else public.marketing_sessions.utm_source end,
    utm_medium = case when v_has_attribution then excluded.utm_medium else public.marketing_sessions.utm_medium end,
    utm_campaign = case when v_has_attribution then excluded.utm_campaign else public.marketing_sessions.utm_campaign end,
    utm_content = case when v_has_attribution then excluded.utm_content else public.marketing_sessions.utm_content end,
    utm_term = case when v_has_attribution then excluded.utm_term else public.marketing_sessions.utm_term end,
    gclid = case when v_has_attribution then excluded.gclid else public.marketing_sessions.gclid end,
    fbclid = case when v_has_attribution then excluded.fbclid else public.marketing_sessions.fbclid end,
    msclkid = case when v_has_attribution then excluded.msclkid else public.marketing_sessions.msclkid end,
    ttclid = case when v_has_attribution then excluded.ttclid else public.marketing_sessions.ttclid end,
    campaign_external_id = case when v_has_attribution then excluded.campaign_external_id else public.marketing_sessions.campaign_external_id end,
    adset_external_id = case when v_has_attribution then excluded.adset_external_id else public.marketing_sessions.adset_external_id end,
    ad_external_id = case when v_has_attribution then excluded.ad_external_id else public.marketing_sessions.ad_external_id end
    , attribution_captured_at = case when v_has_attribution then excluded.attribution_captured_at else public.marketing_sessions.attribution_captured_at end
  where public.marketing_sessions.visitor_id = excluded.visitor_id
  returning id into v_session_id;

  if v_session_id is null then
    return false;
  end if;

  insert into public.marketing_events (
    event_id, visitor_id, session_id, event_name, path, referrer, properties, occurred_at, origin
  ) values (
    p_event_id, v_visitor_id, v_session_id, p_event_name, p_path, p_referrer,
    coalesce(p_properties, '{}'::jsonb), p_occurred_at, 'browser'
  )
  on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.marketing_sessions
    set
      events_count = events_count + 1,
      pageviews = pageviews + case when p_event_name = 'page_viewed' then 1 else 0 end,
      last_activity_at = greatest(last_activity_at, p_occurred_at)
    where id = v_session_id;
  end if;

  return v_inserted = 1;
end;
$$;

revoke all on function public.record_marketing_event_v2(
  uuid, uuid, uuid, text, timestamptz,
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_marketing_event_v2(
  uuid, uuid, uuid, text, timestamptz,
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, jsonb
) to service_role;

-- Keep the currently deployed collector compatible during rollout, while routing
-- it through the corrected visitor/session invariant.
create or replace function public.record_marketing_event(
  p_event_id uuid,
  p_visitor_key uuid,
  p_session_key uuid,
  p_event_name text,
  p_occurred_at timestamptz,
  p_path text default null,
  p_referrer text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_device_type text default 'unknown',
  p_ip_hash text default null,
  p_properties jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.record_marketing_event_v2(
    p_event_id, p_visitor_key, p_session_key, p_event_name, p_occurred_at,
    p_path, p_referrer, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    null, null, null, null, null, null, null,
    coalesce(
      nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''),
      nullif(p_utm_content, ''), nullif(p_utm_term, '')
    ) is not null,
    p_device_type, p_ip_hash, p_properties
  );
end;
$$;

revoke all on function public.record_marketing_event(
  uuid, uuid, uuid, text, timestamptz,
  text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_marketing_event(
  uuid, uuid, uuid, text, timestamptz,
  text, text, text, text, text, text, text, text, text, jsonb
) to service_role;

create or replace function public.record_inquiry_conversion(p_inquiry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inquiry public.project_inquiries%rowtype;
  v_visitor_id uuid;
  v_session_id uuid;
  v_inserted integer;
  v_has_attribution boolean;
begin
  select * into v_inquiry
  from public.project_inquiries
  where id = p_inquiry_id;

  if not found then
    return false;
  end if;

  update public.project_inquiries
  set marketing_conversion_status = 'pending',
      marketing_conversion_attempted_at = clock_timestamp(),
      marketing_conversion_error = null
  where id = p_inquiry_id;

  v_has_attribution := v_inquiry.attribution_captured_at is not null;

  if v_inquiry.visitor_key is not null and v_inquiry.session_key is not null then
    insert into public.marketing_visitors (
      visitor_key,
      first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content, first_touch_term,
      first_touch_path, first_touch_referrer, first_touch_at,
      first_touch_gclid, first_touch_fbclid, first_touch_msclkid, first_touch_ttclid,
      first_touch_campaign_external_id, first_touch_adset_external_id, first_touch_ad_external_id,
      last_touch_source, last_touch_medium, last_touch_campaign, last_touch_content, last_touch_term,
      last_touch_path, last_touch_referrer, last_touch_at,
      last_touch_gclid, last_touch_fbclid, last_touch_msclkid, last_touch_ttclid,
      last_touch_campaign_external_id, last_touch_adset_external_id, last_touch_ad_external_id,
      first_seen_at, last_seen_at
    ) values (
      v_inquiry.visitor_key,
      v_inquiry.utm_source, v_inquiry.utm_medium, v_inquiry.utm_campaign, v_inquiry.utm_content, v_inquiry.utm_term,
      null, v_inquiry.referrer, case when v_has_attribution then v_inquiry.created_at else null end,
      v_inquiry.gclid, v_inquiry.fbclid, v_inquiry.msclkid, v_inquiry.ttclid,
      v_inquiry.campaign_external_id, v_inquiry.adset_external_id, v_inquiry.ad_external_id,
      v_inquiry.utm_source, v_inquiry.utm_medium, v_inquiry.utm_campaign, v_inquiry.utm_content, v_inquiry.utm_term,
      null, v_inquiry.referrer, case when v_has_attribution then v_inquiry.created_at else null end,
      v_inquiry.gclid, v_inquiry.fbclid, v_inquiry.msclkid, v_inquiry.ttclid,
      v_inquiry.campaign_external_id, v_inquiry.adset_external_id, v_inquiry.ad_external_id,
      v_inquiry.created_at, v_inquiry.created_at
    )
    on conflict (visitor_key) do update set
      first_touch_source = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_source else public.marketing_visitors.first_touch_source end,
      first_touch_medium = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_medium else public.marketing_visitors.first_touch_medium end,
      first_touch_campaign = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_campaign else public.marketing_visitors.first_touch_campaign end,
      first_touch_content = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_content else public.marketing_visitors.first_touch_content end,
      first_touch_term = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_term else public.marketing_visitors.first_touch_term end,
      first_touch_referrer = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_referrer else public.marketing_visitors.first_touch_referrer end,
      first_touch_at = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_at else public.marketing_visitors.first_touch_at end,
      first_touch_gclid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_gclid else public.marketing_visitors.first_touch_gclid end,
      first_touch_fbclid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_fbclid else public.marketing_visitors.first_touch_fbclid end,
      first_touch_msclkid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_msclkid else public.marketing_visitors.first_touch_msclkid end,
      first_touch_ttclid = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_ttclid else public.marketing_visitors.first_touch_ttclid end,
      first_touch_campaign_external_id = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_campaign_external_id else public.marketing_visitors.first_touch_campaign_external_id end,
      first_touch_adset_external_id = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_adset_external_id else public.marketing_visitors.first_touch_adset_external_id end,
      first_touch_ad_external_id = case when public.marketing_visitors.first_touch_at is null and v_has_attribution then excluded.first_touch_ad_external_id else public.marketing_visitors.first_touch_ad_external_id end,
      last_touch_source = case when v_has_attribution then excluded.last_touch_source else public.marketing_visitors.last_touch_source end,
      last_touch_medium = case when v_has_attribution then excluded.last_touch_medium else public.marketing_visitors.last_touch_medium end,
      last_touch_campaign = case when v_has_attribution then excluded.last_touch_campaign else public.marketing_visitors.last_touch_campaign end,
      last_touch_content = case when v_has_attribution then excluded.last_touch_content else public.marketing_visitors.last_touch_content end,
      last_touch_term = case when v_has_attribution then excluded.last_touch_term else public.marketing_visitors.last_touch_term end,
      last_touch_referrer = case when v_has_attribution then excluded.last_touch_referrer else public.marketing_visitors.last_touch_referrer end,
      last_touch_at = case when v_has_attribution then excluded.last_touch_at else public.marketing_visitors.last_touch_at end,
      last_touch_gclid = case when v_has_attribution then excluded.last_touch_gclid else public.marketing_visitors.last_touch_gclid end,
      last_touch_fbclid = case when v_has_attribution then excluded.last_touch_fbclid else public.marketing_visitors.last_touch_fbclid end,
      last_touch_msclkid = case when v_has_attribution then excluded.last_touch_msclkid else public.marketing_visitors.last_touch_msclkid end,
      last_touch_ttclid = case when v_has_attribution then excluded.last_touch_ttclid else public.marketing_visitors.last_touch_ttclid end,
      last_touch_campaign_external_id = case when v_has_attribution then excluded.last_touch_campaign_external_id else public.marketing_visitors.last_touch_campaign_external_id end,
      last_touch_adset_external_id = case when v_has_attribution then excluded.last_touch_adset_external_id else public.marketing_visitors.last_touch_adset_external_id end,
      last_touch_ad_external_id = case when v_has_attribution then excluded.last_touch_ad_external_id else public.marketing_visitors.last_touch_ad_external_id end,
      last_seen_at = greatest(public.marketing_visitors.last_seen_at, excluded.last_seen_at)
    returning id into v_visitor_id;

    insert into public.marketing_sessions (
      session_key, visitor_id, started_at, last_activity_at, landing_path, referrer,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      gclid, fbclid, msclkid, ttclid, campaign_external_id, adset_external_id, ad_external_id,
      attribution_captured_at, device_type
    ) values (
      v_inquiry.session_key, v_visitor_id, v_inquiry.created_at, v_inquiry.created_at, null, v_inquiry.referrer,
      v_inquiry.utm_source, v_inquiry.utm_medium, v_inquiry.utm_campaign, v_inquiry.utm_content, v_inquiry.utm_term,
      v_inquiry.gclid, v_inquiry.fbclid, v_inquiry.msclkid, v_inquiry.ttclid,
      v_inquiry.campaign_external_id, v_inquiry.adset_external_id, v_inquiry.ad_external_id,
      v_inquiry.attribution_captured_at, 'unknown'
    )
    on conflict (session_key) do update set
      last_activity_at = greatest(public.marketing_sessions.last_activity_at, excluded.last_activity_at)
    where public.marketing_sessions.visitor_id = excluded.visitor_id
    returning id into v_session_id;

    if v_session_id is null then
      v_visitor_id := null;
    end if;
  end if;

  insert into public.marketing_events (
    event_id, visitor_id, session_id, inquiry_id, event_name, path, referrer, properties, occurred_at, origin
  ) values (
    v_inquiry.id, v_visitor_id, v_session_id, v_inquiry.id, 'inquiry_submitted', null, v_inquiry.referrer,
    jsonb_build_object(
      'form_type', case when v_inquiry.project_type = 'product-support' then 'support' else 'project-inquiry' end,
      'project_type', v_inquiry.project_type
    ), v_inquiry.created_at, 'server'
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 1 and v_session_id is not null then
    update public.marketing_sessions
    set events_count = events_count + 1,
        last_activity_at = greatest(last_activity_at, v_inquiry.created_at)
    where id = v_session_id;
  end if;

  update public.project_inquiries
  set marketing_conversion_status = 'recorded',
      marketing_conversion_recorded_at = coalesce(marketing_conversion_recorded_at, clock_timestamp()),
      marketing_conversion_error = null
  where id = p_inquiry_id;

  return true;
end;
$$;

revoke all on function public.record_inquiry_conversion(uuid) from public, anon, authenticated;
grant execute on function public.record_inquiry_conversion(uuid) to service_role;

create or replace function public.get_marketing_funnel(p_from timestamptz, p_to timestamptz)
returns table (
  source text,
  medium text,
  campaign text,
  visitors bigint,
  sessions bigint,
  engaged_sessions bigint,
  form_starts bigint,
  inquiries bigint,
  qualified_inquiries bigint,
  won_inquiries bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_code_city_staff() then
    raise exception 'not_authorized';
  end if;

  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > interval '366 days' then
    raise exception 'invalid_reporting_window';
  end if;

  return query
  with session_engagement as (
    select
      marketing_events.session_id,
      bool_or(marketing_events.event_name = 'session_engaged') as engaged,
      count(*) filter (
        where marketing_events.event_name in ('contact_form_started', 'support_form_started')
      )::bigint as form_starts
    from public.marketing_events
    where marketing_events.occurred_at >= p_from
      and marketing_events.occurred_at < p_to
      and marketing_events.session_id is not null
    group by marketing_events.session_id
  ),
  session_rollup as (
    select
      coalesce(nullif(marketing_sessions.utm_source, ''), 'direct') as source,
      coalesce(nullif(marketing_sessions.utm_medium, ''), 'none') as medium,
      coalesce(nullif(marketing_sessions.utm_campaign, ''), 'unassigned') as campaign,
      count(distinct marketing_sessions.visitor_id)::bigint as visitors,
      count(*)::bigint as sessions,
      count(*) filter (where coalesce(session_engagement.engaged, false))::bigint as engaged_sessions,
      coalesce(sum(session_engagement.form_starts), 0)::bigint as form_starts
    from public.marketing_sessions
    left join session_engagement on session_engagement.session_id = marketing_sessions.id
    where marketing_sessions.started_at >= p_from
      and marketing_sessions.started_at < p_to
    group by 1, 2, 3
  ),
  inquiry_rollup as (
    select
      coalesce(nullif(project_inquiries.utm_source, ''), 'direct') as source,
      coalesce(nullif(project_inquiries.utm_medium, ''), 'none') as medium,
      coalesce(nullif(project_inquiries.utm_campaign, ''), 'unassigned') as campaign,
      count(*)::bigint as inquiries,
      count(distinct project_inquiries.id) filter (
        where project_inquiries.status in ('qualified', 'proposal', 'won')
          or exists (
            select 1
            from public.inquiry_activity
            where inquiry_activity.inquiry_id = project_inquiries.id
              and inquiry_activity.to_value in ('qualified', 'proposal', 'won')
          )
      )::bigint as qualified_inquiries,
      count(distinct project_inquiries.id) filter (
        where project_inquiries.status = 'won'
          or exists (
            select 1
            from public.inquiry_activity
            where inquiry_activity.inquiry_id = project_inquiries.id
              and inquiry_activity.to_value = 'won'
          )
      )::bigint as won_inquiries
    from public.project_inquiries
    where project_inquiries.created_at >= p_from
      and project_inquiries.created_at < p_to
    group by 1, 2, 3
  ),
  dimensions as (
    select session_rollup.source, session_rollup.medium, session_rollup.campaign from session_rollup
    union
    select inquiry_rollup.source, inquiry_rollup.medium, inquiry_rollup.campaign from inquiry_rollup
  )
  select
    dimensions.source,
    dimensions.medium,
    dimensions.campaign,
    coalesce(session_rollup.visitors, 0)::bigint,
    coalesce(session_rollup.sessions, 0)::bigint,
    coalesce(session_rollup.engaged_sessions, 0)::bigint,
    coalesce(session_rollup.form_starts, 0)::bigint,
    coalesce(inquiry_rollup.inquiries, 0)::bigint,
    coalesce(inquiry_rollup.qualified_inquiries, 0)::bigint,
    coalesce(inquiry_rollup.won_inquiries, 0)::bigint
  from dimensions
  left join session_rollup using (source, medium, campaign)
  left join inquiry_rollup using (source, medium, campaign)
  order by coalesce(inquiry_rollup.inquiries, 0) desc, coalesce(session_rollup.sessions, 0) desc, dimensions.source;
end;
$$;

revoke all on function public.get_marketing_funnel(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_marketing_funnel(timestamptz, timestamptz) to authenticated, service_role;

update public.marketing_integrations
set public_config = public_config || jsonb_build_object(
      'attribution_version', 2,
      'click_ids', jsonb_build_array('gclid', 'fbclid', 'msclkid', 'ttclid'),
      'conversion_source', 'server_authoritative'
    ),
    updated_at = clock_timestamp()
where slug = 'first_party_tracking';

update public.portal_work_items
set status = 'in_progress',
    blocked_reason = 'Production database, collector, and role-boundary verification are still required.',
    description = 'The attribution schema and collector contract are implemented. Production database, Vercel runtime, session chronology, and role-boundary verification remain before completion.',
    updated_at = clock_timestamp()
where area = 'Analytics'
  and title = 'Deploy the first-party Python tracker';

update public.portal_work_items
set description = 'Connect the verified Mailgun sending domain and server-only API key, verify provider acceptance to both recipients, then add delivery-webhook and retry-worker processing.',
    updated_at = clock_timestamp()
where area = 'Email'
  and title = 'Connect Mailgun notification delivery';

comment on table public.inquiry_notification_deliveries is
  'Per-recipient Mailgun lifecycle evidence. Accepted is provider acceptance; delivered and bounced require provider webhooks.';
comment on function public.record_inquiry_conversion(uuid) is
  'Idempotently links a stored inquiry to its canonical first-party conversion event.';
comment on function public.get_marketing_funnel(timestamptz, timestamptz) is
  'Staff-only live first-party funnel grouped by source, medium, and campaign. Qualification means ever reached; provider spend remains separate until synced.';
