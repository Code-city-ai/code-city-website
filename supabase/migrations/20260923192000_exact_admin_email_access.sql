-- Only the owner and the two invited administrators may enter Code City Admin.
-- Auth still verifies passwords; this server-side identity gate additionally
-- protects profiles, CRM data, project grants, and future profile writes.
-- Capture the Auth email that originally owns each profile. A later Auth email
-- change, even to another approved address, cannot inherit that profile/grants.
alter table public.admin_profiles add column if not exists identity_email text;
update public.admin_profiles p
set identity_email = lower(u.email)
from auth.users u
where p.user_id = u.id and p.identity_email is null;
alter table public.admin_profiles alter column identity_email set not null;

create or replace function public.code_city_admin_email_allowed(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and lower(u.email) in (
        'dev@codecity.ai',
        'hugosan8210@gmail.com',
        'tradecity.mc@proton.me'
      )
  );
$$;
revoke all on function public.code_city_admin_email_allowed(uuid) from public, anon, authenticated;
grant execute on function public.code_city_admin_email_allowed(uuid) to authenticated, service_role;

-- Read Auth's current email every time access is checked. The immutable
-- profile binding must match, including when two addresses are both approved.
create or replace function public.code_city_profile_identity_allowed(p_user_id uuid, p_role text, p_identity_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.code_city_admin_email_allowed(p_user_id)
    and coalesce(p_role in ('owner', 'admin', 'agent', 'viewer'), false)
    and p_identity_email = lower(p_identity_email)
    and (p_role <> 'owner' or p_identity_email = 'dev@codecity.ai')
    and exists (
      select 1 from auth.users u
      where u.id = p_user_id and lower(u.email) = p_identity_email
    );
$$;
revoke all on function public.code_city_profile_identity_allowed(uuid, text, text) from public, anon, authenticated;
grant execute on function public.code_city_profile_identity_allowed(uuid, text, text) to authenticated, service_role;

-- Fail instead of silently removing the owner's only access if production
-- identity differs from the owner email confirmed for this release.
do $$ begin
  if exists (
    select 1 from public.admin_profiles p
    where p.is_active and p.role = 'owner'
      and not public.code_city_profile_identity_allowed(p.user_id, p.role, p.identity_email)
  ) then raise exception 'Active Code City owner email is not approved'; end if;
end $$;

update public.admin_profiles p
set is_active = false
where p.is_active and not public.code_city_profile_identity_allowed(p.user_id, p.role, p.identity_email);

delete from public.project_workspace_grants g
where not public.code_city_admin_email_allowed(g.user_id);

create or replace function public.enforce_code_city_admin_profile_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_auth_email text;
begin
  if tg_op = 'INSERT' then
    select lower(u.email) into v_auth_email from auth.users u where u.id = new.user_id;
    if v_auth_email is null then
      raise exception 'Code City administrator identity needs an Auth email' using errcode = '23514';
    end if;
    new.identity_email := v_auth_email;
  elsif new.user_id is distinct from old.user_id or new.identity_email is distinct from old.identity_email then
    raise exception 'Code City administrator identity cannot be reassigned' using errcode = '23514';
  end if;
  if new.role = 'owner' and not public.code_city_profile_identity_allowed(new.user_id, new.role, new.identity_email) then
    raise exception 'Only the Code City owner email may hold the owner role' using errcode = '23514';
  end if;
  if new.is_active and not public.code_city_profile_identity_allowed(new.user_id, new.role, new.identity_email) then
    raise exception 'Code City administrator email is not approved' using errcode = '23514';
  end if;
  return new;
end $$;
create or replace trigger admin_profiles_approved_email
before insert or update on public.admin_profiles
for each row execute function public.enforce_code_city_admin_profile_email();
revoke all on function public.enforce_code_city_admin_profile_email() from public, anon, authenticated;

-- The first self-read is needed before a project code is entered, but only an
-- approved active identity may receive its profile.
alter policy admin_profiles_identity_self_select on public.admin_profiles
  using (user_id = (select auth.uid()) and is_active
    and public.code_city_profile_identity_allowed(user_id, role, identity_email));
alter policy admin_profiles_managers_insert on public.admin_profiles
  with check ((select public.can_manage_code_city())
    and public.code_city_profile_identity_allowed(user_id, role, identity_email)
    and (role <> 'owner' or user_id = (select auth.uid())));
alter policy admin_profiles_managers_update on public.admin_profiles
  using ((select public.can_manage_code_city())
    and (role <> 'owner' or user_id = (select auth.uid())))
  with check ((select public.can_manage_code_city())
    and public.code_city_profile_identity_allowed(user_id, role, identity_email)
    and (role <> 'owner' or user_id = (select auth.uid())));
alter policy admin_profiles_managers_delete on public.admin_profiles
  using ((select public.can_manage_code_city())
    and (role <> 'owner' or user_id = (select auth.uid())));

create or replace function public.project_workspace_has_access(p_project text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_session text := auth.jwt()->>'session_id';
begin
  if v_user is null or v_session is null or v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or not public.code_city_admin_email_allowed(v_user) then return false; end if;
  return exists (
    select 1 from public.project_workspace_grants g
    join public.project_workspace_codes c on c.project = g.project and c.revision = g.revision
    join public.admin_profiles a on a.user_id = g.user_id
    where g.user_id = v_user and g.session_id = v_session::uuid and g.project = p_project
      and g.expires_at > now() and a.is_active
      and public.code_city_profile_identity_allowed(a.user_id, a.role, a.identity_email)
      and (a.role in ('owner', 'admin') or (p_project = 'code-city' and a.role in ('agent', 'viewer')))
      and public.project_workspace_session_active(v_user, v_session::uuid)
  );
end $$;

-- This service-role RPC is the final grant minting step after Mailgun accepts
-- the project access notification. Recheck the identity here as well.
create or replace function public.complete_project_workspace_unlock(p_user_id uuid, p_session_id uuid, p_project text, p_revision uuid, p_generation uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_expires_at timestamptz;
begin
  update public.project_workspace_grants g
  set expires_at = now() + interval '1 hour'
  where g.user_id = p_user_id and g.session_id = p_session_id and g.project = p_project
    and g.revision = p_revision and g.generation = p_generation
    and exists (select 1 from public.project_workspace_codes c where c.project = p_project and c.revision = p_revision)
    and public.project_workspace_session_active(p_user_id, p_session_id)
    and public.code_city_admin_email_allowed(p_user_id)
    and exists (select 1 from public.admin_profiles a where a.user_id = p_user_id and a.is_active
      and public.code_city_profile_identity_allowed(a.user_id, a.role, a.identity_email)
      and (a.role in ('owner', 'admin') or (p_project = 'code-city' and a.role in ('agent', 'viewer'))))
  returning g.expires_at into v_expires_at;
  return v_expires_at;
end $$;

-- CRM helpers are called by RLS and service-side portal RPCs. A current email
-- mismatch must deny access even if an old profile, code grant, and session live.
create or replace function public.is_code_city_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_profiles a
    where a.user_id = (select auth.uid()) and a.is_active
      and public.code_city_profile_identity_allowed(a.user_id, a.role, a.identity_email)
  ) and public.project_workspace_has_access('code-city');
$$;
create or replace function public.can_manage_code_city()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_profiles a
    where a.user_id = (select auth.uid()) and a.is_active
      and a.role in ('owner', 'admin')
      and public.code_city_profile_identity_allowed(a.user_id, a.role, a.identity_email)
  ) and public.project_workspace_has_access('code-city');
$$;
create or replace function public.can_operate_code_city()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_profiles a
    where a.user_id = (select auth.uid()) and a.is_active
      and a.role in ('owner', 'admin', 'agent')
      and public.code_city_profile_identity_allowed(a.user_id, a.role, a.identity_email)
  ) and public.project_workspace_has_access('code-city');
$$;
