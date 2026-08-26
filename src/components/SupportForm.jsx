import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { submitSupportRequest } from '@/lib/inquiries';

const initialForm = {
  name: '',
  email: '',
  product: '',
  issueType: '',
  reference: '',
  message: '',
  website: '',
};

export default function SupportForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: 'loading', message: '' });

    try {
      await submitSupportRequest({
        ...form,
        sourceUrl: window.location.href,
      });
      setForm(initialForm);
      setStatus({ type: 'success', message: 'Your support request is in. Code City will follow up using the email you provided.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  return (
    <form className="support-form" onSubmit={handleSubmit}>
      <div className="support-form-heading">
        <div>
          <span>Official support channel</span>
          <h2 id="support-request-title">Tell us what happened.</h2>
        </div>
        <b>02 — 04</b>
      </div>

      <div className="form-row">
        <label>
          <span>Your name</span>
          <input name="name" value={form.name} onChange={updateField} autoComplete="name" maxLength={120} required placeholder="Name" />
        </label>
        <label>
          <span>Email for our reply</span>
          <input name="email" value={form.email} onChange={updateField} type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" />
        </label>
      </div>

      <div className="form-row">
        <label>
          <span>Product</span>
          <select name="product" value={form.product} onChange={updateField} required>
            <option value="" disabled>Select a Code City product</option>
            <option value="AirDrop Logistics">AirDrop Logistics</option>
            <option value="AutoPilot CRM">AutoPilot CRM</option>
            <option value="Rituals">Rituals</option>
            <option value="Trade City">Trade City</option>
            <option value="Code City website">Code City website</option>
            <option value="Other Code City product">Other Code City product</option>
          </select>
        </label>
        <label>
          <span>What do you need help with?</span>
          <select name="issueType" value={form.issueType} onChange={updateField} required>
            <option value="" disabled>Select an issue type</option>
            <option value="Account or access">Account or access</option>
            <option value="App behavior or bug">App behavior or bug</option>
            <option value="Billing or subscription">Billing or subscription</option>
            <option value="Data or privacy">Data or privacy</option>
            <option value="Shipping or operations">Shipping or operations</option>
            <option value="Other support request">Other support request</option>
          </select>
        </label>
      </div>

      <label>
        <span>Order, tracking, or case reference <em>Optional</em></span>
        <input name="reference" value={form.reference} onChange={updateField} maxLength={160} placeholder="A reference that helps us locate the issue" />
      </label>

      <label>
        <span>Describe the issue</span>
        <textarea name="message" value={form.message} onChange={updateField} minLength={20} maxLength={3000} required rows={6} placeholder="What happened, what did you expect, and which device or browser were you using?" />
      </label>

      <label className="honeypot" aria-hidden="true">
        <span>Website</span>
        <input name="website" value={form.website} onChange={updateField} tabIndex={-1} autoComplete="off" />
      </label>

      <div className="support-form-footer">
        <p>Never include a password, full payment-card number, or authentication code.</p>
        <button className="submit-button" type="submit" disabled={status.type === 'loading'}>
          {status.type === 'loading' ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
          {status.type === 'loading' ? 'Sending' : 'Send support request'}
        </button>
      </div>

      {status.type !== 'idle' && status.type !== 'loading' && (
        <div className={`form-status form-status-${status.type}`} role="status">
          {status.type === 'success' && <CheckCircle2 aria-hidden="true" />}
          {status.message}
        </div>
      )}
    </form>
  );
}
