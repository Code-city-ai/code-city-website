import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider } from '@/components/landing/ThemeContext';

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('codecity-theme') || 'dark');
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  useEffect(() => {
    localStorage.setItem('codecity-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <div className={isDark ? 'min-h-screen bg-[#07111f]' : 'min-h-screen bg-[#f7fafc]'}>
      <style>{`
        :root {
          --primary-orange: #f97316;
          --primary-blue: #2563eb;
          --dark-bg: #07111f;
          --light-bg: #f7fafc;
        }

        * {
          scroll-behavior: smooth;
        }

        body {
          background: ${isDark ? '#07111f' : '#f7fafc'};
          color: ${isDark ? '#ffffff' : '#0f172a'};
        }
      `}</style>

      <ThemeProvider theme={theme}>
      {/* Header */}
      <motion.header 
        style={{ backgroundColor: isDark ? `rgba(7, 17, 31, ${headerOpacity})` : `rgba(247, 250, 252, ${headerOpacity})` }}
        className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl ${isDark ? 'border-white/10' : 'border-slate-200/80'}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f5957b7a83695690b9ef26/b9619430c_codecity_logo.png"
                alt="CodeCity Logo"
                className="h-32 md:h-40 w-auto"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#services" className={isDark ? 'text-slate-300 hover:text-white transition-colors' : 'text-slate-600 hover:text-slate-950 transition-colors'}>Services</a>
              <a href="#why-us" className={isDark ? 'text-slate-300 hover:text-white transition-colors' : 'text-slate-600 hover:text-slate-950 transition-colors'}>Why Us</a>
              <a href="#technology" className={isDark ? 'text-slate-300 hover:text-white transition-colors' : 'text-slate-600 hover:text-slate-950 transition-colors'}>Technology</a>
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white rounded-full shadow-lg"
              >
                Get Started
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 pb-4 flex flex-col gap-4"
            >
              <a href="#services" className={isDark ? 'text-slate-300 hover:text-white transition-colors py-2' : 'text-slate-600 hover:text-slate-950 transition-colors py-2'}>Services</a>
              <a href="#why-us" className={isDark ? 'text-slate-300 hover:text-white transition-colors py-2' : 'text-slate-600 hover:text-slate-950 transition-colors py-2'}>Why Us</a>
              <a href="#technology" className={isDark ? 'text-slate-300 hover:text-white transition-colors py-2' : 'text-slate-600 hover:text-slate-950 transition-colors py-2'}>Technology</a>
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 transition-colors ${isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDark ? 'Light Theme' : 'Dark Theme'}
              </button>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white rounded-full w-full"
              >
                Get Started
              </Button>
            </motion.nav>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className={`border-t py-12 px-6 ${isDark ? 'bg-[#07111f] border-white/10' : 'bg-[#f7fafc] border-slate-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f5957b7a83695690b9ef26/b9619430c_codecity_logo.png"
                alt="CodeCity Logo"
                className="h-40 md:h-48 w-auto mb-4"
              />
              <p className={isDark ? 'text-slate-400 text-sm' : 'text-slate-600 text-sm'}>
                Pushing the envelope of technology to build tomorrow's solutions today.
              </p>
            </div>
            
            <div>
              <h3 className={isDark ? 'text-white font-semibold mb-4' : 'text-slate-950 font-semibold mb-4'}>Services</h3>
              <ul className={isDark ? 'space-y-2 text-sm text-slate-400' : 'space-y-2 text-sm text-slate-600'}>
                <li>Software Development</li>
                <li>Digital Marketing</li>
                <li>Web Applications</li>
                <li>Mobile Apps</li>
              </ul>
            </div>
            
            <div>
              <h3 className={isDark ? 'text-white font-semibold mb-4' : 'text-slate-950 font-semibold mb-4'}>Company</h3>
              <ul className={isDark ? 'space-y-2 text-sm text-slate-400' : 'space-y-2 text-sm text-slate-600'}>
                <li>About Us</li>
                <li>Our Team</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            
            <div>
              <h3 className={isDark ? 'text-white font-semibold mb-4' : 'text-slate-950 font-semibold mb-4'}>Connect</h3>
              <ul className={isDark ? 'space-y-2 text-sm text-slate-400' : 'space-y-2 text-sm text-slate-600'}>
                <li>LinkedIn</li>
                <li>Twitter</li>
                <li>GitHub</li>
                <li>Instagram</li>
              </ul>
            </div>
          </div>
          
          <div className={`pt-8 border-t text-center text-sm ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
            <p>© 2024 CodeCity. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </ThemeProvider>
    </div>
  );
}