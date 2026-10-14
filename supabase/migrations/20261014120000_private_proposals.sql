-- Private client proposals. Pricing documents are owner/admin only: the rows live behind forced RLS
-- and the PDFs live in a private Storage bucket. Browsers only ever receive short-lived signed URLs.

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_label text not null,
  summary text,
  files jsonb not null default '[]'::jsonb,
  created_by uuid references public.admin_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_title_length check (char_length(btrim(title)) between 2 and 160),
  constraint proposals_client_label_length check (char_length(btrim(client_label)) between 2 and 160),
  constraint proposals_summary_length check (summary is null or char_length(summary) <= 600),
  constraint proposals_files_array check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 8)
);

create index proposals_created_at_idx on public.proposals (created_at desc);

create trigger proposals_set_updated_at
before update on public.proposals
for each row execute function public.set_portal_updated_at();

alter table public.proposals enable row level security;
alter table public.proposals force row level security;

revoke all on table public.proposals from public, anon, authenticated;
grant select, insert, update, delete on table public.proposals to authenticated;
grant select, insert, update, delete on table public.proposals to service_role;

create policy proposals_managers_select on public.proposals
  for select to authenticated
  using ((select public.can_manage_code_city()));
create policy proposals_managers_insert on public.proposals
  for insert to authenticated
  with check ((select public.can_manage_code_city()));
create policy proposals_managers_update on public.proposals
  for update to authenticated
  using ((select public.can_manage_code_city()))
  with check ((select public.can_manage_code_city()));
create policy proposals_managers_delete on public.proposals
  for delete to authenticated
  using ((select public.can_manage_code_city()));

-- Private bucket: never public, PDFs only, 25 MB per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proposals', 'proposals', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy proposals_files_managers_select on storage.objects
  for select to authenticated
  using (bucket_id = 'proposals' and (select public.can_manage_code_city()));
create policy proposals_files_managers_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proposals' and (select public.can_manage_code_city()));
create policy proposals_files_managers_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'proposals' and (select public.can_manage_code_city()));
