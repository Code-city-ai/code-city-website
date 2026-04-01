import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeMode } from './ThemeContext';

const statItems = [
  { number: '100+', label: 'Projects Delivered' },
  { number: '50+', label: 'Happy Clients' },
  { number: '99%', label: 'Satisfaction Rate' },
  { number: '24/7', label: 'Support Available' },
];

export default function Hero() {
  const { isDark } = useThemeMode();

  return (
    <div className={`relative min-h-screen flex items-center justify-center overflow-hidden ${isDark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80"
          alt="Modern workspace"
          className="h-full w-full object-cover"
        />
      </div>
      <div className={isDark ? 'absolute inset-0 bg-[#07111f]/78' : 'absolute inset-0 bg-white/72'} />
      <div className={isDark ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,125,192,0.22),transparent_35%)]' : 'absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,125,192,0.14),transparent_35%)]'} />
      <div className={isDark ? 'absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(245,80,41,0.18),transparent_32%)]' : 'absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(245,80,41,0.12),transparent_32%)]'} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-40 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={isDark ? 'inline-flex items-center px-5 py-2.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl mb-10' : 'inline-flex items-center px-5 py-2.5 rounded-full bg-white/85 border border-white/70 backdrop-blur-xl mb-10 shadow-sm'}
        >
          <span className={isDark ? 'text-sm text-slate-100 font-medium tracking-[0.18em] uppercase' : 'text-sm text-slate-700 font-medium tracking-[0.18em] uppercase'}>Pushing the Envelope of Technology</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className={isDark ? 'text-6xl md:text-8xl lg:text-9xl font-extrabold mb-8 leading-[1.02] tracking-tight text-white' : 'text-6xl md:text-8xl lg:text-9xl font-extrabold mb-8 leading-[1.02] tracking-tight text-slate-950'}
        >
          <span className={isDark ? 'text-[#f55029]' : 'text-[#f55029]'}>
            Build the Future
          </span>
          <br />
          <span>With CodeCity</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className={isDark ? 'text-xl md:text-2xl text-slate-400 mb-14 max-w-3xl mx-auto leading-relaxed' : 'text-xl md:text-2xl text-slate-600 mb-14 max-w-3xl mx-auto leading-relaxed'}
        >
          World-class software development and marketing solutions.
          <br className="hidden md:block" />
          <span className="text-[#147dc0] font-semibold">
            Efficient. Affordable. Exceptional.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24"
        >
          <Button size="lg" className="bg-[#f55029] hover:bg-[#f9761b] text-white px-10 py-6 text-lg rounded-full shadow-xl">
            Start Your Project
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className={isDark ? 'border-white/10 text-slate-200 hover:bg-white/5 px-10 py-6 text-lg rounded-full' : 'border-slate-200 text-slate-700 hover:bg-white px-10 py-6 text-lg rounded-full'}>
            Explore Services
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {statItems.map((stat, idx) => (
            <motion.div key={idx} whileHover={{ scale: 1.04, y: -4 }} className="relative group cursor-default">
              <div className={isDark ? 'relative bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-[28px] p-6 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.18)]' : 'relative bg-white/88 backdrop-blur-xl border border-white/70 rounded-[28px] p-6 transition-all duration-500 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'}>
                <div className="text-4xl md:text-5xl font-extrabold text-[#147dc0] mb-2 tracking-tight">
                  {stat.number}
                </div>
                <div className={isDark ? 'text-sm text-slate-500 font-medium tracking-wide' : 'text-sm text-slate-500 font-medium tracking-wide'}>{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} className={isDark ? 'absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500' : 'absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400'}>
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </div>
  );
}