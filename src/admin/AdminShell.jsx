import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LogOut,
  LayoutGrid,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import Brand from '@/components/Brand';
import { useAdminAuth } from '@/admin/AuthProvider';

const navigation = [
  { label: 'Projects', href: '/admin/projects', icon: LayoutGrid },
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
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia('(max-width: 980px)').matches);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const path = window.location.pathname.replace(/\/+$/, '') || '/admin';

  const active = (item) => item.href === '/admin/projects' ? (path === '/sign-in' || path.startsWith('/admin/projects')) : item.exact ? path === item.href : path.startsWith(item.href);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 980px)');
    const handleChange = (event) => {
      const activeElement = document.activeElement;
      const focusWasInSidebar = activeElement instanceof Element && sidebarRef.current?.contains(activeElement);
      const focusWasOnMenu = activeElement === menuButtonRef.current;
      setMobileLayout(event.matches);
      setMobileOpen(false);
      if (event.matches) setCollapsed(false);
      if (event.matches && focusWasInSidebar) {
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      } else if (!event.matches && (focusWasInSidebar || focusWasOnMenu)) {
        requestAnimationFrame(() => sidebarRef.current?.querySelector('[aria-current="page"], a[href]')?.focus());
      }
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!mobileLayout || !mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = menuButtonRef.current;
    const sidebar = sidebarRef.current;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll(
        'a[href], button:not([disabled])',
      )).filter((element) => element.getClientRects().length > 0 && window.getComputedStyle(element).visibility !== 'hidden');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const visibleReturnTarget = returnFocusTarget?.getClientRects().length
        ? returnFocusTarget
        : sidebar?.querySelector('[aria-current="page"], a[href]');
      visibleReturnTarget?.focus();
    };
  }, [mobileLayout, mobileOpen]);

  return (
    <div className={`portal-shell${collapsed ? ' portal-shell-collapsed' : ''}`}>
      <aside
        id="code-city-portal-navigation"
        ref={sidebarRef}
        className={`portal-sidebar${mobileOpen ? ' is-open' : ''}`}
        aria-hidden={mobileLayout && !mobileOpen ? true : undefined}
        aria-label={mobileLayout ? 'Code City portal navigation' : undefined}
        aria-modal={mobileLayout && mobileOpen ? true : undefined}
        inert={mobileLayout && !mobileOpen}
        role={mobileLayout ? 'dialog' : undefined}
      >
        <div className="portal-sidebar-top">
          <Brand href="/admin/projects" className="portal-brand" />
          <button ref={closeButtonRef} className="portal-icon-button portal-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close portal navigation"><X /></button>
        </div>

        <nav className="portal-navigation" aria-label="Code City workspace">
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
          <button type="button" onClick={signOut} className="portal-signout" aria-label="Sign out of Code City" title={collapsed ? 'Sign out' : undefined}><LogOut aria-hidden="true" /><span>Sign out</span></button>
          <button type="button" className="portal-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </div>
      </aside>

      {mobileLayout && mobileOpen && <div className="portal-sidebar-backdrop" aria-hidden="true" onMouseDown={() => setMobileOpen(false)} />}

      <div className="portal-workspace" aria-hidden={mobileLayout && mobileOpen ? true : undefined} inert={mobileLayout && mobileOpen}>
        <header className="portal-topbar">
          <button ref={menuButtonRef} className="portal-icon-button portal-menu-button" type="button" onClick={() => setMobileOpen(true)} aria-label="Open portal navigation" aria-expanded={mobileOpen} aria-controls="code-city-portal-navigation"><Menu /></button>
          <div><span>{eyebrow}</span><h1>{title}</h1></div>
          <div className="portal-environment"><i />Secure workspace</div>
        </header>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}
