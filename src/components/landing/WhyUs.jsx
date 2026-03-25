import React from 'react';
import { motion } from 'framer-motion';
import { Zap, DollarSign, Award, Rocket, Shield, Users } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Efficiency',
    description: 'Streamlined processes and agile methodologies ensure rapid delivery without compromising quality.',
    gradient: 'from-purple-500 to-violet-700',
    accent: 'purple',
  },
  {
    icon: DollarSign,
    title: 'Affordable Excellence',
    description: 'World-class solutions at prices that respect your budget. Premium quality, accessible pricing.',
    gradient: 'from-orange-500 to-red-500',
    accent: 'orange',
  },
  {
    icon: Award,
    title: 'World-Class Service',
    description: 'Industry-leading expertise backed by a commitment to exceeding expectations every single time.',
    gradient: 'from-blue-500 to-cyan-500',
    accent: 'blue',
  },
  {
    icon: Rocket,
    title: 'Innovation First',
    description: 'We push boundaries and leverage the latest technologies to keep you ahead of the competition.',
    gradient: 'from-purple-500 to-blue-500',
    accent: 'purple',
  },
  {
    icon: Shield,
    title: 'Proven Track Record',
    description: 'Trusted by businesses worldwide with a portfolio of successful projects across industries.',
    gradient: 'from-orange-500 to-purple-500',
    accent: 'orange',
  },
  {
    icon: Users,
    title: 'Dedicated Support',
    description: '24/7 support team ready to assist you at every stage of your journey with us.',
    gradient: 'from-blue-500 to-purple-500',
    accent: 'blue',
  },
];

export default function WhyUs() {
  return (
    <div id="why-us" className="relative py-36 px-6 bg-[#020617] overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />

      {/* Subtle dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(139,92,246,0.08)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold tracking-widest uppercase mb-6">
            Why Choose CodeCity
          </span>
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Excellence Meets
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              Efficiency & Value
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Cutting-edge technology paired with unmatched service — delivering results that transform businesses.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              whileHover={{ y: -6 }}
              className="group relative"
            >
              {/* Glow */}
              <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-700 bg-gradient-to-br ${feature.gradient}`} />

              <div className="relative h-full bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] hover:border-white/20 rounded-3xl p-8 transition-all duration-500 overflow-hidden">
                {/* Animated corner accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-bl-full transition-opacity duration-500`} />

                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>

                <p className="text-gray-500 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
    </div>
  );
}