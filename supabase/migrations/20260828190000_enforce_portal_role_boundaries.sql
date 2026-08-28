create or replace function public.can_operate_code_city()
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
      and role in ('owner', 'admin', 'agent')
  );
$$;

revoke all on function public.can_operate_code_city() from public, anon;
grant execute on function public.can_operate_code_city() to authenticated, service_role;

drop policy if exists project_inquiries_staff_update on public.project_inquiries;
create policy project_inquiries_operators_update on public.project_inquiries
  for update to authenticated
  using ((select public.can_operate_code_city()))
  with check ((select public.can_operate_code_city()));

-- Original intake evidence, attribution, notification state, and client linkage are
-- server-owned. Portal operators may move workflow state without rewriting history.
revoke update on table public.project_inquiries from authenticated;
grant update (status, priority, assigned_to, last_activity_at)
  on table public.project_inquiries to authenticated;

drop policy if exists clients_staff_all on public.clients;
create policy clients_staff_select on public.clients
  for select to authenticated using ((select public.is_code_city_staff()));
create policy clients_operators_insert on public.clients
  for insert to authenticated with check ((select public.can_operate_code_city()));
create policy clients_operators_update on public.clients
  for update to authenticated
  using ((select public.can_operate_code_city()))
  with check ((select public.can_operate_code_city()));
create policy clients_operators_delete on public.clients
  for delete to authenticated using ((select public.can_operate_code_city()));

drop policy if exists client_contacts_staff_all on public.client_contacts;
create policy client_contacts_staff_select on public.client_contacts
  for select to authenticated using ((select public.is_code_city_staff()));
create policy client_contacts_operators_insert on public.client_contacts
  for insert to authenticated with check ((select public.can_operate_code_city()));
create policy client_contacts_operators_update on public.client_contacts
  for update to authenticated
  using ((select public.can_operate_code_city()))
  with check ((select public.can_operate_code_city()));
create policy client_contacts_operators_delete on public.client_contacts
  for delete to authenticated using ((select public.can_operate_code_city()));

drop policy if exists client_projects_staff_all on public.client_projects;
create policy client_projects_staff_select on public.client_projects
  for select to authenticated using ((select public.is_code_city_staff()));
create policy client_projects_operators_insert on public.client_projects
  for insert to authenticated with check ((select public.can_operate_code_city()));
create policy client_projects_operators_update on public.client_projects
  for update to authenticated
  using ((select public.can_operate_code_city()))
  with check ((select public.can_operate_code_city()));
create policy client_projects_operators_delete on public.client_projects
  for delete to authenticated using ((select public.can_operate_code_city()));

drop policy if exists inquiry_notes_staff_all on public.inquiry_notes;
create policy inquiry_notes_staff_select on public.inquiry_notes
  for select to authenticated using ((select public.is_code_city_staff()));
create policy inquiry_notes_operators_insert on public.inquiry_notes
  for insert to authenticated
  with check (
    (select public.can_operate_code_city())
    and author_user_id = (select auth.uid())
  );
create policy inquiry_notes_authors_update on public.inquiry_notes
  for update to authenticated
  using (
    (select public.can_operate_code_city())
    and author_user_id = (select auth.uid())
  )
  with check (
    (select public.can_operate_code_city())
    and author_user_id = (select auth.uid())
  );
create policy inquiry_notes_authors_delete on public.inquiry_notes
  for delete to authenticated
  using (
    (select public.can_operate_code_city())
    and author_user_id = (select auth.uid())
  );

drop policy if exists marketing_campaigns_staff_all on public.marketing_campaigns;
create policy marketing_campaigns_staff_select on public.marketing_campaigns
  for select to authenticated using ((select public.is_code_city_staff()));
create policy marketing_campaigns_operators_insert on public.marketing_campaigns
  for insert to authenticated with check ((select public.can_operate_code_city()));
create policy marketing_campaigns_operators_update on public.marketing_campaigns
  for update to authenticated
  using ((select public.can_operate_code_city()))
  with check ((select public.can_operate_code_city()));
create policy marketing_campaigns_operators_delete on public.marketing_campaigns
  for delete to authenticated using ((select public.can_operate_code_city()));

drop policy if exists marketing_daily_metrics_staff_all on public.marketing_daily_metrics;
create policy marketing_daily_metrics_staff_select on public.marketing_daily_metrics
  for select to authenticated using ((select public.is_code_city_staff()));
create policy marketing_daily_metrics_operators_insert on public.marketing_daily_metrics
  for insert to authenticated with check ((select public.can_operate_code_city()));
create policy marketing_daily_metrics_operators_update on public.marketing_daily_metrics
  for update to authenticated
  using ((select public.can_operate_code_city()))
  with check ((select public.can_operate_code_city()));
create policy marketing_daily_metrics_operators_delete on public.marketing_daily_metrics
  for delete to authenticated using ((select public.can_operate_code_city()));

drop policy if exists portal_work_items_staff_update on public.portal_work_items;
create policy portal_work_items_managers_update on public.portal_work_items
  for update to authenticated
  using ((select public.can_manage_code_city()))
  with check ((select public.can_manage_code_city()));

create or replace function public.promote_inquiry_to_client(p_inquiry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inquiry public.project_inquiries%rowtype;
  v_client_id uuid;
  v_display_name text;
begin
  if not public.can_operate_code_city() then
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

  if v_inquiry.status not in ('new', 'reviewing', 'qualified', 'proposal', 'won') then
    raise exception 'inquiry_not_eligible_for_promotion';
  end if;

  v_display_name := coalesce(nullif(btrim(v_inquiry.organization), ''), btrim(v_inquiry.name));
  if char_length(v_display_name) < 2 then
    v_display_name := btrim(v_inquiry.name);
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
      v_display_name,
      nullif(v_inquiry.organization, ''),
      v_inquiry.email,
      'active',
      'qualified',
      coalesce(v_inquiry.assigned_to, (select auth.uid())),
      v_inquiry.id
    )
    on conflict do nothing
    returning id into v_client_id;

    if v_client_id is null then
      select id into v_client_id
      from public.clients
      where primary_email is not null
        and lower(primary_email) = lower(v_inquiry.email)
      limit 1;
    end if;

    if v_client_id is null then
      raise exception 'client_creation_conflict';
    end if;

    insert into public.client_contacts (client_id, name, email, is_primary)
    values (v_client_id, v_inquiry.name, v_inquiry.email, true)
    on conflict do nothing;
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

comment on function public.can_operate_code_city() is
  'True for active owner, admin, or agent profiles. Viewer profiles remain read-only.';
