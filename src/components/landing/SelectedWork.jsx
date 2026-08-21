import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import {
  SiAndroid,
  SiApple,
  SiKotlin,
  SiReact,
  SiSupabase,
  SiSwift,
  SiTypescript,
} from 'react-icons/si';

const airdropServiceIcons = [
  {
    name: 'Standard',
    mode: 'Air Freight',
    detail: '2 to 3 business days after items are delivered to our warehouse',
    src: '/portfolio/airdrop-service-standard.png',
  },
  {
    name: 'SeaDrop',
    mode: 'Sea Freight',
    detail: '2 to 4 weeks after items are delivered to our warehouse',
    src: '/portfolio/airdrop-service-seadrop.png',
  },
  {
    name: 'Express',
    mode: 'Air Freight',
    detail: '1 to 2 business days after items are delivered to our warehouse',
    src: '/portfolio/airdrop-service-express.png',
  },
];

function ProjectLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}

function ProjectBadge({ icon: Icon, children }) {
  return (
    <span>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
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
                className="airdrop-promo-panel"
                initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                <img className="airdrop-phone airdrop-phone-light" src="/portfolio/airdrop-phone-light.png" alt="" loading="lazy" />
                <img className="airdrop-phone airdrop-phone-dark" src="/portfolio/airdrop-phone-dark.png" alt="" loading="lazy" />
                <div className="airdrop-service-cards">
                  {airdropServiceIcons.map((service, index) => (
                    <div className="airdrop-service-card" key={service.name}>
                      <motion.img
                        className="airdrop-service-icon"
                        src={service.src}
                        alt=""
                        loading="lazy"
                        animate={reduceMotion ? undefined : {
                          y: [0, -6, 0],
                          rotate: [0, index === 1 ? 1.5 : -1.5, 0],
                        }}
                        transition={reduceMotion ? undefined : {
                          duration: 3.8 + (index * 0.35),
                          delay: index * 0.3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <strong>{service.name}</strong>
                      <span>{service.mode}</span>
                      <p>{service.detail}</p>
                      <em>Read More</em>
                    </div>
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
                <div className="airdrop-rings" aria-hidden="true">
                  <span className="airdrop-ring airdrop-ring-outer" />
                  <span className="airdrop-ring airdrop-ring-middle" />
                  <span className="airdrop-ring airdrop-ring-inner" />
                </div>
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
                <div className="work-card-meta">
                  <span className="work-index">01 / 05</span>
                  <span className="work-type">Multi-region logistics</span>
                </div>
                <h3>AirDrop Logistics</h3>
                <p>A connected shipping and operations platform linking the United States with the Caribbean, Central America, and South America.</p>
                <div className="work-regions" aria-label="AirDrop Logistics operating regions">
                  <span>United States</span>
                  <span>Caribbean</span>
                  <span>Central America</span>
                  <span>South America</span>
                </div>
              </div>
              <div className="work-card-actions">
                <div className="work-links" aria-label="AirDrop Logistics websites">
                  <ProjectLink href="https://airdropja.com/">Jamaica</ProjectLink>
                  <ProjectLink href="https://airdropus.com/">United States</ProjectLink>
                </div>
                <div className="work-status work-tech-stack" aria-label="AirDrop technologies and platforms">
                  <ProjectBadge icon={SiSwift}>Swift</ProjectBadge>
                  <ProjectBadge icon={SiKotlin}>Kotlin</ProjectBadge>
                  <ProjectBadge icon={SiApple}>iOS</ProjectBadge>
                  <ProjectBadge icon={SiApple}>macOS</ProjectBadge>
                  <ProjectBadge icon={SiAndroid}>Android</ProjectBadge>
                </div>
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
                <div className="work-card-meta">
                  <span className="work-index">02 / 05</span>
                  <span className="work-type">AI-powered operations</span>
                </div>
                <h3>AutoPilot CRM</h3>
                <p>An omnichannel operating system for customer conversations, workflows, analytics, and automation.</p>
              </div>
              <div className="work-card-actions">
                <div className="work-links">
                  <ProjectLink href="https://autopilotcrm.ai/">Visit AutoPilot</ProjectLink>
                </div>
                <div className="work-status work-tech-stack" aria-label="AutoPilot technologies">
                  <ProjectBadge icon={SiReact}>React</ProjectBadge>
                  <ProjectBadge icon={SiTypescript}>TypeScript</ProjectBadge>
                  <ProjectBadge icon={SiSupabase}>Supabase</ProjectBadge>
                </div>
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
                <div className="work-card-meta">
                  <span className="work-index">03 / 05</span>
                  <span className="work-type">Native productivity</span>
                </div>
                <h3>Rituals</h3>
                <p>A daily planning and life-management system built as one considered experience across mobile and desktop.</p>
              </div>
              <div className="work-status work-tech-stack" aria-label="Rituals technologies and platforms">
                <ProjectBadge icon={SiSwift}>Swift</ProjectBadge>
                <ProjectBadge icon={SiKotlin}>Kotlin</ProjectBadge>
                <ProjectBadge icon={SiApple}>iOS</ProjectBadge>
                <ProjectBadge icon={SiAndroid}>Android</ProjectBadge>
                <ProjectBadge icon={SiApple}>macOS</ProjectBadge>
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
                <div className="work-card-meta">
                  <span className="work-index">04 / 05</span>
                  <span className="work-type">Trading intelligence</span>
                </div>
                <h3>Trade City</h3>
                <p>A native trading command center that brings portfolio intelligence, market signals, disciplined execution, and Nova AI into one operating system.</p>
              </div>
              <div className="work-status work-tech-stack" aria-label="Trade City technologies and platforms">
                <ProjectBadge icon={SiSwift}>Swift</ProjectBadge>
                <ProjectBadge icon={SiApple}>macOS</ProjectBadge>
                <ProjectBadge icon={SiApple}>iOS</ProjectBadge>
                <ProjectBadge icon={Sparkles}>Nova AI</ProjectBadge>
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
                <div className="work-card-meta">
                  <span className="work-index">05 / 05</span>
                  <span className="work-type">Workforce operations</span>
                </div>
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
