import { supabase } from '@/lib/supabase';

export async function workspaceRequest(action, payload = {}) {
  if (!supabase) throw new Error('The workspace connection is not configured.');
  const { data, error } = await supabase.functions.invoke('project-workspace', { body: { action, ...payload } });
  if (error) {
    const response = error.context;
    const detail = response instanceof Response ? await response.json().catch(() => null) : null;
    const failure = new Error(detail?.error || 'Project access is unavailable. Please retry or contact the owner.');
    Object.assign(failure, { status: response?.status });
    if (action === 'snapshot' && response?.status === 403) window.dispatchEvent(new Event('workspace-locked'));
    throw failure;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

