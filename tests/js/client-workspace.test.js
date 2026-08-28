import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('client workspace data is protected by forced RLS and least-privilege grants', async () => {
  const migration = await readProjectFile('supabase/migrations/20260828201000_complete_client_workspace_backend.sql');

  assert.match(migration, /alter table public\.client_notes force row level security/);
  assert.match(migration, /alter table public\.client_activity force row level security/);
  assert.match(migration, /revoke all on table public\.client_notes, public\.client_activity\s+from public, anon, authenticated, service_role/);
  assert.match(migration, /grant select on table public\.client_notes to authenticated/);
  assert.match(migration, /grant select on table public\.client_activity to authenticated/);
  assert.match(migration, /author_user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /grant insert \(client_id, author_user_id, body\)/);
  assert.match(migration, /body = btrim\(body\) and char_length\(body\) between 1 and 4000/);
});

test('client creation and primary-contact changes stay behind operator-only RPCs', async () => {
  const [migration, portal] = await Promise.all([
    readProjectFile('supabase/migrations/20260828201000_complete_client_workspace_backend.sql'),
    readProjectFile('src/admin/lib/portal.js'),
  ]);

  assert.match(migration, /create or replace function public\.create_client_workspace\(/);
  assert.match(migration, /create or replace function public\.save_client_contact\(/);
  assert.match(migration, /security definer\s+set search_path = ''/);
  assert.match(migration, /if not public\.can_operate_code_city\(\)/);
  assert.match(migration, /revoke insert, update, delete on table public\.client_contacts from authenticated/);
  assert.match(migration, /revoke insert, delete on table public\.clients from authenticated/);
  assert.match(migration, /drop policy if exists client_contacts_operators_update on public\.client_contacts/);
  assert.match(migration, /drop policy if exists clients_operators_insert on public\.clients/);
  assert.match(migration, /order by contact\.id\s+for update/);
  assert.match(migration, /create or replace function public\.validate_client_workspace_record\(\)/);
  assert.match(migration, /role in \('owner', 'admin', 'agent'\)/);
  assert.match(migration, /invalid_client_website/);
  assert.match(migration, /client_projects_currency_iso_shape/);
  assert.match(migration, /create or replace function public\.get_client_pipeline_totals\(\)/);
  assert.match(migration, /client_contact_conflict/);
  assert.match(migration, /revoke update on table public\.clients from authenticated/);
  assert.match(migration, /revoke insert, update, delete on table public\.client_projects from authenticated/);
  assert.match(portal, /client\.rpc\('create_client_workspace'/);
  assert.match(portal, /client\.rpc\('save_client_contact'/);
  assert.match(portal, /client\.rpc\('get_client_pipeline_totals'\)/);
  assert.match(portal, /export async function loadClientWorkspace\(clientId\)/);
  assert.match(portal, /\.order\('created_at', \{ ascending: false \}\)\s*\.order\('id', \{ ascending: false \}\)/);
  assert.match(portal, /created_at\.lt\.\$\{cursor\.created_at\}.*id\.lt\.\$\{cursor\.id\}/);
  assert.match(portal, /noteTotal: noteTotal\.count/);
  assert.match(portal, /created_at\.lt\.\$\{noteCursor\.created_at\}.*id\.lt\.\$\{noteCursor\.id\}/);
  assert.match(portal, /p_expected_updated_at:/);
  assert.match(portal, /\.eq\('updated_at', expectedUpdatedAt\)/);
  assert.match(portal, /client_contact_conflict/);
  assert.doesNotMatch(portal, /from\('client_contacts'\)\s*\.insert/);
  assert.doesNotMatch(portal, /pickDefined\(payload, \[\s*'source_inquiry_id'/);
});

test('client history is append-only and mutation activity is trigger-generated', async () => {
  const migration = await readProjectFile('supabase/migrations/20260828201000_complete_client_workspace_backend.sql');

  assert.match(migration, /create trigger clients_log_workspace_activity/);
  assert.match(migration, /create trigger client_contacts_log_workspace_activity/);
  assert.match(migration, /create trigger client_projects_log_workspace_activity/);
  assert.match(migration, /insert into public\.client_activity/);
  assert.doesNotMatch(migration, /grant (?:update|delete)[^;]*public\.client_notes to authenticated/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete)[^;]*public\.client_activity to authenticated/);
});

test('the client screen keeps one canonical editor and exposes incomplete marketing work honestly', async () => {
  const [screen, dashboard, portal, migration, environment] = await Promise.all([
    readProjectFile('src/admin/pages/Clients.jsx'),
    readProjectFile('src/admin/pages/Dashboard.jsx'),
    readProjectFile('src/admin/lib/portal.js'),
    readProjectFile('supabase/migrations/20260828201000_complete_client_workspace_backend.sql'),
    readProjectFile('.env.example'),
  ]);

  assert.equal((screen.match(/function WorkspaceDialog/g) || []).length, 1);
  assert.match(screen, /\['owner', 'admin', 'agent'\]\.includes\(profile\.role\)/);
  assert.match(screen, /Viewer access is read-only/);
  assert.match(screen, /Relationship timeline/);
  assert.match(portal, /pipelineTotals: pipelineRows\.map/);
  assert.match(dashboard, /metrics\.pipelineTotals\.length > 1/);
  assert.doesNotMatch(portal, /pipelineValue: pipelineRows\.reduce/);
  assert.match(migration, /Add consent-aware advertising pixel controls/);
  assert.match(migration, /Connect Meta and Google campaign data/);
  assert.match(migration, /Upload value-based offline conversions/);
  assert.match(environment, /RATE_LIMIT_SALT=server-only-random-value-at-least-32-characters/);
});
