// Pure helpers for private proposals (no Supabase import, so Node tests can load them directly).

export const PROPOSAL_BUCKET = 'proposals';
export const MAX_PROPOSAL_BYTES = 25 * 1024 * 1024;
export const VIEW_LINK_SECONDS = 10 * 60;
export const SHARE_LINK_SECONDS = 7 * 24 * 60 * 60;

export const PROPOSAL_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

// Mirrors public.can_manage_code_city(): pricing documents are owner/admin only.
export const canManageProposals = (profile) => Boolean(profile?.is_active && ['owner', 'admin'].includes(profile.role));

export function validateProposalFile(file) {
  if (!file) return 'Choose a PDF file.';
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdf) return 'Only PDF files can be uploaded.';
  if (!file.size) return 'That PDF is empty.';
  if (file.size > MAX_PROPOSAL_BYTES) return 'Each PDF must be 25 MB or smaller.';
  return '';
}

export function validateProposalDraft({ title, clientLabel, files }) {
  if (!title || title.trim().length < 2) return 'Give the proposal a title.';
  if (!clientLabel || clientLabel.trim().length < 2) return 'Name the client the proposal is for.';
  const chosen = PROPOSAL_LANGUAGES.filter(({ code }) => files?.[code]);
  if (!chosen.length) return 'Add at least one PDF.';
  for (const { code } of chosen) {
    const problem = validateProposalFile(files[code]);
    if (problem) return problem;
  }
  return '';
}

export const proposalFilePath = (proposalId, language, stamp = Date.now()) => `${proposalId}/${language}-${stamp}.pdf`;

export const languageLabel = (code) => PROPOSAL_LANGUAGES.find((language) => language.code === code)?.label || code;
