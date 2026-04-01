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
      <div className="absolute top-0 inset-x-0 h-px bg-[#147dc0]/30" />
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=80"
          alt="Professional team"
          className="h-full w-full object-cover"
        />
      </div>
      <div className={isDark ? 'absolute inset-0 bg-[#07111f]/90' : 'absolute inset-0 bg-white/90'} />

      <div className="relative max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
          <span className={isDark ? 'inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-sm font-semibold tracking-widest uppercase mb-6' : 'inline-block px-5 py-2 rounded-full bg-white/80 border border-slate-200 text-blue-600 text-sm font-semibold tracking-widest uppercase mb-6'}>
            Why CodeCity
          </span>
          <h2 className={isDark ? 'text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight' : 'text-5xl md:text-6xl font-extrabold text-slate-950 mb-6 leading-tight tracking-tight'}>
            Excellence Meets
            <br />
            <span className="text-[#147dc0]">Efficiency & Value</span>
          </h2>
          <p className={isDark ? 'text-lg text-slate-400 max-w-xl mx-auto' : 'text-lg text-slate-600 max-w-xl mx-auto'}>
            Cutting-edge technology paired with unmatched service — delivering results that transform businesses.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.08 }} whileHover={{ y: -8 }} className="group relative">
              <div className={isDark ? 'relative h-full bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-[32px] p-8 transition-all duration-500 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.20)]' : 'relative h-full bg-white/88 backdrop-blur-xl border border-white/70 hover:border-white rounded-[32px] p-8 transition-all duration-500 overflow-hidden shadow-[0_24px_70px_rgba(15,23,42,0.08)]'}>
                <div className="w-14 h-14 rounded-2xl bg-[#f55029] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500">
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