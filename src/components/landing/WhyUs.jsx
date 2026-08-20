import React from 'react';
import { motion } from 'framer-motion';

const phases = [
  { number: '01', title: 'Discover', text: 'We expose the real problem, the business constraint, and the opportunity worth pursuing.' },
  { number: '02', title: 'Define', text: 'We align the product, experience, and technical direction before complexity compounds.' },
  { number: '03', title: 'Build', text: 'We work in visible, testable slices—making quality tangible early and often.' },
  { number: '04', title: 'Evolve', text: 'We use real behavior and real data to sharpen the product after it meets the world.' },
];

export default function WhyUs() {
  return (
    <section className="section approach-section" id="why-us" aria-labelledby="approach-title">
      <div className="site-container approach-layout">
        <motion.div
          className="approach-intro"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="section-label section-label-inverse"><span>03</span> How we work</div>
          <h2 id="approach-title">Momentum without the mess.</h2>
          <p>Our process is rigorous where it protects the outcome and lightweight everywhere else. You always know what is happening, why it matters, and what comes next.</p>
          <blockquote>“No black box. No agency theatre. Just thoughtful people doing excellent work together.”</blockquote>
        </motion.div>

        <div className="phase-list">
          {phases.map((phase, index) => (
            <motion.article
              className="phase-row"
              key={phase.number}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
            >
              <span>{phase.number}</span>
              <h3>{phase.title}</h3>
              <p>{phase.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
