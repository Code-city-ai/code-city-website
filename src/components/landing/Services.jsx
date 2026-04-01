import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Code2, Globe, Palette, TrendingUp, Zap } from 'lucide-react';
import { useThemeMode } from './ThemeContext';
import ServicesSlideshow from './ServicesSlideshow';

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
        <ServicesSlideshow />
      </div>
      <div className={isDark ? 'absolute inset-0 bg-[#07111f]/72' : 'absolute inset-0 bg-white/70'} />
      <div className={isDark ? 'absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.45)_0%,rgba(7,17,31,0.82)_100%)]' : 'absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.30)_0%,rgba(255,255,255,0.84)_100%)]'} />

      <div className="relative max-w-7xl mx-auto z-10">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20">
          <span className={isDark ? 'inline-block px-5 py-2 rounded-full bg-white/10 border border-white/15 text-orange-300 text-sm font-semibold tracking-widest uppercase mb-6 backdrop-blur-xl' : 'inline-block px-5 py-2 rounded-full bg-white/80 border border-white/70 text-orange-500 text-sm font-semibold tracking-widest uppercase mb-6 backdrop-blur-xl'}>
            Our Services
          </span>
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Comprehensive Solutions
            <br />
            <span className="text-[#f55029]">For Every Need</span>
          </h2>
          <p className="text-lg text-slate-200 max-w-xl mx-auto">
            From concept to launch — end-to-end services that drive innovation and sustainable growth.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.08 }} whileHover={{ y: -8 }} className="group relative">
              <div className="relative h-full rounded-[32px] border border-white/10 bg-white/10 p-8 backdrop-blur-xl transition-all duration-500 overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#147dc0] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 rounded-2xl bg-[#147dc0] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                <p className="text-slate-200 leading-relaxed text-sm">{service.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}