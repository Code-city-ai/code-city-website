import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statItems = [
  { number: '100+', label: 'Projects Delivered' },
  { number: '50+', label: 'Happy Clients' },
  { number: '99%', label: 'Satisfaction Rate' },
  { number: '24/7', label: 'Support Available' },
];

function FloatingParticles({ dark }) {
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
          className={`absolute rounded-full ${dark ? 'bg-blue-300/30' : 'bg-blue-500/20'}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-20, 20, -20], opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function Hero() {
  const dark = document.documentElement.classList.contains('dark');

  return (
    <section className={`relative min-h-screen flex items-center justify-center overflow-hidden ${dark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.18, 1], rotate: [0, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute -top-20 -left-24 w-[34rem] h-[34rem] rounded-full blur-[120px] ${dark ? 'bg-orange-500/20' : 'bg-orange-300/40'}`}
        />
        <motion.div
          animate={{ scale: [1, 1.22, 1], rotate: [0, -50, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute -bottom-24 -right-24 w-[36rem] h-[36rem] rounded-full blur-[130px] ${dark ? 'bg-blue-600/20' : 'bg-blue-300/40'}`}
        />
      </div>

      <div className={`absolute inset-0 ${dark ? 'bg-[linear-gradient(rgba(37,99,235,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.06)_1px,transparent_1px)]' : 'bg-[linear-gradient(rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)]'} bg-[size:64px_64px]`} />
      <FloatingParticles dark={dark} />

      <div className={`absolute inset-0 ${dark ? 'bg-[radial-gradient(ellipse_80%_65%_at_50%_50%,transparent_35%,#07111f_100%)]' : 'bg-[radial-gradient(ellipse_80%_65%_at_50%_50%,transparent_35%,#f7fafc_100%)]'}`} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-40 pb-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border backdrop-blur-md mb-10 ${dark ? 'bg-white/5 border-white/10 text-blue-100' : 'bg-white/80 border-slate-200 text-slate-700'} shadow-sm`}
        >
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold tracking-[0.2em] uppercase">World-Class Digital Execution</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className={`text-6xl md:text-8xl lg:text-[8.5rem] font-extrabold mb-8 leading-[0.98] tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}
        >
          Chic, Modern,
          <br />
          <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-blue-600 bg-clip-text text-transparent">
            Built to Lead
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`text-xl md:text-2xl mb-14 max-w-3xl mx-auto leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}
        >
          Premium software, marketing, and digital experiences crafted with precision,
          elegance, and performance at the core.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24"
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white px-10 py-6 text-lg rounded-full shadow-[0_20px_60px_rgba(37,99,235,0.25)]"
          >
            Start Your Project
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={`px-10 py-6 text-lg rounded-full ${dark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}`}
          >
            Explore Services
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {statItems.map((stat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4, scale: 1.03 }}
              className={`rounded-3xl p-6 border backdrop-blur-md ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/80 border-slate-200'} shadow-sm`}
            >
              <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className={`text-sm font-medium tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
        <span className="text-xs tracking-[0.3em] uppercase">Scroll</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </div>
    </section>
  );
}