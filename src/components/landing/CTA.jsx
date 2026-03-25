import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CTA() {
  return (
    <div className="relative py-36 px-6 bg-[#020617] overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      {/* Layered background glows */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-r from-purple-700/30 via-orange-600/20 to-blue-700/30 rounded-full blur-[100px]"
        />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500/10 border border-purple-500/30 backdrop-blur-md mb-10 shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300 font-semibold tracking-wide">Let's Work Together</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight">
            Ready to Build
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-orange-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(139,92,246,0.3)]">
              Something Amazing?
            </span>
          </h2>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-16 leading-relaxed">
            Let's turn your vision into reality. Get in touch with our team and start your transformation today.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-lg mx-auto"
        >
          {/* Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-orange-600/10 rounded-3xl blur-2xl" />
            <div className="relative bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-3xl p-8 overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-orange-400 to-blue-500" />

              <div className="flex flex-col gap-4">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-gray-600 h-14 text-base rounded-xl focus-visible:ring-purple-500 focus-visible:border-purple-500"
                />
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white h-14 text-base rounded-xl group shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_50px_rgba(139,92,246,0.55)] transition-all duration-300"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20 rounded-xl transition-all duration-300"
                >
                  <Mail className="mr-2 w-4 h-4" />
                  Email Us
                </Button>
                <Button
                  variant="outline"
                  className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20 rounded-xl transition-all duration-300"
                >
                  <MessageSquare className="mr-2 w-4 h-4" />
                  Live Chat
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-12 text-gray-600 text-sm tracking-wide"
        >
          Trusted by innovative companies worldwide · No commitment required
        </motion.p>
      </div>
    </div>
  );
}