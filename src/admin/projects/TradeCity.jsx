import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CircleAlert, LockKeyhole, Radio, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { workspaceRequest } from './client';
import { curveGeometry, money, numberOrNull, percent } from './data';

function PerformanceChart({ report }) {
  const geometry = useMemo(() => curveGeometry(report?.equity_curve), [report]);
  const [selected, setSelected] = useState(null);
  const active = geometry.points[Math.min(selected ?? geometry.points.length - 1, geometry.points.length - 1)];
  const closeDate = active?.closed_at && Number.isFinite(Date.parse(active.closed_at)) ? new Date(active.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recorded close (date unavailable)';
  const closeValue = money(active?.cumulative_pnl, report?.currency);
  if (!geometry.points.length) return <div className="tc-chart-empty"><LineGlyph /><strong>Your performance story starts here.</strong><span>{report ? 'A chart appears after two recorded closes.' : 'Connect Trade City to see your recorded performance.'}</span></div>;
  return <div className="tc-chart">
    <div className="tc-chart-readout"><span>{closeDate}</span><strong>{money(active?.cumulative_pnl, report.currency)}</strong></div>
    <svg viewBox="0 0 800 230" role="img" aria-label="Cumulative realized profit and loss by recorded close" onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setSelected(Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * (geometry.points.length - 1))); }} onPointerLeave={() => setSelected(null)}>
      {[26, 86, 146, 206].map((y) => <line key={y} x1="16" x2="784" y1={y} y2={y} className="tc-chart-grid" />)}
      <path d={geometry.path} className="tc-chart-line" />
      {active && <><line x1={active.x} x2={active.x} y1="20" y2="214" className="tc-chart-cursor" /><circle cx={active.x} cy={active.y} r="5" className="tc-chart-dot" /></>}
    </svg>
    <label className="tc-chart-scrub"><span>Explore recorded closes</span><input aria-label="Select recorded close" aria-valuetext={`${closeDate}: cumulative profit and loss ${closeValue}`} type="range" min="0" max={geometry.points.length - 1} value={selected ?? geometry.points.length - 1} onChange={(event) => setSelected(Number(event.target.value))} /></label>
    <div className="tc-chart-axis"><span>First recorded close</span><span>Latest close</span></div>
  </div>;
}
function LineGlyph() { return <svg width="68" height="38" viewBox="0 0 68 38" aria-hidden="true"><path d="M2 30H16L25 16L35 24L47 5H66" fill="none" stroke="currentColor" strokeWidth="2" /></svg>; }

