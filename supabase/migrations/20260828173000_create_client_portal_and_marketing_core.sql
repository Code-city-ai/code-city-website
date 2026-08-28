create or replace function public.set_portal_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create table public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'agent',
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_full_name_length check (char_length(full_name) between 2 and 120),
  constraint admin_profiles_role_allowed check (role in ('owner', 'admin', 'agent', 'viewer'))
);

create index admin_profiles_active_role_idx
  on public.admin_profiles (role, user_id)
  where is_active;

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_portal_updated_at();

create or replace function public.is_code_city_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function public.can_manage_code_city()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = (select auth.uid())
      and is_active
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_code_city_staff() from public, anon;
revoke all on function public.can_manage_code_city() from public, anon;
grant execute on function public.is_code_city_staff() to authenticated, service_role;
grant execute on function public.can_manage_code_city() to authenticated, service_role;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  company_name text,
  primary_email text,
  phone text,
  website text,
  status text not null default 'lead',
  lifecycle_stage text not null default 'discovery',
  owner_user_id uuid references public.admin_profiles (user_id) on delete set null,
  notes text,
  source_inquiry_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_display_name_length check (char_length(display_name) between 2 and 160),
  constraint clients_company_name_length check (company_name is null or char_length(company_name) <= 160),
  constraint clients_primary_email_length check (primary_email is null or char_length(primary_email) between 3 and 254),
  constraint clients_phone_length check (phone is null or char_length(phone) <= 40),
  constraint clients_website_length check (website is null or char_length(website) <= 500),
  constraint clients_status_allowed check (status in ('lead', 'active', 'dormant', 'closed')),
  constraint clients_lifecycle_stage_allowed check (
    lifecycle_stage in ('discovery', 'qualified', 'proposal', 'contracted', 'delivery', 'retained', 'inactive')
  )
);

create unique index clients_primary_email_unique_idx
  on public.clients (lower(primary_email))
  where primary_email is not null;

create index clients_owner_status_idx on public.clients (owner_user_id, status, updated_at desc);
create index clients_lifecycle_updated_idx on public.clients (lifecycle_stage, updated_at desc);

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_portal_updated_at();

alter table public.project_inquiries
  drop constraint if exists project_inquiries_status_allowed;

alter table public.project_inquiries
  add column client_id uuid references public.clients (id) on delete set null,
  add column assigned_to uuid references public.admin_profiles (user_id) on delete set null,
  add column priority text not null default 'normal',
  add column notification_status text not null default 'not_attempted',
  add column notification_error text,
  add column notified_at timestamptz,
  add column visitor_key uuid,
  add column session_key uuid,
  add column utm_source text,
  add column utm_medium text,
  add column utm_campaign text,
  add column utm_content text,
  add column utm_term text,
  add column referrer text,
  add column last_activity_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now(),
  add constraint project_inquiries_status_allowed check (
    status in ('new', 'reviewing', 'qualified', 'proposal', 'won', 'lost', 'closed', 'spam')
  ),
  add constraint project_inquiries_priority_allowed check (priority in ('low', 'normal', 'high', 'urgent')),
  add constraint project_inquiries_notification_status_allowed check (
    notification_status in ('not_attempted', 'configuration_required', 'sending', 'sent', 'failed')
  ),
  add constraint project_inquiries_notification_error_length check (
    notification_error is null or char_length(notification_error) <= 500
  ),
  add constraint project_inquiries_utm_lengths check (
    (utm_source is null or char_length(utm_source) <= 120)
    and (utm_medium is null or char_length(utm_medium) <= 120)
    and (utm_campaign is null or char_length(utm_campaign) <= 190)
    and (utm_content is null or char_length(utm_content) <= 190)
    and (utm_term is null or char_length(utm_term) <= 190)
  );

alter table public.clients
  add constraint clients_source_inquiry_id_fkey
  foreign key (source_inquiry_id) references public.project_inquiries (id) on delete set null;

