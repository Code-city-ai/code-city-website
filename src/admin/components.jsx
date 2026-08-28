import React from 'react';
import { AlertTriangle, ArrowUpRight, LoaderCircle } from 'lucide-react';

export const formatDate = (value, includeTime = false) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value));
};

export const formatMoney = (value, currency = 'USD') => {
  const amount = Number(value || 0);
  const code = String(currency || 'USD').trim().toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} ${code || 'USD'}`;
  }
};

export const formatCurrencyTotals = (totals) => totals.length
  ? totals.map(({ currency, value }) => `${formatMoney(value, currency)} ${currency}`).join(' · ')
  : formatMoney(0);

export function StatusTag({ value = 'unknown' }) {
  return <span className={`portal-status portal-status-${String(value).replaceAll('_', '-')}`}>{String(value).replaceAll('_', ' ')}</span>;
}

export function MetricCard({ eyebrow, value, detail, accent = false }) {
  return (
    <article className={`portal-metric${accent ? ' portal-metric-accent' : ''}`}>
      <span>{eyebrow}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export function Panel({ title, eyebrow, action = null, children, className = '' }) {
  return (
    <section className={`portal-panel ${className}`.trim()}>
      <header className="portal-panel-heading">
        <div>
          {eyebrow && <span>{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({ title, message, href = null, action = null }) {
  return (
    <div className="portal-empty">
      <span>00</span>
      <h3>{title}</h3>
      <p>{message}</p>
      {href && <a href={href}>{action}<ArrowUpRight aria-hidden="true" /></a>}
    </div>
  );
}

export function LoadingState({ label = 'Loading the operating picture' }) {
  return <div className="portal-loading"><LoaderCircle className="spin" aria-hidden="true" /><span>{label}</span></div>;
}

export function ErrorState({ error, retry }) {
  return (
    <div className="portal-error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div><strong>That view could not be loaded.</strong><span>{error?.message || String(error)}</span></div>
      {retry && <button type="button" onClick={retry}>Try again</button>}
    </div>
  );
}
