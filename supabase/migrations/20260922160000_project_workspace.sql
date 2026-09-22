-- Browser roles cannot read hashes, issue grants, or reset attempt counters.
create table public.project_workspace_codes (
  project text primary key check (project in ('trade-city', 'code-city')),
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
  generation uuid not null default gen_random_uuid(),
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

-- A persistent generation fences slow Mailgun requests. Locking changes it rather
-- than deleting the row, so an already-running unlock cannot resurrect access.
create function public.begin_project_workspace_unlock(p_user_id uuid, p_session_id uuid, p_project text, p_revision uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_generation uuid;
begin
  insert into public.project_workspace_grants as g (user_id, session_id, project, revision, generation, expires_at)
  select p_user_id, p_session_id, c.project, c.revision, gen_random_uuid(), '-infinity'::timestamptz
  from public.project_workspace_codes c where c.project = p_project and c.revision = p_revision
  on conflict (user_id, session_id, project) do update
    set generation = excluded.generation, revision = excluded.revision, expires_at = excluded.expires_at
  returning generation into v_generation;
  return v_generation;
end $$;

create function public.lock_project_workspace(p_user_id uuid, p_session_id uuid, p_project text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_workspace_grants as g (user_id, session_id, project, revision, generation, expires_at)
  select p_user_id, p_session_id, c.project, c.revision, gen_random_uuid(), '-infinity'::timestamptz
  from public.project_workspace_codes c where c.project = p_project
  on conflict (user_id, session_id, project) do update
    set generation = excluded.generation, revision = excluded.revision, expires_at = excluded.expires_at;
end $$;

create function public.complete_project_workspace_unlock(p_user_id uuid, p_session_id uuid, p_project text, p_revision uuid, p_generation uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_expires_at timestamptz;
begin
  update public.project_workspace_grants g
  set expires_at = now() + interval '1 hour'
  where g.user_id = p_user_id and g.session_id = p_session_id and g.project = p_project
    and g.revision = p_revision and g.generation = p_generation
    and exists (select 1 from public.project_workspace_codes c where c.project = p_project and c.revision = p_revision)
    and public.project_workspace_session_active(p_user_id, p_session_id)
    and exists (select 1 from public.admin_profiles a where a.user_id = p_user_id and a.is_active and (a.role in ('owner', 'admin') or (p_project = 'code-city' and a.role in ('agent', 'viewer'))))
  returning g.expires_at into v_expires_at;
  return v_expires_at;
end $$;

revoke all on function public.begin_project_workspace_unlock(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.lock_project_workspace(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.complete_project_workspace_unlock(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.begin_project_workspace_unlock(uuid, uuid, text, uuid) to service_role;
grant execute on function public.lock_project_workspace(uuid, uuid, text) to service_role;
grant execute on function public.complete_project_workspace_unlock(uuid, uuid, text, uuid, uuid) to service_role;
