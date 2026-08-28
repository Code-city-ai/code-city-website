import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Building2, Mail, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, MetricCard, StatusTag, formatDate, formatMoney } from '@/admin/components';
import { loadClients } from '@/admin/lib/portal';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: true, error: null });
  const load = useCallback(() => {
    setState({ loading: true, error: null });
    loadClients()
      .then((rows) => { setClients(rows); setState({ loading: false, error: null }); })
      .catch((error) => setState({ loading: false, error }));
  }, []);

  useEffect(load, [load]);
  const filtered = useMemo(() => clients.filter((client) => `${client.display_name} ${client.company_name || ''} ${client.primary_email || ''}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);
  const projects = clients.flatMap((client) => client.client_projects || []);
  const pipeline = projects.filter((project) => !['completed', 'lost'].includes(project.status)).reduce((sum, project) => sum + Number(project.value || 0), 0);

  if (state.loading) return <LoadingState label="Loading client relationships" />;
  if (state.error) return <ErrorState error={state.error} retry={load} />;

  return (
    <div className="portal-page-stack">
      <section className="portal-metrics-grid portal-metrics-compact">
        <MetricCard eyebrow="Relationships" value={clients.length} detail="Total client records" accent />
        <MetricCard eyebrow="Active" value={clients.filter((client) => client.status === 'active').length} detail="Current clients" />
        <MetricCard eyebrow="Open projects" value={projects.filter((project) => !['completed', 'lost'].includes(project.status)).length} detail="Commercial + delivery" />
        <MetricCard eyebrow="Pipeline" value={formatMoney(pipeline)} detail="Recorded project value" />
      </section>

      <section className="clients-directory">
        <header><div><span>Relationship directory</span><h2>Clients and active pursuits.</h2></div><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients" /></label></header>
        {filtered.length ? <div className="clients-grid">{filtered.map((client) => {
          const clientProjects = client.client_projects || [];
          const primaryContact = (client.client_contacts || []).find((contact) => contact.is_primary) || client.client_contacts?.[0];
          return (
            <article className="client-card" key={client.id}>
              <div className="client-card-top"><span><Building2 /></span><StatusTag value={client.status} /></div>
              <h3>{client.display_name}</h3>
              <p>{client.company_name || 'Independent client'}</p>
              <div className="client-contact-line"><Mail />{primaryContact?.email || client.primary_email || 'No email recorded'}</div>
              <dl>
                <div><dt>Stage</dt><dd>{client.lifecycle_stage}</dd></div>
                <div><dt>Projects</dt><dd>{clientProjects.length}</dd></div>
                <div><dt>Last movement</dt><dd>{formatDate(client.updated_at)}</dd></div>
              </dl>
              <div className="client-projects">
                {clientProjects.slice(0, 3).map((project) => (
                  <div key={project.id}><span>{project.name}</span><StatusTag value={project.status} /><strong>{project.value ? formatMoney(project.value, project.currency) : 'Value pending'}</strong></div>
                ))}
                {!clientProjects.length && <span className="client-no-projects">No project has been opened yet.</span>}
              </div>
              {client.website && <a href={client.website} target="_blank" rel="noreferrer">Visit organization <ArrowUpRight /></a>}
            </article>
          );
        })}</div> : <EmptyState title="No client records yet" message="Qualify an inquiry and use Promote to client. The portal will create the relationship, primary contact, and first project together." href="/admin/inquiries" action="Open inquiries" />}
      </section>
    </div>
  );
}
