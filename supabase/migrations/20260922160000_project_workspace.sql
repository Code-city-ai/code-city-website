-- Browser roles cannot read hashes, issue grants, or reset attempt counters.
create table public.project_workspace_codes (
  project text primary key check (project = 'trade-city'),
  code_hash text not null,
  salt text not null,
  revision uuid not null default gen_random_uuid(),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.project_workspace_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  project text not null references public.project_workspace_codes(project),
  revision uuid not null,
  expires_at timestamptz not null,
  primary key (user_id, session_id, project)
);
create table public.project_workspace_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('code', 'read')),
  window_start timestamptz not null default now(),
  attempts integer not null default 1,
  primary key (user_id, bucket)
);
alter table public.project_workspace_codes enable row level security;
alter table public.project_workspace_grants enable row level security;
alter table public.project_workspace_attempts enable row level security;
revoke all on public.project_workspace_codes, public.project_workspace_grants, public.project_workspace_attempts from anon, authenticated;
grant all on public.project_workspace_codes, public.project_workspace_grants, public.project_workspace_attempts to service_role;

-- Atomic shared rate limit: parallel requests and separate function instances share a bucket.
create function public.consume_project_workspace_attempt(p_user_id uuid, p_bucket text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_window interval; v_limit integer;
begin
  if p_bucket = 'code' then v_window := interval '15 minutes'; v_limit := 5;
  elsif p_bucket = 'read' then v_window := interval '1 minute'; v_limit := 120;
  else raise exception 'invalid_bucket'; end if;
  insert into public.project_workspace_attempts as a (user_id, bucket)
  values (p_user_id, p_bucket)
  on conflict (user_id, bucket) do update set
    attempts = case when a.window_start < now() - v_window then 1 else least(a.attempts + 1, v_limit + 1) end,
    window_start = case when a.window_start < now() - v_window then now() else a.window_start end
  returning attempts into v_count;
  return v_count <= v_limit;
end $$;
revoke all on function public.consume_project_workspace_attempt(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_project_workspace_attempt(uuid, text) to service_role;

-- A signed access token can outlive logout. Require its Auth session to still exist.
create function public.project_workspace_session_active(p_user_id uuid, p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = p_session_id and s.user_id = p_user_id
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function public.project_workspace_session_active(uuid, uuid) from public, anon, authenticated;
grant execute on function public.project_workspace_session_active(uuid, uuid) to service_role;
