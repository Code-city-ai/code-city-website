import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, CircleDashed, ShieldCheck } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, MetricCard, Panel, StatusTag, formatMoney } from '@/admin/components';
import { loadMarketing } from '@/admin/lib/portal';
import { trackedSessionConversionRate } from '@/admin/lib/marketingMetrics';

export default function Marketing() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    loadMarketing()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => setState({ loading: false, data: null, error }));
  }, []);
  useEffect(load, [load]);

  const campaignRows = useMemo(() => (state.data?.campaigns || []).map((campaign) => {
    const totals = (campaign.marketing_daily_metrics || []).reduce((acc, row) => ({
      spend: acc.spend + Number(row.spend || 0),
      leads: acc.leads + Number(row.leads || 0),
      revenue: acc.revenue + Number(row.revenue || 0),
      clicks: acc.clicks + Number(row.clicks || 0),
    }), { spend: 0, leads: 0, revenue: 0, clicks: 0 });
    return { ...campaign, totals };
  }), [state.data?.campaigns]);

  if (state.loading) return <LoadingState label="Assembling attribution intelligence" />;
  if (state.error) return <ErrorState error={state.error} retry={load} />;
  const { metrics, funnel, integrations, workItems } = state.data;
  const conversionRate = trackedSessionConversionRate(metrics.convertedSessions, metrics.sessions);

  return (
    <div className="portal-page-stack">
      <section className="marketing-command-header">
        <div><span>First-party intelligence</span><h2>Know what creates demand before increasing spend.</h2></div>
        <div><ShieldCheck /><p>No raw IP addresses. No customer form content in event properties. Third-party pixels remain off until configured and governed.</p></div>
      </section>

      <section className="portal-metrics-grid">
        <MetricCard eyebrow="30-day visitors" value={metrics.visitors} detail="Anonymous first-party identities" accent />
        <MetricCard eyebrow="Tracked sessions" value={metrics.sessions} detail="30-minute first-party activity windows" />
        <MetricCard eyebrow="Page views" value={metrics.pageviews} detail={`${metrics.events} total tracked events`} />
        <MetricCard eyebrow="Converted sessions" value={metrics.convertedSessions} detail={`${conversionRate}% of tracked sessions`} />
        <MetricCard eyebrow="Attributed inquiries" value={metrics.attributableInquiries} detail="Campaign or click identity recorded" />
      </section>

      <Panel eyebrow="First-party funnel · 30 days" title="Campaign touch to qualified demand.">
        {funnel.length ? (
          <div className="portal-table-wrap"><table className="portal-table marketing-table marketing-funnel-table"><thead><tr><th>Source / campaign</th><th>Visitors</th><th>Sessions</th><th>Engaged</th><th>Form starts</th><th>Inquiries</th><th>Qualified</th><th>Won</th><th>Tracked session → inquiry</th></tr></thead><tbody>
            {funnel.map((row) => {
              const rate = trackedSessionConversionRate(row.converted_sessions, row.sessions);
              return <tr key={`${row.source}:${row.medium}:${row.campaign}`}>
                <td><strong>{row.campaign === 'unassigned' ? row.source : row.campaign}</strong><span>{row.source} · {row.medium}</span></td>
                <td>{row.visitors}</td>
                <td>{row.sessions}</td>
                <td>{row.engaged_sessions}</td>
                <td>{row.form_starts}</td>
                <td>{row.inquiries}</td>
                <td>{row.qualified_inquiries}</td>
                <td>{row.won_inquiries}</td>
                <td>{rate}%</td>
              </tr>;
            })}
          </tbody></table></div>
        ) : <EmptyState title="The first campaign touch has not arrived" message="Direct and paid campaign rows will appear here as real sessions and stored inquiries are recorded. Qualified means the inquiry has ever reached a qualified stage." />}
      </Panel>

      <Panel eyebrow="Campaign ledger" title="Spend must meet evidence.">
        {campaignRows.length ? (
          <div className="portal-table-wrap"><table className="portal-table marketing-table"><thead><tr><th>Campaign</th><th>Provider</th><th>Spend</th><th>Clicks</th><th>Leads</th><th>Revenue</th><th>ROAS</th></tr></thead><tbody>
            {campaignRows.map((campaign) => <tr key={campaign.id}>
              <td><strong>{campaign.name}</strong><span>{campaign.source} · {campaign.objective.replaceAll('_', ' ')}</span></td>
              <td><StatusTag value={campaign.provider} /></td>
              <td>{formatMoney(campaign.totals.spend, campaign.currency)}</td>
              <td>{campaign.totals.clicks}</td>
              <td>{campaign.totals.leads}</td>
              <td>{formatMoney(campaign.totals.revenue, campaign.currency)}</td>
              <td>{campaign.totals.spend ? `${(campaign.totals.revenue / campaign.totals.spend).toFixed(2)}×` : '—'}</td>
            </tr>)}
          </tbody></table></div>
        ) : <EmptyState title="No campaign spend has been imported" message="That is an honest zero, not a broken chart. First-party traffic and inquiry attribution can operate before Meta or Google spend sync is connected." />}
      </Panel>

      <div className="marketing-lower-grid">
        <Panel eyebrow="Provider boundary" title="Connection control">
          <div className="marketing-integrations-grid">
            {integrations.map((integration) => <article key={integration.slug}>
              <div>{integration.status === 'connected' ? <CheckCircle2 /> : <CircleDashed />}<StatusTag value={integration.status} /></div>
              <strong>{integration.provider}</strong>
              <p>{integration.last_error || (integration.status === 'connected' ? 'Operating normally.' : 'Credentials and provider authorization remain server-side and incomplete.')}</p>
            </article>)}
          </div>
        </Panel>

        <Panel eyebrow="Delivery sequence" title="Build order">
          <div className="marketing-work-sequence">
            {workItems.filter((item) => ['Analytics', 'Advertising', 'Attribution', 'Privacy'].includes(item.area)).map((item, index) => <article key={item.id}>
              <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><p>{item.description}</p></div><StatusTag value={item.status} />
            </article>)}
          </div>
        </Panel>
      </div>

      <section className="marketing-python-boundary">
        <Activity />
        <div><span>Python service boundary</span><h3>One collection endpoint. One source of truth.</h3><p>The Vercel Python function validates a deliberately small event vocabulary, strips unknown properties, hashes network identity with a server-only salt, and writes through a single Supabase RPC.</p></div>
        <a href="/admin/settings">Review system state <ArrowUpRight /></a>
      </section>
    </div>
  );
}
