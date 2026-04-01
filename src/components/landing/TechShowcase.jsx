import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Cpu, Database, Layers, Lock, Smartphone } from 'lucide-react';

const technologies = [
  { icon: Cpu, name: 'AI & Intelligence' },
  { icon: Cloud, name: 'Cloud Systems' },
  { icon: Smartphone, name: 'Mobile-First UX' },
  { icon: Lock, name: 'Enterprise Security' },
  { icon: Database, name: 'Data Infrastructure' },
  { icon: Layers, name: 'Scalable Architecture' },
];

const metrics = [
  { value: '99.9%', label: 'Uptime' },
  { value: '<100ms', label: 'Speed' },
  { value: '50M+', label: 'Requests' },
];

export default function TechShowcase() {
  const dark = document.documentElement.classList.contains('dark');

  return (
    <section id="technology" className={`relative py-32 px-6 ${dark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
          <span className={`inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-[0.2em] uppercase mb-6 ${dark ? 'bg-white/5 border border-white/10 text-blue-200' : 'bg-white border border-slate-200 text-slate-600'}`}>
            Technology
          </span>
          <h2 className={`text-5xl md:text-6xl font-extrabold mb-6 tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>
            Built on Modern
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">Digital Infrastructure</span>
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Strong systems underneath, elegant experiences on top.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {technologies.map((tech, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
              className={`rounded-2xl p-5 text-center border ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'} shadow-sm`}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
                <tech.icon className="w-6 h-6 text-white" />
              </div>
              <p className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{tech.name}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`rounded-[2rem] p-10 md:p-14 border ${dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-slate-200'} shadow-sm`}
        >
          <div className="text-center mb-10">
            <h3 className={`text-3xl md:text-4xl font-extrabold mb-4 ${dark ? 'text-white' : 'text-slate-950'}`}>
              Elegant Outside. Powerful Inside.
            </h3>
            <p className={`${dark ? 'text-slate-400' : 'text-slate-600'} max-w-2xl mx-auto`}>
              Our systems are engineered to look premium, perform quickly, and scale with confidence.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-12 md:gap-20">
            {metrics.map((metric, idx) => (
              <div key={idx} className="text-center">
                <div className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent mb-2">
                  {metric.value}
                </div>
                <div className={`${dark ? 'text-slate-400' : 'text-slate-600'} text-sm font-medium tracking-wide uppercase`}>{metric.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}