-- Keep inquiry fallback sessions chronological and make reported conversion
-- rates a true subset of the tracked-session cohort.
-- Apply this migration before deploying the Edge Function; the new RPC argument
-- defaults to null so the currently deployed caller remains compatible.

alter table public.project_inquiries
  add column if not exists session_started_at timestamptz;

alter table public.project_inquiries
  drop constraint if exists project_inquiries_session_started_window;
alter table public.project_inquiries
  add constraint project_inquiries_session_started_window check (
    session_started_at is null
    or session_started_at between created_at - interval '31 days' and created_at + interval '5 minutes'
  );

alter table public.project_inquiries
  drop constraint if exists project_inquiries_session_identity_required;
alter table public.project_inquiries
  add constraint project_inquiries_session_identity_required check (
    session_started_at is null
    or (visitor_key is not null and session_key is not null)
  );

alter table public.project_inquiries
  drop constraint if exists project_inquiries_attribution_after_session_start;
alter table public.project_inquiries
  add constraint project_inquiries_attribution_after_session_start check (
    attribution_captured_at is null
    or session_started_at is null
    or attribution_captured_at >= session_started_at - interval '5 minutes'
  );

create index if not exists marketing_sessions_started_at_idx
  on public.marketing_sessions (started_at desc, id);

drop function if exists public.create_inquiry_with_notification_outbox(
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
);

create function public.create_inquiry_with_notification_outbox(
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
  p_referrer text default null,
  p_session_started_at timestamptz default null
)
returns table (
  inquiry_id uuid,
  duplicate boolean,
  notification_status text
)
language plpgsql
security definer
set search_path = ''
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
    session_started_at,
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
    p_session_started_at,
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
  text,
  timestamptz
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
  text,
  timestamptz
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
  text,
  timestamptz
) is 'Atomically stores an inquiry, its original browser session start, and its two-recipient notification outbox.';

create or replace function public.record_inquiry_conversion(p_inquiry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
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
      coalesce(
        v_inquiry.session_started_at,
        least(coalesce(v_inquiry.attribution_captured_at, v_inquiry.created_at), v_inquiry.created_at)
      ),
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

drop function if exists public.get_marketing_funnel(timestamptz, timestamptz);

create function public.get_marketing_funnel(p_from timestamptz, p_to timestamptz)
returns table (
  source text,
  medium text,
  campaign text,
  visitors bigint,
  sessions bigint,
  engaged_sessions bigint,
  form_starts bigint,
  converted_sessions bigint,
  inquiries bigint,
  qualified_inquiries bigint,
  won_inquiries bigint
)
language plpgsql
stable
security definer
set search_path = ''
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
      bool_or(marketing_events.event_name = 'contact_form_started') as contact_form_started,
      bool_or(
        marketing_events.event_name = 'inquiry_submitted'
        and project_inquiries.id is not null
        and project_inquiries.project_type <> 'product-support'
        and project_inquiries.status <> 'spam'
      ) as converted
    from public.marketing_events
    left join public.project_inquiries
      on project_inquiries.id = marketing_events.inquiry_id
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
      count(*) filter (where coalesce(session_engagement.contact_form_started, false))::bigint as form_starts,
      count(*) filter (where coalesce(session_engagement.converted, false))::bigint as converted_sessions
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
    coalesce(session_rollup.converted_sessions, 0)::bigint,
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

comment on column public.project_inquiries.session_started_at is
  'Original browser session start supplied with privacy-conscious inquiry telemetry.';
comment on function public.get_marketing_funnel(timestamptz, timestamptz) is
  'Staff-only first-party funnel with a converted-session subset for cohort-consistent rates; absolute inquiry outcomes remain separately visible.';
