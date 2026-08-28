-- Append-only client context, audited workspace mutations, and atomic client setup.

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  author_user_id uuid not null references public.admin_profiles (user_id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint client_notes_body_length check (
    body = btrim(body) and char_length(body) between 1 and 4000
  )
);

create index client_notes_client_created_idx
  on public.client_notes (client_id, created_at desc, id desc);
create index client_notes_author_created_idx
  on public.client_notes (author_user_id, created_at desc);

create table public.client_activity (
  id bigint generated always as identity primary key,
  client_id uuid not null,
  actor_user_id uuid references public.admin_profiles (user_id) on delete set null,
  project_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint client_activity_entity_type_allowed check (
    entity_type in ('client', 'contact', 'project')
  ),
  constraint client_activity_event_type_allowed check (
    event_type in (
      'client_created', 'client_updated', 'client_deleted',
      'contact_created', 'contact_updated', 'contact_deleted',
      'project_created', 'project_updated', 'project_deleted'
    )
  ),
  constraint client_activity_summary_length check (char_length(summary) between 2 and 500),
  constraint client_activity_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint client_activity_metadata_size check (octet_length(metadata::text) <= 8192),
  constraint client_activity_project_scope check (
    (entity_type = 'project' and project_id = entity_id)
    or (entity_type <> 'project' and project_id is null)
  )
);

create index client_activity_client_created_idx
  on public.client_activity (client_id, created_at desc, id desc);
create index client_activity_project_created_idx
  on public.client_activity (project_id, created_at desc, id desc)
  where project_id is not null;
create index client_activity_actor_created_idx
  on public.client_activity (actor_user_id, created_at desc)
  where actor_user_id is not null;

alter table public.client_notes enable row level security;
alter table public.client_notes force row level security;
alter table public.client_activity enable row level security;
alter table public.client_activity force row level security;

revoke all on table public.client_notes, public.client_activity
  from public, anon, authenticated, service_role;
revoke all on sequence public.client_activity_id_seq
  from public, anon, authenticated, service_role;
grant select on table public.client_notes to authenticated;
grant insert (client_id, author_user_id, body)
  on table public.client_notes to authenticated;
grant select on table public.client_activity to authenticated;
grant select, insert on table public.client_notes to service_role;
grant select on table public.client_activity to service_role;

create policy client_notes_staff_select on public.client_notes
  for select to authenticated
  using ((select public.is_code_city_staff()));

create policy client_notes_operators_insert on public.client_notes
  for insert to authenticated
  with check (
    (select public.can_operate_code_city())
    and author_user_id = (select auth.uid())
  );

create policy client_activity_staff_select on public.client_activity
  for select to authenticated
  using ((select public.is_code_city_staff()));

alter table public.client_projects
  add constraint client_projects_currency_iso_shape
  check (currency::text ~ '^[A-Z]{3}$');

