import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useThemeMode } from './ThemeContext';

export default function CTA() {
  const { isDark } = useThemeMode();

  return (
    <section className={`relative py-36 px-6 overflow-hidden ${isDark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className={isDark ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-r from-orange-500/20 via-blue-600/20 to-orange-500/20 rounded-full blur-[100px]' : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-r from-orange-200 via-blue-200 to-orange-200 rounded-full blur-[100px]'}
        />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <div className={isDark ? 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-10' : 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 border border-slate-200 backdrop-blur-md mb-10'}>
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className={isDark ? 'text-sm text-slate-200 font-semibold tracking-wide' : 'text-sm text-slate-700 font-semibold tracking-wide'}>Let's Work Together</span>
          </div>

          <h2 className={isDark ? 'text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight' : 'text-5xl md:text-7xl font-extrabold text-slate-950 mb-6 leading-[1.05] tracking-tight'}>
            Ready for a More
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">World-Class Presence?</span>
          </h2>

          <p className={isDark ? 'text-xl text-slate-400 max-w-2xl mx-auto mb-16 leading-relaxed' : 'text-xl text-slate-600 max-w-2xl mx-auto mb-16 leading-relaxed'}>
            Let’s create something refined, memorable, and commercially powerful.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-lg mx-auto">
          <div className="relative">
            <div className={isDark ? 'absolute inset-0 bg-gradient-to-br from-orange-500/20 to-blue-600/15 rounded-3xl blur-2xl' : 'absolute inset-0 bg-gradient-to-br from-orange-200 to-blue-200 rounded-3xl blur-2xl'} />
            <div className={isDark ? 'relative bg-white/[0.05] backdrop-blur-md border border-white/[0.08] rounded-3xl p-8 overflow-hidden' : 'relative bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-8 overflow-hidden shadow-sm'}>
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 to-blue-500" />
              <div className="flex flex-col gap-4">
                <Input type="email" placeholder="Enter your email address" className={isDark ? 'bg-white/[0.04] border-white/10 text-white placeholder:text-slate-500 h-14 text-base rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500' : 'bg-white border-slate-200 text-slate-950 placeholder:text-slate-400 h-14 text-base rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500'} />
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white h-14 text-base rounded-xl shadow-xl">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" className={isDark ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl' : 'border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl'}>
                  <Mail className="mr-2 w-4 h-4" />
                  Email Us
                </Button>
                <Button variant="outline" className={isDark ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl' : 'border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl'}>
                  <MessageSquare className="mr-2 w-4 h-4" />
                  Live Chat
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}