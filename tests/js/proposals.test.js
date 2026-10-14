import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  MAX_PROPOSAL_BYTES,
  PROPOSAL_BUCKET,
  SHARE_LINK_SECONDS,
  VIEW_LINK_SECONDS,
  canManageProposals,
  proposalFilePath,
  validateProposalDraft,
  validateProposalFile,
} from '../../src/admin/lib/proposal-files.js';

const readProjectFile = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const pdf = (name = 'proposal.pdf', size = 2048) => ({ name, size, type: 'application/pdf' });

test('proposal rows are owner/admin only behind forced RLS', async () => {
  const migration = await readProjectFile('supabase/migrations/20261014120000_private_proposals.sql');
  assert.match(migration, /alter table public\.proposals enable row level security/);
  assert.match(migration, /alter table public\.proposals force row level security/);
  assert.match(migration, /revoke all on table public\.proposals from public, anon, authenticated/);
  for (const action of ['select', 'insert', 'update', 'delete']) {
    assert.match(migration, new RegExp(`create policy proposals_managers_${action} on public\\.proposals\\s+for ${action} to authenticated`));
  }
  assert.doesNotMatch(migration, /is_code_city_staff/, 'agents and viewers must not read pricing documents');
  assert.equal((migration.match(/public\.can_manage_code_city\(\)/g) || []).length, 8);
});

test('proposal PDFs live in a private, PDF-only bucket readable only by managers', async () => {
  const migration = await readProjectFile('supabase/migrations/20261014120000_private_proposals.sql');
  assert.match(migration, /values \('proposals', 'proposals', false, 26214400, array\['application\/pdf'\]\)/);
  assert.match(migration, /set public = false/);
  for (const action of ['select', 'insert', 'delete']) {
    assert.match(migration, new RegExp(`create policy proposals_files_managers_${action} on storage\\.objects\\s+for ${action} to authenticated\\s+(using|with check) \\(bucket_id = 'proposals' and \\(select public\\.can_manage_code_city\\(\\)\\)\\)`));
  }
  assert.doesNotMatch(migration, /to anon/);
});

test('only active owners and admins can manage proposals', () => {
  assert.equal(canManageProposals({ role: 'owner', is_active: true }), true);
  assert.equal(canManageProposals({ role: 'admin', is_active: true }), true);
  assert.equal(canManageProposals({ role: 'agent', is_active: true }), false);
  assert.equal(canManageProposals({ role: 'viewer', is_active: true }), false);
  assert.equal(canManageProposals({ role: 'owner', is_active: false }), false);
  assert.equal(canManageProposals(null), false);
});

test('uploads accept PDFs up to 25 MB only', () => {
  assert.equal(validateProposalFile(pdf()), '');
  assert.equal(validateProposalFile({ name: 'PROPOSAL.PDF', size: 10, type: '' }), '');
  assert.match(validateProposalFile({ name: 'notes.docx', size: 10, type: 'application/msword' }), /Only PDF/);
  assert.match(validateProposalFile(pdf('big.pdf', MAX_PROPOSAL_BYTES + 1)), /25 MB/);
  assert.match(validateProposalFile(pdf('empty.pdf', 0)), /empty/);
  assert.match(validateProposalFile(null), /Choose a PDF/);
});

test('a draft needs a title, a client and at least one valid PDF', () => {
  assert.equal(validateProposalDraft({ title: 'Dealership DMS', clientLabel: 'Dealership Partner', files: { en: pdf() } }), '');
  assert.match(validateProposalDraft({ title: ' ', clientLabel: 'Client', files: { en: pdf() } }), /title/);
  assert.match(validateProposalDraft({ title: 'Title', clientLabel: '', files: { en: pdf() } }), /client/);
  assert.match(validateProposalDraft({ title: 'Title', clientLabel: 'Client', files: {} }), /at least one PDF/);
  assert.match(validateProposalDraft({ title: 'Title', clientLabel: 'Client', files: { zh: { name: 'x.png', size: 5, type: 'image/png' } } }), /Only PDF/);
});

test('file paths and link lifetimes are predictable', () => {
  assert.equal(PROPOSAL_BUCKET, 'proposals');
  assert.equal(proposalFilePath('abc', 'zh', 1700000000000), 'abc/zh-1700000000000.pdf');
  assert.equal(VIEW_LINK_SECONDS, 600);
  assert.equal(SHARE_LINK_SECONDS, 604800);
});

test('the proposals route and nav item are wired for managers only', async () => {
  const [app, shell] = await Promise.all([readProjectFile('src/admin/AdminApp.jsx'), readProjectFile('src/admin/AdminShell.jsx')]);
  assert.match(app, /'\/admin\/proposals': \{ title: 'Proposals'/);
  assert.match(shell, /\{ label: 'Proposals', href: '\/admin\/proposals', icon: FileText, managersOnly: true \}/);
  assert.match(shell, /!item\.managersOnly \|\| canManageProposals\(profile\)/);
});
