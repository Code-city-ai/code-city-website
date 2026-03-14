import React from 'react';
import { motion } from 'framer-motion';
import { Code2, TrendingUp, Zap, Palette, Globe, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  {
    icon: Code2,
    title: 'Custom Software Development',
    description: 'Tailor-made solutions built with cutting-edge technologies to transform your business operations.',
    color: 'from-purple-500 to-purple-700',
    iconColor: 'text-purple-400',
  },
  {
    icon: Globe,
    title: 'Web & Mobile Applications',
    description: 'Responsive, scalable applications that deliver exceptional user experiences across all devices.',
    color: 'from-blue-500 to-blue-700',
    iconColor: 'text-blue-400',
  },
  {
    icon: TrendingUp,
    title: 'Digital Marketing Strategy',
    description: 'Data-driven marketing campaigns that amplify your brand and accelerate growth.',
    color: 'from-orange-500 to-orange-700',
    iconColor: 'text-orange-400',
  },
  {
    icon: Palette,
    title: 'Brand & Design',
    description: 'Stunning visual identities and designs that captivate audiences and build lasting impressions.',
    color: 'from-purple-500 to-blue-500',
    iconColor: 'text-purple-400',
  },
  {
    icon: Zap,
    title: 'Performance Optimization',
    description: 'Lightning-fast solutions optimized for speed, efficiency, and seamless user experiences.',
    color: 'from-orange-500 to-purple-600',
    iconColor: 'text-orange-400',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Comprehensive data analytics to drive informed decisions and measurable business outcomes.',
    color: 'from-blue-500 to-purple-600',
    iconColor: 'text-blue-400',
  },
];

export default function Services() {
  return (
    <div className="relative py-32 px-6 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.1),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-orange-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold">
              Our Services
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Comprehensive Solutions
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
              For Every Need
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From concept to launch, we provide end-to-end services that drive innovation and growth
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <Card className="group relative bg-slate-900/50 border-slate-800 hover:border-purple-500/50 transition-all duration-500 overflow-hidden backdrop-blur-sm h-full">
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                <CardContent className="p-8 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} bg-opacity-10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                    <service.icon className={`w-8 h-8 ${service.iconColor}`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors">
                    {service.title}
                  </h3>
                  
                  <p className="text-gray-400 leading-relaxed">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}