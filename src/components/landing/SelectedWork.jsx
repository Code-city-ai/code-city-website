import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, BriefcaseBusiness } from 'lucide-react';

const reveal = {
  initial: { opacity: 1, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-70px' },
};

function ProjectLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}

export default function SelectedWork() {
  return (
    <section className="section work-section" id="work" aria-labelledby="work-title">
      <div className="site-container">
        <div className="section-heading work-heading">
          <div className="section-label"><span>03</span> Selected work</div>
          <div>
            <h2 id="work-title">Built in the real world.</h2>
            <p>
              A selection of products designed and engineered by Code City across logistics,
              customer operations, workforce systems, and personal productivity.
            </p>
          </div>
        </div>

        <div className="work-grid" id="work-grid">
          <motion.article
            className="work-card work-card-airdrop work-card-wide"
            {...reveal}
            transition={{ duration: 0.58 }}
          >
            <div className="work-visual" aria-hidden="true">
              <span className="work-orbit work-orbit-one" />
              <span className="work-orbit work-orbit-two" />
              <img className="airdrop-logo" src="/brands/airdrop.svg" alt="" />
            </div>
            <div className="work-card-body">
              <div className="work-card-copy">
                <span className="work-type">Cross-border logistics</span>
                <h3>AIRDROP Logistics</h3>
                <p>A connected customer and operations platform serving international shipping across Jamaica and the United States.</p>
              </div>
              <div className="work-links" aria-label="AIRDROP Logistics websites">
                <ProjectLink href="https://airdropja.com/">Jamaica</ProjectLink>
                <ProjectLink href="https://airdropus.com/">United States</ProjectLink>
              </div>
            </div>
          </motion.article>

          <motion.article
            className="work-card work-card-autopilot"
            {...reveal}
            transition={{ duration: 0.58, delay: 0.06 }}
          >
            <div className="work-visual" aria-hidden="true">
              <span className="autopilot-signal" />
              <img className="autopilot-logo" src="/brands/autopilot.svg" alt="" />
            </div>
            <div className="work-card-body">
              <div className="work-card-copy">
                <span className="work-type">AI-powered operations</span>
                <h3>AutoPilot CRM</h3>
                <p>An omnichannel operating system for customer conversations, workflows, analytics, and automation.</p>
              </div>
              <div className="work-links">
                <ProjectLink href="https://autopilotcrm.ai/">Visit AutoPilot</ProjectLink>
              </div>
            </div>
          </motion.article>

          <motion.article
            className="work-card work-card-rituals"
            {...reveal}
            transition={{ duration: 0.58, delay: 0.06 }}
          >
            <div className="work-visual" aria-hidden="true">
              <span className="rituals-glow" />
              <img className="rituals-logo" src="/brands/rituals.png" alt="" />
              <span className="rituals-wordmark">RITUALS</span>
            </div>
            <div className="work-card-body">
              <div className="work-card-copy">
                <span className="work-type">Native productivity</span>
                <h3>Rituals</h3>
                <p>A daily planning and life-management system built as one considered experience across mobile and desktop.</p>
              </div>
              <div className="work-status" aria-label="Supported platforms">
                <span>iOS</span><span>Android</span><span>macOS</span>
              </div>
            </div>
          </motion.article>

          <motion.article
            className="work-card work-card-inspire work-card-wide"
            {...reveal}
            transition={{ duration: 0.58, delay: 0.12 }}
          >
            <div className="work-visual" aria-hidden="true">
              <div className="inspire-lockup">
                <span><BriefcaseBusiness /></span>
                <div>
                  <strong>INSPIRE</strong>
                  <small>CAPITAL</small>
                </div>
              </div>
              <span className="inspire-line inspire-line-one" />
              <span className="inspire-line inspire-line-two" />
            </div>
            <div className="work-card-body">
              <div className="work-card-copy">
                <span className="work-type">Workforce operations</span>
                <h3>Inspire Capital</h3>
                <p>Workforce management and talent infrastructure spanning recruitment, onboarding, and payroll administration.</p>
              </div>
              <div className="work-status">
                <span>Operations platform</span><span>Private system</span>
              </div>
            </div>
          </motion.article>
        </div>

        <div className="work-footnote">
          <span>04 products</span>
          <p>Distinct businesses. One standard of craft.</p>
        </div>
      </div>
    </section>
  );
}
