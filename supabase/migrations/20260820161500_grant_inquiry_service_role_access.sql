grant select, insert, update, delete
  on table public.project_inquiries
  to service_role;

comment on table public.project_inquiries is
  'Project inquiries submitted through the public Code City website. Public roles have no direct table access; only the server-side service role may manage records.';
