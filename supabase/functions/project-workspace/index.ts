import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';
import { workspaceContextAdmin, workspaceHandler } from '../_shared/project-workspace.ts';

const origins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://codecity.ai').split(',').map((item) => item.trim()).filter(Boolean);
// OPTIONS and origin checks stay in the handler before any context or Auth lookup.
Deno.serve(workspaceHandler(workspaceContextAdmin(createSupabaseContext), origins));