create index project_inquiries_status_updated_idx on public.project_inquiries (status, updated_at desc);
create index project_inquiries_assigned_status_idx on public.project_inquiries (assigned_to, status, updated_at desc);
create index project_inquiries_client_id_idx on public.project_inquiries (client_id);
create index project_inquiries_visitor_key_idx on public.project_inquiries (visitor_key) where visitor_key is not null;
create index project_inquiries_session_key_idx on public.project_inquiries (session_key) where session_key is not null;
create index project_inquiries_campaign_idx on public.project_inquiries (utm_source, utm_campaign, created_at desc);

create trigger project_inquiries_set_updated_at
before update on public.project_inquiries
for each row execute function public.set_portal_updated_at();

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contacts_name_length check (char_length(name) between 2 and 120),
  constraint client_contacts_email_length check (email is null or char_length(email) between 3 and 254),
  constraint client_contacts_phone_length check (phone is null or char_length(phone) <= 40),
  constraint client_contacts_title_length check (title is null or char_length(title) <= 120)
);

create index client_contacts_client_id_idx on public.client_contacts (client_id, is_primary desc);
create unique index client_contacts_one_primary_idx on public.client_contacts (client_id) where is_primary;

create trigger client_contacts_set_updated_at
before update on public.client_contacts
for each row execute function public.set_portal_updated_at();

create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  source_inquiry_id uuid references public.project_inquiries (id) on delete set null,
  name text not null,
  status text not null default 'discovery',
  value numeric(14, 2),
  currency char(3) not null default 'USD',
  owner_user_id uuid references public.admin_profiles (user_id) on delete set null,
  next_step text,
  next_step_at timestamptz,
  started_at date,
  target_launch_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_projects_name_length check (char_length(name) between 2 and 180),
  constraint client_projects_status_allowed check (
    status in ('discovery', 'qualified', 'proposal', 'contracted', 'in_progress', 'on_hold', 'completed', 'lost')
  ),
  constraint client_projects_value_nonnegative check (value is null or value >= 0),
  constraint client_projects_currency_uppercase check (currency = upper(currency)),
  constraint client_projects_next_step_length check (next_step is null or char_length(next_step) <= 500)
);

create index client_projects_client_status_idx on public.client_projects (client_id, status, updated_at desc);
create index client_projects_owner_status_idx on public.client_projects (owner_user_id, status, next_step_at);
create index client_projects_source_inquiry_idx on public.client_projects (source_inquiry_id) where source_inquiry_id is not null;
create unique index client_projects_source_inquiry_unique_idx on public.client_projects (source_inquiry_id) where source_inquiry_id is not null;

create trigger client_projects_set_updated_at
before update on public.client_projects
for each row execute function public.set_portal_updated_at();

create table public.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.project_inquiries (id) on delete cascade,
  author_user_id uuid not null references public.admin_profiles (user_id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiry_notes_body_length check (char_length(body) between 1 and 4000)
);

create index inquiry_notes_inquiry_created_idx on public.inquiry_notes (inquiry_id, created_at desc);
create index inquiry_notes_author_idx on public.inquiry_notes (author_user_id, created_at desc);

create trigger inquiry_notes_set_updated_at
before update on public.inquiry_notes
for each row execute function public.set_portal_updated_at();

create table public.inquiry_activity (
  id bigint generated always as identity primary key,
  inquiry_id uuid not null references public.project_inquiries (id) on delete cascade,
  actor_user_id uuid references public.admin_profiles (user_id) on delete set null,
  event_type text not null,
  from_value text,
  to_value text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint inquiry_activity_event_type_length check (char_length(event_type) between 2 and 80),
  constraint inquiry_activity_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index inquiry_activity_inquiry_created_idx on public.inquiry_activity (inquiry_id, created_at desc);
create index inquiry_activity_actor_created_idx on public.inquiry_activity (actor_user_id, created_at desc) where actor_user_id is not null;

create or replace function public.log_inquiry_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.inquiry_activity (inquiry_id, actor_user_id, event_type, to_value)
    values (new.id, (select auth.uid()), 'inquiry_created', new.status);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.inquiry_activity (inquiry_id, actor_user_id, event_type, from_value, to_value)
    values (new.id, (select auth.uid()), 'status_changed', old.status, new.status);
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.inquiry_activity (inquiry_id, actor_user_id, event_type, from_value, to_value)
    values (new.id, (select auth.uid()), 'assignment_changed', old.assigned_to::text, new.assigned_to::text);
  end if;

  if new.priority is distinct from old.priority then
    insert into public.inquiry_activity (inquiry_id, actor_user_id, event_type, from_value, to_value)
    values (new.id, (select auth.uid()), 'priority_changed', old.priority, new.priority);
  end if;

  return new;
end;
$$;

create trigger project_inquiries_log_activity
after insert or update of status, assigned_to, priority on public.project_inquiries
for each row execute function public.log_inquiry_activity();

create table public.marketing_visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_key uuid not null unique,
  consent_status text not null default 'unknown',
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_content text,
  first_touch_term text,
  first_touch_path text,
  first_touch_referrer text,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_content text,
  last_touch_term text,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_visitors_consent_allowed check (consent_status in ('unknown', 'granted', 'denied'))
);

