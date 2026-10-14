import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink, FileText, LockKeyhole, Plus, Upload, X } from 'lucide-react';
import { useAdminAuth } from '@/admin/AuthProvider';
import { EmptyState, ErrorState, LoadingState, Panel, formatDate } from '@/admin/components';
import { PROPOSAL_LANGUAGES, canManageProposals, languageLabel, validateProposalDraft } from '@/admin/lib/proposal-files';
import { createProposal, listProposals, signProposalFile } from '@/admin/lib/proposals';
import '@/admin/proposals.css';

const emptyDraft = { title: '', clientLabel: '', summary: '', files: {} };

function NewProposal({ userId, onClose, onCreated }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setField = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));
  const setFile = (code) => (event) => {
    const file = event.target.files?.[0] || null;
    setDraft((current) => ({ ...current, files: { ...current.files, [code]: file } }));
  };
  const submit = async (event) => {
    event.preventDefault();
    const problem = validateProposalDraft(draft);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    try {
      const id = await createProposal({ ...draft, userId });
      onCreated(id);
    } catch (failure) {
      setError(failure.message || String(failure));
      setBusy(false);
    }
  };
  return (
    <Panel eyebrow="Private upload" title="New proposal" className="proposal-form-panel"
      action={<button type="button" className="proposal-icon-button" onClick={onClose} aria-label="Close new proposal form"><X aria-hidden="true" /></button>}>
      <form className="proposal-form" onSubmit={submit}>
        <label><span>Title</span><input value={draft.title} onChange={setField('title')} placeholder="Dealership Management System" maxLength={160} required /></label>
        <label><span>Client</span><input value={draft.clientLabel} onChange={setField('clientLabel')} placeholder="Dealership Partner" maxLength={160} required /></label>
        <label className="proposal-form-wide"><span>Summary (optional)</span><textarea value={draft.summary} onChange={setField('summary')} rows={3} maxLength={600} /></label>
        {PROPOSAL_LANGUAGES.map(({ code, label }) => (
          <label key={code} className="proposal-file-field">
            <span>{label} PDF</span>
            <input type="file" accept="application/pdf,.pdf" onChange={setFile(code)} />
            <small>{draft.files[code] ? `${draft.files[code].name} · ${(draft.files[code].size / 1048576).toFixed(1)} MB` : 'PDF, up to 25 MB'}</small>
          </label>
        ))}
        {error && <p className="proposal-form-error" role="alert">{error}</p>}
        <div className="proposal-form-actions">
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="proposal-primary" disabled={busy}><Upload aria-hidden="true" />{busy ? 'Uploading' : 'Save proposal'}</button>
        </div>
      </form>
    </Panel>
  );
}

