import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import Brand from '@/components/Brand';
import '@/admin/signin.css';
import { useAdminAuth } from '@/admin/AuthProvider';

export default function Login() {
  const { signIn, sendPasswordReset, authError, configured } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: '', message: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', message: '' });
    const { error } = await signIn(email.trim(), password);
    setStatus({ loading: false, error: error ? 'The email or password was not accepted.' : '', message: '' });
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ loading: false, error: 'Enter your email address first.', message: '' });
      return;
    }
    setStatus({ loading: true, error: '', message: '' });
    const { error } = await sendPasswordReset(normalizedEmail);
    setStatus(error
      ? { loading: false, error: 'The password email could not be requested. Try again shortly.', message: '' }
      : { loading: false, error: '', message: 'If this address is authorized, a secure password link is on its way.' });
  };

  return (
    <main className="signin-page">
      <header className="signin-header">
        <Brand />
        <a className="signin-return" href="/">Back to Code City <ArrowUpRight aria-hidden="true" /></a>
      </header>

      <div className="signin-layout">
        <section className="signin-world" aria-labelledby="signin-world-heading">
          <div className="signin-sculpture" aria-hidden="true">
            <svg viewBox="0 0 620 520" fill="none" focusable="false">
              <defs>
                <linearGradient id="signin-metal" x1="150" y1="60" x2="465" y2="460" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#353c44" /><stop offset=".22" stopColor="#b0b9c2" /><stop offset=".32" stopColor="#eef0ed" /><stop offset=".43" stopColor="#4e5963" /><stop offset=".63" stopColor="#10161c" /><stop offset=".83" stopColor="#88939c" /><stop offset="1" stopColor="#222a32" />
                </linearGradient>
                <linearGradient id="signin-edge" x1="225" y1="50" x2="390" y2="470" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#eef0ed" /><stop offset=".45" stopColor="#7a8792" /><stop offset="1" stopColor="#293039" />
                </linearGradient>
                <linearGradient id="signin-inner" x1="180" y1="120" x2="410" y2="440" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#080b0f" /><stop offset=".5" stopColor="#18212a" /><stop offset="1" stopColor="#080b0f" />
                </linearGradient>
              </defs>
              <g className="signin-frame">
                <path d="M194 457V203C194 112 247 59 321 59C403 59 455 116 455 203V457H194Z" fill="url(#signin-inner)" />
                <path fillRule="evenodd" d="M154 453V197C154 92 216 30 304 30C395 30 457 95 457 197V453H154ZM184 453H427V198C427 116 379 61 304 61C233 61 184 113 184 198V453Z" fill="url(#signin-metal)" />
                <path d="M154 453V197C154 92 216 30 304 30C395 30 457 95 457 197V453M184 453V198C184 113 233 61 304 61C379 61 427 116 427 198V453" stroke="url(#signin-edge)" strokeWidth="1.2" />
                <path fillRule="evenodd" d="M211 453V219C211 144 253 101 316 101C379 101 419 146 419 219V453H211ZM229 453H401V219C401 158 369 122 316 122C264 122 229 158 229 219V453Z" fill="url(#signin-metal)" opacity=".76" />
                <path d="M211 453V219C211 144 253 101 316 101C379 101 419 146 419 219V453" stroke="url(#signin-edge)" opacity=".7" />
                <path fillRule="evenodd" d="M252 453V237C252 185 280 157 325 157C369 157 396 186 396 237V453H252ZM264 453H383V237C383 194 361 172 325 172C288 172 264 195 264 237V453Z" fill="url(#signin-metal)" opacity=".56" />
                <path d="M252 453V237C252 185 280 157 325 157C369 157 396 186 396 237V453" stroke="url(#signin-edge)" opacity=".6" />
                <path d="M121 454H478" stroke="#66727b" strokeOpacity=".45" />
              </g>
            </svg>
          </div>
          <div className="signin-world-copy">
            <h1 id="signin-world-heading">Your projects.<br /><span>One secure entrance.</span></h1>
            <p>Sign in to your Code City account to open ORC and Trade City.</p>
            <div className="signin-project-signatures" aria-label="Your workspaces">
              <span><img src="/brands/orc-app.png" width="36" height="36" alt="" />ORC</span>
              <span><img src="/brands/trade-city-app.png" width="36" height="36" alt="" />Trade City</span>
            </div>
          </div>
        </section>

        <section className="signin-form-panel" aria-labelledby="signin-heading">
          <div className="signin-form-content">
            <h2 id="signin-heading">Sign in.</h2>
            <p className="signin-description">Your Code City account.<br />A private space for what comes next.</p>
            <form onSubmit={handleSubmit}>
              <div className="signin-field">
                <label htmlFor="code-city-admin-email">Email address</label>
                <input id="code-city-admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required placeholder="dev@codecity.ai" aria-describedby={status.error || authError ? 'signin-error' : undefined} />
              </div>
              <div className="signin-field">
                <label htmlFor="code-city-admin-password">Password</label>
                <div className="signin-password">
                  <input id="code-city-admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Enter your password" aria-describedby={status.error || authError ? 'signin-error' : undefined} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
                </div>
              </div>
              <button className="signin-reset" type="button" onClick={handlePasswordReset} disabled={status.loading}>Set or reset password <ArrowUpRight aria-hidden="true" /></button>
              {(status.error || authError || !configured) && <div className="signin-feedback signin-feedback-error" id="signin-error" role="alert">{status.error || authError || 'Sign-in is temporarily unavailable. Please try again shortly.'}</div>}
              {status.message && <div className="signin-feedback signin-feedback-success" role="status">{status.message}</div>}
              <button className="signin-submit" type="submit" disabled={status.loading || !configured}>
                <span>{status.loading ? 'Authenticating' : 'Enter the workspace'}</span>
                {status.loading ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
              </button>
            </form>
            <p className="signin-setup-help">First time here? Enter your email and select <strong>Set or reset password</strong> to receive your setup link.</p>
            <div className="signin-access-note"><LockKeyhole aria-hidden="true" /><p>One account. Separate project codes.<br />Choose your workspace after signing in.</p></div>
          </div>
        </section>
      </div>
      <footer className="signin-footer"><span>Code City Admin</span><span>Private workspace · Authorized team members only</span></footer>
    </main>
  );
}
