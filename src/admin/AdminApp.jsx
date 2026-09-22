import React, { useEffect } from 'react';
import { LoaderCircle, LogOut, ShieldX } from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from '@/admin/AuthProvider';
import AdminShell from '@/admin/AdminShell';
import Dashboard from '@/admin/pages/Dashboard';
import Inquiries from '@/admin/pages/Inquiries';
import Clients from '@/admin/pages/Clients';
import Marketing from '@/admin/pages/Marketing';
import Settings from '@/admin/pages/Settings';
import Login from '@/admin/pages/Login';
import PasswordSetup from '@/admin/pages/PasswordSetup';
import '@/admin/admin.css';
import '@/admin/projects/projects.css';
import Projects from '@/admin/projects/Projects';
import ProjectWorkspace from '@/admin/projects/ProjectWorkspace';
import TradeCity from '@/admin/projects/TradeCity';

const routes = {
  '/admin': { title: 'Overview', eyebrow: 'Code City / Client operations', Component: Dashboard },
  '/admin/inquiries': { title: 'Inquiry desk', eyebrow: 'Demand / Qualification', Component: Inquiries },
  '/admin/clients': { title: 'Client directory', eyebrow: 'Relationships / Delivery', Component: Clients },
  '/admin/marketing': { title: 'Marketing intelligence', eyebrow: 'Attribution / Return', Component: Marketing },
  '/admin/settings': { title: 'System state', eyebrow: 'Access / Integrations', Component: Settings },
};

function PortalRouter({ pathname }) {
  const { loading, session, profile, authError, signOut } = useAdminAuth();
  if (loading) return <div className="portal-auth-loading"><LoaderCircle className="spin" /><span>Securing the workspace</span></div>;
  if (!session) return <Login />;
  if (pathname === '/admin/set-password') return <PasswordSetup />;
  if (!profile) {
    return (
      <main className="portal-access-denied">
        <ShieldX />
        <span>Access boundary</span>
        <h1>Identity verified. Workspace access denied.</h1>
        <p>{authError}</p>
        <button type="button" onClick={signOut}><LogOut />Sign out</button>
        <a href="/">Return to codecity.ai</a>
      </main>
    );
  }

  if (pathname === '/sign-in' || pathname === '/admin/login' || pathname.startsWith('/admin/projects')) {
    const tradeCity = pathname === '/admin/projects/trade-city';
    return <AdminShell title={tradeCity ? 'Trade City' : 'Your projects'} eyebrow="Code City / Workspace"><ProjectWorkspace settings={pathname === '/admin/projects/access'}>{tradeCity ? <TradeCity /> : <Projects />}</ProjectWorkspace></AdminShell>;
  }

  const route = routes[pathname] || routes['/admin'];
  const { Component } = route;
  return <AdminShell title={route.title} eyebrow={route.eyebrow}><Component /></AdminShell>;
}

export default function AdminApp({ pathname }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${pathname === '/admin/projects/trade-city' ? 'Trade City' : pathname.startsWith('/admin/projects') ? 'Projects' : pathname === '/sign-in' || pathname === '/admin/login' ? 'Sign in' : 'Workspace'} · Code City`;
    return () => { document.title = previousTitle; };
  }, [pathname]);
  return <AdminAuthProvider><PortalRouter pathname={pathname} /></AdminAuthProvider>;
}