export default function Proposals() {
  const { session, profile } = useAdminAuth();
  const allowed = canManageProposals(profile);
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const [selectedId, setSelectedId] = useState(null);
  const [language, setLanguage] = useState('en');
  const [viewer, setViewer] = useState({ url: '', loading: false, error: '' });
  const [shared, setShared] = useState('');
  const [viewerAttempt, setViewerAttempt] = useState(0);
  const [adding, setAdding] = useState(false);

  const load = useCallback((focusId = null) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    listProposals()
      .then((items) => {
        setState({ loading: false, items, error: null });
        setSelectedId((current) => (focusId && items.some((item) => item.id === focusId) ? focusId : items.some((item) => item.id === current) ? current : items[0]?.id || null));
      })
      .catch((error) => setState({ loading: false, items: [], error }));
  }, []);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const selected = state.items.find((item) => item.id === selectedId) || null;
  const files = Array.isArray(selected?.files) ? selected.files : [];
  const file = files.find((entry) => entry.language === language) || files[0] || null;
  const filePath = file?.path || '';

  useEffect(() => {
    if (!filePath) { setViewer({ url: '', loading: false, error: '' }); return undefined; }
    let active = true;
    setViewer({ url: '', loading: true, error: '' });
    setShared('');
    signProposalFile(filePath)
      .then((url) => { if (active) setViewer({ url, loading: false, error: '' }); })
      .catch((error) => { if (active) setViewer({ url: '', loading: false, error: error.message || String(error) }); });
    return () => { active = false; };
  }, [filePath, viewerAttempt]);

  const copyShareLink = async () => {
    try {
      const url = await signProposalFile(filePath, { share: true });
      await navigator.clipboard.writeText(url);
      setShared('Link copied. It works for 7 days.');
    } catch (error) {
      setShared(`Could not create a link: ${error.message || error}`);
    }
  };

  if (!allowed) {
    return (
      <div className="proposal-locked">
        <LockKeyhole aria-hidden="true" />
        <strong>Proposals are private to Code City owners and admins.</strong>
        <p>They contain client pricing. Ask an owner if you need access.</p>
      </div>
    );
  }
  if (state.loading && !state.items.length) return <LoadingState label="Opening private proposals" />;
  if (state.error) return <ErrorState error={state.error} retry={() => load()} />;

  return (
    <div className="portal-page-stack proposals-page">
      {adding && <NewProposal userId={session?.user?.id} onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); load(id); }} />}
      <div className="proposals-grid">
        <Panel eyebrow="Private" title="Proposals" className="proposal-list-panel"
          action={!adding && <button type="button" className="proposal-primary" onClick={() => setAdding(true)}><Plus aria-hidden="true" />New</button>}>
          {!state.items.length && <EmptyState title="No proposals yet" message="Upload a proposal PDF to keep it here, private to owners and admins." />}
          <div className="proposal-list">
            {state.items.map((item) => (
              <button key={item.id} type="button" className={item.id === selectedId ? 'active' : ''} onClick={() => { setSelectedId(item.id); setLanguage('en'); }}>
                <span className="proposal-list-icon"><FileText aria-hidden="true" /></span>
                <span className="proposal-list-copy">
                  <strong>{item.title}</strong>
                  <small>{item.client_label} · {formatDate(item.created_at)}</small>
                  <span className="proposal-list-languages">{(Array.isArray(item.files) ? item.files : []).map((entry) => <em key={entry.language}>{languageLabel(entry.language)}</em>)}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel eyebrow={selected ? selected.client_label : 'Viewer'} title={selected ? selected.title : 'Select a proposal'} className="proposal-viewer-panel"
          action={selected && files.length > 1 && (
            <div className="proposal-language-toggle" role="group" aria-label="Proposal language">
              {files.map((entry) => <button key={entry.language} type="button" aria-pressed={entry.language === file?.language} onClick={() => setLanguage(entry.language)}>{languageLabel(entry.language)}</button>)}
            </div>
          )}>
          {selected?.summary && <p className="proposal-summary">{selected.summary}</p>}
          {!selected && <EmptyState title="Nothing selected" message="Choose a proposal to read it here." />}
          {selected && !file && <EmptyState title="No PDF attached" message="This proposal has no file yet." />}
          {file && (
            <>
              <div className="proposal-actions">
                <a href={viewer.url || undefined} target="_blank" rel="noreferrer" aria-disabled={!viewer.url}><ExternalLink aria-hidden="true" />Open full screen</a>
                <a href={viewer.url || undefined} download aria-disabled={!viewer.url}><Download aria-hidden="true" />Download</a>
                <button type="button" onClick={copyShareLink}><Copy aria-hidden="true" />Copy 7-day link</button>
                {shared && <span className="proposal-shared" role="status"><Check aria-hidden="true" />{shared}</span>}
              </div>
              <div className="proposal-frame">
                {viewer.loading && <LoadingState label="Opening the PDF" />}
                {viewer.error && <ErrorState error={viewer.error} retry={() => setViewerAttempt((attempt) => attempt + 1)} />}
                {viewer.url && <iframe title={`${selected.title} (${languageLabel(file.language)})`} src={viewer.url} />}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
