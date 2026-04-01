import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CTA() {
  const dark = document.documentElement.classList.contains('dark');

  return (
    <section className={`relative py-32 px-6 ${dark ? 'bg-[#07111f]' : 'bg-[#f7fafc]'}`}>
      <div className="max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border mb-8 ${dark ? 'bg-white/5 border-white/10 text-blue-100' : 'bg-white border-slate-200 text-slate-700'}`}>
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">Start Something Exceptional</span>
          </div>

          <h2 className={`text-5xl md:text-7xl font-extrabold mb-6 leading-[1.02] tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>
            Ready for a More
            <br />
            <span className="bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">World-Class Presence?</span>
          </h2>

          <p className={`text-xl max-w-2xl mx-auto mb-14 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
            Let’s design a sharper, more elevated digital experience for your brand.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`max-w-xl mx-auto rounded-[2rem] p-8 border ${dark ? 'bg-white/[0.05] border-white/10' : 'bg-white border-slate-200'} shadow-sm`}
        >
          <div className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder="Enter your email address"
              className={`${dark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'} h-14 rounded-xl`}
            />
            <Button className="h-14 rounded-xl bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white text-base shadow-[0_20px_60px_rgba(37,99,235,0.2)]">
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className={`${dark ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} rounded-xl`}>
              <Mail className="mr-2 w-4 h-4" />
              Email Us
            </Button>
            <Button variant="outline" className={`${dark ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} rounded-xl`}>
              <MessageSquare className="mr-2 w-4 h-4" />
              Live Chat
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}