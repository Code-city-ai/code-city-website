import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Mail, MessageSquareText, Search, UserRoundCheck } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, StatusTag, formatDate } from '@/admin/components';
import { addInquiryNote, loadInquiries, loadInquiryContext, promoteInquiry, updateInquiry } from '@/admin/lib/portal';
import { useAdminAuth } from '@/admin/AuthProvider';

const statusOptions = ['new', 'reviewing', 'qualified', 'proposal', 'won', 'lost', 'closed', 'spam'];
const priorityOptions = ['low', 'normal', 'high', 'urgent'];

const sourcePath = (value) => {
  if (!value) return '—';
  try {
    return new URL(value).pathname;
  } catch {
    return 'Recorded source';
  }
};

const deliveryMilestone = (delivery) => {
  if (delivery.status === 'delivered') {
    return { label: 'Delivered', at: delivery.delivered_at || delivery.provider_event_at };
  }
  if (delivery.status === 'bounced') {
    return { label: 'Bounced', at: delivery.failed_at || delivery.provider_event_at };
  }
  if (delivery.status === 'accepted') {
    return { label: 'Accepted', at: delivery.accepted_at || delivery.provider_event_at };
  }
  return {
    label: delivery.attempts ? `Attempt ${delivery.attempts}` : 'Not attempted',
    at: delivery.last_attempt_at,
  };
};

const providerEventLabel = (eventId) => {
  if (!eventId) return '';
  return eventId.length > 18 ? `${eventId.slice(0, 8)}…${eventId.slice(-8)}` : eventId;
};

