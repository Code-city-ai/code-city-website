-- Run only in an isolated PostgreSQL fixture after the three project-workspace
-- migrations and the exact-admin-email migration. Requires fixture
-- auth.users/auth.sessions/admin_profiles and auth claim helpers. All data is
-- synthetic and rolled back; no external calls occur.
begin;
do $$
declare
  u uuid := '11111111-1111-4111-8111-111111111111';
  s uuid := '22222222-2222-4222-8222-222222222222';
  r uuid := '33333333-3333-4333-8333-333333333333';
  generation uuid;
  project_key text;
  role_name text;
begin
  insert into auth.users(id,email) values(u,'dev@codecity.ai');
  insert into auth.sessions(id,user_id,not_after) values(s,u,null);
  insert into public.admin_profiles(user_id,full_name,role,is_active) values(u,'SQL fixture owner','owner',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'session_id',s)::text,true);

  foreach project_key in array array['trade-city','code-city','orc'] loop
    insert into public.project_workspace_codes(project,code_hash,salt,revision,updated_by)
      values(project_key,'synthetic-hash','synthetic-salt',r,u);
  end loop;
  begin
    insert into public.project_workspace_codes(project,code_hash,salt,updated_by)
      values('unknown','synthetic-hash','synthetic-salt',u);
    raise exception 'unknown project was accepted';
  exception when check_violation then null;
  end;

  -- An existing Trade City grant never gives access to ORC or the CRM.
  generation := public.begin_project_workspace_unlock(u,s,'trade-city',r);
  if public.complete_project_workspace_unlock(u,s,'trade-city',r,generation) is null then
    raise exception 'Trade City baseline did not unlock';
  end if;
  if public.project_workspace_has_access('orc') or public.is_code_city_staff() then
    raise exception 'Trade City grant escaped its project';
  end if;

  generation := public.begin_project_workspace_unlock(u,s,'orc',r);
  if public.complete_project_workspace_unlock(u,s,'orc',r,generation) is null then
    raise exception 'owner ORC grant was rejected';
  end if;
  if not public.project_workspace_has_access('orc') or public.is_code_city_staff() then
    raise exception 'ORC grant did not remain separate from CRM';
  end if;

  foreach role_name in array array['agent','viewer'] loop
    update public.admin_profiles set role=role_name where user_id=u;
    if public.project_workspace_has_access('orc') then raise exception 'CRM staff inherited ORC access'; end if;
    generation := public.begin_project_workspace_unlock(u,s,'orc',r);
    if public.complete_project_workspace_unlock(u,s,'orc',r,generation) is not null then
      raise exception 'non-admin ORC grant was issued';
    end if;
    generation := public.begin_project_workspace_unlock(u,s,'code-city',r);
    if public.complete_project_workspace_unlock(u,s,'code-city',r,generation) is null then
      raise exception 'existing CRM staff grant rejected';
    end if;
    if not public.is_code_city_staff() then raise exception 'existing CRM staff permissions lost'; end if;
  end loop;
  update public.admin_profiles set role='admin' where user_id=u;
  generation := public.begin_project_workspace_unlock(u,s,'orc',r);
  if public.complete_project_workspace_unlock(u,s,'orc',r,generation) is null then
    raise exception 'active admin ORC grant was rejected';
  end if;

  -- Lock fences an earlier in-flight unlock. A fresh attempt can succeed.
  generation := public.begin_project_workspace_unlock(u,s,'orc',r);
  perform public.lock_project_workspace(u,s,'orc');
  if public.complete_project_workspace_unlock(u,s,'orc',r,generation) is not null or
    public.project_workspace_has_access('orc') then raise exception 'ORC lock fence failed'; end if;
  generation := public.begin_project_workspace_unlock(u,s,'orc',r);
  if public.complete_project_workspace_unlock(u,s,'orc',r,generation) is null then
    raise exception 'fresh ORC unlock failed';
  end if;
  update public.project_workspace_codes set revision=gen_random_uuid() where project='orc';
  if public.project_workspace_has_access('orc') or
    not public.project_workspace_has_access('trade-city') or not public.is_code_city_staff() then
    raise exception 'ORC rotation was not project scoped';
  end if;
  update public.project_workspace_codes set revision=r where project='orc';
  update public.admin_profiles set is_active=false where user_id=u;
  if public.project_workspace_has_access('orc') then raise exception 'inactive ORC identity retained access'; end if;
  update public.admin_profiles set is_active=true where user_id=u;
  update auth.sessions set not_after=now()-interval '1 second' where id=s;
  if public.project_workspace_has_access('orc') then raise exception 'expired Auth session retained ORC access'; end if;

  if has_table_privilege('authenticated','public.project_workspace_codes','select') or
    has_table_privilege('authenticated','public.project_workspace_grants','insert') or
    has_function_privilege('authenticated','public.complete_project_workspace_unlock(uuid,uuid,text,uuid,uuid)','execute') or
    has_function_privilege('anon','public.begin_project_workspace_unlock(uuid,uuid,text,uuid)','execute') then
    raise exception 'browser role can read codes or mint grants';
  end if;
end $$;
rollback;
