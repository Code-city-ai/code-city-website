import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Cpu, Database, Layers, Lock, Smartphone } from 'lucide-react';
import { useThemeMode } from './ThemeContext';

const technologies = [
  { icon: Cpu, name: 'AI & Machine Learning' },
  { icon: Cloud, name: 'Cloud Infrastructure' },
  { icon: Smartphone, name: 'Mobile First' },
  { icon: Lock, name: 'Enterprise Security' },
  { icon: Database, name: 'Big Data Analytics' },
  { icon: Layers, name: 'Microservices' },
];

const metrics = [
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '<100ms', label: 'Response Time' },
  { value: '50M+', label: 'Requests Handled' },
];

export default function TechShowcase() {
  const { isDark } = useThemeMode();

  return (
    <section id="technology" className={`relative py-36 px-6 overflow-hidden ${isDark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="absolute top-0 inset-x-0 h-px bg-[#f9761b]/30" />
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=80"
          alt="Technology background"
          className="h-full w-full object-cover"
        />
      </div>
      <div className={isDark ? 'absolute inset-0 bg-[#07111f]/90' : 'absolute inset-0 bg-[#f7fafc]/92'} />

      <div className="relative max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
          <span className={isDark ? 'inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-orange-400 text-sm font-semibold tracking-widest uppercase mb-6' : 'inline-block px-5 py-2 rounded-full bg-white/80 border border-slate-200 text-orange-500 text-sm font-semibold tracking-widest uppercase mb-6'}>
            Technology Stack
          </span>
          <h2 className={isDark ? 'text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight' : 'text-5xl md:text-6xl font-extrabold text-slate-950 mb-6 leading-tight tracking-tight'}>
            Powered by
            <br />
            <span className="text-[#147dc0]">Next-Gen Technology</span>
          </h2>
          <p className={isDark ? 'text-lg text-slate-400 max-w-xl mx-auto' : 'text-lg text-slate-600 max-w-xl mx-auto'}>
            We leverage cutting-edge tools and frameworks to build solutions that define tomorrow.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {technologies.map((tech, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.07 }} whileHover={{ y: -6, scale: 1.04 }} className="group relative">
              <div className={isDark ? 'relative bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-[24px] p-5 text-center transition-all duration-400 shadow-[0_20px_60px_rgba(0,0,0,0.18)]' : 'relative bg-white/88 backdrop-blur-xl border border-white/70 hover:border-white rounded-[24px] p-5 text-center transition-all duration-400 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'}>
                <div className="w-12 h-12 rounded-xl bg-[#147dc0] flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <tech.icon className="w-6 h-6 text-white" />
                </div>
                <p className={isDark ? 'text-xs text-slate-400 font-medium leading-snug' : 'text-xs text-slate-600 font-medium leading-snug'}>{tech.name}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative">
          <div className={isDark ? 'relative bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-[36px] p-12 md:p-16 overflow-hidden shadow-[0_28px_90px_rgba(0,0,0,0.24)]' : 'relative bg-white/90 backdrop-blur-xl border border-white/70 rounded-[36px] p-12 md:p-16 overflow-hidden shadow-[0_28px_90px_rgba(15,23,42,0.10)]'}>
            <div className="relative text-center">
              <h3 className={isDark ? 'text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight' : 'text-3xl md:text-4xl font-extrabold text-slate-950 mb-4 tracking-tight'}>
                Built for scale. Styled with precision.
              </h3>
              <p className={isDark ? 'text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed' : 'text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed'}>
                Every system is designed to feel premium while performing at a high level — fast, resilient, and ready for growth.
              </p>
              <div className="flex flex-wrap justify-center gap-12 md:gap-20">
                {metrics.map((m, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.06 }} className="text-center cursor-default">
                    <div className="text-5xl md:text-6xl font-extrabold text-[#f55029] mb-2 tracking-tight">{m.value}</div>
                    <div className={isDark ? 'text-sm text-slate-500 font-medium tracking-wide' : 'text-sm text-slate-500 font-medium tracking-wide'}>{m.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}