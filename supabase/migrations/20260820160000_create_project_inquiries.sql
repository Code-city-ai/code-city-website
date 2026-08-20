create table public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  project_type text not null,
  budget_range text,
  message text not null,
  source_url text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint project_inquiries_name_length check (char_length(name) between 2 and 120),
  constraint project_inquiries_email_length check (char_length(email) between 3 and 254),
  constraint project_inquiries_organization_length check (organization is null or char_length(organization) <= 160),
  constraint project_inquiries_project_type_allowed check (
    project_type in ('new-product', 'existing-product', 'mobile-app', 'growth-system', 'not-sure')
  ),
  constraint project_inquiries_budget_range_allowed check (
    budget_range is null or budget_range in ('under-10k', '10k-25k', '25k-75k', '75k-plus', 'undecided')
  ),
  constraint project_inquiries_message_length check (char_length(message) between 20 and 3000),
  constraint project_inquiries_source_url_length check (source_url is null or char_length(source_url) <= 500),
  constraint project_inquiries_status_allowed check (status in ('new', 'reviewing', 'qualified', 'closed', 'spam'))
);

comment on table public.project_inquiries is 'Project inquiries submitted through the public Code City website.';
comment on column public.project_inquiries.status is 'Internal inquiry workflow state; never exposed to the public client.';

alter table public.project_inquiries enable row level security;
alter table public.project_inquiries force row level security;

revoke all on table public.project_inquiries from anon, authenticated;

create index project_inquiries_new_created_at_idx
  on public.project_inquiries (created_at desc)
  where status = 'new';

create table public.project_inquiry_rate_limits (
  ip_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  last_request_at timestamptz not null default now(),
  primary key (ip_hash, window_started_at),
  constraint project_inquiry_rate_limits_ip_hash_length check (char_length(ip_hash) = 64),
  constraint project_inquiry_rate_limits_request_count_positive check (request_count > 0)
);

alter table public.project_inquiry_rate_limits enable row level security;
alter table public.project_inquiry_rate_limits force row level security;

revoke all on table public.project_inquiry_rate_limits from anon, authenticated;

create index project_inquiry_rate_limits_cleanup_idx
  on public.project_inquiry_rate_limits (window_started_at);

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
  if char_length(p_ip_hash) <> 64 or p_max_requests < 1 or p_max_requests > 20 then
    return false;
  end if;

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