export default function TradeCity() {
  const [broker, setBroker] = useState('paper');
  const [period, setPeriod] = useState('30d');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: '' });
    workspaceRequest('snapshot', { broker, period }).then((data) => { if (active) setState({ loading: false, data, error: '' }); })
      .catch((error) => { if (active) setState({ loading: false, data: null, error: error.message }); });
    return () => { active = false; };
  }, [broker, period, revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const lock = async () => {
    try { await workspaceRequest('lock'); window.location.assign('/admin/projects'); }
    catch (error) { setState((value) => ({ ...value, error: error.message })); }
  };
  const portfolio = state.data?.portfolio?.data;
  const report = state.data?.performance?.data;
  const nova = state.data?.nova?.data;
  const reportReadable = report && report.order_store_state !== 'unreadable';
  const points = reportReadable && report.drawdown_state !== 'unavailable' ? report : null;
  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions : [];
  const visiblePositions = positions.filter((position) => position.symbol.toLowerCase().includes(search.toLowerCase()));
  const failure = state.error || Object.values(state.data || {}).filter((section) => section && typeof section === 'object' && 'error' in section).map((section) => section.error).filter(Boolean).join(' ');
  const currency = portfolio?.currency || 'USD';
  const updated = state.data?.fetched_at ? new Date(state.data.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  return <div className="tc-workspace" aria-busy={state.loading}>
    <div className="tc-toolbar"><a href="/admin/projects"><ArrowLeft size={15} />All projects</a><div><span>{state.loading ? 'Fetching snapshot' : updated ? `Fetched ${updated}` : 'Awaiting connection'}</span><button onClick={refresh} disabled={state.loading} aria-label="Refresh Trade City"><RefreshCw size={17} className={state.loading ? 'spin' : ''} /></button><button onClick={lock}><LockKeyhole size={15} />Lock</button></div></div>
    <header className="tc-heading"><div><h2>Every move.<br /><em>In perspective.</em></h2><p>Your Trade City portfolio, from a single vantage point.</p></div><label>Account<select value={broker} onChange={(event) => setBroker(event.target.value)}>{[['paper','Paper account'],['alpaca','Alpaca'],['coinbase','Coinbase'],['kraken','Kraken'],['oanda','OANDA'],['robinhood','Robinhood'],['webull','Webull']].map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label></header>
    {failure && <div className="project-error tc-connection-error" role="alert"><CircleAlert size={20} /><div><strong>We couldn’t load the complete picture.</strong><p>{failure}</p></div><button onClick={refresh} disabled={state.loading}>Try again</button></div>}
    <div className="tc-layout">
      <section className="tc-performance">
        <header><div><h3>Realized performance</h3><p>Cumulative profit and loss on closed trades</p></div><div className="tc-periods" aria-label="Performance period">{[['today','1D'],['7d','1W'],['30d','1M'],['90d','3M'],['all','All']].map(([value,label]) => <button key={value} onClick={() => setPeriod(value)} aria-pressed={period === value}>{label}</button>)}</div></header>
        <div className="tc-performance-value"><strong>{money(reportReadable ? report.net_pnl : null, report?.currency)}</strong><span>{broker === 'paper' ? 'Paper trading' : 'Broker report'}{report?.currency ? ` · ${report.currency}` : ''}</span></div>
        {state.loading ? <div className="tc-chart-empty" role="status"><RefreshCw className="spin" /><strong>Reading your performance</strong></div> : <PerformanceChart report={points} />}
        <div className="tc-performance-stats"><div><span>Win rate</span><strong>{percent(reportReadable ? report.win_rate : null)}</strong></div><div><span>Closed trades</span><strong>{reportReadable ? report.trade_count : '—'}</strong></div><div><span>Max drawdown</span><strong>{money(reportReadable && report.drawdown_state !== 'unavailable' ? report.max_drawdown : null, report?.currency)}</strong></div></div>
        {report && (!report.cost_evidence_complete || report.realization_state === 'partial' || !reportReadable) && <p className="tc-evidence-note"><CircleAlert size={14} />{!reportReadable ? 'Order history is unavailable. Performance cannot be verified.' : report.realization_state === 'partial' ? 'Some trade evidence is missing. These values are partial.' : 'Trading costs are not fully reconciled; this is not a net-profit verdict.'}</p>}
      </section>
      <aside className="tc-side">
        <section className="tc-portfolio"><Wallet size={21} /><h3>Open portfolio</h3><strong>{money(portfolio?.total_market_value, currency)}</strong><span>Market value{portfolio?.pricing_complete === false ? ' · Partially priced' : ''}</span><dl><div><dt>Cost basis</dt><dd>{money(portfolio?.total_cost_basis, currency)}</dd></div><div><dt>Unrealized P&amp;L</dt><dd className={numberOrNull(portfolio?.total_unrealized_pnl) < 0 ? 'tc-negative' : ''}>{money(portfolio?.total_unrealized_pnl, currency)}</dd></div><div><dt>Open positions</dt><dd>{portfolio ? positions.length : '—'}</dd></div></dl></section>
        <section className="tc-nova"><div><Radio size={20} /><span className={`tc-runtime-state${nova?.alive === true ? ' is-online' : ''}`}>{nova ? nova.alive === true ? 'Reporting' : 'Not reporting' : 'Unverified'}</span></div><h3>Nova, in view.</h3><p>{nova?.alive === true ? 'The configured backend reports Nova’s runtime as active.' : 'Nova’s runtime status will appear here when the backend can verify it.'}</p><span>Runtime visibility only. No orders are placed from this workspace.</span></section>
      </aside>
      <section className="tc-positions"><header><div><h3>Your positions</h3><p>Open exposure across the selected account</p></div><label><span className="portal-sr-only">Filter positions</span><input type="search" placeholder="Find a symbol" value={search} onChange={(event) => setSearch(event.target.value)} /></label></header><div className="tc-table-scroll"><table><thead><tr><th scope="col">Asset</th><th scope="col">Quantity</th><th scope="col">Market value</th><th scope="col">Unrealized P&amp;L</th><th scope="col">Return</th></tr></thead><tbody>{visiblePositions.map((position) => <tr key={position.symbol}><th scope="row"><span className="tc-symbol">{position.symbol.slice(0,2)}</span>{position.symbol}</th><td>{numberOrNull(position.quantity)?.toLocaleString('en-US', { maximumFractionDigits: 8 }) ?? '—'}</td><td>{money(position.market_value,currency)}</td><td className={numberOrNull(position.unrealized_pnl) < 0 ? 'tc-negative' : ''}>{money(position.unrealized_pnl,currency)}</td><td>{percent(position.unrealized_pnl_pct)}</td></tr>)}</tbody></table></div>{!visiblePositions.length && <div className="tc-position-empty"><Wallet size={22} /><strong>{search ? 'No matching positions' : portfolio ? 'No open positions in this account' : 'Your positions will appear here'}</strong><span>{search ? 'Try a different symbol.' : portfolio ? 'Choose another account to explore its positions.' : 'A verified backend connection is required to load your holdings.'}</span></div>}</section>
    </div>
    <footer className="tc-footer"><span><ShieldCheck size={14} />Protected project workspace</span><a href="/admin/projects/access">Manage access <ArrowUpRight size={14} /></a></footer>
  </div>;
}
