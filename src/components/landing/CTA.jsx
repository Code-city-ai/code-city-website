import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { submitInquiry } from '@/lib/inquiries';

const initialForm = {
  name: '',
  email: '',
  organization: '',
  projectType: '',
  budgetRange: '',
  message: '',
  website: '',
};

export default function CTA() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: 'loading', message: '' });

    try {
      await submitInquiry({
        ...form,
        sourceUrl: window.location.href,
      });
      setForm(initialForm);
      setStatus({ type: 'success', message: 'Your project is in. We’ll review it and follow up personally.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  return (
    <section className="section contact-section" id="contact" aria-labelledby="contact-title">
      <div className="site-container contact-layout">
        <div className="contact-copy">
          <div className="section-label section-label-inverse"><span>05</span> Start a project</div>
          <h2 id="contact-title">Let’s build the thing people remember.</h2>
          <p>Tell us what you are solving, where you are stuck, and what success looks like. You do not need a perfect brief.</p>
          <div className="contact-note">
            <span>What happens next</span>
            <p>We review every inquiry ourselves, then respond with a clear recommendation—not a generic sales sequence.</p>
          </div>
        </div>

        <form className="inquiry-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label>
              <span>Your name</span>
              <input name="name" value={form.name} onChange={updateField} autoComplete="name" maxLength={120} required placeholder="Name" />
            </label>
            <label>
              <span>Work email</span>
              <input name="email" value={form.email} onChange={updateField} type="email" autoComplete="email" maxLength={254} required placeholder="you@company.com" />
            </label>
          </div>

          <label>
            <span>Company or organization <em>Optional</em></span>
            <input name="organization" value={form.organization} onChange={updateField} autoComplete="organization" maxLength={160} placeholder="Company name" />
          </label>

          <div className="form-row">
            <label>
              <span>What are we building?</span>
              <select name="projectType" value={form.projectType} onChange={updateField} required>
                <option value="" disabled>Select a project type</option>
                <option value="new-product">A new digital product</option>
                <option value="existing-product">A major product evolution</option>
                <option value="mobile-app">A mobile application</option>
                <option value="growth-system">A growth or marketing system</option>
                <option value="not-sure">I am not sure yet</option>
              </select>
            </label>
            <label>
              <span>Investment range <em>Optional</em></span>
              <select name="budgetRange" value={form.budgetRange} onChange={updateField}>
                <option value="">Choose a range</option>
                <option value="under-10k">Under $10k</option>
                <option value="10k-25k">$10k–$25k</option>
                <option value="25k-75k">$25k–$75k</option>
                <option value="75k-plus">$75k+</option>
                <option value="undecided">Not decided</option>
              </select>
            </label>
          </div>

          <label>
            <span>Tell us about the opportunity</span>
            <textarea name="message" value={form.message} onChange={updateField} minLength={20} maxLength={3000} required rows={5} placeholder="What are you trying to change, launch, or improve?" />
          </label>

          <label className="honeypot" aria-hidden="true">
            <span>Website</span>
            <input name="website" value={form.website} onChange={updateField} tabIndex={-1} autoComplete="off" />
          </label>

          <div className="form-footer">
            <p>By submitting, you agree that we may use these details to respond to your inquiry.</p>
            <button className="submit-button" type="submit" disabled={status.type === 'loading'}>
              {status.type === 'loading' ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
              {status.type === 'loading' ? 'Sending' : 'Send project inquiry'}
            </button>
          </div>

          {status.type !== 'idle' && status.type !== 'loading' && (
            <div className={`form-status form-status-${status.type}`} role="status">
              {status.type === 'success' && <CheckCircle2 aria-hidden="true" />}
              {status.message}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
