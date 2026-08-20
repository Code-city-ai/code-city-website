import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const headerRef = useRef(null);
  const isScrolledRef = useRef(false);
  const activeSectionRef = useRef('');
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
    let frameId;

    const updateHeader = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = documentHeight > 0 ? Math.min(window.scrollY / documentHeight, 1) : 0;
      headerRef.current?.style.setProperty('--page-progress', progress);

      const nextScrolled = window.scrollY > 24;
      if (isScrolledRef.current !== nextScrolled) {
        isScrolledRef.current = nextScrolled;
        setIsScrolled(nextScrolled);
      }

      const sectionOffset = window.scrollY + 180;
      const nextSection = [...navItems]
        .reverse()
        .find((item) => {
          const section = document.querySelector(item.href);
          return section ? section.getBoundingClientRect().top + window.scrollY <= sectionOffset : false;
        })
        ?.href.slice(1) || '';

      if (activeSectionRef.current !== nextSection) {
        activeSectionRef.current = nextSection;
        setActiveSection(nextSection);
      }
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = undefined;
        updateHeader();
      });
    };

    updateHeader();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="site-shell" id="top">
        <header ref={headerRef} className={`site-header${isScrolled ? ' site-header-scrolled' : ''}`}>
          <div className="site-container header-shell">
            <div className="header-brand-block">
              <Brand />
              <span className="header-discipline"><i /> Product engineering</span>
            </div>

            <nav className="desktop-nav" aria-label="Primary navigation">
              {navItems.map((item, index) => (
                <a
                  key={item.href}
                  className={activeSection === item.href.slice(1) ? 'is-active' : ''}
                  href={item.href}
                  aria-current={activeSection === item.href.slice(1) ? 'location' : undefined}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
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
              <a className="header-cta" href="#contact">
                Let&apos;s build
                <ArrowUpRight aria-hidden="true" />
              </a>
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
            <span className="header-scan" aria-hidden="true" />
            <span className="header-progress" aria-hidden="true" />
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