create index marketing_visitors_last_seen_idx on public.marketing_visitors (last_seen_at desc);
create index marketing_visitors_first_touch_idx on public.marketing_visitors (first_touch_source, first_touch_campaign, first_seen_at desc);

create trigger marketing_visitors_set_updated_at
before update on public.marketing_visitors
for each row execute function public.set_portal_updated_at();

create table public.marketing_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key uuid not null unique,
  visitor_id uuid not null references public.marketing_visitors (id) on delete cascade,
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  landing_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  device_type text,
  pageviews integer not null default 0,
  events_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_sessions_device_allowed check (device_type is null or device_type in ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
  constraint marketing_sessions_counts_nonnegative check (pageviews >= 0 and events_count >= 0)
);

create index marketing_sessions_visitor_started_idx on public.marketing_sessions (visitor_id, started_at desc);
create index marketing_sessions_campaign_started_idx on public.marketing_sessions (utm_source, utm_campaign, started_at desc);

create trigger marketing_sessions_set_updated_at
before update on public.marketing_sessions
for each row execute function public.set_portal_updated_at();

create table public.marketing_events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  visitor_id uuid not null references public.marketing_visitors (id) on delete cascade,
  session_id uuid not null references public.marketing_sessions (id) on delete cascade,
  inquiry_id uuid references public.project_inquiries (id) on delete set null,
  event_name text not null,
  path text,
  referrer text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint marketing_events_name_allowed check (
    event_name in (
      'page_viewed', 'session_started', 'session_engaged', 'cta_clicked',
      'contact_form_started', 'contact_form_submitted', 'support_form_started',
      'support_form_submitted', 'inquiry_submitted'
    )
  ),
  constraint marketing_events_properties_object check (jsonb_typeof(properties) = 'object')
);

create index marketing_events_occurred_idx on public.marketing_events (occurred_at desc);
create index marketing_events_name_occurred_idx on public.marketing_events (event_name, occurred_at desc);
create index marketing_events_visitor_occurred_idx on public.marketing_events (visitor_id, occurred_at desc);
create index marketing_events_session_occurred_idx on public.marketing_events (session_id, occurred_at desc);
create index marketing_events_inquiry_idx on public.marketing_events (inquiry_id) where inquiry_id is not null;

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null default 'first_party',
  external_id text,
  source text not null,
  medium text,
  objective text not null default 'lead_generation',
  status text not null default 'draft',
  budget numeric(14, 2),
  currency char(3) not null default 'USD',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_campaigns_name_length check (char_length(name) between 2 and 190),
  constraint marketing_campaigns_provider_allowed check (provider in ('first_party', 'meta', 'google_ads', 'linkedin', 'other')),
  constraint marketing_campaigns_status_allowed check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  constraint marketing_campaigns_budget_nonnegative check (budget is null or budget >= 0),
  constraint marketing_campaigns_currency_uppercase check (currency = upper(currency))
);

create unique index marketing_campaigns_provider_external_unique_idx
  on public.marketing_campaigns (provider, external_id)
  where external_id is not null;
create index marketing_campaigns_status_idx on public.marketing_campaigns (status, starts_on desc);
create index marketing_campaigns_source_idx on public.marketing_campaigns (source, name);

