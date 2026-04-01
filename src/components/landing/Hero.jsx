import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeMode } from './ThemeContext';

function FloatingParticles({ isDark }) {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 8,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={isDark ? 'absolute rounded-full bg-blue-300/20' : 'absolute rounded-full bg-blue-500/20'}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-20, 20, -20], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

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
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.18, 1], rotate: [0, 50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className={isDark ? 'absolute top-[-10%] left-[-15%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]' : 'absolute top-[-10%] left-[-15%] w-[600px] h-[600px] bg-blue-300/30 rounded-full blur-[120px]'}
        />
        <motion.div
          animate={{ scale: [1, 1.28, 1], rotate: [0, -60, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          className={isDark ? 'absolute bottom-[-10%] right-[-15%] w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-[120px]' : 'absolute bottom-[-10%] right-[-15%] w-[600px] h-[600px] bg-orange-300/35 rounded-full blur-[120px]'}
        />
      </div>

      <div className={isDark ? 'absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:60px_60px]' : 'absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.06)_1px,transparent_1px)] bg-[size:60px_60px]'} />
      <FloatingParticles isDark={isDark} />
      <div className={isDark ? 'absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_40%,#07111f_100%)]' : 'absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_35%,#f7fafc_100%)]'} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-40 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={isDark ? 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-10 shadow-[0_0_30px_rgba(37,99,235,0.12)]' : 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 border border-slate-200 backdrop-blur-md mb-10 shadow-[0_10px_30px_rgba(15,23,42,0.06)]'}
        >
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span className={isDark ? 'text-sm text-slate-200 font-semibold tracking-wide' : 'text-sm text-slate-700 font-semibold tracking-wide'}>Premium software & marketing studio</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className={isDark ? 'text-6xl md:text-8xl lg:text-9xl font-extrabold mb-8 leading-[1.02] tracking-tight text-white' : 'text-6xl md:text-8xl lg:text-9xl font-extrabold mb-8 leading-[1.02] tracking-tight text-slate-950'}
        >
          <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-blue-500 bg-clip-text text-transparent">
            Chic Digital
          </span>
          <br />
          <span>Experiences</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className={isDark ? 'text-xl md:text-2xl text-slate-400 mb-14 max-w-3xl mx-auto leading-relaxed' : 'text-xl md:text-2xl text-slate-600 mb-14 max-w-3xl mx-auto leading-relaxed'}
        >
          World-class software development and marketing for ambitious brands.
          <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent font-semibold">
            Refined. Strategic. Built to perform.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24"
        >
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white px-10 py-6 text-lg rounded-full shadow-xl">
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
              <div className={isDark ? 'absolute inset-0 bg-gradient-to-br from-orange-500/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500' : 'absolute inset-0 bg-gradient-to-br from-orange-200 to-blue-200 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500'} />
              <div className={isDark ? 'relative bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-500' : 'relative bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-6 transition-all duration-500 shadow-sm'}>
                <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
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