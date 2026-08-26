alter table public.project_inquiries
  drop constraint if exists project_inquiries_project_type_allowed,
  add constraint project_inquiries_project_type_allowed check (
    project_type in (
      'new-product',
      'existing-product',
      'mobile-app',
      'growth-system',
      'not-sure',
      'product-support'
    )
  ) not valid;

alter table public.project_inquiries
  validate constraint project_inquiries_project_type_allowed;

comment on table public.project_inquiries is
  'Project and product-support inquiries submitted through the public Code City website.';
