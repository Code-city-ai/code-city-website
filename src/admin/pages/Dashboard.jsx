import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, CircleDashed } from 'lucide-react';
import { ErrorState, LoadingState, MetricCard, Panel, StatusTag, formatDate, formatMoney } from '@/admin/components';
import { loadDashboard } from '@/admin/lib/portal';

export default function Dashboard() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    loadDashboard()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => setState({ loading: false, data: null, error }));
  }, []);

  useEffect(load, [load]);
  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState error={state.error} retry={load} />;

  const { metrics, recent, integrations, workItems } = state.data;
  return (
    <div className="portal-page-stack">
      <section className="portal-intro">
        <div><span>Operating picture</span><h2>Every serious conversation, visible.</h2></div>
        <p>New demand, qualified relationships, active delivery, and the signal that created each opportunity.</p>
      </section>

      <section className="portal-metrics-grid">
        <MetricCard eyebrow="New inquiries" value={metrics.newInquiries} detail="Awaiting first review" accent />
        <MetricCard eyebrow="Qualified pipeline" value={metrics.qualified} detail="Qualified through won" />
        <MetricCard eyebrow="Active clients" value={metrics.activeClients} detail="Current relationships" />
        <MetricCard eyebrow="Visible pipeline" value={formatMoney(metrics.pipelineValue)} detail="Recorded project value" />
        <MetricCard eyebrow="30-day visitors" value={metrics.visitors30d} detail="First-party tracking" />
      </section>

      <div className="portal-dashboard-grid">
        <Panel
          eyebrow="Inbox"
          title="Latest inquiries"
          action={<a className="portal-text-link" href="/admin/inquiries">Open inbox <ArrowUpRight /></a>}
          className="portal-dashboard-inquiries"
        >
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead><tr><th>Contact</th><th>Request</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>{recent.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td><a href={`/admin/inquiries?selected=${inquiry.id}`}><strong>{inquiry.name}</strong><span>{inquiry.organization || inquiry.email}</span></a></td>
                  <td>{inquiry.project_type.replaceAll('-', ' ')}</td>
                  <td><StatusTag value={inquiry.status} /></td>
                  <td>{formatDate(inquiry.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>

        <Panel eyebrow="Infrastructure" title="Connection state" className="portal-dashboard-integrations">
          <div className="portal-integration-list">
            {integrations.map((integration) => (
              <div key={integration.slug}>
                {integration.status === 'connected' ? <CheckCircle2 /> : <CircleDashed />}
                <div><strong>{integration.provider}</strong><span>{integration.status.replaceAll('_', ' ')}</span></div>
                <StatusTag value={integration.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Build ledger" title="What remains visible">
        <div className="portal-work-list">
          {workItems.map((item, index) => (
            <article key={item.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{item.title}</strong><p>{item.description}</p>{item.blocked_reason && <small>{item.blocked_reason}</small>}</div>
              <StatusTag value={item.status} />
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
