import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Cloud, Smartphone, Lock, Database, Layers } from 'lucide-react';

const technologies = [
  { icon: Cpu, name: 'AI & Machine Learning', color: 'text-purple-400' },
  { icon: Cloud, name: 'Cloud Infrastructure', color: 'text-blue-400' },
  { icon: Smartphone, name: 'Mobile First', color: 'text-orange-400' },
  { icon: Lock, name: 'Enterprise Security', color: 'text-purple-400' },
  { icon: Database, name: 'Big Data Analytics', color: 'text-blue-400' },
  { icon: Layers, name: 'Microservices', color: 'text-orange-400' },
];

export default function TechShowcase() {
  return (
    <div className="relative py-32 px-6 bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(139,92,246,0.05)_2px,transparent_2px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold">
              Technology Stack
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Powered by
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-orange-400 bg-clip-text text-transparent">
              Next-Gen Technology
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            We leverage cutting-edge tools and frameworks to build solutions that define tomorrow
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-16">
          {technologies.map((tech, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center group-hover:border-purple-500/50 transition-all duration-500 group-hover:scale-105">
                <tech.icon className={`w-10 h-10 mx-auto mb-3 ${tech.color}`} />
                <p className="text-sm text-gray-400 font-medium">{tech.name}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-orange-600/20 rounded-3xl blur-2xl" />
          <div className="relative bg-slate-900/50 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-12 text-center">
            <h3 className="text-3xl font-bold text-white mb-4">
              Built for Scale. Designed for Speed.
            </h3>
            <p className="text-lg text-gray-400 mb-8 max-w-3xl mx-auto">
              Every solution we create is architected for performance, scalability, and reliability. 
              We don't just build software—we engineer experiences that drive measurable business impact.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent mb-2">
                  99.9%
                </div>
                <div className="text-sm text-gray-400">Uptime Guarantee</div>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  &lt;100ms
                </div>
                <div className="text-sm text-gray-400">Response Time</div>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  50M+
                </div>
                <div className="text-sm text-gray-400">Requests Handled</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}