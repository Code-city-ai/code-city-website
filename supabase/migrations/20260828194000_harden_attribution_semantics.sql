-- Preserve chronological first/last touch semantics across concurrent browser
-- events, cached v1 clients, server conversions, and historical replay.

create or replace function public.prune_code_city_rate_limit_windows()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.marketing_event_rate_limits
  where window_started_at < clock_timestamp() - interval '2 days';

  delete from public.project_inquiry_rate_limits
  where window_started_at < clock_timestamp() - interval '2 days';
end;
$$;

revoke all on function public.prune_code_city_rate_limit_windows() from public, anon, authenticated;
grant execute on function public.prune_code_city_rate_limit_windows() to service_role;

comment on function public.prune_code_city_rate_limit_windows() is
  'Service-only bounded retention for ephemeral hashed rate-limit windows.';

create or replace function public.check_project_inquiry_rate_limit(
  p_ip_hash text,
  p_max_requests integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_started_at timestamptz := date_bin(
    interval '10 minutes',
    clock_timestamp(),
    timestamptz '2000-01-01 00:00:00+00'
  );
  v_request_count integer;
begin
  if p_ip_hash is null
    or char_length(p_ip_hash) <> 64
    or p_max_requests is null
    or p_max_requests < 1
    or p_max_requests > 20
  then
    return false;
  end if;

  perform public.prune_code_city_rate_limit_windows();

  insert into public.project_inquiry_rate_limits (
    ip_hash,
    window_started_at,
    request_count,
    last_request_at
  )
  values (p_ip_hash, v_window_started_at, 1, clock_timestamp())
  on conflict (ip_hash, window_started_at)
  do update set
    request_count = public.project_inquiry_rate_limits.request_count + 1,
    last_request_at = clock_timestamp()
  returning request_count into v_request_count;

  return v_request_count <= p_max_requests;
end;
$$;

revoke all on function public.check_project_inquiry_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.check_project_inquiry_rate_limit(text, integer) to service_role;

create or replace function public.upsert_marketing_identity(
  p_visitor_key uuid,
  p_session_key uuid,
  p_session_started_at timestamptz,
  p_occurred_at timestamptz,
  p_path text,
  p_referrer text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_utm_content text,
  p_utm_term text,
  p_gclid text,
  p_fbclid text,
  p_msclkid text,
  p_ttclid text,
  p_campaign_external_id text,
  p_adset_external_id text,
  p_ad_external_id text,
  p_attribution_present boolean,
  p_touch_occurred boolean,
  p_attribution_captured_at timestamptz,
  p_device_type text
)
returns table (resolved_visitor_id uuid, resolved_session_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visitor_id uuid;
  v_session_id uuid;
  v_existing_session_visitor_key uuid;
  v_has_attribution boolean := coalesce(p_attribution_present, false)
    and p_attribution_captured_at is not null;
  v_session_started_at timestamptz := least(coalesce(p_session_started_at, p_occurred_at), p_occurred_at);
  v_device_type text := case
    when p_device_type in ('desktop', 'mobile', 'tablet', 'bot', 'unknown') then p_device_type
    else 'unknown'
  end;
begin
  if p_visitor_key is null or p_session_key is null then
    return query select null::uuid, null::uuid;
    return;
  end if;

  -- Serialize identity resolution by session key before touching the visitor
  -- row. Without this lock, two first events could race the same session key
  -- with different visitor keys and leave the losing visitor mutation behind.
  perform pg_advisory_xact_lock(hashtextextended(p_session_key::text, 1));

  select existing_visitor.visitor_key
  into v_existing_session_visitor_key
  from public.marketing_sessions as existing_session
  join public.marketing_visitors as existing_visitor
    on existing_visitor.id = existing_session.visitor_id
  where existing_session.session_key = p_session_key
  for update of existing_session;

  if found and v_existing_session_visitor_key is distinct from p_visitor_key then
    return query select null::uuid, null::uuid;
    return;
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
    case when v_has_attribution then nullif(p_utm_source, '') end,
    case when v_has_attribution then nullif(p_utm_medium, '') end,
    case when v_has_attribution then nullif(p_utm_campaign, '') end,
    case when v_has_attribution then nullif(p_utm_content, '') end,
    case when v_has_attribution then nullif(p_utm_term, '') end,
    case when v_has_attribution then p_path end,
    case when v_has_attribution then p_referrer end,
    case when v_has_attribution then p_attribution_captured_at end,
    case when v_has_attribution then nullif(p_gclid, '') end,
    case when v_has_attribution then nullif(p_fbclid, '') end,
    case when v_has_attribution then nullif(p_msclkid, '') end,
    case when v_has_attribution then nullif(p_ttclid, '') end,
    case when v_has_attribution then nullif(p_campaign_external_id, '') end,
    case when v_has_attribution then nullif(p_adset_external_id, '') end,
    case when v_has_attribution then nullif(p_ad_external_id, '') end,
    case when v_has_attribution then nullif(p_utm_source, '') end,
    case when v_has_attribution then nullif(p_utm_medium, '') end,
    case when v_has_attribution then nullif(p_utm_campaign, '') end,
    case when v_has_attribution then nullif(p_utm_content, '') end,
    case when v_has_attribution then nullif(p_utm_term, '') end,
    case when v_has_attribution then p_path end,
    case when v_has_attribution then p_referrer end,
    case when v_has_attribution then p_attribution_captured_at end,
    case when v_has_attribution then nullif(p_gclid, '') end,
    case when v_has_attribution then nullif(p_fbclid, '') end,
    case when v_has_attribution then nullif(p_msclkid, '') end,
    case when v_has_attribution then nullif(p_ttclid, '') end,
    case when v_has_attribution then nullif(p_campaign_external_id, '') end,
    case when v_has_attribution then nullif(p_adset_external_id, '') end,
    case when v_has_attribution then nullif(p_ad_external_id, '') end,
    v_session_started_at,
    p_occurred_at
  )
  on conflict (visitor_key) do update set
    first_touch_source = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_source else public.marketing_visitors.first_touch_source end,
    first_touch_medium = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_medium else public.marketing_visitors.first_touch_medium end,
    first_touch_campaign = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_campaign else public.marketing_visitors.first_touch_campaign end,
    first_touch_content = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_content else public.marketing_visitors.first_touch_content end,
    first_touch_term = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_term else public.marketing_visitors.first_touch_term end,
    first_touch_path = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_path else public.marketing_visitors.first_touch_path end,
    first_touch_referrer = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_referrer else public.marketing_visitors.first_touch_referrer end,
    first_touch_gclid = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_gclid else public.marketing_visitors.first_touch_gclid end,
    first_touch_fbclid = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_fbclid else public.marketing_visitors.first_touch_fbclid end,
    first_touch_msclkid = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_msclkid else public.marketing_visitors.first_touch_msclkid end,
    first_touch_ttclid = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_ttclid else public.marketing_visitors.first_touch_ttclid end,
    first_touch_campaign_external_id = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_campaign_external_id else public.marketing_visitors.first_touch_campaign_external_id end,
    first_touch_adset_external_id = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_adset_external_id else public.marketing_visitors.first_touch_adset_external_id end,
    first_touch_ad_external_id = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_ad_external_id else public.marketing_visitors.first_touch_ad_external_id end,
    first_touch_at = case when v_has_attribution and (
      public.marketing_visitors.first_touch_at is null
      or excluded.first_touch_at < public.marketing_visitors.first_touch_at
    ) then excluded.first_touch_at else public.marketing_visitors.first_touch_at end,
    last_touch_source = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_source else public.marketing_visitors.last_touch_source end,
    last_touch_medium = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_medium else public.marketing_visitors.last_touch_medium end,
    last_touch_campaign = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_campaign else public.marketing_visitors.last_touch_campaign end,
    last_touch_content = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_content else public.marketing_visitors.last_touch_content end,
    last_touch_term = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_term else public.marketing_visitors.last_touch_term end,
    last_touch_path = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_path else public.marketing_visitors.last_touch_path end,
    last_touch_referrer = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_referrer else public.marketing_visitors.last_touch_referrer end,
    last_touch_gclid = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_gclid else public.marketing_visitors.last_touch_gclid end,
    last_touch_fbclid = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_fbclid else public.marketing_visitors.last_touch_fbclid end,
    last_touch_msclkid = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_msclkid else public.marketing_visitors.last_touch_msclkid end,
    last_touch_ttclid = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_ttclid else public.marketing_visitors.last_touch_ttclid end,
    last_touch_campaign_external_id = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_campaign_external_id else public.marketing_visitors.last_touch_campaign_external_id end,
    last_touch_adset_external_id = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_adset_external_id else public.marketing_visitors.last_touch_adset_external_id end,
    last_touch_ad_external_id = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_ad_external_id else public.marketing_visitors.last_touch_ad_external_id end,
    last_touch_at = case when v_has_attribution and (
      public.marketing_visitors.last_touch_at is null
      or excluded.last_touch_at > public.marketing_visitors.last_touch_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.last_touch_at = public.marketing_visitors.last_touch_at
      )
    ) then excluded.last_touch_at else public.marketing_visitors.last_touch_at end,
    first_seen_at = least(public.marketing_visitors.first_seen_at, excluded.first_seen_at),
    last_seen_at = greatest(public.marketing_visitors.last_seen_at, excluded.last_seen_at)
  returning id into v_visitor_id;

  insert into public.marketing_sessions (
    session_key, visitor_id, started_at, last_activity_at, landing_path, referrer,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, fbclid, msclkid, ttclid, campaign_external_id, adset_external_id, ad_external_id,
    attribution_captured_at, device_type
  ) values (
    p_session_key, v_visitor_id, v_session_started_at, p_occurred_at, p_path, p_referrer,
    case when v_has_attribution then nullif(p_utm_source, '') end,
    case when v_has_attribution then nullif(p_utm_medium, '') end,
    case when v_has_attribution then nullif(p_utm_campaign, '') end,
    case when v_has_attribution then nullif(p_utm_content, '') end,
    case when v_has_attribution then nullif(p_utm_term, '') end,
    case when v_has_attribution then nullif(p_gclid, '') end,
    case when v_has_attribution then nullif(p_fbclid, '') end,
    case when v_has_attribution then nullif(p_msclkid, '') end,
    case when v_has_attribution then nullif(p_ttclid, '') end,
    case when v_has_attribution then nullif(p_campaign_external_id, '') end,
    case when v_has_attribution then nullif(p_adset_external_id, '') end,
    case when v_has_attribution then nullif(p_ad_external_id, '') end,
    case when v_has_attribution then p_attribution_captured_at end,
    v_device_type
  )
  on conflict (session_key) do update set
    started_at = least(public.marketing_sessions.started_at, excluded.started_at),
    last_activity_at = greatest(public.marketing_sessions.last_activity_at, excluded.last_activity_at),
    landing_path = case when nullif(public.marketing_sessions.landing_path, '') is null
      then excluded.landing_path else public.marketing_sessions.landing_path end,
    referrer = case when nullif(public.marketing_sessions.referrer, '') is null
      then excluded.referrer else public.marketing_sessions.referrer end,
    device_type = case when coalesce(public.marketing_sessions.device_type, 'unknown') = 'unknown'
      then excluded.device_type else public.marketing_sessions.device_type end,
    utm_source = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.utm_source else public.marketing_sessions.utm_source end,
    utm_medium = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.utm_medium else public.marketing_sessions.utm_medium end,
    utm_campaign = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.utm_campaign else public.marketing_sessions.utm_campaign end,
    utm_content = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.utm_content else public.marketing_sessions.utm_content end,
    utm_term = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.utm_term else public.marketing_sessions.utm_term end,
    gclid = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.gclid else public.marketing_sessions.gclid end,
    fbclid = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.fbclid else public.marketing_sessions.fbclid end,
    msclkid = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.msclkid else public.marketing_sessions.msclkid end,
    ttclid = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.ttclid else public.marketing_sessions.ttclid end,
    campaign_external_id = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.campaign_external_id else public.marketing_sessions.campaign_external_id end,
    adset_external_id = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.adset_external_id else public.marketing_sessions.adset_external_id end,
    ad_external_id = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.ad_external_id else public.marketing_sessions.ad_external_id end,
    attribution_captured_at = case when excluded.attribution_captured_at is not null and (
      public.marketing_sessions.attribution_captured_at is null
      or excluded.attribution_captured_at > public.marketing_sessions.attribution_captured_at
      or (
        coalesce(p_touch_occurred, false)
        and excluded.attribution_captured_at = public.marketing_sessions.attribution_captured_at
      )
    ) then excluded.attribution_captured_at else public.marketing_sessions.attribution_captured_at end
  where public.marketing_sessions.visitor_id = excluded.visitor_id
  returning id into v_session_id;

  return query select v_visitor_id, v_session_id;
