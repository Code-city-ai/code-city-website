
import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <div className="min-h-screen bg-slate-950">
      <style>{`
        :root {
          --primary-purple: #7C3AED;
          --primary-orange: #F97316;
          --primary-blue: #3B82F6;
        }
        
        * {
          scroll-behavior: smooth;
        }
        
        body {
          background: #020617;
          color: white;
        }
      `}</style>

      {/* Header */}
      <motion.header 
        style={{ backgroundColor: `rgba(2, 6, 23, ${headerOpacity})` }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 backdrop-blur-lg"
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
              <a href="#services" className="text-gray-400 hover:text-white transition-colors">Services</a>
              <a href="#why-us" className="text-gray-400 hover:text-white transition-colors">Why Us</a>
              <a href="#technology" className="text-gray-400 hover:text-white transition-colors">Technology</a>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white rounded-full"
              >
                Get Started
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
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
              <a href="#services" className="text-gray-400 hover:text-white transition-colors py-2">Services</a>
              <a href="#why-us" className="text-gray-400 hover:text-white transition-colors py-2">Why Us</a>
              <a href="#technology" className="text-gray-400 hover:text-white transition-colors py-2">Technology</a>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white rounded-full w-full"
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
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f5957b7a83695690b9ef26/b9619430c_codecity_logo.png"
                alt="CodeCity Logo"
                className="h-40 md:h-48 w-auto mb-4"
              />
              <p className="text-gray-400 text-sm">
                Pushing the envelope of technology to build tomorrow's solutions today.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Software Development</li>
                <li>Digital Marketing</li>
                <li>Web Applications</li>
                <li>Mobile Apps</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>About Us</li>
                <li>Our Team</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>LinkedIn</li>
                <li>Twitter</li>
                <li>GitHub</li>
                <li>Instagram</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-center text-sm text-gray-500">
            <p>© 2024 CodeCity. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