create trigger marketing_campaigns_set_updated_at
before update on public.marketing_campaigns
for each row execute function public.set_portal_updated_at();

create table public.marketing_daily_metrics (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  metric_date date not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(14, 2) not null default 0,
  leads bigint not null default 0,
  qualified_leads bigint not null default 0,
  won_clients bigint not null default 0,
  revenue numeric(14, 2) not null default 0,
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_daily_metrics_unique unique (campaign_id, metric_date),
  constraint marketing_daily_metrics_nonnegative check (
    impressions >= 0 and clicks >= 0 and spend >= 0 and leads >= 0
    and qualified_leads >= 0 and won_clients >= 0 and revenue >= 0
  ),
  constraint marketing_daily_metrics_currency_uppercase check (currency = upper(currency))
);

create index marketing_daily_metrics_date_idx on public.marketing_daily_metrics (metric_date desc, campaign_id);

create trigger marketing_daily_metrics_set_updated_at
before update on public.marketing_daily_metrics
for each row execute function public.set_portal_updated_at();

create table public.marketing_integrations (
  slug text primary key,
  provider text not null,
  status text not null default 'not_connected',
  last_sync_at timestamptz,
  last_error text,
  public_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint marketing_integrations_slug_length check (char_length(slug) between 2 and 80),
  constraint marketing_integrations_status_allowed check (
    status in ('connected', 'needs_configuration', 'not_connected', 'error', 'disabled')
  ),
  constraint marketing_integrations_public_config_object check (jsonb_typeof(public_config) = 'object'),
  constraint marketing_integrations_last_error_length check (last_error is null or char_length(last_error) <= 500)
);

create trigger marketing_integrations_set_updated_at
before update on public.marketing_integrations
for each row execute function public.set_portal_updated_at();

insert into public.marketing_integrations (slug, provider, status, public_config)
values
  ('first_party_tracking', 'Code City Python', 'needs_configuration', '{"runtime":"vercel-python","privacy":"no_raw_ip"}'::jsonb),
  ('mailgun', 'Mailgun', 'needs_configuration', '{"recipients":["dev@codecity.ai","aytamzid@airdropja.com"]}'::jsonb),
  ('meta', 'Meta Pixel + Conversions API', 'not_connected', '{}'::jsonb),
  ('google_ads', 'Google Ads + GA4', 'not_connected', '{}'::jsonb),
  ('search_console', 'Google Search Console', 'not_connected', '{}'::jsonb)
on conflict (slug) do nothing;

create table public.portal_work_items (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  title text not null,
  description text not null,
  status text not null default 'planned',
  priority text not null default 'normal',
  blocked_reason text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_work_items_status_allowed check (status in ('planned', 'in_progress', 'blocked', 'completed')),
  constraint portal_work_items_priority_allowed check (priority in ('low', 'normal', 'high', 'critical')),
  constraint portal_work_items_lengths check (
    char_length(area) between 2 and 80
    and char_length(title) between 2 and 180
    and char_length(description) between 2 and 1000
    and (blocked_reason is null or char_length(blocked_reason) <= 500)
  )
);

create index portal_work_items_status_priority_idx on public.portal_work_items (status, priority, sort_order);

create trigger portal_work_items_set_updated_at
before update on public.portal_work_items
for each row execute function public.set_portal_updated_at();

insert into public.portal_work_items (area, title, description, status, priority, blocked_reason, sort_order)
values
  ('Access', 'Provision the first Code City administrator', 'Create an authorized Supabase Auth user and matching admin profile after the owner confirms the login email.', 'blocked', 'critical', 'Authorized admin email and account setup are still required.', 10),
  ('Email', 'Connect Mailgun notification delivery', 'Add the verified Mailgun sending domain and server-only API key, then verify delivery to both Code City recipients.', 'blocked', 'critical', 'No signed-in Mailgun account or Mailgun credentials were found.', 20),
  ('Analytics', 'Deploy the first-party Python tracker', 'Deploy the Vercel Python endpoint with server-only Supabase credentials and validate real page, form, and inquiry events.', 'in_progress', 'high', null, 30),
  ('Advertising', 'Connect Meta and Google campaign data', 'Connect provider accounts after first-party attribution is stable, then automate spend, clicks, and conversion sync.', 'planned', 'high', null, 40),
  ('Attribution', 'Upload value-based offline conversions', 'Only send verified revenue events to ad providers after campaign identity and consent rules are proven.', 'planned', 'normal', null, 50)
