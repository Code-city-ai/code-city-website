import React, { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';

const navItems = [
  { label: 'Capabilities', href: '#services' },
  { label: 'Work', href: '#work' },
  { label: 'Approach', href: '#why-us' },
  { label: 'Technology', href: '#technology' },
];

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Code City home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand-name">CODE CITY</span>
    </a>
  );
}

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('codecity-theme') || 'dark');
  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem('codecity-theme', theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark, theme]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="site-shell" id="top">
        <header className="site-header">
          <div className="site-container header-inner">
            <Brand />

            <nav className="desktop-nav" aria-label="Primary navigation">
              {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
            </nav>

            <div className="header-actions">
              <button
                className="icon-button"
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </button>
              <a className="header-cta" href="#contact">Let&apos;s build</a>
              <button
                className="icon-button menu-button"
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </button>
            </div>
          </div>

        </header>

        {mobileMenuOpen && (
          <nav className="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">
            <div className="site-container mobile-nav-inner">
              {navItems.map((item, index) => (
                <a key={item.href} href={item.href} onClick={closeMenu}>
                  <span>{String(index + 1).padStart(2, '0')}</span>{item.label}
                </a>
              ))}
              <a className="mobile-nav-cta" href="#contact" onClick={closeMenu}>Start a project</a>
            </div>
          </nav>
        )}

        <main>{children}</main>

        <footer className="site-footer">
          <div className="site-container footer-inner">
            <Brand />
            <p>Strategy, design, engineering, and growth—under one roof.</p>
            <span>© {new Date().getFullYear()} Code City</span>
          </div>
        </footer>
    </div>
  );
}
