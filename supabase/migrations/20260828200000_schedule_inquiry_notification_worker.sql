-- Autonomous Mailgun outbox scheduling.
--
-- The scheduler authenticates with a dedicated Supabase secret API key. It
-- never stores or transmits the service-role JWT. Create a secret API key named
-- `code-city-notifications`, then store this exact Vault secret:
--
--   code_city_notifications_secret_key
--     the sb_secret_... value for the `code-city-notifications` API key
--
-- The Edge Function uses withSupabase({ auth: 'secret:code-city-notifications' })
-- and receives the dedicated key only through the `apikey` request header. The
-- destination is pinned below to the Code City project rather than read from
-- mutable Vault state.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.reconcile_inquiry_notification_worker_schedule()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_job_name constant text := 'code-city-process-inquiry-notifications';
  v_work_item_title constant text := 'Automate inquiry notification retries';
  v_notification_secret_key text;
  v_extensions_ready boolean := false;
  v_vault_ready boolean := false;
  v_existing_job boolean := false;
  v_existing_job_id bigint;
  v_scheduled_job_id bigint;
  v_work_item_exists boolean := false;
  v_scheduled boolean := false;
  v_command text := $command$
select net.http_post(
  url := 'https://yfpcjxkyjftkekwkekrz.supabase.co/functions/v1/process-inquiry-notifications',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'code_city_notifications_secret_key'
      limit 1
    )
  ),
  body := '{"source":"pg_cron"}'::jsonb,
  timeout_milliseconds := 25000
);
$command$;
begin
  v_extensions_ready :=
    to_regprocedure('cron.schedule(text,text,text)') is not null
    and to_regprocedure('cron.alter_job(bigint,text,text,text,text,boolean)') is not null
    and to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null
    and to_regclass('cron.job') is not null;

  if to_regclass('vault.decrypted_secrets') is not null then
    execute $sql$
      select max(decrypted_secret)
      from vault.decrypted_secrets
      where name = 'code_city_notifications_secret_key'
    $sql$
    into v_notification_secret_key;

    v_vault_ready :=
      coalesce(v_notification_secret_key, '') ~ '^sb_secret_[A-Za-z0-9_-]+$'
      and char_length(coalesce(v_notification_secret_key, '')) >= 32;
  end if;

  if v_extensions_ready and v_vault_ready then
    -- A named schedule is overwritten in place, so reconciliation cannot create
    -- parallel duplicate workers.
    execute 'select cron.schedule($1, $2, $3)'
      into v_scheduled_job_id
      using v_job_name, '* * * * *', v_command;
    -- Named scheduling updates an existing row but does not reactivate a job
    -- that was manually disabled. Reconciliation owns the desired active state.
    execute 'select cron.alter_job($1, active := true)'
      using v_scheduled_job_id;
    execute 'select active from cron.job where jobid = $1 and jobname = $2'
      into v_scheduled
      using v_scheduled_job_id, v_job_name;
    v_scheduled := coalesce(v_scheduled, false);
  elsif to_regclass('cron.job') is not null then
    execute 'select exists (select 1 from cron.job where jobname = $1), max(jobid) from cron.job where jobname = $1'
      into v_existing_job, v_existing_job_id
      using v_job_name;
    if v_existing_job then
      if to_regprocedure('cron.unschedule(text)') is not null then
        execute 'select cron.unschedule($1)' using v_job_name;
      elsif to_regprocedure('cron.unschedule(bigint)') is not null then
        execute 'select cron.unschedule($1)' using v_existing_job_id;
      end if;
    end if;
  end if;

  select exists (
    select 1
    from public.portal_work_items
    where title = v_work_item_title
  ) into v_work_item_exists;

  if v_work_item_exists then
    update public.portal_work_items
    set
      area = 'Email',
      description = 'Run the service-only Mailgun outbox worker every minute with nonblocking claims, bounded retries, and stale-lease recovery.',
      status = case when v_scheduled then 'in_progress' else 'blocked' end,
      priority = 'critical',
      blocked_reason = case
        when v_scheduled then null
        else 'Automatic retries are not scheduled. Create the Supabase secret API key named code-city-notifications and store its value in the required Vault secret.'
      end,
      sort_order = 25
    where title = v_work_item_title;
  else
    insert into public.portal_work_items (
      area,
      title,
      description,
      status,
      priority,
      blocked_reason,
      sort_order
    ) values (
      'Email',
      v_work_item_title,
      'Run the service-only Mailgun outbox worker every minute with nonblocking claims, bounded retries, and stale-lease recovery.',
      case when v_scheduled then 'in_progress' else 'blocked' end,
      'critical',
      case
        when v_scheduled then null
        else 'Automatic retries are not scheduled. Create the Supabase secret API key named code-city-notifications and store its value in the required Vault secret.'
      end,
      25
    );
  end if;

  return v_scheduled;
end;
$function$;

revoke all on function public.reconcile_inquiry_notification_worker_schedule()
  from public, anon, authenticated;
grant execute on function public.reconcile_inquiry_notification_worker_schedule()
  to service_role;

comment on function public.reconcile_inquiry_notification_worker_schedule() is
  'Service-only idempotent scheduler reconciliation. A single named cron job targets the pinned Code City Supabase project and exists only when the dedicated notification secret API key is present in Vault.';

select public.reconcile_inquiry_notification_worker_schedule();

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
  'Client operations',
  'Complete the client delivery workspace',
  'Extend the proven inquiry-to-client rail with editable client details, project value and stage controls, next actions, and a unified relationship timeline.',
  'planned',
  'high',
  null,
  35
where not exists (
  select 1
  from public.portal_work_items
  where title = 'Complete the client delivery workspace'
);

update public.portal_work_items
set
  description = 'Per-recipient Mailgun outbox delivery and automatic retries are implemented. Configure the verified sending domain and server-only Mailgun secrets, prove provider acceptance to both recipients, then add delivery and bounce webhook reconciliation.',
  blocked_reason = 'Mailgun server secrets and live dual-recipient delivery are not yet verified.',
  updated_at = clock_timestamp()
where area = 'Email'
  and title = 'Connect Mailgun notification delivery';
