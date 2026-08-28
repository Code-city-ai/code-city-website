import { supabase } from '@/lib/supabase';

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

const unwrap = ({ data, error, count }) => {
  if (error) throw error;
  return count ?? data;
};

const pickDefined = (source, fields) => Object.fromEntries(
  fields
    .filter((field) => source[field] !== undefined)
    .map((field) => [field, source[field]]),
);

const requireMutationPayload = (payload, message) => {
  if (!Object.keys(payload).length) throw new Error(message);
  return payload;
};

const blankToNull = (value) => (
  typeof value === 'string' && !value.trim() ? null : value ?? null
);

const dateTimeToIso = (value) => {
  const normalized = blankToNull(value);
  if (typeof normalized !== 'string') return normalized;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? normalized : date.toISOString();
};

export const groupCurrencyTotals = (records) => {
  const totals = new Map();
  records.forEach((record) => {
    if (record.value === null || record.value === '') return;
    const currency = String(record.currency || 'USD').trim().toUpperCase();
    totals.set(currency, (totals.get(currency) || 0) + Number(record.value || 0));
  });
  return [...totals.entries()].map(([currency, value]) => ({ currency, value }));
};

export async function loadDashboard() {
  const client = requireSupabase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [newInquiries, qualified, activeClients, pipeline, visitors, recent, integrations, workItems] = await Promise.all([
    client.from('project_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    client.from('project_inquiries').select('id', { count: 'exact', head: true }).in('status', ['qualified', 'proposal', 'won']),
    client.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    client.rpc('get_client_pipeline_totals'),
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
      pipelineTotals: pipelineRows.map((row) => ({ currency: row.currency, value: Number(row.value || 0) })),
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

const clientWorkspaceSelect = '*, client_contacts(*), client_projects(*)';

export async function loadClients({ cursor = null, limit = 50 } = {}) {
  const client = requireSupabase();
  const safeLimit = Math.min(250, Math.max(1, Number(limit) || 50));
  let rowsQuery = client
    .from('clients')
    .select(clientWorkspaceSelect)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(safeLimit + 1);
  if (cursor?.created_at && cursor?.id) {
    rowsQuery = rowsQuery.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }
  const [rows, total] = await Promise.all([
    rowsQuery,
    client.from('clients').select('id', { count: 'exact', head: true }),
  ]);
  if (rows.error) throw rows.error;
  if (total.error) throw total.error;
  const pageRows = rows.data || [];
  return {
    rows: pageRows.slice(0, safeLimit),
    hasMore: pageRows.length > safeLimit,
    total: total.count ?? Math.min(pageRows.length, safeLimit),
  };
}

export async function loadClientWorkspace(clientId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('clients')
    .select(clientWorkspaceSelect)
    .eq('id', clientId)
    .single();
  if (error) throw error;
  return data;
}

export async function loadClientContext(clientId, {
  cursor = null,
  limit = 200,
} = {}) {
  const client = requireSupabase();
  const safeLimit = Math.min(250, Math.max(1, Number(limit) || 200));
  let timelineQuery = client
    .from('client_relationship_timeline')
    .select('client_id, kind, sort_key, source_id, title, body, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .order('sort_key', { ascending: false })
    .limit(safeLimit + 1);
  if (cursor?.created_at && cursor?.sort_key) {
    timelineQuery = timelineQuery.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},sort_key.lt.${cursor.sort_key})`);
  }
  const { data, error } = await timelineQuery;
  if (error) throw error;
  const rows = data || [];
  return {
    timeline: rows.slice(0, safeLimit),
    timelineHasMore: rows.length > safeLimit,
  };
}

export async function loadActiveOperators() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('admin_profiles')
    .select('user_id, full_name, role')
    .eq('is_active', true)
    .in('role', ['owner', 'admin', 'agent'])
    .order('full_name');
  if (error) throw error;
  return data || [];
}

export async function createClientWorkspace(payload) {
  const client = requireSupabase();
  const contact = payload.contact || {};
  const project = payload.project || {};
  const { data, error } = await client.rpc('create_client_workspace', {
    p_display_name: payload.display_name,
    p_company_name: payload.company_name ?? null,
    p_primary_email: payload.primary_email ?? null,
    p_phone: payload.phone ?? null,
    p_website: payload.website ?? null,
    p_status: payload.status ?? 'lead',
    p_lifecycle_stage: payload.lifecycle_stage ?? 'discovery',
    p_owner_user_id: blankToNull(payload.owner_user_id),
    p_notes: blankToNull(payload.notes),
    p_contact_name: payload.contact_name ?? contact.name ?? null,
    p_contact_email: payload.contact_email ?? contact.email ?? null,
    p_contact_phone: payload.contact_phone ?? contact.phone ?? null,
    p_contact_title: payload.contact_title ?? contact.title ?? null,
    p_project_name: payload.project_name ?? project.name ?? null,
    p_project_status: payload.project_status ?? project.status ?? 'discovery',
    p_project_value: blankToNull(payload.project_value ?? project.value),
    p_project_currency: payload.project_currency ?? payload.currency ?? project.currency ?? 'USD',
    p_project_next_step: payload.project_next_step ?? payload.next_step ?? project.next_step ?? null,
    p_project_next_step_at: dateTimeToIso(payload.project_next_step_at ?? payload.next_step_at ?? project.next_step_at),
    p_project_started_at: blankToNull(payload.project_started_at ?? payload.started_at ?? project.started_at),
    p_project_target_launch_at: blankToNull(payload.project_target_launch_at ?? payload.target_launch_at ?? project.target_launch_at),
    p_initial_note: blankToNull(payload.initial_note),
  });
  if (error) throw error;
  return data;
}

export async function updateClient(clientId, changes) {
  const client = requireSupabase();
  const expectedUpdatedAt = blankToNull(changes.expected_updated_at ?? changes.updated_at);
  const update = requireMutationPayload(pickDefined(changes, [
    'display_name',
    'company_name',
    'primary_email',
    'phone',
    'website',
    'status',
    'lifecycle_stage',
    'owner_user_id',
    'notes',
  ]), 'No supported client changes were provided.');
  for (const field of ['company_name', 'primary_email', 'phone', 'website', 'owner_user_id', 'notes']) {
    if (field in update) update[field] = blankToNull(update[field]);
  }
  let request = client
    .from('clients')
    .update(update)
    .eq('id', clientId);
  if (expectedUpdatedAt) request = request.eq('updated_at', expectedUpdatedAt);
  const { data, error } = await request.select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This client was updated by another operator. Reload the relationship before saving again.');
  return data;
}

export async function saveClientContact(clientId, contact) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('save_client_contact', {
    p_client_id: clientId,
    p_name: contact.name,
    p_contact_id: blankToNull(contact.id),
    p_expected_updated_at: blankToNull(contact.expected_updated_at ?? contact.updated_at),
    p_email: contact.email ?? null,
    p_phone: contact.phone ?? null,
    p_title: contact.title ?? null,
    p_is_primary: contact.is_primary ?? null,
  });
  if (error?.code === '40001' || error?.message?.includes('client_contact_conflict')) {
    throw new Error('This contact was updated by another operator. Reload the relationship before saving again.');
  }
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function createClientProject(clientId, payload) {
  const client = requireSupabase();
  const insert = /** @type {Record<string, any>} */ ({
    client_id: clientId,
    ...pickDefined(payload, [
      'name',
      'status',
      'value',
      'currency',
      'owner_user_id',
      'next_step',
      'next_step_at',
      'started_at',
      'target_launch_at',
    ]),
  });
  for (const field of ['value', 'owner_user_id', 'next_step', 'next_step_at', 'started_at', 'target_launch_at']) {
    if (field in insert) insert[field] = blankToNull(insert[field]);
  }
  if (insert.next_step_at) insert.next_step_at = dateTimeToIso(insert.next_step_at);
  if ('currency' in insert) insert.currency = blankToNull(insert.currency)?.trim().toUpperCase() || 'USD';
  const { data, error } = await client
    .from('client_projects')
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClientProject(projectId, changes) {
  const client = requireSupabase();
  const expectedUpdatedAt = blankToNull(changes.expected_updated_at ?? changes.updated_at);
  const update = requireMutationPayload(pickDefined(changes, [
    'name',
    'status',
    'value',
    'currency',
    'owner_user_id',
    'next_step',
    'next_step_at',
    'started_at',
    'target_launch_at',
  ]), 'No supported project changes were provided.');
  for (const field of ['value', 'owner_user_id', 'next_step', 'next_step_at', 'started_at', 'target_launch_at']) {
    if (field in update) update[field] = blankToNull(update[field]);
  }
  if (update.next_step_at) update.next_step_at = dateTimeToIso(update.next_step_at);
  if (update.currency) update.currency = update.currency.trim().toUpperCase();
  let request = client
    .from('client_projects')
    .update(update)
    .eq('id', projectId);
  if (expectedUpdatedAt) request = request.eq('updated_at', expectedUpdatedAt);
  const { data, error } = await request.select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This project was updated by another operator. Reload the relationship before saving again.');
  return data;
}

export async function addClientNote(clientId, authorUserId, body) {
  const client = requireSupabase();
  const note = body.trim();
  if (!note) throw new Error('A client note cannot be empty.');
  const { data, error } = await client
    .from('client_notes')
    .insert({ client_id: clientId, author_user_id: authorUserId, body: note })
    .select('id, client_id, author_user_id, body, created_at')
    .single();
  if (error) throw error;
  return data;
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
