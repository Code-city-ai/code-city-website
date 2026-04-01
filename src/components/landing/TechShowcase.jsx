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
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
      <div className={isDark ? 'absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]' : 'absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]'} />

      <div className="relative max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
          <span className={isDark ? 'inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-orange-400 text-sm font-semibold tracking-widest uppercase mb-6' : 'inline-block px-5 py-2 rounded-full bg-white/80 border border-slate-200 text-orange-500 text-sm font-semibold tracking-widest uppercase mb-6'}>
            Technology Stack
          </span>
          <h2 className={isDark ? 'text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight' : 'text-5xl md:text-6xl font-extrabold text-slate-950 mb-6 leading-tight tracking-tight'}>
            Powered by
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">Modern Technology</span>
          </h2>
          <p className={isDark ? 'text-lg text-slate-400 max-w-xl mx-auto' : 'text-lg text-slate-600 max-w-xl mx-auto'}>
            Tools, systems, and architecture selected for sophistication, speed, and long-term growth.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {technologies.map((tech, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: idx * 0.07 }} whileHover={{ y: -6, scale: 1.04 }} className="group relative">
              <div className={isDark ? 'absolute inset-0 bg-gradient-to-br from-orange-500/15 to-blue-600/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500' : 'absolute inset-0 bg-gradient-to-br from-orange-200 to-blue-200 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500'} />
              <div className={isDark ? 'relative bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:border-white/20 rounded-2xl p-5 text-center transition-all duration-400' : 'relative bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-slate-300 rounded-2xl p-5 text-center transition-all duration-400 shadow-sm'}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <tech.icon className="w-6 h-6 text-white" />
                </div>
                <p className={isDark ? 'text-xs text-slate-400 font-medium leading-snug' : 'text-xs text-slate-600 font-medium leading-snug'}>{tech.name}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative">
          <div className={isDark ? 'absolute inset-0 bg-gradient-to-r from-orange-500/15 via-blue-600/10 to-orange-500/15 rounded-3xl blur-3xl' : 'absolute inset-0 bg-gradient-to-r from-orange-200 via-blue-200 to-orange-200 rounded-3xl blur-3xl'} />
          <div className={isDark ? 'relative bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-3xl p-12 md:p-16 overflow-hidden' : 'relative bg-white/85 backdrop-blur-md border border-slate-200 rounded-3xl p-12 md:p-16 overflow-hidden shadow-sm'}>
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
                    <div className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">{m.value}</div>
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