import { supabase } from '@/lib/supabase';

export async function projectAccess(action, fields = {}, project = 'trade-city') {
  if (!supabase) throw new Error('Project access is not connected. Try again shortly.');
  const { data, error } = await supabase.functions.invoke('project-workspace', {
    body: { ...fields, action, project },
  });
  if (error) {
    let message = 'Project access could not be verified. Please try again.';
    if (error.context instanceof Response) {
      const result = await error.context.json().catch(() => null);
      if (typeof result?.error === 'string') message = result.error;
    }
    throw new Error(message);
  }
  return data;
}

export const isProjectAccessRoute = (pathname) => pathname === '/admin' || pathname === '/admin/' || pathname === '/sign-in' || pathname === '/admin/login'
  || pathname === '/admin/projects' || pathname === '/admin/projects/';
