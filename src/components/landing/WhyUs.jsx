import React from 'react';
import { motion } from 'framer-motion';
import { Zap, DollarSign, Award, Rocket, Shield, Users } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Efficiency',
    description: 'Streamlined processes and agile methodologies ensure rapid delivery without compromising quality.',
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    icon: DollarSign,
    title: 'Affordable Excellence',
    description: 'World-class solutions at prices that respect your budget. Premium quality, accessible pricing.',
    gradient: 'from-orange-500 to-orange-700',
  },
  {
    icon: Award,
    title: 'World-Class Service',
    description: 'Industry-leading expertise backed by a commitment to exceeding expectations every single time.',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    icon: Rocket,
    title: 'Innovation First',
    description: 'We push boundaries and leverage the latest technologies to keep you ahead of the competition.',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    icon: Shield,
    title: 'Proven Track Record',
    description: 'Trusted by businesses worldwide with a portfolio of successful projects across industries.',
    gradient: 'from-orange-500 to-purple-500',
  },
  {
    icon: Users,
    title: 'Dedicated Support',
    description: '24/7 support team ready to assist you at every stage of your journey with us.',
    gradient: 'from-blue-500 to-purple-500',
  },
];

export default function WhyUs() {
  return (
    <div className="relative py-32 px-6 bg-slate-950 overflow-hidden">
      {/* Geometric patterns */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold">
              Why Choose CodeCity
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Excellence Meets
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              Efficiency & Value
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            We combine cutting-edge technology with unmatched service to deliver results that transform businesses
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group relative"
            >
              {/* Glowing effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 rounded-3xl`} />
              
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm group-hover:border-purple-500/50 transition-all duration-500 h-full">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}