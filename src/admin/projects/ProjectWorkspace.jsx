import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, KeyRound, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { workspaceRequest } from './client';

export default function ProjectWorkspace({ children, settings = false }) {
  const [access, setAccess] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setAccess(await workspaceRequest('status')); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const lock = () => setAccess((value) => value ? { ...value, unlocked: false } : value);
    window.addEventListener('workspace-locked', lock);
    return () => window.removeEventListener('workspace-locked', lock);
  }, []);
  useEffect(() => {
    if (!access?.unlocked || !access.expires_at) return undefined;
    const timeout = window.setTimeout(() => setAccess((value) => ({ ...value, unlocked: false })), Math.max(0, Date.parse(access.expires_at) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [access]);
  const configure = Boolean(access?.owner && (!access.configured || settings));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (configure && code !== confirmation) { setError('The two codes do not match.'); return; }
    setBusy(true);
    try {
      const result = await workspaceRequest(configure ? 'configure' : 'unlock', { code, ...(configure ? { current_code: currentCode } : {}) });
      setAccess(result); setCode(''); setCurrentCode(''); setConfirmation('');
      if (configure) setNotice(result.notification === 'failed'
        ? 'Your code is saved, but the email notification failed. Mailgun must be connected before the workspace can be unlocked.'
        : 'Your code is saved. Use it to unlock your workspace.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  if (loading) return <div className="project-loading" role="status"><LoaderCircle className="spin" /><p>Checking project access</p></div>;
  if (access?.unlocked && !settings) return children;
  if (settings && !access?.owner) return <div className="project-empty"><ShieldCheck /><h2>Owner access required</h2><p>Only the workspace owner can change the project code.</p><a href="/admin/projects">Return to projects <ArrowRight /></a></div>;
  return (
    <section className="project-access">
      <div className="project-access-story">
        <div className="project-access-mark" aria-hidden="true"><i /><i /><i /><i /></div>
        <h2>Your projects.<br />One private workspace.</h2>
        <p>A dedicated place for the things you’re building. Start with Trade City, then move between your Code City projects.</p>
        <div className="project-access-product"><img src="/brands/trade-city.png" alt="" /><div><strong>Trade City</strong><span>Portfolio · Performance · Nova</span></div><LockKeyhole size={18} /></div>
      </div>
      <div className="project-access-form">
        <KeyRound size={28} aria-hidden="true" />
        <h2>{configure ? (access.configured ? 'Change your access code.' : 'Make this workspace yours.') : 'A little more security.'}</h2>
        <p>{configure ? 'Choose a private code of at least 10 characters. You control it; your administrators use it to open Trade City.' : 'Your administrator account is verified. Enter the owner’s fixed access code to continue.'}</p>
        {error && <div className="project-error" role="alert">{error}</div>}
        {notice && <div className="project-notice" role="status"><Check size={18} />{notice}</div>}
        {!access ? <button className="project-primary" onClick={load}><RefreshCw size={16} />Retry connection</button> : !access.configured && !access.owner ? <div className="project-notice">The owner needs to set the first access code. Contact your workspace owner.</div> : <form onSubmit={submit}>
          {configure && access.configured && <label>Current code<input type="password" autoComplete="current-password" value={currentCode} onChange={(event) => setCurrentCode(event.target.value)} required maxLength={128} /></label>}
          <label>{configure ? 'Your new code' : 'Access code'}<input type="password" autoComplete={configure ? 'new-password' : 'current-password'} value={code} onChange={(event) => setCode(event.target.value)} required minLength={configure ? 10 : undefined} maxLength={128} autoFocus /></label>
          {configure && <label>Confirm new code<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={10} maxLength={128} /></label>}
          <button className="project-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}{busy ? 'Securing your workspace' : configure ? 'Save access code' : 'Unlock workspace'}</button>
        </form>}
        <small><ShieldCheck size={15} />Successful unlocks notify dev@codecity.ai. Access lasts one hour.</small>
        {settings && <a href="/admin/projects">Return to projects</a>}
      </div>
    </section>
  );
}