create or replace function public.validate_client_workspace_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_user_id is not null and not exists (
    select 1
    from public.admin_profiles
    where user_id = new.owner_user_id
      and is_active
      and role in ('owner', 'admin', 'agent')
  ) then
    raise exception using errcode = '22023', message = 'invalid_client_owner';
  end if;

  if tg_table_name = 'clients' then
    new.primary_email := nullif(lower(btrim(new.primary_email)), '');
    if new.primary_email is not null and (
      char_length(new.primary_email) > 254
      or new.primary_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then
      raise exception using errcode = '22023', message = 'invalid_client_email';
    end if;

    if new.website is not null
      and new.website !~* '^https?://[^[:space:]]+$'
    then
      raise exception using errcode = '22023', message = 'invalid_client_website';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_client_workspace_record()
  from public, anon, authenticated;

create trigger clients_validate_workspace_record
before insert or update of owner_user_id, website, primary_email on public.clients
for each row execute function public.validate_client_workspace_record();

create trigger client_projects_validate_workspace_owner
before insert or update of owner_user_id on public.client_projects
for each row execute function public.validate_client_workspace_record();

create or replace function public.log_client_workspace_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_project_id uuid;
  v_entity_id uuid;
  v_entity_type text;
  v_event_type text;
  v_summary text;
  v_metadata jsonb := '{}'::jsonb;
  v_before jsonb;
  v_after jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_changed_text text;
begin
  if tg_table_schema <> 'public'
    or tg_table_name not in ('clients', 'client_contacts', 'client_projects')
  then
    raise exception using errcode = '22023', message = 'Unsupported client audit trigger source';
  end if;

  if tg_op = 'UPDATE' then
    v_before := to_jsonb(old) - 'created_at' - 'updated_at';
    v_after := to_jsonb(new) - 'created_at' - 'updated_at';

    select coalesce(jsonb_agg(changed.key order by changed.key), '[]'::jsonb)
      into v_changed_fields
    from (
      select keys.key
      from jsonb_object_keys(v_before || v_after) as keys(key)
      where v_before -> keys.key is distinct from v_after -> keys.key
    ) as changed;

    if jsonb_array_length(v_changed_fields) = 0 then
      return new;
    end if;

    select string_agg(value, ', ' order by value)
      into v_changed_text
    from jsonb_array_elements_text(v_changed_fields) as fields(value);
  end if;

  if tg_table_name = 'clients' then
    v_client_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_entity_id := v_client_id;
    v_entity_type := 'client';
    v_event_type := case tg_op
      when 'INSERT' then 'client_created'
      when 'UPDATE' then 'client_updated'
      else 'client_deleted'
    end;
    v_summary := case tg_op
      when 'INSERT' then format('Client workspace created for %s.', new.display_name)
      when 'UPDATE' then format('Client %s updated: %s.', new.display_name, v_changed_text)
      else format('Client workspace deleted for %s.', old.display_name)
    end;
    v_metadata := jsonb_build_object(
      'entity_type', 'client',
      'entity_id', v_entity_id,
      'changed_fields', v_changed_fields,
      'status', case when tg_op = 'DELETE' then old.status else new.status end,
      'lifecycle_stage', case when tg_op = 'DELETE' then old.lifecycle_stage else new.lifecycle_stage end
    );
  elsif tg_table_name = 'client_contacts' then
    v_client_id := case when tg_op = 'DELETE' then old.client_id else new.client_id end;
    v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_entity_type := 'contact';
    v_event_type := case tg_op
      when 'INSERT' then 'contact_created'
      when 'UPDATE' then 'contact_updated'
      else 'contact_deleted'
    end;
    v_summary := case tg_op
      when 'INSERT' then format('Contact %s added.', new.name)
      when 'UPDATE' then format('Contact %s updated: %s.', new.name, v_changed_text)
      else format('Contact %s removed.', old.name)
    end;
    v_metadata := jsonb_build_object(
      'entity_type', 'contact',
      'entity_id', v_entity_id,
      'changed_fields', v_changed_fields,
      'is_primary', case when tg_op = 'DELETE' then old.is_primary else new.is_primary end
    );
  else
    v_client_id := case when tg_op = 'DELETE' then old.client_id else new.client_id end;
    v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_project_id := v_entity_id;
    v_entity_type := 'project';
    v_event_type := case tg_op
      when 'INSERT' then 'project_created'
      when 'UPDATE' then 'project_updated'
      else 'project_deleted'
    end;
    v_summary := case tg_op
      when 'INSERT' then format('Project %s created.', new.name)
      when 'UPDATE' then format('Project %s updated: %s.', new.name, v_changed_text)
      else format('Project %s removed.', old.name)
    end;
    v_metadata := jsonb_build_object(
      'entity_type', 'project',
      'entity_id', v_entity_id,
      'changed_fields', v_changed_fields,
      'status', case when tg_op = 'DELETE' then old.status else new.status end
    );
  end if;

  insert into public.client_activity (
    client_id,
    actor_user_id,
    project_id,
    entity_type,
    entity_id,
    event_type,
    summary,
    metadata
  ) values (
    v_client_id,
    (select auth.uid()),
    v_project_id,
    v_entity_type,
    v_entity_id,
    v_event_type,
    left(v_summary, 500),
    v_metadata
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.log_client_workspace_activity() from public, anon, authenticated;

create trigger clients_log_workspace_activity
after insert or update or delete on public.clients
for each row execute function public.log_client_workspace_activity();

create trigger client_contacts_log_workspace_activity
after insert or update or delete on public.client_contacts
for each row execute function public.log_client_workspace_activity();

create trigger client_projects_log_workspace_activity
after insert or update or delete on public.client_projects
for each row execute function public.log_client_workspace_activity();

create or replace function public.save_client_contact(
  p_client_id uuid,
  p_name text,
  p_contact_id uuid default null,
  p_expected_updated_at timestamptz default null,
  p_email text default null,
  p_phone text default null,
  p_title text default null,
  p_is_primary boolean default null
)
returns public.client_contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.client_contacts%rowtype;
  v_saved public.client_contacts%rowtype;
  v_replacement_id uuid;
  v_name text := nullif(btrim(p_name), '');
  v_email text := nullif(lower(btrim(p_email)), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_title text := nullif(btrim(p_title), '');
  v_make_primary boolean;
begin
  if not public.can_operate_code_city() then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if p_client_id is null
    or v_name is null
    or char_length(v_name) > 120
    or (v_email is not null and (
      char_length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    or char_length(coalesce(v_phone, '')) > 40
    or char_length(coalesce(v_title, '')) > 120
  then
    raise exception using errcode = '22023', message = 'invalid_client_contact';
  end if;

  perform 1 from public.clients where id = p_client_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'client_not_found';
  end if;

  -- Serialize every primary-contact transition for this client in a stable order.
  perform contact.id
  from public.client_contacts as contact
  where contact.client_id = p_client_id
  order by contact.id
  for update;

  if p_contact_id is null then
    v_make_primary := coalesce(p_is_primary, false)
      or not exists (
        select 1 from public.client_contacts
        where client_id = p_client_id and is_primary
      );

    if v_make_primary then
      update public.client_contacts
      set is_primary = false
      where client_id = p_client_id and is_primary;
    end if;

    insert into public.client_contacts (
      client_id, name, email, phone, title, is_primary
    ) values (
      p_client_id, v_name, v_email, v_phone, v_title, v_make_primary
    )
    returning * into v_saved;

    return v_saved;
  end if;

  select * into v_existing
  from public.client_contacts
  where id = p_contact_id and client_id = p_client_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'contact_not_found';
  end if;

  if p_expected_updated_at is not null
    and v_existing.updated_at is distinct from p_expected_updated_at
  then
    raise exception using errcode = '40001', message = 'client_contact_conflict';
  end if;

  if p_is_primary is true then
    update public.client_contacts
    set is_primary = false
    where client_id = p_client_id and id <> p_contact_id and is_primary;
    v_make_primary := true;
  elsif p_is_primary is false and v_existing.is_primary then
    select id into v_replacement_id
    from public.client_contacts
    where client_id = p_client_id and id <> p_contact_id
    order by created_at, id
    limit 1;

    if v_replacement_id is null then
      v_make_primary := true;
    else
      update public.client_contacts
      set
        name = v_name,
        email = v_email,
        phone = v_phone,
        title = v_title,
        is_primary = false
      where id = p_contact_id and client_id = p_client_id
      returning * into v_saved;

      update public.client_contacts
      set is_primary = true
      where id = v_replacement_id;

      return v_saved;
    end if;
  else
    v_make_primary := v_existing.is_primary;
    if not v_make_primary and not exists (
      select 1 from public.client_contacts
      where client_id = p_client_id and id <> p_contact_id and is_primary
    ) then
      v_make_primary := true;
    end if;
  end if;

  update public.client_contacts
  set
    name = v_name,
    email = v_email,
    phone = v_phone,
    title = v_title,
    is_primary = v_make_primary
  where id = p_contact_id and client_id = p_client_id
  returning * into v_saved;

  return v_saved;
end;
$$;

revoke all on function public.save_client_contact(uuid, text, uuid, timestamptz, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.save_client_contact(uuid, text, uuid, timestamptz, text, text, text, boolean)
  to authenticated;

-- Contact writes must go through save_client_contact so a client cannot be left
-- with competing primary contacts or no primary contact after an edit.
revoke insert, update, delete on table public.client_contacts from authenticated;
drop policy if exists client_contacts_operators_insert on public.client_contacts;
drop policy if exists client_contacts_operators_update on public.client_contacts;
drop policy if exists client_contacts_operators_delete on public.client_contacts;

create or replace function public.create_client_workspace(
  p_display_name text,
  p_company_name text default null,
  p_primary_email text default null,
  p_phone text default null,
  p_website text default null,
  p_status text default 'lead',
  p_lifecycle_stage text default 'discovery',
  p_owner_user_id uuid default null,
  p_notes text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_contact_title text default null,
  p_project_name text default null,
  p_project_status text default 'discovery',
  p_project_value numeric default null,
  p_project_currency text default 'USD',
  p_project_next_step text default null,
  p_project_next_step_at timestamptz default null,
  p_project_started_at date default null,
  p_project_target_launch_at date default null,
  p_initial_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_owner_user_id uuid;
  v_client_id uuid;
  v_display_name text := nullif(btrim(p_display_name), '');
  v_website text := nullif(btrim(p_website), '');
  v_primary_email text := coalesce(
    nullif(lower(btrim(p_primary_email)), ''),
    nullif(lower(btrim(p_contact_email)), '')
  );
  v_contact_name text;
begin
  if not public.can_operate_code_city() then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  if v_display_name is null or char_length(v_display_name) > 160 then
    raise exception using errcode = '22023', message = 'invalid_client_name';
  end if;

  if v_primary_email is not null and (
    char_length(v_primary_email) > 254
    or v_primary_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception using errcode = '22023', message = 'invalid_client_email';
  end if;

  if v_website is not null and v_website !~* '^https?://[^[:space:]]+$' then
    raise exception using errcode = '22023', message = 'invalid_client_website';
  end if;

  if p_initial_note is not null
    and char_length(btrim(p_initial_note)) not between 1 and 4000
  then
    raise exception using errcode = '22023', message = 'invalid_client_note';
  end if;

  if p_notes is not null and char_length(btrim(p_notes)) > 4000 then
    raise exception using errcode = '22023', message = 'invalid_client_brief';
  end if;

  v_owner_user_id := coalesce(p_owner_user_id, v_actor_user_id);
  if not exists (
    select 1
    from public.admin_profiles
    where user_id = v_owner_user_id
      and is_active
      and role in ('owner', 'admin', 'agent')
  ) then
    raise exception using errcode = '22023', message = 'invalid_client_owner';
  end if;

  insert into public.clients (
    display_name,
    company_name,
    primary_email,
    phone,
    website,
    status,
    lifecycle_stage,
    owner_user_id,
    notes
  ) values (
    v_display_name,
    nullif(btrim(p_company_name), ''),
    v_primary_email,
    nullif(btrim(p_phone), ''),
    v_website,
    coalesce(nullif(btrim(p_status), ''), 'lead'),
    coalesce(nullif(btrim(p_lifecycle_stage), ''), 'discovery'),
    v_owner_user_id,
    nullif(btrim(p_notes), '')
  )
  returning id into v_client_id;

  if nullif(btrim(p_contact_name), '') is not null
    or nullif(btrim(p_contact_email), '') is not null
    or v_primary_email is not null
    or nullif(btrim(p_contact_phone), '') is not null
    or nullif(btrim(p_contact_title), '') is not null
  then
    v_contact_name := coalesce(nullif(btrim(p_contact_name), ''), v_display_name);
    perform public.save_client_contact(
      p_client_id => v_client_id,
      p_name => v_contact_name,
      p_email => coalesce(nullif(lower(btrim(p_contact_email)), ''), v_primary_email),
      p_phone => p_contact_phone,
      p_title => p_contact_title,
      p_is_primary => true
    );
  end if;

  if nullif(btrim(p_project_name), '') is not null then
    insert into public.client_projects (
      client_id,
      name,
      status,
      value,
      currency,
      owner_user_id,
      next_step,
      next_step_at,
      started_at,
      target_launch_at
    ) values (
      v_client_id,
      btrim(p_project_name),
      coalesce(nullif(btrim(p_project_status), ''), 'discovery'),
      p_project_value,
      upper(coalesce(nullif(btrim(p_project_currency), ''), 'USD')),
      v_owner_user_id,
      nullif(btrim(p_project_next_step), ''),
      p_project_next_step_at,
      p_project_started_at,
      p_project_target_launch_at
    );
  elsif p_project_value is not null
    or nullif(btrim(p_project_next_step), '') is not null
    or p_project_next_step_at is not null
    or p_project_started_at is not null
    or p_project_target_launch_at is not null
  then
    raise exception using errcode = '22023', message = 'project_name_required';
  end if;

  if nullif(btrim(p_initial_note), '') is not null then
    insert into public.client_notes (client_id, author_user_id, body)
    values (v_client_id, v_actor_user_id, btrim(p_initial_note));
  end if;

  return v_client_id;
end;
$$;

revoke all on function public.create_client_workspace(
  text, text, text, text, text, text, text, uuid,
  text, text, text, text, text, text, text, numeric, text, text,
  timestamptz, date, date, text
) from public, anon, authenticated;
grant execute on function public.create_client_workspace(
  text, text, text, text, text, text, text, uuid,
  text, text, text, text, text, text, text, numeric, text, text,
  timestamptz, date, date, text
) to authenticated;

-- Client creation must use the atomic workspace RPC. Permanent deletion is not
-- exposed in the current UI. Service-side cleanup remains audited by triggers.
revoke insert, delete on table public.clients from authenticated;
revoke update on table public.clients from authenticated;
grant update (
  display_name,
  company_name,
  primary_email,
  phone,
  website,
  status,
  lifecycle_stage,
  owner_user_id,
  notes
) on table public.clients to authenticated;

revoke insert, update, delete on table public.client_projects from authenticated;
grant insert (
  client_id,
  name,
  status,
  value,
  currency,
  owner_user_id,
  next_step,
  next_step_at,
  started_at,
  target_launch_at
) on table public.client_projects to authenticated;
grant update (
  name,
  status,
  value,
  currency,
  owner_user_id,
  next_step,
  next_step_at,
  started_at,
  target_launch_at
) on table public.client_projects to authenticated;
drop policy if exists clients_operators_insert on public.clients;
drop policy if exists clients_operators_delete on public.clients;
drop policy if exists client_projects_operators_delete on public.client_projects;

create or replace function public.get_client_pipeline_totals()
returns table(currency text, value numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    project.currency::text as currency,
    coalesce(sum(project.value), 0)::numeric as value
  from public.client_projects as project
  where project.status in ('qualified', 'proposal', 'contracted', 'in_progress')
    and project.value is not null
  group by project.currency
  order by project.currency;
$$;

revoke all on function public.get_client_pipeline_totals()
  from public, anon, authenticated;
grant execute on function public.get_client_pipeline_totals()
  to authenticated;

update public.portal_work_items
set
  description = 'Append-only notes, audited client/contact/project mutations, atomic workspace creation, primary-contact management, and the client detail interface are implemented locally. Hosted migration, live role checks, and authenticated browser verification remain.',
  status = 'in_progress',
  priority = 'high',
  blocked_reason = null,
  updated_at = clock_timestamp()
where title = 'Complete the client delivery workspace';

update public.portal_work_items
set
  description = 'Connect governed Meta and Google provider APIs to import campaign identity, spend, impressions, and clicks after consent-aware browser pixel controls are established. This is provider reporting, not first-party collection.',
  status = 'planned',
  blocked_reason = null,
  updated_at = clock_timestamp()
where title = 'Connect Meta and Google campaign data';

update public.portal_work_items
set
  description = 'Send verified qualified-lead, won-client, and realized-value events to advertising providers only after revenue ownership, campaign identity, and consent rules are proven. This is distinct from spend import.',
  status = 'planned',
  blocked_reason = null,
  updated_at = clock_timestamp()
where title = 'Upload value-based offline conversions';

insert into public.portal_work_items (
  area,
  title,
  description,
  status,
  priority,
  blocked_reason,
  sort_order
)
select
  'Privacy',
  'Add consent-aware advertising pixel controls',
  'Add an explicit consent and policy state plus governed enable/disable controls for Meta Pixel, Google tags, and future third-party pixels. Keep privacy-conscious first-party analytics operationally separate.',
  'planned',
  'high',
  null,
  45
where not exists (
  select 1
  from public.portal_work_items
  where title = 'Add consent-aware advertising pixel controls'
);

comment on table public.client_notes is
  'Append-only operator notes for a Code City client. Authenticated users may read; operators may insert; no application role may update or delete.';
comment on table public.client_activity is
  'Read-only audit timeline generated by secured triggers for client, contact, and project mutations.';
comment on column public.client_activity.client_id is
  'Durable client identity snapshot without a foreign key so delete audit history is not erased with the client row.';
comment on column public.client_activity.project_id is
  'Durable project identity snapshot for project events; intentionally retained if the source project is later deleted.';
comment on column public.clients.primary_email is
  'Canonical relationship-level email. Individual people retain their own email in client_contacts.';
comment on function public.save_client_contact(uuid, text, uuid, timestamptz, text, text, text, boolean) is
  'Operator-only atomic create/update contact boundary that serializes one primary contact per client.';
comment on function public.create_client_workspace(
  text, text, text, text, text, text, text, uuid,
  text, text, text, text, text, text, text, numeric, text, text,
  timestamptz, date, date, text
) is
  'Operator-only atomic workspace setup for a client, optional primary contact, optional initial project, and optional append-only note.';
