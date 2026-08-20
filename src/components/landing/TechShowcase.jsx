import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

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

const stack = ['React', 'Swift', 'Kotlin', 'Laravel', 'Python', 'Postgres', 'Supabase', 'AI systems'];

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
              {stack.map((item) => <span key={item}>{item}</span>)}
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
