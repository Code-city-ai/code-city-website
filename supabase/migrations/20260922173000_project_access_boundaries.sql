-- Add the per-project code boundary to the existing CRM role model. Public inquiry
-- intake, marketing ingestion, and server notification workers retain their rails.
create function public.project_workspace_has_access(p_project text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_session text := auth.jwt()->>'session_id';
begin
  if v_user is null or v_session is null or v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return exists (
    select 1 from public.project_workspace_grants g
    join public.project_workspace_codes c on c.project = g.project and c.revision = g.revision
    join public.admin_profiles a on a.user_id = g.user_id
    where g.user_id = v_user and g.session_id = v_session::uuid and g.project = p_project
      and g.expires_at > now() and a.is_active
      and (a.role in ('owner', 'admin') or (p_project = 'code-city' and a.role in ('agent', 'viewer')))
      and public.project_workspace_session_active(v_user, v_session::uuid)
  );
end $$;
revoke all on function public.project_workspace_has_access(text) from public, anon;
grant execute on function public.project_workspace_has_access(text) to authenticated, service_role;

-- Identity can load its own role before either project is unlocked. This read-only
-- policy does not grant access to anybody else's profile or to CRM data.
create policy admin_profiles_identity_self_select on public.admin_profiles
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_code_city_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_profiles where user_id = (select auth.uid()) and is_active)
    and public.project_workspace_has_access('code-city');
$$;
create or replace function public.can_manage_code_city()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_profiles where user_id = (select auth.uid()) and is_active and role in ('owner', 'admin'))
    and public.project_workspace_has_access('code-city');
$$;
create or replace function public.can_operate_code_city()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_profiles where user_id = (select auth.uid()) and is_active and role in ('owner', 'admin', 'agent'))
    and public.project_workspace_has_access('code-city');
$$;
