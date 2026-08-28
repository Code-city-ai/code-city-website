-- One canonical, security-invoker timeline prevents independently paginated
-- notes and system activity from appearing out of chronological order.

create or replace view public.client_relationship_timeline
with (security_invoker = true)
as
select
  note.client_id,
  'note'::text as kind,
  'note:' || note.id::text as sort_key,
  note.id::text as source_id,
  coalesce(profile.full_name, 'Code City team') as title,
  note.body,
  note.created_at
from public.client_notes as note
left join public.admin_profiles as profile
  on profile.user_id = note.author_user_id

union all

select
  activity.client_id,
  'activity'::text as kind,
  'activity:' || lpad(activity.id::text, 20, '0') as sort_key,
  activity.id::text as source_id,
  coalesce(profile.full_name, 'System automation') as title,
  coalesce(
    activity.summary,
    replace(activity.event_type, '_', ' '),
    'Relationship updated'
  ) as body,
  activity.created_at
from public.client_activity as activity
left join public.admin_profiles as profile
  on profile.user_id = activity.actor_user_id;

revoke all on table public.client_relationship_timeline
  from public, anon, authenticated, service_role;
grant select on table public.client_relationship_timeline to authenticated, service_role;

comment on view public.client_relationship_timeline is
  'Security-invoker union of client notes and system activity. Consumers paginate on the shared created_at and sort_key cursor so one stream cannot hide newer rows from the other.';