on conflict do nothing;

create table public.marketing_event_rate_limits (
  ip_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  last_request_at timestamptz not null default now(),
  primary key (ip_hash, window_started_at),
  constraint marketing_event_rate_limits_hash_length check (char_length(ip_hash) = 64),
  constraint marketing_event_rate_limits_count_positive check (request_count > 0)
);

create index marketing_event_rate_limits_cleanup_idx on public.marketing_event_rate_limits (window_started_at);

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
declare
  v_visitor_id uuid;
  v_session_id uuid;
  v_window_started_at timestamptz;
  v_request_count integer;
  v_inserted integer;
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
    or octet_length(coalesce(p_properties, '{}'::jsonb)::text) > 4096
  then
    return false;
  end if;

  if p_device_type not in ('desktop', 'mobile', 'tablet', 'bot', 'unknown') then
    p_device_type := 'unknown';
  end if;

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
    first_touch_source,
    first_touch_medium,
    first_touch_campaign,
    first_touch_content,
    first_touch_term,
    first_touch_path,
    first_touch_referrer,
    last_touch_source,
    last_touch_medium,
    last_touch_campaign,
    last_touch_content,
    last_touch_term,
    first_seen_at,
    last_seen_at
  ) values (
    p_visitor_key,
    nullif(p_utm_source, ''),
    nullif(p_utm_medium, ''),
    nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''),
    nullif(p_utm_term, ''),
    p_path,
    p_referrer,
    nullif(p_utm_source, ''),
    nullif(p_utm_medium, ''),
    nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''),
    nullif(p_utm_term, ''),
    p_occurred_at,
    p_occurred_at
  )
  on conflict (visitor_key) do update set
    last_touch_source = coalesce(excluded.last_touch_source, public.marketing_visitors.last_touch_source),
    last_touch_medium = coalesce(excluded.last_touch_medium, public.marketing_visitors.last_touch_medium),
    last_touch_campaign = coalesce(excluded.last_touch_campaign, public.marketing_visitors.last_touch_campaign),
    last_touch_content = coalesce(excluded.last_touch_content, public.marketing_visitors.last_touch_content),
    last_touch_term = coalesce(excluded.last_touch_term, public.marketing_visitors.last_touch_term),
    last_seen_at = greatest(public.marketing_visitors.last_seen_at, excluded.last_seen_at)
  returning id into v_visitor_id;

  insert into public.marketing_sessions (
    session_key,
    visitor_id,
    started_at,
    last_activity_at,
    landing_path,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    device_type
  ) values (
    p_session_key,
    v_visitor_id,
    p_occurred_at,
    p_occurred_at,
    p_path,
    p_referrer,
    nullif(p_utm_source, ''),
    nullif(p_utm_medium, ''),
    nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''),
    nullif(p_utm_term, ''),
    p_device_type
  )
  on conflict (session_key) do update set
    last_activity_at = greatest(public.marketing_sessions.last_activity_at, excluded.last_activity_at)
  returning id into v_session_id;

  insert into public.marketing_events (
    event_id,
    visitor_id,
    session_id,
    event_name,
    path,
    referrer,
    properties,
    occurred_at
  ) values (
    p_event_id,
    v_visitor_id,
    v_session_id,
    p_event_name,
    p_path,
    p_referrer,
    coalesce(p_properties, '{}'::jsonb),
    p_occurred_at
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

revoke all on function public.record_marketing_event(
  uuid, uuid, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_marketing_event(
  uuid, uuid, uuid, text, timestamptz, text, text, text, text, text, text, text, text, text, jsonb
) to service_role;

create or replace function public.promote_inquiry_to_client(p_inquiry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inquiry public.project_inquiries%rowtype;
  v_client_id uuid;
begin
  if not public.is_code_city_staff() then
    raise exception 'not_authorized';
  end if;

  select * into v_inquiry
  from public.project_inquiries
  where id = p_inquiry_id
  for update;

  if not found then
    raise exception 'inquiry_not_found';
  end if;

  if v_inquiry.client_id is not null then
    return v_inquiry.client_id;
  end if;

  select id into v_client_id
  from public.clients
  where primary_email is not null
    and lower(primary_email) = lower(v_inquiry.email)
  limit 1;

  if v_client_id is null then
    insert into public.clients (
      display_name,
      company_name,
      primary_email,
      status,
      lifecycle_stage,
      owner_user_id,
      source_inquiry_id
    ) values (
      coalesce(nullif(v_inquiry.organization, ''), v_inquiry.name),
      nullif(v_inquiry.organization, ''),
      v_inquiry.email,
      'active',
      'qualified',
      coalesce(v_inquiry.assigned_to, (select auth.uid())),
      v_inquiry.id
    ) returning id into v_client_id;

    insert into public.client_contacts (client_id, name, email, is_primary)
    values (v_client_id, v_inquiry.name, v_inquiry.email, true);
  end if;

  insert into public.client_projects (
    client_id,
    source_inquiry_id,
    name,
    status,
    owner_user_id
  ) values (
    v_client_id,
    v_inquiry.id,
    coalesce(nullif(v_inquiry.organization, ''), v_inquiry.name) || ' — ' || replace(v_inquiry.project_type, '-', ' '),
    'qualified',
    coalesce(v_inquiry.assigned_to, (select auth.uid()))
  )
  on conflict do nothing;

  update public.project_inquiries
  set client_id = v_client_id,
      assigned_to = coalesce(assigned_to, (select auth.uid())),
      status = case when status in ('new', 'reviewing') then 'qualified' else status end,
      last_activity_at = clock_timestamp()
  where id = v_inquiry.id;

  return v_client_id;
end;
$$;

revoke all on function public.promote_inquiry_to_client(uuid) from public, anon;
grant execute on function public.promote_inquiry_to_client(uuid) to authenticated, service_role;

alter table public.admin_profiles enable row level security;
alter table public.admin_profiles force row level security;
alter table public.clients enable row level security;
alter table public.clients force row level security;
alter table public.client_contacts enable row level security;
alter table public.client_contacts force row level security;
alter table public.client_projects enable row level security;
alter table public.client_projects force row level security;
alter table public.inquiry_notes enable row level security;
alter table public.inquiry_notes force row level security;
alter table public.inquiry_activity enable row level security;
alter table public.inquiry_activity force row level security;
alter table public.marketing_visitors enable row level security;
alter table public.marketing_visitors force row level security;
alter table public.marketing_sessions enable row level security;
alter table public.marketing_sessions force row level security;
alter table public.marketing_events enable row level security;
alter table public.marketing_events force row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaigns force row level security;
alter table public.marketing_daily_metrics enable row level security;
alter table public.marketing_daily_metrics force row level security;
alter table public.marketing_integrations enable row level security;
alter table public.marketing_integrations force row level security;
alter table public.portal_work_items enable row level security;
alter table public.portal_work_items force row level security;
alter table public.marketing_event_rate_limits enable row level security;
alter table public.marketing_event_rate_limits force row level security;

revoke all on table
  public.admin_profiles,
  public.clients,
  public.client_contacts,
  public.client_projects,
  public.inquiry_notes,
  public.inquiry_activity,
  public.marketing_visitors,
  public.marketing_sessions,
  public.marketing_events,
  public.marketing_campaigns,
  public.marketing_daily_metrics,
  public.marketing_integrations,
  public.portal_work_items,
  public.marketing_event_rate_limits
from anon, authenticated;

grant select on table public.admin_profiles to authenticated;
grant select, insert, update, delete on table public.clients, public.client_contacts, public.client_projects to authenticated;
grant select, insert, update, delete on table public.inquiry_notes to authenticated;
grant select on table public.inquiry_activity to authenticated;
grant select on table public.marketing_visitors, public.marketing_sessions, public.marketing_events to authenticated;
grant select, insert, update, delete on table public.marketing_campaigns, public.marketing_daily_metrics to authenticated;
grant select, update on table public.marketing_integrations, public.portal_work_items to authenticated;
grant select, update on table public.project_inquiries to authenticated;

grant usage, select on sequence public.marketing_daily_metrics_id_seq to authenticated;

grant select, insert, update, delete on table
  public.admin_profiles,
  public.clients,
  public.client_contacts,
  public.client_projects,
  public.inquiry_notes,
  public.inquiry_activity,
  public.marketing_visitors,
  public.marketing_sessions,
  public.marketing_events,
  public.marketing_campaigns,
  public.marketing_daily_metrics,
  public.marketing_integrations,
  public.portal_work_items,
  public.marketing_event_rate_limits
to service_role;

grant usage, select on sequence
  public.inquiry_activity_id_seq,
  public.marketing_events_id_seq,
  public.marketing_daily_metrics_id_seq
to service_role;

create policy admin_profiles_staff_select on public.admin_profiles
  for select to authenticated
  using ((select public.is_code_city_staff()));
create policy admin_profiles_managers_insert on public.admin_profiles
  for insert to authenticated
  with check ((select public.can_manage_code_city()));
create policy admin_profiles_managers_update on public.admin_profiles
  for update to authenticated
  using ((select public.can_manage_code_city()))
  with check ((select public.can_manage_code_city()));
create policy admin_profiles_managers_delete on public.admin_profiles
  for delete to authenticated
  using ((select public.can_manage_code_city()));

create policy project_inquiries_staff_select on public.project_inquiries
  for select to authenticated using ((select public.is_code_city_staff()));
create policy project_inquiries_staff_update on public.project_inquiries
  for update to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()));

create policy clients_staff_all on public.clients
  for all to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()));
