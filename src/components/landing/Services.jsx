import React from 'react';
import { motion } from 'framer-motion';
import { Code2, TrendingUp, Zap, Palette, Globe, BarChart3 } from 'lucide-react';

const services = [
  {
    icon: Code2,
    title: 'Custom Software Development',
    description: 'Tailor-made solutions built with cutting-edge technologies to transform your business operations.',
    gradient: 'from-purple-500 to-violet-700',
    glow: 'rgba(139,92,246,0.35)',
    border: 'hover:border-purple-500/60',
  },
  {
    icon: Globe,
    title: 'Web & Mobile Applications',
    description: 'Responsive, scalable applications that deliver exceptional user experiences across all devices.',
    gradient: 'from-blue-500 to-cyan-600',
    glow: 'rgba(59,130,246,0.35)',
    border: 'hover:border-blue-500/60',
  },
  {
    icon: TrendingUp,
    title: 'Digital Marketing Strategy',
    description: 'Data-driven marketing campaigns that amplify your brand and accelerate growth.',
    gradient: 'from-orange-500 to-red-500',
    glow: 'rgba(249,115,22,0.35)',
    border: 'hover:border-orange-500/60',
  },
  {
    icon: Palette,
    title: 'Brand & Design',
    description: 'Stunning visual identities and designs that captivate audiences and build lasting impressions.',
    gradient: 'from-purple-500 to-blue-500',
    glow: 'rgba(139,92,246,0.3)',
    border: 'hover:border-purple-500/60',
  },
  {
    icon: Zap,
    title: 'Performance Optimization',
    description: 'Lightning-fast solutions optimized for speed, efficiency, and seamless user experiences.',
    gradient: 'from-orange-400 to-purple-600',
    glow: 'rgba(249,115,22,0.3)',
    border: 'hover:border-orange-400/60',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Comprehensive data analytics to drive informed decisions and measurable business outcomes.',
    gradient: 'from-blue-400 to-purple-600',
    glow: 'rgba(59,130,246,0.3)',
    border: 'hover:border-blue-400/60',
  },
];

export default function Services() {
  return (
    <div id="services" className="relative py-36 px-6 bg-[#020617] overflow-hidden">
      {/* Section gradient separator from hero */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      {/* Background radial accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_50%,rgba(139,92,246,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(249,115,22,0.08),transparent)]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-5 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold tracking-widest uppercase mb-6">
            Our Services
          </span>
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Comprehensive Solutions
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              For Every Need
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            From concept to launch — end-to-end services that drive innovation and sustainable growth.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              whileHover={{ y: -6 }}
              className="group relative"
            >
              {/* Glow behind card */}
              <div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700"
                style={{ background: `radial-gradient(circle at 50% 80%, ${service.glow}, transparent 70%)` }}
              />

              <div className={`relative h-full bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] ${service.border} rounded-3xl p-8 transition-all duration-500 overflow-hidden`}>
                {/* Top gradient line */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${service.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors duration-300">
                  {service.title}
                </h3>

                <p className="text-gray-500 leading-relaxed text-sm">
                  {service.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom separator */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
    </div>
  );
}