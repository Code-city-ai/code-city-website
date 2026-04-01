import React from 'react';
import { motion } from 'framer-motion';
import { Award, DollarSign, Rocket, Shield, Users, Zap } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Fast, Without Feeling Rushed', description: 'High-end delivery with a refined process and strong attention to detail.' },
  { icon: DollarSign, title: 'Premium Value', description: 'A world-class standard with smart pricing and long-term business impact.' },
  { icon: Award, title: 'Exceptional Craft', description: 'Design, messaging, and execution aligned to elevate your brand perception.' },
  { icon: Rocket, title: 'Built to Move Brands Forward', description: 'Everything we create is designed to increase clarity, confidence, and growth.' },
  { icon: Shield, title: 'Reliable by Design', description: 'Stable systems, thoughtful architecture, and dependable long-term support.' },
  { icon: Users, title: 'A Strategic Partner', description: 'We work like an extension of your team, not a disconnected vendor.' },
];

export default function WhyUs() {
  const dark = document.documentElement.classList.contains('dark');

  return (
    <section id="why-us" className={`relative py-32 px-6 ${dark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
          <span className={`inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-[0.2em] uppercase mb-6 ${dark ? 'bg-white/5 border border-white/10 text-orange-200' : 'bg-white border border-slate-200 text-slate-600'}`}>
            Why CodeCity
          </span>
          <h2 className={`text-5xl md:text-6xl font-extrabold mb-6 tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>
            Refined Thinking.
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">Serious Results.</span>
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            We combine luxury-level presentation with practical execution that performs in the real world.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ y: -6 }}
              className={`rounded-[2rem] p-8 border transition-all ${dark ? 'bg-white/[0.04] border-white/10 hover:border-orange-400/30' : 'bg-white/90 border-slate-200 hover:border-orange-200'} shadow-sm`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${dark ? 'text-white' : 'text-slate-950'}`}>{feature.title}</h3>
              <p className={`${dark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}