create policy client_contacts_staff_all on public.client_contacts
  for all to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()));
create policy client_projects_staff_all on public.client_projects
  for all to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()));
create policy inquiry_notes_staff_all on public.inquiry_notes
  for all to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()) and author_user_id = (select auth.uid()));
create policy inquiry_activity_staff_select on public.inquiry_activity
  for select to authenticated using ((select public.is_code_city_staff()));

create policy marketing_visitors_staff_select on public.marketing_visitors
  for select to authenticated using ((select public.is_code_city_staff()));
create policy marketing_sessions_staff_select on public.marketing_sessions
  for select to authenticated using ((select public.is_code_city_staff()));
create policy marketing_events_staff_select on public.marketing_events
  for select to authenticated using ((select public.is_code_city_staff()));
create policy marketing_campaigns_staff_all on public.marketing_campaigns
  for all to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()));
create policy marketing_daily_metrics_staff_all on public.marketing_daily_metrics
  for all to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()));
create policy marketing_integrations_staff_select on public.marketing_integrations
  for select to authenticated using ((select public.is_code_city_staff()));
create policy marketing_integrations_managers_update on public.marketing_integrations
  for update to authenticated
  using ((select public.can_manage_code_city()))
  with check ((select public.can_manage_code_city()));
create policy portal_work_items_staff_select on public.portal_work_items
  for select to authenticated using ((select public.is_code_city_staff()));
create policy portal_work_items_staff_update on public.portal_work_items
  for update to authenticated
  using ((select public.is_code_city_staff()))
  with check ((select public.is_code_city_staff()));

comment on table public.admin_profiles is 'Allowlisted Code City portal staff linked to Supabase Auth users.';
comment on table public.clients is 'Code City client relationship records promoted from qualified inquiries or created by staff.';
comment on table public.client_projects is 'Commercial and delivery pipeline for Code City client work.';
comment on table public.marketing_events is 'First-party, non-sensitive marketing events received by the Python tracking boundary.';
comment on table public.marketing_integrations is 'Non-secret integration health only. Provider credentials must remain in server-side environment secrets.';
comment on table public.portal_work_items is 'Visible implementation ledger for incomplete client-platform and marketing capabilities.';
