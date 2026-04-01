import React from 'react';
import { motion } from 'framer-motion';
import { Award, DollarSign, Rocket, Shield, Users, Zap } from 'lucide-react';
import { useThemeMode } from './ThemeContext';

const features = [
  { icon: Zap, title: 'Sharper Execution', description: 'Fast-moving delivery with a polished process that respects quality and momentum.' },
  { icon: DollarSign, title: 'Smart Investment', description: 'Premium work with strategic value — built to outperform what typical agencies deliver.' },
  { icon: Award, title: 'High-End Standards', description: 'Every interaction, layout, and detail is crafted to look and feel elevated.' },
  { icon: Rocket, title: 'Future-Facing Thinking', description: 'We design for what your business becomes next, not just what it needs today.' },
  { icon: Shield, title: 'Reliable Partnership', description: 'Dependable delivery, transparent communication, and confidence at every phase.' },
  { icon: Users, title: 'Dedicated Collaboration', description: 'A hands-on team that works closely with you to shape exceptional outcomes.' },
];

export default function WhyUs() {
  const { isDark } = useThemeMode();

  return (
    <section id="why-us" className={`relative py-36 px-6 overflow-hidden ${isDark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
      <div className={isDark ? 'absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]' : 'absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-[120px]'} />
      <div className={isDark ? 'absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]' : 'absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-orange-200/50 rounded-full blur-[120px]'} />

      <div className="relative max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
          <span className={isDark ? 'inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-sm font-semibold tracking-widest uppercase mb-6' : 'inline-block px-5 py-2 rounded-full bg-white/80 border border-slate-200 text-blue-600 text-sm font-semibold tracking-widest uppercase mb-6'}>
            Why CodeCity
          </span>
          <h2 className={isDark ? 'text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight' : 'text-5xl md:text-6xl font-extrabold text-slate-950 mb-6 leading-tight tracking-tight'}>
            Excellence Meets
            <br />
            <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Efficiency & Value</span>
          </h2>
          <p className={isDark ? 'text-lg text-slate-400 max-w-xl mx-auto' : 'text-lg text-slate-600 max-w-xl mx-auto'}>
            Cutting-edge technology paired with unmatched service — delivering results that transform businesses.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.08 }} whileHover={{ y: -8 }} className="group relative">
              <div className={isDark ? 'absolute inset-0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 bg-gradient-to-br from-blue-600/20 to-orange-500/20' : 'absolute inset-0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-blue-200 to-orange-200'} />
              <div className={isDark ? 'relative h-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:border-white/20 rounded-3xl p-8 transition-all duration-500 overflow-hidden' : 'relative h-full bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-slate-300 rounded-3xl p-8 transition-all duration-500 overflow-hidden shadow-sm'}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 rounded-bl-full transition-opacity duration-500" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className={isDark ? 'text-xl font-bold text-white mb-3' : 'text-xl font-bold text-slate-950 mb-3'}>{feature.title}</h3>
                <p className={isDark ? 'text-slate-400 leading-relaxed text-sm' : 'text-slate-600 leading-relaxed text-sm'}>{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}