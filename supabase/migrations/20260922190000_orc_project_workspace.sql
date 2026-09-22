-- Forward-only extension: existing project codes, grants, roles, generation fences,
-- Auth-session checks, RLS, and shared rate limits remain authoritative.
-- The generic grant RPCs already require owner/admin outside the Code City CRM.
alter table public.project_workspace_codes
  drop constraint project_workspace_codes_project_check,
  add constraint project_workspace_codes_project_check
    check (project in ('trade-city', 'code-city', 'orc'));

-- No ORC code or grant is seeded. The owner chooses its distinct code through the
-- existing project-workspace function; Trade City/CRM grants cannot authorize ORC.
