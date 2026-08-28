import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CircleDollarSign,
  Mail,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, MetricCard, StatusTag, formatCurrencyTotals, formatDate, formatMoney } from '@/admin/components';
import {
  addClientNote,
  createClientProject,
  createClientWorkspace,
  groupCurrencyTotals,
  loadActiveOperators,
  loadClientContext,
  loadClientWorkspace,
  loadClients,
  saveClientContact,
  updateClient,
  updateClientProject,
} from '@/admin/lib/portal';
import { useAdminAuth } from '@/admin/AuthProvider';

const clientStatuses = ['lead', 'active', 'dormant', 'closed'];
const lifecycleStages = ['discovery', 'qualified', 'proposal', 'contracted', 'delivery', 'retained', 'inactive'];
const projectStatuses = ['discovery', 'qualified', 'proposal', 'contracted', 'in_progress', 'on_hold', 'completed', 'lost'];
const clientPageSize = 50;

const emptyClient = {
  display_name: '',
  company_name: '',
  primary_email: '',
  phone: '',
  website: '',
  status: 'lead',
  lifecycle_stage: 'discovery',
  owner_user_id: '',
  notes: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_title: '',
  project_name: '',
  project_status: 'discovery',
  project_value: '',
  currency: 'USD',
  next_step: '',
  next_step_at: '',
};

const emptyContact = {
  id: '',
  expected_updated_at: '',
  name: '',
  email: '',
  phone: '',
  title: '',
  is_primary: false,
};

const emptyProject = {
  id: '',
  expected_updated_at: '',
  name: '',
  status: 'discovery',
  value: '',
  currency: 'USD',
  owner_user_id: '',
  next_step: '',
  next_step_at: '',
  started_at: '',
  target_launch_at: '',
};

const valueForInput = (value) => value ?? '';
const dateTimeForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const safeWebsiteHref = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

function Field({ label, children, wide = false }) {
  return <label className={wide ? 'client-field client-field-wide' : 'client-field'}><span>{label}</span>{children}</label>;
}

