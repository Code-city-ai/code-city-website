import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut } from 'lucide-react';
import Brand from '@/components/Brand';
import { useAdminAuth } from '@/admin/AuthProvider';
import { projectAccess } from '@/admin/lib/project-access';

export default function ProjectAccess({ project = null, children = null }) {
  const [selectedProject, setSelectedProject] = useState(project);
  const projectName = selectedProject === 'code-city' ? 'Code City' : 'Trade City';
  const projectPath = selectedProject === 'code-city' ? '/admin' : '/trade-city/';
  const requestAccess = (action, fields = {}) => projectAccess(action, fields, selectedProject);
  const { session, profile, signOut } = useAdminAuth();
  const [access, setAccess] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const isAdmin = profile?.is_active && (selectedProject === 'code-city' ? ['owner', 'admin', 'agent', 'viewer'] : ['owner', 'admin']).includes(profile.role);
  const configuring = access?.owner && (!access.configured || editing);

  const loadAccess = async () => {
    setBusy(true);
    setError('');
    try { setAccess(await requestAccess('status')); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    let active = true;
    setAccess(null);
    setBusy(true);
    setError('');
    if (!selectedProject || !isAdmin) { setBusy(false); return undefined; }
    projectAccess('status', {}, selectedProject).then((result) => { if (active) setAccess(result); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  // Refreshing the same Auth session must not unmount an unlocked CRM form.
  // The grant timer and server checks still enforce expiry and revocation.
  }, [isAdmin, session?.user?.id, selectedProject, profile?.role]);

  useEffect(() => {
    if (!access?.unlocked || !access.expires_at) return undefined;
    const timeout = window.setTimeout(() => {
      setAccess((previous) => ({ ...previous, unlocked: false, expires_at: null }));
      setMessage('Your project access expired. Enter the code again to continue.');
    }, Math.max(0, Date.parse(access.expires_at) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [access?.expires_at, access?.unlocked]);

  useEffect(() => { if (!busy && access && !access.unlocked) inputRef.current?.focus(); }, [access, busy]);

  const clearFields = () => { setCode(''); setCurrentCode(''); setConfirmation(''); setVisible(false); };
  const submit = async (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (configuring && code !== confirmation) { setError('The two codes do not match. Enter them again.'); return; }
    setBusy(true);
    try {
      const result = await requestAccess(configuring ? 'configure' : 'unlock', { code, ...(configuring ? { current_code: currentCode } : {}) });
      setAccess(result); setEditing(false); clearFields();
      if (configuring) setMessage(result.notification === 'failed'
        ? 'Your code was saved. Mailgun could not send the notification; try opening the project again shortly.'
        : `Your code was saved. Enter it below to open ${projectName}.`);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const lock = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      await requestAccess('lock');
      setAccess((previous) => ({ ...previous, unlocked: false, expires_at: null }));
      await loadAccess();
    }
    catch (failure) { setError(failure.message); setBusy(false); }
  };
  const exit = async () => {
    setBusy(true);
    try { if (access) await requestAccess('lock'); } catch { /* Sign-out also revokes the underlying Auth session. */ }
    await signOut();
  };

  if (children && selectedProject === project && access?.unlocked) return children;

  const chooseProject = (nextProject) => { setSelectedProject(nextProject); setAccess(null); setBusy(Boolean(nextProject)); setEditing(false); clearFields(); setMessage(''); setError(''); };

  return (
    <main className="portal-login portal-project-access">
      <section className="portal-login-story">
        <Brand />
        <div>
          <h1>Your projects.<br />One secure entrance.</h1>
          <p>Choose Trade City or Code City, then enter that project’s private access code. Your account stays the same.</p>
        </div>
        <small>Private workspace · Authorized team members only</small>
      </section>
      <section className="portal-login-panel">
        <div className="portal-login-card">
          <div className="portal-login-icon">{access?.unlocked ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}</div>
          <h2>{!selectedProject ? 'Choose your project.' : !isAdmin ? 'Administrator access required.' : configuring ? (access?.configured ? 'Change your access code.' : `Set the ${projectName} code.`) : access?.unlocked ? 'Open your workspace.' : `Enter the ${projectName} code.`}</h2>
          <p className="project-access-identity">Signed in as <strong>{session?.user.email}</strong></p>
          {!selectedProject ? <div className="project-access-choices"><button type="button" onClick={() => chooseProject('trade-city')}><span><strong>Trade City</strong><small>Trading workspace</small></span><ArrowUpRight aria-hidden="true" /></button><button type="button" onClick={() => chooseProject('code-city')}><span><strong>Code City</strong><small>Client operations</small></span><ArrowUpRight aria-hidden="true" /></button></div> : !isAdmin ? <p>Trade City requires an active administrator or owner account. Choose Code City to open your existing client workspace.</p>
            : busy && !access ? <p className="project-access-checking" role="status"><LoaderCircle className="spin" aria-hidden="true" /> Checking project access</p>
              : access ? <>
                {configuring ? <p>Choose a fixed code with 10–128 characters. You can change it here; changing it locks every browser session for this project.</p>
                  : access.unlocked ? <p>{projectName} is available for this sign-in. Lock it when you finish.</p>
                    : <p>{access.configured ? 'Use the fixed code set by your workspace owner. An access notification is sent to dev@codecity.ai.' : 'Your workspace owner needs to set this project code before you can continue.'}</p>}
                {access.unlocked && !editing ? <div className="project-access-launch">
                  <a className="project-access-primary" href={projectPath}>Open {projectName} <ArrowUpRight aria-hidden="true" /></a>
                  <button className="project-access-text-button" type="button" onClick={lock} disabled={busy}>Lock {projectName}</button>
                </div> : (access.configured || configuring) && <form onSubmit={submit}>
                  {configuring && access.configured && <div className="portal-login-field"><label htmlFor="project-current-code"><span>Current code</span></label><input id="project-current-code" type="password" value={currentCode} onChange={(event) => setCurrentCode(event.target.value)} autoComplete="current-password" required maxLength={128} disabled={busy} /></div>}
                  <div className="portal-login-field">
                    <label htmlFor="project-access-code"><span>{configuring ? 'New access code' : 'Access code'}</span></label>
                    <div className="portal-password-field">
                      <input ref={inputRef} id="project-access-code" type={visible ? 'text' : 'password'} value={code} onChange={(event) => setCode(event.target.value)} autoComplete={configuring ? 'new-password' : 'current-password'} required minLength={configuring ? 10 : undefined} maxLength={128} disabled={busy} aria-describedby={error ? 'project-access-error' : undefined} />
                      <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide access code' : 'Show access code'}>{visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
                    </div>
                  </div>
                  {configuring && <div className="portal-login-field"><label htmlFor="project-confirm-code"><span>Confirm new code</span></label><input id="project-confirm-code" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} disabled={busy} /></div>}
                  <button type="submit" disabled={busy}>{busy ? 'Verifying' : configuring ? 'Save access code' : `Unlock ${projectName}`}{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</button>
                </form>}
              </> : null}
          {error && <div className="portal-login-error project-access-feedback" id="project-access-error" role="alert">{error}</div>}
          {message && <div className="portal-login-message project-access-feedback" role="status">{message}</div>}
          {selectedProject && !access && isAdmin && !busy && <button className="project-access-text-button" type="button" onClick={loadAccess}>Try again</button>}
          {access?.owner && access.configured && <button className="project-access-text-button" type="button" disabled={busy} onClick={() => { setEditing((value) => !value); clearFields(); setError(''); setMessage(''); }}>{editing ? 'Cancel code change' : 'Change access code'}</button>}
          <div className="project-access-footer">
            <button type="button" onClick={() => chooseProject(null)} disabled={busy || !selectedProject}>Choose another project</button>
            <button type="button" onClick={exit} disabled={busy}><LogOut aria-hidden="true" /> Sign out</button>
          </div>
          <a href="/">Return to codecity.ai</a>
          {selectedProject === 'trade-city' && <p>Trade City. All rights reserved.</p>}
        </div>
      </section>
    </main>
  );
}
