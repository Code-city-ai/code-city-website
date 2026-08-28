import { supabase } from '@/lib/supabase';

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

const unwrap = ({ data, error, count }) => {
  if (error) throw error;
  return count ?? data;
};

export async function loadDashboard() {
  const client = requireSupabase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [newInquiries, qualified, activeClients, pipeline, visitors, recent, integrations, workItems] = await Promise.all([
    client.from('project_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    client.from('project_inquiries').select('id', { count: 'exact', head: true }).in('status', ['qualified', 'proposal', 'won']),
    client.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    client.from('client_projects').select('value, status').in('status', ['qualified', 'proposal', 'contracted', 'in_progress']),
    client.from('marketing_visitors').select('id', { count: 'exact', head: true }).gte('last_seen_at', since),
    client.from('project_inquiries').select('*').order('created_at', { ascending: false }).limit(7),
    client.from('marketing_integrations').select('*').order('provider'),
    client.from('portal_work_items').select('*').neq('status', 'completed').order('sort_order'),
  ]);

  const pipelineRows = unwrap(pipeline) || [];
  return {
    metrics: {
      newInquiries: unwrap(newInquiries),
      qualified: unwrap(qualified),
      activeClients: unwrap(activeClients),
      pipelineValue: pipelineRows.reduce((sum, project) => sum + Number(project.value || 0), 0),
      visitors30d: unwrap(visitors),
    },
    recent: unwrap(recent) || [],
    integrations: unwrap(integrations) || [],
    workItems: unwrap(workItems) || [],
  };
}

export async function loadInquiries() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('project_inquiries')
    .select('*, inquiry_notification_deliveries(recipient, status, attempts, last_error, last_attempt_at, accepted_at, delivered_at)')
    .order('created_at', { ascending: false })
    .limit(250);
  if (error) throw error;
  return data || [];
}

export async function loadInquiryContext(inquiryId) {
  const client = requireSupabase();
  const [notes, activity] = await Promise.all([
    client.from('inquiry_notes').select('*, admin_profiles(full_name)').eq('inquiry_id', inquiryId).order('created_at', { ascending: false }),
    client.from('inquiry_activity').select('*').eq('inquiry_id', inquiryId).order('created_at', { ascending: false }).limit(30),
  ]);
  return { notes: unwrap(notes) || [], activity: unwrap(activity) || [] };
}

export async function updateInquiry(inquiryId, changes) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('project_inquiries')
    .update({ ...changes, last_activity_at: new Date().toISOString() })
    .eq('id', inquiryId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addInquiryNote(inquiryId, authorUserId, body) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('inquiry_notes')
    .insert({ inquiry_id: inquiryId, author_user_id: authorUserId, body: body.trim() })
    .select('*, admin_profiles(full_name)')
    .single();
  if (error) throw error;
  return data;
}

export async function promoteInquiry(inquiryId) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('promote_inquiry_to_client', { p_inquiry_id: inquiryId });
  if (error) throw error;
  return data;
}

export async function loadClients() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('clients')
    .select('*, client_contacts(*), client_projects(*)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadMarketing() {
  const client = requireSupabase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date().toISOString();
  const [visitors, sessions, events, pageviews, formStarts, inquiries, attributableInquiries, campaigns, integrations, workItems, funnel] = await Promise.all([
    client.from('marketing_visitors').select('id', { count: 'exact', head: true }).gte('last_seen_at', since),
    client.from('marketing_sessions').select('id', { count: 'exact', head: true }).gte('started_at', since),
    client.from('marketing_events').select('id', { count: 'exact', head: true }).gte('occurred_at', since),
    client.from('marketing_events').select('id', { count: 'exact', head: true }).eq('event_name', 'page_viewed').gte('occurred_at', since),
    client.from('marketing_events').select('id', { count: 'exact', head: true }).eq('event_name', 'contact_form_started').gte('occurred_at', since),
    client.from('project_inquiries').select('id', { count: 'exact', head: true }).neq('project_type', 'product-support').neq('status', 'spam').gte('created_at', since),
    client.from('project_inquiries').select('id', { count: 'exact', head: true }).neq('project_type', 'product-support').neq('status', 'spam').not('attribution_captured_at', 'is', null).gte('created_at', since),
    client.from('marketing_campaigns').select('*, marketing_daily_metrics(*)').order('updated_at', { ascending: false }),
    client.from('marketing_integrations').select('*').order('provider'),
    client.from('portal_work_items').select('*').order('sort_order'),
    client.rpc('get_marketing_funnel', { p_from: since, p_to: until }),
  ]);

  return {
    metrics: {
      visitors: unwrap(visitors),
      sessions: unwrap(sessions),
      events: unwrap(events),
      pageviews: unwrap(pageviews),
      formStarts: unwrap(formStarts),
      formSubmits: unwrap(inquiries),
      attributableInquiries: unwrap(attributableInquiries),
    },
    funnel: unwrap(funnel) || [],
    campaigns: unwrap(campaigns) || [],
    integrations: unwrap(integrations) || [],
    workItems: unwrap(workItems) || [],
  };
}

export async function loadPortalSettings() {
  const client = requireSupabase();
  const [profiles, integrations, workItems] = await Promise.all([
    client.from('admin_profiles').select('user_id, full_name, role, is_active, last_seen_at, created_at').order('created_at'),
    client.from('marketing_integrations').select('*').order('provider'),
    client.from('portal_work_items').select('*').order('sort_order'),
  ]);
  return {
    profiles: unwrap(profiles) || [],
    integrations: unwrap(integrations) || [],
    workItems: unwrap(workItems) || [],
  };
}
