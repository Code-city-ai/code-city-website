import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CTA() {
  return (
    <div className="relative py-32 px-6 bg-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/30 via-orange-600/30 to-blue-600/30 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Ready to Build
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-orange-400 to-blue-400 bg-clip-text text-transparent">
              Something Amazing?
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Let's turn your vision into reality. Get in touch with our team and start your transformation today.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-xl mx-auto"
        >
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-purple-500/30 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex flex-col gap-4">
              <Input 
                type="email"
                placeholder="Enter your email"
                className="bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500 h-14 text-lg rounded-xl focus:border-purple-500"
              />
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white h-14 text-lg rounded-xl group"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline"
                className="border-slate-700 text-gray-400 hover:bg-slate-800 rounded-xl"
              >
                <Mail className="mr-2 w-4 h-4" />
                Email Us
              </Button>
              <Button 
                variant="outline"
                className="border-slate-700 text-gray-400 hover:bg-slate-800 rounded-xl"
              >
                <MessageSquare className="mr-2 w-4 h-4" />
                Live Chat
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 text-center text-gray-500 text-sm"
        >
          <p>Trusted by innovative companies worldwide</p>
        </motion.div>
      </div>
    </div>
  );
}