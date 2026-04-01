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
      <div className="absolute top-0 inset-x-0 h-px bg-[#f55029]/30" />
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=80"
          alt="Team collaboration"
          className="h-full w-full object-cover"
        />
      </div>
      <div className={isDark ? 'absolute inset-0 bg-[#07111f]/92' : 'absolute inset-0 bg-[#f7fafc]/92'} />

      <div className="relative max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
          <span className={isDark ? 'inline-block px-5 py-2 rounded-full bg-white/5 border border-white/10 text-orange-400 text-sm font-semibold tracking-widest uppercase mb-6' : 'inline-block px-5 py-2 rounded-full bg-white/80 border border-slate-200 text-orange-500 text-sm font-semibold tracking-widest uppercase mb-6'}>
            Our Services
          </span>
          <h2 className={isDark ? 'text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight' : 'text-5xl md:text-6xl font-extrabold text-slate-950 mb-6 leading-tight tracking-tight'}>
            Comprehensive Solutions
            <br />
            <span className="text-[#f55029]">For Every Need</span>
          </h2>
          <p className={isDark ? 'text-lg text-slate-400 max-w-xl mx-auto' : 'text-lg text-slate-600 max-w-xl mx-auto'}>
            From concept to launch — end-to-end services that drive innovation and sustainable growth.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.08 }} whileHover={{ y: -8 }} className="group relative">
              <div className={isDark ? 'relative h-full bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-[32px] p-8 transition-all duration-500 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.20)]' : 'relative h-full bg-white/88 backdrop-blur-xl border border-white/70 hover:border-white rounded-[32px] p-8 transition-all duration-500 overflow-hidden shadow-[0_24px_70px_rgba(15,23,42,0.08)]'}>
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#147dc0] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 rounded-2xl bg-[#147dc0] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
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