function WorkspaceDialog({ title, eyebrow, submitLabel, busy, error, onClose, onSubmit, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = /** @type {HTMLElement | null} */ (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    document.body.style.overflow = 'hidden';
    const firstFocusable = /** @type {HTMLElement | null} */ (
      dialogRef.current?.querySelector('form input, form select, form textarea, form button') || null
    );
    firstFocusable?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = /** @type {HTMLElement[]} */ (Array.from(dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
      )));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="client-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="client-dialog" role="dialog" aria-modal="true" aria-labelledby="client-dialog-title">
        <header>
          <div><span>{eyebrow}</span><h2 id="client-dialog-title">{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close editor"><X /></button>
        </header>
        <form onSubmit={onSubmit}>
          <div className="client-dialog-fields">{children}</div>
          {error && <div className="client-action-error" role="alert">{error}</div>}
          <footer>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy}><Check />{busy ? 'Saving' : submitLabel}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function Clients() {
  const { profile } = useAdminAuth();
  const canOperate = ['owner', 'admin', 'agent'].includes(profile.role);
  const [clients, setClients] = useState([]);
  const [clientTotal, setClientTotal] = useState(0);
  const [clientHasMore, setClientHasMore] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [operators, setOperators] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const selectedIdRef = useRef(selectedId);
  const [context, setContext] = useState({ timeline: [], timelineHasMore: false });
  const [contextState, setContextState] = useState({ loading: false, error: null });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(/** @type {Record<string, any>} */ ({ ...emptyClient }));
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [state, setState] = useState({ loading: true, error: null });

  const load = useCallback(async (preferredId = null) => {
    setState({ loading: true, error: null });
    try {
      const [clientPage, operatorRows] = await Promise.all([loadClients({ limit: clientPageSize }), loadActiveOperators()]);
      const clientRows = clientPage.rows;
      setClients(clientRows);
      setClientTotal(clientPage.total);
      setClientHasMore(clientPage.hasMore);
      setOperators(operatorRows);
      setSelectedId((current) => {
        const candidate = typeof preferredId === 'string' ? preferredId : current;
        return clientRows.some((client) => client.id === candidate) ? candidate : clientRows[0]?.id || null;
      });
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error });
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => {
    setActionError('');
    setNote('');
  }, [selectedId]);
  useEffect(() => {
    setHistoryLoading(false);
    setContext({ timeline: [], timelineHasMore: false });
    if (!selectedId) {
      setContextState({ loading: false, error: null });
      return undefined;
    }
    let active = true;
    setContextState({ loading: true, error: null });
    loadClientContext(selectedId)
      .then((data) => {
        if (!active) return;
        setContext(data);
        setContextState({ loading: false, error: null });
      })
      .catch((error) => {
        if (!active) return;
        setContextState({ loading: false, error });
      });
    return () => { active = false; };
  }, [contextVersion, selectedId]);

  const filtered = useMemo(() => clients.filter((client) => (
    `${client.display_name} ${client.company_name || ''} ${client.primary_email || ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )), [clients, query]);
  const selected = clients.find((client) => client.id === selectedId) || filtered[0] || null;
  const projects = clients.flatMap((client) => client.client_projects || []);
  const openProjects = projects.filter((project) => !['completed', 'lost'].includes(project.status));
  const pipelineTotals = groupCurrencyTotals(openProjects);
  const selectedContacts = [...(selected?.client_contacts || [])].sort((left, right) => Number(right.is_primary) - Number(left.is_primary));
  const selectedProjects = [...(selected?.client_projects || [])].sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
  const ownerName = (ownerId) => operators.find((operator) => operator.user_id === ownerId)?.full_name || 'Unassigned';
  const websiteHref = safeWebsiteHref(selected?.website);
  const selectedOpenTotals = groupCurrencyTotals(selectedProjects.filter((project) => !['completed', 'lost'].includes(project.status)));
  const directoryPartial = clientHasMore || clients.length < clientTotal;

  const timeline = context.timeline;

  const refreshSelected = async (clientId = selectedId, isNew = false) => {
    if (!clientId) return;
    const refreshed = await loadClientWorkspace(clientId);
    setClients((current) => {
      const exists = current.some((client) => client.id === clientId);
      return exists
        ? current.map((client) => client.id === clientId ? refreshed : client)
        : [refreshed, ...current];
    });
    if (isNew) setClientTotal((current) => current + 1);
    setSelectedId(clientId);
    setContextVersion((value) => value + 1);
  };

  const loadMoreClients = async () => {
    if (directoryLoading || !clientHasMore) return;
    setDirectoryLoading(true);
    setActionError('');
    try {
      const lastClient = clients.at(-1);
      const nextPage = await loadClients({
        cursor: lastClient ? { created_at: lastClient.created_at, id: lastClient.id } : null,
        limit: clientPageSize,
      });
      setClients((current) => {
        const known = new Set(current.map((client) => client.id));
        return [...current, ...nextPage.rows.filter((client) => !known.has(client.id))];
      });
      setClientHasMore(nextPage.hasMore);
    } catch (error) {
      setActionError(error?.message || 'More client relationships could not be loaded.');
    } finally {
      setDirectoryLoading(false);
    }
  };

  const loadMoreHistory = async () => {
    if (!selected || historyLoading || !context.timelineHasMore) return;
    const targetClientId = selected.id;
    setHistoryLoading(true);
    setActionError('');
    try {
      const lastItem = context.timeline.at(-1);
      const nextPage = await loadClientContext(targetClientId, {
        cursor: lastItem ? { created_at: lastItem.created_at, sort_key: lastItem.sort_key } : null,
      });
      if (selectedIdRef.current === targetClientId) {
        setContext((current) => {
          const timelineKeys = new Set(current.timeline.map((item) => item.sort_key));
          const mergedTimeline = [...current.timeline, ...nextPage.timeline.filter((item) => !timelineKeys.has(item.sort_key))];
          return {
            timeline: mergedTimeline,
            timelineHasMore: nextPage.timelineHasMore,
          };
        });
      }
    } catch (error) {
      if (selectedIdRef.current === targetClientId) {
        setActionError(error?.message || 'Older relationship history could not be loaded.');
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const openNewClient = () => {
    if (busy) return;
    setActionError('');
    setForm({ ...emptyClient, owner_user_id: profile.user_id });
    setDialog({ type: 'client-new' });
  };

  const openEditClient = () => {
    if (!selected || busy) return;
    setActionError('');
    setForm({
      display_name: valueForInput(selected.display_name),
      company_name: valueForInput(selected.company_name),
      primary_email: valueForInput(selected.primary_email),
      phone: valueForInput(selected.phone),
      website: valueForInput(selected.website),
      status: selected.status,
      lifecycle_stage: selected.lifecycle_stage,
      owner_user_id: valueForInput(selected.owner_user_id),
      notes: valueForInput(selected.notes),
      expected_updated_at: selected.updated_at,
    });
    setDialog({ type: 'client-edit' });
  };

  const openContact = (contact = null) => {
    if (busy) return;
    setActionError('');
    setForm(contact ? {
      id: contact.id,
      expected_updated_at: contact.updated_at,
      name: valueForInput(contact.name),
      email: valueForInput(contact.email),
      phone: valueForInput(contact.phone),
      title: valueForInput(contact.title),
      is_primary: Boolean(contact.is_primary),
    } : { ...emptyContact, is_primary: !selectedContacts.length });
    setDialog({ type: 'contact', editing: Boolean(contact) });
  };

  const openProject = (project = null) => {
    if (busy) return;
    setActionError('');
    setForm(project ? {
      id: project.id,
      expected_updated_at: project.updated_at,
      name: valueForInput(project.name),
      status: project.status,
      value: valueForInput(project.value),
      currency: project.currency || 'USD',
      owner_user_id: valueForInput(project.owner_user_id),
      next_step: valueForInput(project.next_step),
      next_step_at: dateTimeForInput(project.next_step_at),
      started_at: valueForInput(project.started_at),
      target_launch_at: valueForInput(project.target_launch_at),
    } : { ...emptyProject, owner_user_id: selected?.owner_user_id || profile.user_id });
    setDialog({ type: 'project', editing: Boolean(project) });
  };

  const closeDialog = () => {
    if (busy === 'dialog') return;
    setDialog(null);
    setActionError('');
  };

  const saveDialog = async (event) => {
    event.preventDefault();
    if (!canOperate || !dialog || busy) return;
    setBusy('dialog');
    setActionError('');
    let clientId = selectedId;
    const isNewClient = dialog.type === 'client-new';
    try {
      if (dialog.type === 'client-new') {
        clientId = await createClientWorkspace(form);
      } else if (dialog.type === 'client-edit') {
        await updateClient(selected.id, form);
      } else if (dialog.type === 'contact') {
        await saveClientContact(selected.id, form);
      } else if (dialog.type === 'project' && dialog.editing) {
        await updateClientProject(form.id, form);
      } else if (dialog.type === 'project') {
        await createClientProject(selected.id, form);
      }
    } catch (error) {
      setActionError(error?.message || 'The relationship could not be saved.');
      setBusy('');
      return;
    }

    setDialog(null);
    try {
      await refreshSelected(clientId, isNewClient);
    } catch {
      setActionError('The change was saved, but the latest relationship data could not be reloaded. Refresh the portal before making another change.');
    } finally {
      setBusy('');
    }
  };

  const handleNote = async (event) => {
    event.preventDefault();
    if (!canOperate || !selected || !note.trim() || busy || contextState.loading || contextState.error) return;
    const targetClientId = selected.id;
    setBusy('note');
    setActionError('');
    try {
      const created = await addClientNote(targetClientId, profile.user_id, note);
      if (selectedIdRef.current === targetClientId) {
        const timelineItem = {
          client_id: targetClientId,
          kind: 'note',
          sort_key: `note:${created.id}`,
          source_id: created.id,
          title: profile.full_name || 'Code City team',
          body: created.body,
          created_at: created.created_at,
        };
        setContext((current) => ({
          ...current,
          timeline: [timelineItem, ...current.timeline],
        }));
        setNote('');
      }
    } catch (error) {
      if (selectedIdRef.current === targetClientId) {
        setActionError(error?.message || 'The relationship note could not be saved.');
      }
    } finally {
      setBusy('');
    }
  };

  if (state.loading) return <LoadingState label="Loading client relationships" />;
  if (state.error) return <ErrorState error={state.error} retry={() => load()} />;

  return (
    <div className="portal-page-stack">
      <section className="portal-metrics-grid portal-metrics-compact">
        <MetricCard eyebrow="Relationships" value={clientTotal} detail={directoryPartial ? `${clients.length} loaded in the directory` : 'Directory snapshot total'} accent />
        <MetricCard eyebrow={directoryPartial ? 'Active loaded' : 'Active'} value={clients.filter((client) => client.status === 'active').length} detail={directoryPartial ? `Across ${clients.length} loaded relationships` : 'Current clients'} />
        <MetricCard eyebrow={directoryPartial ? 'Open projects loaded' : 'Open projects'} value={openProjects.length} detail={directoryPartial ? `Across ${clients.length} loaded relationships` : 'Commercial + delivery'} />
        <MetricCard
          eyebrow={directoryPartial ? 'Loaded pipeline' : 'Pipeline'}
          value={pipelineTotals.length > 1 ? `${pipelineTotals.length} currencies` : formatCurrencyTotals(pipelineTotals)}
          detail={directoryPartial ? `Across ${clients.length} loaded relationships` : pipelineTotals.length > 1 ? formatCurrencyTotals(pipelineTotals) : 'Recorded project value'}
        />
      </section>

      {actionError && !dialog && <div className="client-action-error" role="alert">{actionError}</div>}

      <section className="client-workbench">
        <aside className="client-directory-rail">
          <header>
            <div><span>Relationship directory</span><h2>Clients</h2></div>
            {canOperate && <button type="button" onClick={openNewClient} disabled={Boolean(busy)}><Plus />New</button>}
          </header>
          <label className="client-search"><span className="portal-sr-only">Search client relationships</span><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients" /></label>
          <div className="client-directory-list">
            {filtered.map((client) => {
              const primary = (client.client_contacts || []).find((contact) => contact.is_primary) || client.client_contacts?.[0];
              return (
                <button key={client.id} type="button" className={selected?.id === client.id ? 'active' : ''} aria-current={selected?.id === client.id ? 'true' : undefined} onClick={() => setSelectedId(client.id)} disabled={Boolean(busy)}>
                  <span className="client-monogram">{client.display_name.slice(0, 2).toUpperCase()}</span>
                  <div><strong>{client.display_name}</strong><small>{client.primary_email || primary?.email || 'No relationship email'}</small></div>
                  <StatusTag value={client.status} />
                </button>
              );
            })}
            {!filtered.length && <EmptyState
              title={query ? 'No loaded relationship matches' : 'No client records'}
              message={query
                ? directoryPartial
                  ? `Search covers ${clients.length} loaded relationships. Load more before creating a duplicate.`
                  : 'No relationship matches this search.'
                : canOperate ? 'Create the first relationship or promote a qualified inquiry.' : 'No relationships are available to this account.'}
            />}
          </div>
          {clientHasMore && <button className="client-directory-more" type="button" onClick={loadMoreClients} disabled={directoryLoading || Boolean(busy)}>{directoryLoading ? 'Loading' : 'Load more relationships'}</button>}
        </aside>

        {selected ? (
          <div className="client-workspace">
            <header className="client-workspace-header">
              <div>
                <span>{selected.company_name || 'Independent relationship'}</span>
                <h2>{selected.display_name}</h2>
                <div><StatusTag value={selected.status} /><StatusTag value={selected.lifecycle_stage} /></div>
              </div>
              <div className="client-header-actions">
                {websiteHref && <a href={websiteHref} target="_blank" rel="noreferrer">Website <ArrowUpRight /></a>}
                {canOperate && <button type="button" onClick={openEditClient} disabled={Boolean(busy)}><Pencil />Edit client</button>}
              </div>
            </header>

            <section className="client-summary-grid">
              <article><Mail /><span>Relationship email</span><strong>{selected.primary_email || 'Not recorded'}</strong></article>
              <article><UserRound /><span>Relationship owner</span><strong>{ownerName(selected.owner_user_id)}</strong></article>
              <article><CircleDollarSign /><span>Open value</span><strong>{formatCurrencyTotals(selectedOpenTotals)}</strong></article>
              <article><CalendarClock /><span>Last movement</span><strong>{formatDate(selected.updated_at, true)}</strong></article>
            </section>

            {selected.notes && <section className="client-relationship-brief"><span>Relationship brief</span><p>{selected.notes}</p></section>}

            <div className="client-workspace-grid">
              <section className="client-record-panel client-project-panel">
                <header><div><BriefcaseBusiness /><span>Delivery</span><h3>Projects and pursuits</h3></div>{canOperate && <button type="button" onClick={() => openProject()} disabled={Boolean(busy)}><Plus />Add project</button>}</header>
                <div>
                  {selectedProjects.map((project) => (
                    <article className="client-project-row" key={project.id}>
                      <button type="button" onClick={() => canOperate && openProject(project)} disabled={!canOperate || Boolean(busy)} aria-label={`Edit ${project.name}`}>
                        <div><strong>{project.name}</strong><span>{project.next_step || 'No next action recorded'}</span></div>
                        <StatusTag value={project.status} />
                        <div className="client-project-value"><strong>{project.value !== null && project.value !== '' ? formatMoney(project.value, project.currency) : 'Value pending'}</strong><small>{project.next_step_at ? `Next ${formatDate(project.next_step_at, true)}` : ownerName(project.owner_user_id)}</small></div>
                      </button>
                    </article>
                  ))}
                  {!selectedProjects.length && <p className="client-panel-empty">No project has been opened for this relationship.</p>}
                </div>
              </section>

              <section className="client-record-panel client-contact-panel">
                <header><div><UsersRound /><span>People</span><h3>Contacts</h3></div>{canOperate && <button type="button" onClick={() => openContact()} disabled={Boolean(busy)}><Plus />Add contact</button>}</header>
                <div>
                  {selectedContacts.map((contact) => (
                    <button className="client-contact-row" type="button" key={contact.id} onClick={() => canOperate && openContact(contact)} disabled={!canOperate || Boolean(busy)}>
                      <span className="client-monogram">{contact.name.slice(0, 2).toUpperCase()}</span>
                      <div><strong>{contact.name}</strong><small>{contact.title || contact.email || 'Client contact'}</small></div>
                      {contact.is_primary && <StatusTag value="primary" />}
                    </button>
                  ))}
                  {!selectedContacts.length && <p className="client-panel-empty">No contacts are attached to this client.</p>}
                </div>
              </section>
            </div>

            <section className="client-timeline-panel">
              <header><div><MessageSquareText /><span>History</span><h3>Relationship timeline</h3></div></header>
              <form onSubmit={handleNote}>
                <label className="portal-sr-only" htmlFor="client-relationship-note">Relationship note</label>
                <textarea id="client-relationship-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={4000} rows={3} disabled={!canOperate || Boolean(busy) || contextState.loading || Boolean(contextState.error)} placeholder={canOperate ? 'Record the decision, follow-up, or client context.' : 'Viewer access is read-only.'} />
                <button type="submit" disabled={!canOperate || !note.trim() || Boolean(busy) || contextState.loading || Boolean(contextState.error)}><ArrowUpRight />{busy === 'note' ? 'Saving' : 'Add note'}</button>
              </form>
              {contextState.loading && <p className="client-context-state" role="status">Loading relationship history…</p>}
              {contextState.error && <div className="client-context-error" role="alert"><span>Relationship history could not be loaded.</span><button type="button" onClick={() => setContextVersion((value) => value + 1)}>Retry</button></div>}
              <div className="client-timeline">
                {timeline.map((item) => (
                  <article className={item.kind} key={item.sort_key}><i /><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}<span>{formatDate(item.created_at, true)}</span></div></article>
                ))}
                {!contextState.loading && !contextState.error && !timeline.length && <p className="client-panel-empty">The first relationship action will appear here.</p>}
                {!contextState.loading && !contextState.error && context.timelineHasMore && <button className="client-history-more" type="button" onClick={loadMoreHistory} disabled={historyLoading}>{historyLoading ? 'Loading older history' : 'Load older history'}</button>}
              </div>
            </section>
          </div>
        ) : <EmptyState title="No relationship selected" message="Choose a client or create the first relationship." />}
      </section>

      {dialog?.type?.startsWith('client') && (
        <WorkspaceDialog
          eyebrow={dialog.type === 'client-new' ? 'New relationship' : 'Client profile'}
          title={dialog.type === 'client-new' ? 'Create a client workspace' : `Edit ${selected.display_name}`}
          submitLabel={dialog.type === 'client-new' ? 'Create workspace' : 'Save client'}
          busy={busy === 'dialog'}
          error={actionError}
          onClose={closeDialog}
          onSubmit={saveDialog}
        >
          <Field label="Display name"><input required minLength={2} maxLength={160} value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} /></Field>
          <Field label="Company"><input maxLength={160} value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} /></Field>
          <Field label="Relationship email"><input type="email" maxLength={254} value={form.primary_email} onChange={(event) => setForm({ ...form, primary_email: event.target.value })} /></Field>
          <Field label="Phone"><input maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="Website"><input type="url" maxLength={500} value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Field>
          <Field label="Owner"><select value={form.owner_user_id} onChange={(event) => setForm({ ...form, owner_user_id: event.target.value })}><option value="">{dialog.type === 'client-new' ? 'Assign to me' : 'Unassigned'}</option>{operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}</select></Field>
          <Field label="Client status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{clientStatuses.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Lifecycle stage"><select value={form.lifecycle_stage} onChange={(event) => setForm({ ...form, lifecycle_stage: event.target.value })}>{lifecycleStages.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Relationship brief" wide><textarea rows={4} maxLength={4000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>

          {dialog.type === 'client-new' && <>
            <div className="client-form-section"><span>Primary contact</span><p>Optional. Add the person who owns the relationship.</p></div>
            <Field label="Contact name"><input minLength={2} maxLength={120} value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} /></Field>
            <Field label="Contact title"><input maxLength={120} value={form.contact_title} onChange={(event) => setForm({ ...form, contact_title: event.target.value })} /></Field>
            <Field label="Contact email"><input type="email" maxLength={254} value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} /></Field>
            <Field label="Contact phone"><input maxLength={40} value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} /></Field>
            <div className="client-form-section"><span>First project</span><p>Optional. Start the commercial or delivery record now.</p></div>
            <Field label="Project name"><input minLength={2} maxLength={180} value={form.project_name} onChange={(event) => setForm({ ...form, project_name: event.target.value })} /></Field>
            <Field label="Project stage"><select value={form.project_status} onChange={(event) => setForm({ ...form, project_status: event.target.value })}>{projectStatuses.map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Project value"><input type="number" min="0" step="0.01" value={form.project_value} onChange={(event) => setForm({ ...form, project_value: event.target.value })} /></Field>
            <Field label="Currency"><input required minLength={3} maxLength={3} pattern="[A-Z]{3}" title="Use a three-letter currency code such as USD" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></Field>
            <Field label="Next action" wide><input maxLength={500} value={form.next_step} onChange={(event) => setForm({ ...form, next_step: event.target.value })} /></Field>
            <Field label="Next action due"><input type="datetime-local" value={form.next_step_at} onChange={(event) => setForm({ ...form, next_step_at: event.target.value })} /></Field>
          </>}
        </WorkspaceDialog>
      )}

      {dialog?.type === 'contact' && (
        <WorkspaceDialog eyebrow="Relationship contact" title={dialog.editing ? `Edit ${form.name}` : 'Add a client contact'} submitLabel="Save contact" busy={busy === 'dialog'} error={actionError} onClose={closeDialog} onSubmit={saveDialog}>
          <Field label="Name"><input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Title"><input maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Email"><input type="email" maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Phone"><input maxLength={40} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <label className="client-checkbox client-field-wide"><input type="checkbox" checked={form.is_primary} onChange={(event) => setForm({ ...form, is_primary: event.target.checked })} /><span>Primary relationship contact</span></label>
        </WorkspaceDialog>
      )}

      {dialog?.type === 'project' && (
        <WorkspaceDialog eyebrow="Commercial and delivery" title={dialog.editing ? `Edit ${form.name}` : 'Open a project'} submitLabel="Save project" busy={busy === 'dialog'} error={actionError} onClose={closeDialog} onSubmit={saveDialog}>
          <Field label="Project name" wide><input required minLength={2} maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Stage"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{projectStatuses.map((value) => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Owner"><select value={form.owner_user_id} onChange={(event) => setForm({ ...form, owner_user_id: event.target.value })}><option value="">Unassigned</option>{operators.map((operator) => <option key={operator.user_id} value={operator.user_id}>{operator.full_name}</option>)}</select></Field>
          <Field label="Value"><input type="number" min="0" step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} /></Field>
          <Field label="Currency"><input required minLength={3} maxLength={3} pattern="[A-Z]{3}" title="Use a three-letter currency code such as USD" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></Field>
          <Field label="Next action" wide><input maxLength={500} value={form.next_step} onChange={(event) => setForm({ ...form, next_step: event.target.value })} /></Field>
          <Field label="Next action due"><input type="datetime-local" value={form.next_step_at} onChange={(event) => setForm({ ...form, next_step_at: event.target.value })} /></Field>
          <Field label="Started"><input type="date" value={form.started_at} onChange={(event) => setForm({ ...form, started_at: event.target.value })} /></Field>
          <Field label="Target launch"><input type="date" value={form.target_launch_at} onChange={(event) => setForm({ ...form, target_launch_at: event.target.value })} /></Field>
        </WorkspaceDialog>
      )}
    </div>
  );
}
