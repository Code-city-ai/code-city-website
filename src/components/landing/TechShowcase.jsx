import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Cloud, Smartphone, Lock, Database, Layers } from 'lucide-react';

const technologies = [
  { icon: Cpu, name: 'AI & Machine Learning', gradient: 'from-purple-500 to-violet-700' },
  { icon: Cloud, name: 'Cloud Infrastructure', gradient: 'from-blue-500 to-cyan-500' },
  { icon: Smartphone, name: 'Mobile First', gradient: 'from-orange-500 to-red-500' },
  { icon: Lock, name: 'Enterprise Security', gradient: 'from-purple-600 to-blue-600' },
  { icon: Database, name: 'Big Data Analytics', gradient: 'from-blue-400 to-purple-500' },
  { icon: Layers, name: 'Microservices', gradient: 'from-orange-400 to-purple-600' },
];

const metrics = [
  { value: '99.9%', label: 'Uptime Guarantee', gradient: 'from-purple-400 to-orange-400' },
  { value: '<100ms', label: 'Response Time', gradient: 'from-blue-400 to-purple-400' },
  { value: '50M+', label: 'Requests Handled', gradient: 'from-orange-400 to-blue-400' },
];

export default function TechShowcase() {
  return (
    <div id="technology" className="relative py-36 px-6 bg-[#020617] overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      {/* Animated grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />

      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-600/8 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold tracking-widest uppercase mb-6">
            Technology Stack
          </span>
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Powered by
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-orange-400 bg-clip-text text-transparent">
              Next-Gen Technology
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            We leverage cutting-edge tools and frameworks to build solutions that define tomorrow.
          </p>
        </motion.div>

        {/* Tech cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {technologies.map((tech, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.07 }}
              whileHover={{ y: -6, scale: 1.05 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-purple-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] group-hover:border-purple-500/40 rounded-2xl p-5 text-center transition-all duration-400">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tech.gradient} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-400 shadow-lg`}>
                  <tech.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs text-gray-500 font-medium leading-snug">{tech.name}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Metrics highlight panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Outer glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/15 to-orange-600/20 rounded-3xl blur-3xl" />

          <div className="relative bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-3xl p-12 md:p-16 overflow-hidden">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-transparent rounded-br-full" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-orange-500/20 to-transparent rounded-tl-full" />

            <div className="relative text-center">
              <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
                Built for Scale. Designed for Speed.
              </h3>
              <p className="text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
                Every solution we create is architected for performance, scalability, and reliability.
                We don't just build software — we engineer experiences that drive measurable business impact.
              </p>

              <div className="flex flex-wrap justify-center gap-12 md:gap-20">
                {metrics.map((m, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.08 }}
                    className="text-center cursor-default"
                  >
                    <div className={`text-5xl md:text-6xl font-extrabold bg-gradient-to-r ${m.gradient} bg-clip-text text-transparent mb-2 tracking-tight`}>
                      {m.value}
                    </div>
                    <div className="text-sm text-gray-500 font-medium tracking-wide">{m.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
    </div>
  );
}