export default function Inquiries() {
  const { profile } = useAdminAuth();
  const canOperate = ['owner', 'admin', 'agent'].includes(profile.role);
  const requestedId = new URLSearchParams(window.location.search).get('selected');
  const [inquiries, setInquiries] = useState([]);
  const [selectedId, setSelectedId] = useState(requestedId);
  const [context, setContext] = useState({ notes: [], activity: [] });
  const [filter, setFilter] = useState('open');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [state, setState] = useState({ loading: true, error: null });

  const load = useCallback(() => {
    setState({ loading: true, error: null });
    loadInquiries()
      .then((rows) => {
        setInquiries(rows);
        setSelectedId((current) => current || rows[0]?.id || null);
        setState({ loading: false, error: null });
      })
      .catch((error) => setState({ loading: false, error }));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    setActionError('');
    setNote('');
    if (!selectedId) {
      setContext({ notes: [], activity: [] });
      return;
    }
    loadInquiryContext(selectedId).then(setContext).catch(() => setContext({ notes: [], activity: [] }));
  }, [selectedId]);

  const filtered = useMemo(() => inquiries.filter((inquiry) => {
    const matchesFilter = filter === 'all'
      || (filter === 'open' && !['closed', 'lost', 'spam'].includes(inquiry.status))
      || inquiry.status === filter;
    const haystack = `${inquiry.name} ${inquiry.email} ${inquiry.organization || ''} ${inquiry.message}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, inquiries, query]);
  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) || filtered[0];
  const canPromote = canOperate && selected && ['new', 'reviewing', 'qualified', 'proposal', 'won'].includes(selected.status);
  const deliveries = [...(selected?.inquiry_notification_deliveries || [])]
    .sort((left, right) => left.recipient.localeCompare(right.recipient));

  const changeInquiry = async (changes) => {
    if (!selected || !canOperate) return;
    setActionError('');
    setBusy('update');
    try {
      const updated = await updateInquiry(selected.id, changes);
      setInquiries((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setContext(await loadInquiryContext(selected.id));
    } catch (error) {
      setActionError(error?.message || 'The inquiry could not be updated.');
    } finally {
      setBusy('');
    }
  };

  const handlePromote = async () => {
    if (!selected || !canOperate) return;
    setActionError('');
    setBusy('promote');
    try {
      await promoteInquiry(selected.id);
      load();
    } catch (error) {
      const message = error?.message?.includes('inquiry_not_eligible_for_promotion')
        ? 'This terminal inquiry cannot be promoted. Reopen it only if the relationship is active.'
        : error?.message || 'The inquiry could not be promoted.';
      setActionError(message);
    } finally {
      setBusy('');
    }
  };

  const handleNote = async (event) => {
    event.preventDefault();
    if (!note.trim() || !selected || !canOperate) return;
    setActionError('');
    setBusy('note');
    try {
      const created = await addInquiryNote(selected.id, profile.user_id, note);
      setContext((current) => ({ ...current, notes: [created, ...current.notes] }));
      setNote('');
    } catch (error) {
      setActionError(error?.message || 'The note could not be added.');
    } finally {
      setBusy('');
    }
  };

  if (state.loading) return <LoadingState label="Opening the inquiry desk" />;
  if (state.error) return <ErrorState error={state.error} retry={load} />;

  return (
    <div className="inquiry-workbench">
      <section className="inquiry-list-panel">
        <div className="inquiry-toolbar">
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inquiries" /></label>
          <div>{['open', 'new', 'qualified', 'all'].map((value) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div>
        </div>
        <div className="inquiry-list" role="list">
          {filtered.map((inquiry) => (
            <button key={inquiry.id} type="button" role="listitem" className={selected?.id === inquiry.id ? 'active' : ''} onClick={() => setSelectedId(inquiry.id)}>
              <div><strong>{inquiry.name}</strong><StatusTag value={inquiry.status} /></div>
              <span>{inquiry.organization || inquiry.email}</span>
              <p>{inquiry.message}</p>
              <small>{formatDate(inquiry.created_at, true)} · {inquiry.project_type.replaceAll('-', ' ')}</small>
            </button>
          ))}
          {!filtered.length && <EmptyState title="No inquiries match" message="Adjust the filter or search term." />}
        </div>
      </section>

      {selected ? (
        <section className="inquiry-detail-panel">
          <header className="inquiry-detail-header">
            <div><span>{selected.organization || 'Independent inquiry'}</span><h2>{selected.name}</h2><a href={`mailto:${selected.email}`}><Mail />{selected.email}</a></div>
            <button type="button" onClick={handlePromote} disabled={!canPromote || busy === 'promote' || selected.client_id}><UserRoundCheck />{selected.client_id ? 'Client created' : !canOperate ? 'Read-only access' : canPromote ? 'Promote to client' : 'Terminal inquiry'}</button>
          </header>

          {actionError && <div className="inquiry-action-error" role="alert">{actionError}</div>}

          <div className="inquiry-controls">
            <label><span>Status</span><select value={selected.status} onChange={(event) => changeInquiry({ status: event.target.value })} disabled={!canOperate || busy === 'update'}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label><span>Priority</span><select value={selected.priority} onChange={(event) => changeInquiry({ priority: event.target.value })} disabled={!canOperate || busy === 'update'}>{priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            <div><span>Email delivery</span><StatusTag value={selected.notification_status} /></div>
          </div>

          <section className="inquiry-delivery-evidence" aria-label="Email delivery evidence">
            <header><span>Recipient evidence</span><strong>{deliveries.length} / 2 delivery records</strong></header>
            <div>
              {deliveries.map((delivery) => {
                const milestone = deliveryMilestone(delivery);
                return (
                  <article key={delivery.recipient}>
                    <div><Mail aria-hidden="true" /><strong>{delivery.recipient}</strong></div>
                    <StatusTag value={delivery.status} />
                    <small className="inquiry-delivery-milestone">
                      <strong>{milestone.label}</strong>
                      {milestone.at ? ` · ${formatDate(milestone.at, true)}` : ''}
                    </small>
                    {delivery.provider_event_id && (
                      <small className="inquiry-provider-event">
                        Mailgun event <code title={delivery.provider_event_id}>{providerEventLabel(delivery.provider_event_id)}</code>
                        {delivery.provider_event_at ? ` · ${formatDate(delivery.provider_event_at, true)}` : ''}
                      </small>
                    )}
                    {delivery.last_error && <p>{delivery.last_error}</p>}
                  </article>
                );
              })}
              {!deliveries.length && <p className="inquiry-delivery-empty">Delivery evidence will appear after the durable notification migration is active.</p>}
            </div>
          </section>

          <div className="inquiry-message">
            <span>{selected.project_type.replaceAll('-', ' ')}{selected.budget_range ? ` · ${selected.budget_range.replaceAll('-', ' ')}` : ''}</span>
            <p>{selected.message}</p>
          </div>

          <div className="inquiry-attribution">
            <div><span>Source</span><strong>{selected.utm_source || 'Direct / unmeasured'}</strong></div>
            <div><span>Campaign</span><strong>{selected.utm_campaign || '—'}</strong></div>
            <div><span>Landing page</span><strong>{sourcePath(selected.source_url)}</strong></div>
            <div><span>Received</span><strong>{formatDate(selected.created_at, true)}</strong></div>
          </div>

          <form className="inquiry-note-form" onSubmit={handleNote}>
            <label><span>Internal note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={4000} disabled={!canOperate} placeholder={canOperate ? 'Record the next decision, context, or follow-up.' : 'Viewer access is read-only.'} /></label>
            <button type="submit" disabled={!canOperate || !note.trim() || busy === 'note'}>{busy === 'note' ? <Check /> : <ArrowUpRight />}{canOperate ? 'Add note' : 'Read only'}</button>
          </form>

          <div className="inquiry-history">
            <h3><MessageSquareText />Relationship history</h3>
            {context.notes.map((item) => <article key={item.id}><i /><div><strong>{item.admin_profiles?.full_name || 'Code City team'}</strong><p>{item.body}</p><span>{formatDate(item.created_at, true)}</span></div></article>)}
            {context.activity.map((item) => <article key={`activity-${item.id}`} className="activity"><i /><div><strong>{item.event_type.replaceAll('_', ' ')}</strong><p>{item.from_value ? `${item.from_value} → ${item.to_value || '—'}` : item.to_value || ''}</p><span>{formatDate(item.created_at, true)}</span></div></article>)}
            {!context.notes.length && !context.activity.length && <p className="inquiry-history-empty">The first action will appear here.</p>}
          </div>
        </section>
      ) : <EmptyState title="No inquiry selected" message="Choose an inquiry to inspect its full context." />}
    </div>
  );
}
