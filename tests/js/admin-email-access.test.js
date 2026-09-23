import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APPROVED_ADMIN_EMAILS, isApprovedAdminEmail, isOwnerAdminEmail } from '../../supabase/functions/_shared/admin-emails.ts';

test('only the three owner-approved addresses pass the shared Edge identity gate', () => {
  assert.deepEqual(APPROVED_ADMIN_EMAILS, [
    'dev@codecity.ai', 'hugosan8210@gmail.com', 'tradecity.mc@proton.me',
  ]);
  for (const email of APPROVED_ADMIN_EMAILS) {
    assert.equal(isApprovedAdminEmail(email), true);
    assert.equal(isApprovedAdminEmail(email.toUpperCase()), true);
  }
  assert.equal(isOwnerAdminEmail('dev@codecity.ai'), true);
  assert.equal(isOwnerAdminEmail('DEV@CODECITY.AI'), true);
  assert.equal(isOwnerAdminEmail('Hugosan8210@gmail.com'), false);
  assert.equal(isOwnerAdminEmail('tradecity.MC@proton.me'), false);
  for (const email of [undefined, null, '', ' dev@codecity.ai', 'dev@codecity.ai ',
    'dev+other@codecity.ai', 'outsider@example.test', 'tradecity.mc@proton.me.evil.test']) {
    assert.equal(isApprovedAdminEmail(email), false);
  }
});

test('SQL identity gate has exactly the same three addresses as the Edge gate', () => {
  const migration = readFileSync(new URL('../../supabase/migrations/20260923192000_exact_admin_email_access.sql', import.meta.url), 'utf8');
  const sqlFunction = (name) => {
    const start = migration.indexOf(`create or replace function public.${name}(`);
    assert.ok(start >= 0, `missing ${name}`);
    const end = migration.indexOf('$$;', start);
    assert.ok(end > start, `missing ${name} body`);
    return migration.slice(start, end + 3);
  };
  const sqlList = migration.match(/lower\(u\.email\) in \(([^)]+)\)/)?.[1];
  assert.ok(sqlList, 'missing SQL Auth email allowlist');
  assert.deepEqual([...sqlList.matchAll(/'([^']+)'/g)].map((match) => match[1]), APPROVED_ADMIN_EMAILS);
  const profileGate = sqlFunction('code_city_profile_identity_allowed');
  assert.match(profileGate, /code_city_admin_email_allowed\(p_user_id\)/);
  assert.match(profileGate, /p_role <> 'owner' or exists/);
  assert.match(profileGate, /lower\(u\.email\) = 'dev@codecity\.ai'/);
  assert.match(migration, /create or replace trigger admin_profiles_approved_email/);
  assert.match(migration, /alter policy admin_profiles_identity_self_select/);
  assert.match(migration, /alter policy admin_profiles_managers_insert/);
  assert.match(migration, /alter policy admin_profiles_managers_update/);
  assert.match(migration, /alter policy admin_profiles_managers_delete/);
  for (const policy of ['insert', 'update', 'delete']) {
    const rule = migration.match(new RegExp(`alter policy admin_profiles_managers_${policy}[\\s\\S]*?;`))?.[0];
    assert.ok(rule, `missing ${policy} policy`);
    assert.match(rule, /role <> 'owner' or user_id = \(select auth\.uid\(\)\)/);
  }
  for (const name of ['project_workspace_has_access', 'complete_project_workspace_unlock',
    'is_code_city_staff', 'can_manage_code_city', 'can_operate_code_city']) {
    assert.match(sqlFunction(name), /code_city_profile_identity_allowed\(a\.user_id, a\.role\)/);
  }
  assert.match(migration, /alter policy admin_profiles_identity_self_select[\s\S]*?code_city_profile_identity_allowed\(user_id, role\)/);
});
