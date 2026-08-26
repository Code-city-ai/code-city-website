import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react';

const navItems = [
  { label: 'Capabilities', href: '/#services' },
  { label: 'Work', href: '/#work' },
  { label: 'Approach', href: '/#why-us' },
  { label: 'Technology', href: '/#technology' },
  { label: 'Support', href: '/support', page: 'support' },
];

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Code City home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand-name">CODE CITY</span>
    </a>
  );
}

export default function Layout({ children, currentPage = 'home', isInnerPage = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);
  const resolveNavHref = (href) => (isInnerPage || !href.startsWith('/#') ? href : href.slice(1));

  return (
    <div className="site-shell" id="top">
        <header className={`site-header${isScrolled ? ' is-scrolled' : ''}`}>
          <div className="site-container header-inner">
            <Brand />

            <nav className="desktop-nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={resolveNavHref(item.href)}
                  aria-current={item.page === currentPage ? 'page' : undefined}
                >
                  {item.label}
                </a>
              ))}
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
              <a className="header-cta" href="/contact" aria-current={currentPage === 'contact' ? 'page' : undefined}>Let&apos;s build</a>
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
                <a
                  key={item.href}
                  href={resolveNavHref(item.href)}
                  onClick={closeMenu}
                  aria-current={item.page === currentPage ? 'page' : undefined}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>{item.label}
                </a>
              ))}
              <a className="mobile-nav-cta" href="/contact" onClick={closeMenu}>Start a project</a>
            </div>
          </nav>
        )}

        <main>{children}</main>

        <footer className="site-footer" aria-labelledby="footer-title">
          <div className="site-container footer-shell">
            <div className="footer-brand-line">
              <Brand />
              <span>Independent digital product studio</span>
            </div>

            <div className="footer-main">
              <div className="footer-statement">
                <span>New business</span>
                <h2 id="footer-title">Have a serious idea?</h2>
                <a href="/contact">
                  Contact Code City
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </div>

              <nav className="footer-directory" aria-label="Footer navigation">
                <div>
                  <span>Company</span>
                  <a href="/careers" aria-current={currentPage === 'careers' ? 'page' : undefined}>Careers</a>
                </div>
                <div>
                  <span>Support</span>
                  <a href="/support" aria-current={currentPage === 'support' ? 'page' : undefined}>Product support</a>
                </div>
                <div>
                  <span>Legal</span>
                  <a href="/privacy" aria-current={currentPage === 'privacy' ? 'page' : undefined}>Privacy policy</a>
                  <a href="/account-deletion" aria-current={currentPage === 'account-deletion' ? 'page' : undefined}>Account deletion</a>
                </div>
              </nav>
            </div>

            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} Code City</span>
              <span>Serious ideas. Remarkable software.</span>
              <div>
                <a href="#top">Back to top ↑</a>
              </div>
            </div>
          </div>
        </footer>
    </div>
  );
}
