import React, { useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import Brand from '@/components/Brand';
import { useAdminAuth } from '@/admin/AuthProvider';

export default function PasswordSetup() {
  const { updatePassword } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 12) {
      setStatus({ loading: false, error: 'Use at least 12 characters for this administrator password.' });
      return;
    }
    if (password !== confirmation) {
      setStatus({ loading: false, error: 'The passwords do not match.' });
      return;
    }

    setStatus({ loading: true, error: '' });
    const { error } = await updatePassword(password);
    if (error) {
      setStatus({ loading: false, error: 'The secure link may have expired. Request a new password link from sign in.' });
      return;
    }
    window.location.assign('/sign-in');
  };

  return (
    <main className="portal-login">
      <section className="portal-login-story">
        <Brand />
        <div>
          <span>Code City / Identity setup</span>
          <h1>Protect the workspace before you enter it.</h1>
          <p>Create the password for your Code City account, then choose the project you want to open.</p>
        </div>
        <small>Private workspace · One-time secure setup</small>
      </section>

      <section className="portal-login-panel">
        <div className="portal-login-card">
          <div className="portal-login-icon"><KeyRound aria-hidden="true" /></div>
          <span>Secure credential</span>
          <h2>Set your password.</h2>
          <p>Use a unique password with at least 12 characters. Code City never displays or stores it in the portal.</p>

          <form onSubmit={handleSubmit}>
            <label>
              <span>New password</span>
              <div className="portal-password-field">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength={12} placeholder="12 characters minimum" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </div>
            </label>
            <label><span>Confirm password</span><input type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={12} placeholder="Repeat your password" /></label>
            {status.error && <div className="portal-login-error" role="alert">{status.error}</div>}
            <button type="submit" disabled={status.loading}>
              {status.loading ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
              {status.loading ? 'Securing access' : 'Set password and continue'}
            </button>
          </form>
          <a href="/sign-in">Request a new secure link</a>
        </div>
      </section>
    </main>
  );
}