end;
$$;

revoke all on function public.upsert_marketing_identity(
  uuid, uuid, timestamptz, timestamptz, text, text,
  text, text, text, text, text, text, text, text, text,
  text, text, text, boolean, boolean, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.upsert_marketing_identity(
  uuid, uuid, timestamptz, timestamptz, text, text,
  text, text, text, text, text, text, text, text, text,
  text, text, text, boolean, boolean, timestamptz, text
) to service_role;

drop function if exists public.record_marketing_event(
  uuid, uuid, uuid, text, timestamptz,
  text, text, text, text, text, text, text, text, text, jsonb
);
drop function if exists public.record_marketing_event_v2(
  uuid, uuid, uuid, text, timestamptz,
  text, text, text, text, text, text, text, text, text, text, text, text, text, text,
  boolean, text, text, jsonb
);

create function public.record_marketing_event_v2(
  p_event_id uuid,
  p_visitor_key uuid,
  p_session_key uuid,
  p_event_name text,
  p_occurred_at timestamptz,
  p_session_started_at timestamptz default null,
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
  p_touch_occurred boolean default false,
  p_attribution_captured_at timestamptz default null,
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
begin
  if p_event_id is null
    or p_visitor_key is null
    or p_session_key is null
    or p_occurred_at is null
    or p_event_name not in (
    'page_viewed', 'session_started', 'session_engaged', 'cta_clicked',
    'contact_form_started', 'contact_form_submitted', 'support_form_started',
    'support_form_submitted', 'inquiry_submitted'
  ) or p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    return false;
  end if;

  p_session_started_at := coalesce(p_session_started_at, p_occurred_at);
  if p_session_started_at < p_occurred_at - interval '7 days'
    or p_session_started_at > p_occurred_at + interval '5 minutes'
    or (coalesce(p_attribution_present, false) and p_attribution_captured_at is null)
    or (coalesce(p_touch_occurred, false) and not coalesce(p_attribution_present, false))
    or (p_attribution_captured_at is not null and (
      p_attribution_captured_at < p_session_started_at - interval '5 minutes'
      or p_attribution_captured_at > p_occurred_at + interval '5 minutes'
    ))
  then
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

  perform public.prune_code_city_rate_limit_windows();

  v_window_started_at := date_bin(
    interval '10 minutes', clock_timestamp(), timestamptz '2000-01-01 00:00:00+00'
  );
  insert into public.marketing_event_rate_limits (ip_hash, window_started_at, request_count, last_request_at)
  values (p_ip_hash, v_window_started_at, 1, clock_timestamp())
  on conflict (ip_hash, window_started_at) do update set
    request_count = public.marketing_event_rate_limits.request_count + 1,
    last_request_at = clock_timestamp()
  returning request_count into v_request_count;

  if v_request_count > 120 then
    return false;
  end if;

  -- Every attempt consumes rate-limit capacity. After that gate, serialize one
  -- logical event so a retry cannot mutate visitor/session attribution twice.
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  if exists (
    select 1 from public.marketing_events where event_id = p_event_id
  ) then
    return false;
  end if;

  select resolved_visitor_id, resolved_session_id
  into v_visitor_id, v_session_id
  from public.upsert_marketing_identity(
    p_visitor_key, p_session_key, p_session_started_at, p_occurred_at, p_path, p_referrer,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
    p_gclid, p_fbclid, p_msclkid, p_ttclid,
    p_campaign_external_id, p_adset_external_id, p_ad_external_id,
    p_attribution_present, p_touch_occurred, p_attribution_captured_at, p_device_type
  );

  if v_visitor_id is null or v_session_id is null then
    return false;
  end if;

  insert into public.marketing_events (
    event_id, visitor_id, session_id, event_name, path, referrer, properties, occurred_at, origin
  ) values (
    p_event_id, v_visitor_id, v_session_id, p_event_name, p_path, p_referrer,
    coalesce(p_properties, '{}'::jsonb), p_occurred_at, 'browser'
  ) on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    update public.marketing_sessions set
      events_count = events_count + 1,
      pageviews = pageviews + case when p_event_name = 'page_viewed' then 1 else 0 end,
      last_activity_at = greatest(last_activity_at, p_occurred_at)
    where id = v_session_id;
  end if;

  return v_inserted = 1;
end;
$$;

revoke all on function public.record_marketing_event_v2(
  uuid, uuid, uuid, text, timestamptz, timestamptz,
  text, text, text, text, text, text, text, text, text, text, text, text, text, text,
  boolean, boolean, timestamptz, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_marketing_event_v2(
  uuid, uuid, uuid, text, timestamptz, timestamptz,
  text, text, text, text, text, text, text, text, text, text, text, text, text, text,
  boolean, boolean, timestamptz, text, text, jsonb
) to service_role;

create function public.record_marketing_event(
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
declare
  v_has_attribution boolean := coalesce(
    nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''), nullif(p_utm_term, '')
  ) is not null;
  v_is_touch boolean;
begin
  v_is_touch := v_has_attribution and p_event_name = 'session_started';
  return public.record_marketing_event_v2(
    p_event_id => p_event_id,
    p_visitor_key => p_visitor_key,
    p_session_key => p_session_key,
    p_event_name => p_event_name,
    p_occurred_at => p_occurred_at,
    p_session_started_at => p_occurred_at,
    p_path => p_path,
    p_referrer => p_referrer,
    p_utm_source => p_utm_source,
    p_utm_medium => p_utm_medium,
    p_utm_campaign => p_utm_campaign,
    p_utm_content => p_utm_content,
    p_utm_term => p_utm_term,
    p_attribution_present => v_is_touch,
    p_touch_occurred => v_is_touch,
    p_attribution_captured_at => case when v_is_touch then p_occurred_at end,
    p_device_type => p_device_type,
    p_ip_hash => p_ip_hash,
    p_properties => p_properties
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
begin
  select * into v_inquiry from public.project_inquiries where id = p_inquiry_id;
  if not found then return false; end if;

  update public.project_inquiries set
    marketing_conversion_status = 'pending',
    marketing_conversion_attempted_at = clock_timestamp(),
    marketing_conversion_error = null
  where id = p_inquiry_id;

  if v_inquiry.visitor_key is not null and v_inquiry.session_key is not null then
    select resolved_visitor_id, resolved_session_id
    into v_visitor_id, v_session_id
    from public.upsert_marketing_identity(
      v_inquiry.visitor_key,
      v_inquiry.session_key,
      least(coalesce(v_inquiry.attribution_captured_at, v_inquiry.created_at), v_inquiry.created_at),
      v_inquiry.created_at,
      v_inquiry.source_url,
      v_inquiry.referrer,
      v_inquiry.utm_source,
      v_inquiry.utm_medium,
      v_inquiry.utm_campaign,
      v_inquiry.utm_content,
      v_inquiry.utm_term,
      v_inquiry.gclid,
      v_inquiry.fbclid,
      v_inquiry.msclkid,
      v_inquiry.ttclid,
      v_inquiry.campaign_external_id,
      v_inquiry.adset_external_id,
      v_inquiry.ad_external_id,
      v_inquiry.attribution_captured_at is not null,
      false,
      v_inquiry.attribution_captured_at,
      'unknown'
    );
  end if;

  insert into public.marketing_events (
    event_id, visitor_id, session_id, inquiry_id, event_name, path, referrer, properties, occurred_at, origin
  ) values (
    v_inquiry.id, v_visitor_id, v_session_id, v_inquiry.id, 'inquiry_submitted',
    v_inquiry.source_url, v_inquiry.referrer,
    jsonb_build_object(
      'form_type', case when v_inquiry.project_type = 'product-support' then 'support' else 'project-inquiry' end,
      'project_type', v_inquiry.project_type
    ),
    v_inquiry.created_at, 'server'
  ) on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    update public.marketing_events set
      visitor_id = v_visitor_id,
      session_id = v_session_id,
      inquiry_id = v_inquiry.id,
      event_name = 'inquiry_submitted',
      path = v_inquiry.source_url,
      referrer = v_inquiry.referrer,
      properties = jsonb_build_object(
        'form_type', case when v_inquiry.project_type = 'product-support' then 'support' else 'project-inquiry' end,
        'project_type', v_inquiry.project_type
      ),
      occurred_at = v_inquiry.created_at,
      origin = 'server'
    where event_id = v_inquiry.id
      and inquiry_id = v_inquiry.id;
  end if;

  if v_inserted = 1 and v_session_id is not null then
    update public.marketing_sessions set
      events_count = events_count + 1,
      last_activity_at = greatest(last_activity_at, v_inquiry.created_at)
    where id = v_session_id;
  end if;

  update public.project_inquiries set
    marketing_conversion_status = 'recorded',
    marketing_conversion_recorded_at = coalesce(marketing_conversion_recorded_at, clock_timestamp()),
    marketing_conversion_error = null
  where id = p_inquiry_id;
  return true;
exception when others then
  update public.project_inquiries set
    marketing_conversion_status = 'failed',
    marketing_conversion_error = left(sqlerrm, 500)
  where id = p_inquiry_id;
  return false;
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
  if not public.is_code_city_staff() then raise exception 'not_authorized'; end if;
  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > interval '366 days' then
    raise exception 'invalid_reporting_window';
  end if;

  return query
  with session_engagement as (
    select
      marketing_events.session_id,
      bool_or(marketing_events.event_name = 'session_engaged') as engaged,
      bool_or(marketing_events.event_name = 'contact_form_started') as contact_form_started
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
      count(*) filter (where coalesce(session_engagement.contact_form_started, false))::bigint as form_starts
    from public.marketing_sessions
    left join session_engagement on session_engagement.session_id = marketing_sessions.id
    where marketing_sessions.started_at >= p_from and marketing_sessions.started_at < p_to
    group by 1, 2, 3
  ),
  inquiry_rollup as (
    select
      coalesce(nullif(project_inquiries.utm_source, ''), 'direct') as source,
      coalesce(nullif(project_inquiries.utm_medium, ''), 'none') as medium,
      coalesce(nullif(project_inquiries.utm_campaign, ''), 'unassigned') as campaign,
      count(*)::bigint as inquiries,
      count(*) filter (
        where project_inquiries.status in ('qualified', 'proposal', 'won')
          or exists (
            select 1 from public.inquiry_activity
            where inquiry_activity.inquiry_id = project_inquiries.id
              and inquiry_activity.to_value in ('qualified', 'proposal', 'won')
          )
      )::bigint as qualified_inquiries,
      count(*) filter (
        where project_inquiries.status = 'won'
          or exists (
            select 1 from public.inquiry_activity
            where inquiry_activity.inquiry_id = project_inquiries.id
              and inquiry_activity.to_value = 'won'
          )
      )::bigint as won_inquiries
    from public.project_inquiries
    where project_inquiries.created_at >= p_from
      and project_inquiries.created_at < p_to
      and project_inquiries.project_type <> 'product-support'
      and project_inquiries.status <> 'spam'
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
  order by coalesce(inquiry_rollup.inquiries, 0) desc,
    coalesce(session_rollup.sessions, 0) desc,
    dimensions.source;
end;
$$;

revoke all on function public.get_marketing_funnel(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_marketing_funnel(timestamptz, timestamptz) to authenticated, service_role;

do $$
declare
  v_inquiry record;
begin
  for v_inquiry in
    select id from public.project_inquiries order by created_at, id
  loop
    perform public.record_inquiry_conversion(v_inquiry.id);
  end loop;
end;
$$;

comment on function public.upsert_marketing_identity(
  uuid, uuid, timestamptz, timestamptz, text, text,
  text, text, text, text, text, text, text, text, text,
  text, text, text, boolean, boolean, timestamptz, text
) is 'Internal chronological identity/session upsert shared by browser events and server conversions.';
comment on function public.record_marketing_event_v2(
  uuid, uuid, uuid, text, timestamptz, timestamptz,
  text, text, text, text, text, text, text, text, text, text, text, text, text, text,
  boolean, boolean, timestamptz, text, text, jsonb
) is 'Service-only first-party event collector preserving original session and attribution capture times.';
