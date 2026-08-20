import React from 'react';
import { motion } from 'framer-motion';
import { Check, Cpu } from 'lucide-react';
import { SiKotlin, SiLaravel, SiPostgresql, SiPython, SiReact, SiSupabase, SiSwift } from 'react-icons/si';

const foundations = [
  {
    title: 'Built to perform',
    text: 'Fast interfaces, efficient data paths, and practical observability are part of the architecture—not a clean-up task.',
  },
  {
    title: 'Secure by design',
    text: 'Least-privilege access, deliberate data boundaries, and environment isolation are baked into the system from the start.',
  },
  {
    title: 'Ready to evolve',
    text: 'Modular foundations and clear ownership make the next release easier instead of more fragile.',
  },
];

const stack = [
  { label: 'React', Icon: SiReact },
  { label: 'Swift', Icon: SiSwift },
  { label: 'Kotlin', Icon: SiKotlin },
  { label: 'Laravel', Icon: SiLaravel },
  { label: 'Python', Icon: SiPython },
  { label: 'Postgres', Icon: SiPostgresql },
  { label: 'Supabase', Icon: SiSupabase },
  { label: 'AI systems', Icon: Cpu },
];

export default function TechShowcase() {
  return (
    <section className="section technology-section" id="technology" aria-labelledby="technology-title">
      <div className="site-container">
        <div className="technology-panel">
          <div className="technology-copy">
            <div className="section-label"><span>05</span> Technology</div>
            <h2 id="technology-title">Technical when it matters. Human everywhere.</h2>
            <p>We choose tools for the product in front of us—not for trend value. The result is software that is easier to use, operate, and extend.</p>
            <div className="stack-cloud" aria-label="Technologies we work with">
              {stack.map(({ label, Icon }) => (
                <span key={label}><Icon aria-hidden="true" /><span>{label}</span></span>
              ))}
            </div>
          </div>

          <div className="foundation-list">
            {foundations.map((foundation, index) => (
              <motion.article
                key={foundation.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.07 }}
              >
                <div><Check aria-hidden="true" /></div>
                <h3>{foundation.title}</h3>
                <p>{foundation.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
