-- Run only in an isolated PostgreSQL fixture after the Code City migrations.
-- This rolls back all synthetic Auth identities, sessions, profiles, and grants.
begin;
do $$
declare
  u uuid := 'aaaa1111-1111-4111-8111-111111111111';
  s uuid := 'bbbb2222-2222-4222-8222-222222222222';
  r uuid := 'cccc3333-3333-4333-8333-333333333333';
  generation uuid;
begin
  insert into auth.users(id, email) values (u, 'Hugosan8210@gmail.com');
  insert into auth.sessions(id, user_id, not_after) values (s, u, null);
  insert into public.admin_profiles(user_id, full_name, role, is_active)
    values (u, 'Synthetic Approved Admin', 'admin', true);
  if (select identity_email from public.admin_profiles where user_id = u) <> 'hugosan8210@gmail.com' then
    raise exception 'profile email was not bound on insert';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u, 'session_id', s)::text, true);
  insert into public.project_workspace_codes(project, code_hash, salt, revision, updated_by)
    values ('trade-city', 'synthetic-hash', 'synthetic-salt', r, u);
  generation := public.begin_project_workspace_unlock(u, s, 'trade-city', r);
  if public.complete_project_workspace_unlock(u, s, 'trade-city', r, generation) is null or
    not public.project_workspace_has_access('trade-city') then
    raise exception 'approved profile baseline was rejected';
  end if;

  -- Auth moves the same user ID to another approved inbox outside the hook.
  update auth.users set email = 'tradecity.MC@proton.me' where id = u;
  if not public.code_city_admin_email_allowed(u) then
    raise exception 'swap test did not reach a second approved email';
  end if;
  if public.code_city_profile_identity_allowed(u, 'admin', 'hugosan8210@gmail.com') or
    public.project_workspace_has_access('trade-city') then
    raise exception 'old profile or grant followed an approved-to-approved email swap';
  end if;
  generation := public.begin_project_workspace_unlock(u, s, 'trade-city', r);
  if public.complete_project_workspace_unlock(u, s, 'trade-city', r, generation) is not null then
    raise exception 'email-swapped identity received a new grant';
  end if;
  begin
    update public.admin_profiles set identity_email = 'tradecity.mc@proton.me' where user_id = u;
    raise exception 'profile email binding was editable';
  exception when check_violation then null;
  end;
end $$;
rollback;
