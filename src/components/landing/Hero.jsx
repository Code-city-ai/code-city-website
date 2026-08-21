import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const capabilities = ['Product strategy', 'Experience design', 'Software engineering', 'Growth systems'];
const signalNodes = [
  { number: '01', label: 'Strategy' },
  { number: '02', label: 'Design' },
  { number: '03', label: 'Build' },
  { number: '04', label: 'Ship' },
];

function HeroSignal() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="hero-signal"
      aria-hidden="true"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="signal-frame">
        <div className="signal-frame-top">
          <span>CC / EXECUTION ENGINE</span>
          <span className="signal-live"><i /> Live</span>
        </div>

        <div className="signal-grid" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i />
        </div>

        <div className="signal-route">
          <span className="signal-route-line signal-route-line-1"><i /></span>
          <span className="signal-route-line signal-route-line-2"><i /></span>
          <span className="signal-route-line signal-route-line-3"><i /></span>
          <span className="signal-route-line signal-route-line-4"><i /></span>

          {signalNodes.map((node, index) => (
            <div className={`signal-node signal-node-${index + 1}`} key={node.label}>
              <i />
              <span>{node.number}</span>
              <strong>{node.label}</strong>
            </div>
          ))}

          <span className="signal-packet signal-packet-1" />
          <span className="signal-packet signal-packet-2" />
        </div>

        <div className="signal-core">
          <div className="signal-core-mark">
            <span className="signal-core-bar signal-core-bar-1"><i /></span>
            <span className="signal-core-bar signal-core-bar-2"><i /></span>
            <span className="signal-core-bar signal-core-bar-3"><i /></span>
          </div>
          <div>
            <strong>Code City</strong>
            <span>System resolved</span>
          </div>
        </div>

        <div className="signal-readout">
          <span>Input</span>
          <strong>01:24:08</strong>
          <span>Output</span>
          <strong>Production</strong>
        </div>

        <span className="signal-corner signal-corner-tl" />
        <span className="signal-corner signal-corner-tr" />
        <span className="signal-corner signal-corner-bl" />
        <span className="signal-corner signal-corner-br" />
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="site-container hero-inner">
        <motion.div
          className="hero-kicker"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
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

          <div className="hero-secondary">
            <HeroSignal />
            <motion.aside
              className="hero-manifesto"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
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
