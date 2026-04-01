import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Code2, Globe, Palette, TrendingUp, Zap } from 'lucide-react';
import { useThemeMode } from './ThemeContext';

const services = [
  { icon: Code2, title: 'Custom Software Development', description: 'Sophisticated digital products engineered for scale, reliability, and long-term business value.' },
  { icon: Globe, title: 'Web & Mobile Applications', description: 'Elegant cross-platform experiences with premium performance and seamless usability.' },
  { icon: TrendingUp, title: 'Digital Marketing Strategy', description: 'Modern growth systems designed to elevate visibility, acquisition, and conversion.' },
  { icon: Palette, title: 'Brand & Design', description: 'Distinctive visual systems and interfaces that feel premium at every touchpoint.' },
  { icon: Zap, title: 'Performance Optimization', description: 'Sharper load times, smoother journeys, and faster experiences across every device.' },
  { icon: BarChart3, title: 'Analytics & Insights', description: 'Clear intelligence that helps you make smarter decisions with confidence.' },
];

export default function Services() {
  const { isDark } = useThemeMode();

  return (
    <section id="services" className={`relative py-36 px-6 overflow-hidden ${isDark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
      <div className={isDark ? 'absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_50%,rgba(249,115,22,0.08),transparent)]' : 'absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_50%,rgba(249,115,22,0.10),transparent)]'} />
      <div className={isDark ? 'absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(37,99,235,0.08),transparent)]' : 'absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(37,99,235,0.10),transparent)]'} />

      <div className="relative max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
          <span className={isDark ? 'inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-orange-400 text-sm font-semibold tracking-widest uppercase mb-6' : 'inline-block px-5 py-2 rounded-full bg-white/80 border border-slate-200 text-orange-500 text-sm font-semibold tracking-widest uppercase mb-6'}>
            Our Services
          </span>
          <h2 className={isDark ? 'text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight' : 'text-5xl md:text-6xl font-extrabold text-slate-950 mb-6 leading-tight tracking-tight'}>
            Comprehensive Solutions
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">For Every Need</span>
          </h2>
          <p className={isDark ? 'text-lg text-slate-400 max-w-xl mx-auto' : 'text-lg text-slate-600 max-w-xl mx-auto'}>
            From concept to launch — end-to-end services that drive innovation and sustainable growth.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.08 }} whileHover={{ y: -8 }} className="group relative">
              <div className={isDark ? 'absolute inset-0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700 bg-gradient-to-br from-orange-500/20 to-blue-600/20' : 'absolute inset-0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-orange-200 to-blue-200'} />
              <div className={isDark ? 'relative h-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:border-white/20 rounded-3xl p-8 transition-all duration-500 overflow-hidden' : 'relative h-full bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-slate-300 rounded-3xl p-8 transition-all duration-500 overflow-hidden shadow-sm'}>
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className={isDark ? 'text-xl font-bold text-white mb-3' : 'text-xl font-bold text-slate-950 mb-3'}>{service.title}</h3>
                <p className={isDark ? 'text-slate-400 leading-relaxed text-sm' : 'text-slate-600 leading-relaxed text-sm'}>{service.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}