import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Code2, Globe, Palette, TrendingUp, Zap } from 'lucide-react';

const services = [
  { icon: Code2, title: 'Custom Software Development', description: 'Bespoke platforms and internal tools designed for speed, clarity, and scale.' },
  { icon: Globe, title: 'Web & Mobile Applications', description: 'Elegant digital products built to feel effortless across every screen.' },
  { icon: TrendingUp, title: 'Digital Marketing Strategy', description: 'Growth systems and campaigns that turn attention into measurable results.' },
  { icon: Palette, title: 'Brand & Design', description: 'Refined visuals, premium identity systems, and memorable customer touchpoints.' },
  { icon: Zap, title: 'Performance Optimization', description: 'Sharper performance, cleaner systems, and smoother user journeys.' },
  { icon: BarChart3, title: 'Analytics & Insights', description: 'Clear reporting and strategic insight that support better decisions.' },
];

export default function Services() {
  const dark = document.documentElement.classList.contains('dark');

  return (
    <section id="services" className={`relative py-32 px-6 ${dark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
          <span className={`inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-[0.2em] uppercase mb-6 ${dark ? 'bg-white/5 border border-white/10 text-blue-200' : 'bg-white border border-slate-200 text-slate-600'}`}>
            Services
          </span>
          <h2 className={`text-5xl md:text-6xl font-extrabold mb-6 tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>
            Sophisticated Solutions,
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">Beautifully Executed</span>
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Every offer is designed to feel premium, strategic, and distinctly world-class.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ y: -6 }}
              className={`rounded-[2rem] p-8 border backdrop-blur-md transition-all ${dark ? 'bg-white/[0.04] border-white/10 hover:border-blue-400/30' : 'bg-white/90 border-slate-200 hover:border-blue-200'} shadow-sm`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                <service.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${dark ? 'text-white' : 'text-slate-950'}`}>{service.title}</h3>
              <p className={`${dark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}