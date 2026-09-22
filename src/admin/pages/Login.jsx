import React, { useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import Brand from '@/components/Brand';
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
    if (error) setStatus({ loading: false, error: 'The email or password was not accepted.', message: '' });
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ loading: false, error: 'Enter your administrator email first.', message: '' });
      return;
    }
    setStatus({ loading: true, error: '', message: '' });
    const { error } = await sendPasswordReset(normalizedEmail);
    setStatus(error
      ? { loading: false, error: 'The password email could not be requested. Try again shortly.', message: '' }
      : { loading: false, error: '', message: 'If this address is authorized, a secure password link is on its way.' });
  };

  return (
    <main className="portal-login">
      <section className="portal-login-story">
        <Brand />
        <div>
          <span>Code City / Client operations</span>
          <h1>Operate the relationship from first signal to signed engagement.</h1>
          <p>One secure workspace for inquiries, client context, project movement, and the marketing evidence behind every lead.</p>
        </div>
        <small>Private workspace · Authorized team members only</small>
      </section>

      <section className="portal-login-panel">
        <div className="portal-login-card">
          <div className="portal-login-icon"><LockKeyhole aria-hidden="true" /></div>
          <span>Team access</span>
          <h2>Sign in to Code City.</h2>
          <p>Use the administrator account provisioned through Code City&apos;s secure Supabase workspace.</p>

          <form onSubmit={handleSubmit}>
            <div className="portal-login-field">
              <label htmlFor="code-city-admin-email"><span>Email address</span></label>
              <input id="code-city-admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required placeholder="you@codecity.ai" />
            </div>
            <div className="portal-login-field">
              <div className="portal-password-label"><label htmlFor="code-city-admin-password">Password</label><button type="button" onClick={handlePasswordReset} disabled={status.loading}>Forgot password?</button></div>
              <div className="portal-password-field">
                <input id="code-city-admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </div>
            </div>
            {(status.error || authError || !configured) && <div className="portal-login-error" role="alert">{status.error || authError}</div>}
            {status.message && <div className="portal-login-message" role="status">{status.message}</div>}
            <button type="submit" disabled={status.loading || !configured}>
              {status.loading ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
              {status.loading ? 'Authenticating' : 'Enter the workspace'}
            </button>
          </form>
          <a href="/">Return to codecity.ai</a>
        </div>
      </section>
    </main>
  );
}
