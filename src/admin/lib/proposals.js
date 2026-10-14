import { supabase } from '@/lib/supabase';
import {
  PROPOSAL_BUCKET,
  PROPOSAL_LANGUAGES,
  SHARE_LINK_SECONDS,
  VIEW_LINK_SECONDS,
  proposalFilePath,
  validateProposalDraft,
} from '@/admin/lib/proposal-files';

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

export async function listProposals() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('proposals')
    .select('id, title, client_label, summary, files, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Short-lived link for viewing inside the portal; a longer one only when the owner shares it.
export async function signProposalFile(path, { share = false } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(PROPOSAL_BUCKET)
    .createSignedUrl(path, share ? SHARE_LINK_SECONDS : VIEW_LINK_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function createProposal({ title, clientLabel, summary, files, userId }) {
  const problem = validateProposalDraft({ title, clientLabel, files });
  if (problem) throw new Error(problem);
  const client = requireSupabase();
  const { data: row, error } = await client
    .from('proposals')
    .insert({ title: title.trim(), client_label: clientLabel.trim(), summary: summary?.trim() || null, created_by: userId || null })
    .select('id')
    .single();
  if (error) throw error;

  const uploaded = [];
  try {
    for (const { code } of PROPOSAL_LANGUAGES.filter(({ code: language }) => files[language])) {
      const path = proposalFilePath(row.id, code);
      const { error: uploadError } = await client.storage
        .from(PROPOSAL_BUCKET)
        .upload(path, files[code], { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;
      uploaded.push({ language: code, path, bytes: files[code].size });
    }
    const { error: updateError } = await client.from('proposals').update({ files: uploaded }).eq('id', row.id);
    if (updateError) throw updateError;
    return row.id;
  } catch (failure) {
    // Leave nothing half-created: remove uploaded files, then the row.
    if (uploaded.length) await client.storage.from(PROPOSAL_BUCKET).remove(uploaded.map((file) => file.path));
    await client.from('proposals').delete().eq('id', row.id);
    throw failure;
  }
}
