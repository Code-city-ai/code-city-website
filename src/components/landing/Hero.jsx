import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const capabilities = ['Product strategy', 'Experience design', 'Software engineering', 'Growth systems'];

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid" aria-hidden="true" />

      <div className="site-container hero-inner">
        <motion.div
          className="hero-kicker"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="hero-kicker-dot" />
          Independent digital product studio
        </motion.div>

        <div className="hero-layout">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
          >
            <h1 id="hero-title">
              Serious ideas.
              <span>Remarkable software.</span>
            </h1>
            <p>
              Code City unites strategy, design, engineering, and growth to turn ambitious ideas into digital products people choose to use.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Start a project
                <ArrowUpRight aria-hidden="true" />
              </a>
              <a className="button button-secondary" href="#work-grid">
                Explore our work
                <ArrowDownRight aria-hidden="true" />
              </a>
            </div>
          </motion.div>

          <motion.aside
            className="hero-manifesto"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
          >
            <div className="manifesto-index">01 / 06</div>
            <p>One senior team. One accountable delivery path. No handoff maze.</p>
            <div className="capability-list" aria-label="Core capabilities">
              {capabilities.map((capability, index) => (
                <div className="capability-row" key={capability}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{capability}</strong>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>

        <motion.div
          className="hero-proof"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          <span>Built for teams who value</span>
          <strong>Clarity</strong>
          <strong>Craft</strong>
          <strong>Momentum</strong>
        </motion.div>
      </div>
    </section>
  );
}
