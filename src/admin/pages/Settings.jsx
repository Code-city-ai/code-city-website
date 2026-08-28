import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { ErrorState, LoadingState, Panel, StatusTag, formatDate } from '@/admin/components';
import { loadPortalSettings } from '@/admin/lib/portal';

export default function Settings() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    loadPortalSettings()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => setState({ loading: false, data: null, error }));
  }, []);
  useEffect(load, [load]);
  if (state.loading) return <LoadingState label="Reading system state" />;
  if (state.error) return <ErrorState error={state.error} retry={load} />;

  const { profiles, integrations, workItems } = state.data;
  const mailgun = integrations.find((item) => item.slug === 'mailgun');
  return (
    <div className="portal-page-stack settings-grid">
      <Panel eyebrow="Access rail" title="Invite-only administration" className="settings-access">
        <div className="settings-principle"><ShieldCheck /><div><strong>Authentication is not authorization.</strong><p>Supabase verifies identity. The `admin_profiles` allowlist separately decides who can read Code City data. Public sign-up is not part of this portal.</p></div></div>
        <div className="settings-team-list">
          {profiles.map((profile) => <article key={profile.user_id}><span>{profile.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{profile.full_name}</strong><small>Added {formatDate(profile.created_at)}</small></div><StatusTag value={profile.role} /></article>)}
          {!profiles.length && <article className="settings-team-pending"><span><KeyRound /></span><div><strong>First administrator pending</strong><small>Confirm the authorized login email, then provision the Supabase Auth identity and matching owner profile.</small></div><StatusTag value="blocked" /></article>}
        </div>
      </Panel>

      <Panel eyebrow="Notification rail" title="Inquiry delivery" className="settings-mail">
        <div className="settings-mail-status"><span><Mail /></span><div><strong>Mailgun</strong><p>Every project and support inquiry is stored first, then delivered to both operational recipients.</p></div><StatusTag value={mailgun?.status || 'not_connected'} /></div>
        <dl>
          <div><dt>Recipient 01</dt><dd>dev@codecity.ai</dd></div>
          <div><dt>Recipient 02</dt><dd>aytamzid@airdropja.com</dd></div>
          <div><dt>Failure behavior</dt><dd>Keep the inquiry; flag delivery in the inbox.</dd></div>
          <div><dt>Secrets</dt><dd>Server-side only; never exposed in Vite.</dd></div>
        </dl>
        {mailgun?.last_error && <div className="settings-blocker">{mailgun.last_error}</div>}
      </Panel>

      <Panel eyebrow="Integration health" title="External systems" className="settings-integrations">
        <div className="portal-integration-list">
          {integrations.map((integration) => <div key={integration.slug}>{integration.status === 'connected' ? <CheckCircle2 /> : <CircleDashed />}<div><strong>{integration.provider}</strong><span>{integration.last_sync_at ? `Last sync ${formatDate(integration.last_sync_at, true)}` : 'No verified sync yet'}</span></div><StatusTag value={integration.status} /></div>)}
        </div>
      </Panel>

      <Panel eyebrow="Implementation ledger" title="Finish state" className="settings-work-items">
        <div className="portal-work-list">{workItems.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><p>{item.description}</p>{item.blocked_reason && <small>{item.blocked_reason}</small>}</div><StatusTag value={item.status} /></article>)}</div>
      </Panel>
    </div>
  );
}
