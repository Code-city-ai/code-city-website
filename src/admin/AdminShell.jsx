import React, { useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import Brand from '@/components/Brand';
import { useAdminAuth } from '@/admin/AuthProvider';

const navigation = [
  { label: 'Overview', href: '/admin', icon: BriefcaseBusiness, exact: true },
  { label: 'Inquiries', href: '/admin/inquiries', icon: Inbox },
  { label: 'Clients', href: '/admin/clients', icon: Building2 },
  { label: 'Marketing', href: '/admin/marketing', icon: BarChart3 },
  { label: 'System', href: '/admin/settings', icon: Settings },
];

export default function AdminShell({ title, eyebrow, children }) {
  const { profile, signOut } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = window.location.pathname.replace(/\/+$/, '') || '/admin';

  const active = (item) => item.exact ? path === item.href : path.startsWith(item.href);

  return (
    <div className={`portal-shell${collapsed ? ' portal-shell-collapsed' : ''}`}>
      <aside className={`portal-sidebar${mobileOpen ? ' is-open' : ''}`}>
        <div className="portal-sidebar-top">
          <Brand href="/admin" className="portal-brand" />
          <button className="portal-icon-button portal-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close portal navigation"><X /></button>
        </div>

        <nav className="portal-navigation" aria-label="Client platform">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.href} href={item.href} aria-current={active(item) ? 'page' : undefined} title={collapsed ? item.label : undefined}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="portal-sidebar-bottom">
          <div className="portal-profile">
            <span>{profile.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}</span>
            <div><strong>{profile.full_name}</strong><small>{profile.role}</small></div>
          </div>
          <button type="button" onClick={signOut} className="portal-signout"><LogOut aria-hidden="true" /><span>Sign out</span></button>
          <button type="button" className="portal-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>
      </aside>

      <div className="portal-workspace">
        <header className="portal-topbar">
          <button className="portal-icon-button portal-menu-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Open portal navigation"><Menu /></button>
          <div><span>{eyebrow}</span><h1>{title}</h1></div>
          <div className="portal-environment"><i />Live workspace</div>
        </header>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}
