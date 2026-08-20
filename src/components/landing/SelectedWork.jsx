import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const airdropServices = [
  { name: 'Standard', icon: '/portfolio/airdrop-service-standard.png' },
  { name: 'SeaDrop', icon: '/portfolio/airdrop-service-seadrop.png' },
  { name: 'Express', icon: '/portfolio/airdrop-service-express.png' },
];

function ProjectLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}

export default function SelectedWork() {
  const reduceMotion = useReducedMotion();

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
          <article
            className="work-card work-card-airdrop work-card-featured"
          >
            <div className="work-visual work-visual-airdrop" aria-hidden="true">
              <img className="project-site-preview" src="/portfolio/airdrop-ja.jpg" alt="" loading="lazy" />
              <motion.div
                className="airdrop-phone-cluster"
                initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                <img
                  className="airdrop-phone airdrop-phone-light"
                  src="/portfolio/airdrop-phone-light.png"
                  alt=""
                  loading="lazy"
                />
                <img
                  className="airdrop-phone airdrop-phone-dark"
                  src="/portfolio/airdrop-phone-dark.png"
                  alt=""
                  loading="lazy"
                />
                <div className="airdrop-service-boxes">
                  {airdropServices.map((service, index) => (
                    <motion.div
                      className="airdrop-service-box"
                      key={service.name}
                      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{
                        duration: 0.5,
                        delay: reduceMotion ? 0 : 0.16 + (index * 0.09),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <img src={service.icon} alt="" loading="lazy" />
                      <span>{service.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                className="airdrop-logo-stage"
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <picture className="airdrop-logo-lockup">
                  <source
                    media="(prefers-reduced-motion: reduce)"
                    srcSet="/portfolio/airdrop-logo-static.png"
                  />
                  <img
                    src="/portfolio/airdrop-logo-animated.webp"
                    alt=""
                    loading="lazy"
                  />
                </picture>
              </motion.div>
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
          </article>

          <article
            className="work-card work-card-autopilot"
          >
            <div className="work-visual" aria-hidden="true">
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
          </article>

          <article
            className="work-card work-card-rituals"
          >
            <div className="work-visual" aria-hidden="true">
              <div className="rituals-lockup">
                <img className="rituals-logo" src="/brands/rituals.png" alt="" loading="lazy" />
                <span>RITUALS</span>
              </div>
            </div>
            <div className="work-card-body">
              <div className="work-card-copy">
                <span className="work-type">Native productivity</span>
                <h3>Rituals</h3>
                <p>A daily planning and life-management system built as one considered experience across mobile and desktop.</p>
              </div>
              <div className="work-status" aria-label="Supported Rituals platforms">
                <span>iOS</span><span>Android</span><span>macOS</span>
              </div>
            </div>
          </article>

          <article
            className="work-card work-card-trade-city"
          >
            <div className="work-visual" aria-hidden="true">
              <div className="trade-city-lockup">
                <img
                  className="trade-city-logo trade-city-logo-base"
                  src="/brands/trade-city.png"
                  alt=""
                  loading="lazy"
                />
                <img
                  className="trade-city-logo trade-city-logo-light-mark"
                  src="/brands/trade-city.png"
                  alt=""
                  loading="lazy"
                />
              </div>
            </div>
            <div className="work-card-body">
              <div className="work-card-copy">
                <span className="work-type">Trading intelligence</span>
                <h3>Trade City</h3>
                <p>A native trading command center that brings portfolio intelligence, market signals, disciplined execution, and Nova AI into one operating system.</p>
              </div>
              <div className="work-status" aria-label="Trade City platforms and capabilities">
                <span>macOS</span><span>iOS</span><span>Nova AI</span>
              </div>
            </div>
          </article>

          <article
            className="work-card work-card-inspire"
          >
            <div className="work-visual" aria-hidden="true">
              <img
                className="inspire-logo project-theme-asset project-theme-asset-light"
                src="/brands/inspire-capital-dark-ink.svg?v=1"
                alt=""
              />
              <img
                className="inspire-logo project-theme-asset project-theme-asset-dark"
                src="/brands/inspire-capital.svg"
                alt=""
              />
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
          </article>
        </div>

        <div className="work-footnote">
          <span>05 products</span>
          <p>Distinct businesses. One standard of craft.</p>
        </div>
      </div>
    </section>
  );
}
