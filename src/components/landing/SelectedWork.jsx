import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import {
  SiAndroid,
  SiApple,
  SiJavascript,
  SiKotlin,
  SiLaravel,
  SiPhp,
  SiPython,
  SiReact,
  SiSupabase,
  SiSwift,
  SiTypescript,
} from 'react-icons/si';
import TradeCityCharts from './TradeCityCharts';

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

const ritualsSlides = [
  {
    label: 'Tasks',
    dark: '/portfolio/rituals-tasks.webp',
    light: '/portfolio/rituals-tasks-light.webp',
  },
  {
    label: 'Time Blocking',
    dark: '/portfolio/rituals-timeline.webp',
    light: '/portfolio/rituals-timeline-light.webp',
  },
  {
    label: 'Life Hub',
    dark: '/portfolio/rituals-command.webp',
    light: '/portfolio/rituals-command-light.webp',
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

function ProjectBadge({ icon: Icon = null, children }) {
  return (
    <span>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function ThemeImage({ light, dark, alt = '', className = '' }) {
  return (
    <>
      <img className={`${className} project-theme-asset project-theme-asset-light`} src={light} alt={alt} loading="lazy" />
      <img className={`${className} project-theme-asset project-theme-asset-dark`} src={dark} alt={alt} loading="lazy" />
    </>
  );
}

function RitualsSlideshow() {
  const reduceMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % ritualsSlides.length);
    }, 4400);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <div className="project-slideshow" aria-label="Rituals product screens">
      <div className="rituals-slide-stage">
        <div className="rituals-brand-lockup" aria-hidden="true">
          <img src="/brands/rituals.png" alt="" />
          <span>RITUALS</span>
        </div>
        {ritualsSlides.map((slide, index) => (
          <figure
            className={`rituals-slide ${activeSlide === index ? 'rituals-slide-active' : ''}`}
            key={slide.label}
            aria-hidden={activeSlide !== index}
          >
            <div className="rituals-device">
              <ThemeImage
                light={slide.light}
                dark={slide.dark}
                alt={activeSlide === index ? `Rituals ${slide.label} screen` : ''}
                className="rituals-screen"
              />
            </div>
            <figcaption>{slide.label}</figcaption>
          </figure>
        ))}
      </div>
      <div className="project-slide-controls" aria-label="Choose a Rituals screen">
        {ritualsSlides.map((slide, index) => (
          <button
            type="button"
            className={activeSlide === index ? 'is-active' : ''}
            onClick={() => setActiveSlide(index)}
            aria-label={`Show ${slide.label}`}
            aria-pressed={activeSlide === index}
            key={slide.label}
          >
            {String(index + 1).padStart(2, '0')}
          </button>
        ))}
        <span>{ritualsSlides[activeSlide].label}</span>
      </div>
    </div>
  );
}

function ProjectWindow({ index, title, type, description, links = null, tech, className, children }) {
  /** @type {React.CSSProperties & Record<string, string | number>} */
  const stackStyle = {
    '--stack-index': index - 1,
    '--stack-offset': `${(index - 1) * 7}px`,
    '--stack-mobile-offset': `${(index - 1) * 4}px`,
    '--stack-z': index,
  };

  return (
    <article
      className={`work-card work-window ${className}`}
      style={stackStyle}
    >
      <div className="work-window-bar">
        <div className="work-window-controls" aria-hidden="true"><span /><span /><span /></div>
        <div className="work-window-title"><span>Code City /</span> {title}</div>
        <span className="work-window-count">{String(index).padStart(2, '0')} — 05</span>
      </div>
      <div className="work-visual">{children}</div>
      <div className="work-card-body">
        <div className="work-card-copy">
          <div className="work-card-meta">
            <span className="work-index">{String(index).padStart(2, '0')}</span>
            <span className="work-type">{type}</span>
          </div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="work-card-actions">
          {links ? <div className="work-links">{links}</div> : null}
          <div className="work-status work-tech-stack">{tech}</div>
        </div>
      </div>
    </article>
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
              Five products. One cinematic stack. Scroll through the work as each product
              moves to the front.
            </p>
          </div>
        </div>

        <div className="work-stack" id="work-grid">
          <ProjectWindow
            index={1}
            title="AutoPilot CRM"
            type="AI-powered operations"
            description="An omnichannel operating system for customer conversations, workflows, analytics, and automation."
            className="work-card-autopilot"
            links={<ProjectLink href="https://autopilotcrm.ai/">Visit AutoPilot</ProjectLink>}
            tech={(
              <>
                <ProjectBadge icon={SiReact}>React</ProjectBadge>
                <ProjectBadge icon={SiTypescript}>TypeScript</ProjectBadge>
                <ProjectBadge icon={SiSupabase}>Supabase</ProjectBadge>
                <ProjectBadge icon={SiPython}>Python</ProjectBadge>
              </>
            )}
          >
            <ThemeImage
              light="/portfolio/autopilot-light.jpg"
              dark="/portfolio/autopilot-dark.jpg"
              alt="AutoPilot CRM website"
              className="autopilot-page-preview"
            />
          </ProjectWindow>

          <ProjectWindow
            index={2}
            title="Rituals"
            type="Native productivity"
            description="A daily planning and life-management system built as one considered experience across mobile and desktop."
            className="work-card-rituals"
            tech={(
              <>
                <ProjectBadge icon={SiSwift}>Swift</ProjectBadge>
                <ProjectBadge icon={SiKotlin}>Kotlin</ProjectBadge>
                <ProjectBadge icon={SiApple}>iOS</ProjectBadge>
                <ProjectBadge icon={SiAndroid}>Android</ProjectBadge>
                <ProjectBadge icon={SiApple}>macOS</ProjectBadge>
              </>
            )}
          >
            <RitualsSlideshow />
          </ProjectWindow>

          <ProjectWindow
            index={3}
            title="Inspire Capital"
            type="Workforce operations"
            description="Workforce management and talent infrastructure spanning recruitment, onboarding, and payroll administration."
            className="work-card-inspire"
            tech={(
              <>
                <ProjectBadge>Operations platform</ProjectBadge>
                <ProjectBadge>Private system</ProjectBadge>
              </>
            )}
          >
            <div className="inspire-brand-board">
              <div className="inspire-brand-main">
                <ThemeImage
                  light="/brands/inspire-capital-dark-ink.svg?v=1"
                  dark="/brands/inspire-capital.svg"
                  alt="Inspire Capital"
                  className="inspire-logo"
                />
                <p>People systems,<br />considered.</p>
              </div>
              <div className="inspire-system-map" aria-hidden="true">
                <span><b>01</b> Recruitment</span>
                <span><b>02</b> Onboarding</span>
                <span><b>03</b> Payroll</span>
              </div>
            </div>
          </ProjectWindow>

          <ProjectWindow
            index={4}
            title="Trade City"
            type="Trading intelligence"
            description="A native trading command center unifying portfolio intelligence, market signals, disciplined execution, and Nova AI."
            className="work-card-trade-city"
            tech={(
              <>
                <ProjectBadge icon={SiSwift}>Swift</ProjectBadge>
                <ProjectBadge icon={SiApple}>macOS</ProjectBadge>
                <ProjectBadge icon={SiApple}>iOS</ProjectBadge>
                <ProjectBadge icon={Sparkles}>Nova AI</ProjectBadge>
              </>
            )}
          >
            <ThemeImage
              light="/portfolio/trade-city-light.jpg"
              dark="/portfolio/trade-city-dark.jpg"
              alt=""
              className="trade-city-scenery"
            />
            <div className="trade-city-product" aria-label="Trade City product interface">
              <aside>
                <img src="/brands/trade-city.png" alt="Trade City" />
                <span className="is-active">Overview</span>
                <span>Markets</span>
                <span>Portfolio</span>
                <span>Nova</span>
              </aside>
              <TradeCityCharts />
            </div>
          </ProjectWindow>

          <ProjectWindow
            index={5}
            title="AirDrop Logistics"
            type="Multi-region logistics"
            description="A connected shipping and operations platform linking the United States with the Caribbean, Central America, and South America."
            className="work-card-airdrop"
            links={(
              <>
                <ProjectLink href="https://airdropja.com/">Jamaica</ProjectLink>
                <ProjectLink href="https://airdropus.com/">United States</ProjectLink>
              </>
            )}
            tech={(
              <>
                <ProjectBadge icon={SiLaravel}>Laravel</ProjectBadge>
                <ProjectBadge icon={SiPhp}>PHP</ProjectBadge>
                <ProjectBadge icon={SiReact}>React</ProjectBadge>
                <ProjectBadge icon={SiJavascript}>JavaScript</ProjectBadge>
                <ProjectBadge icon={SiSwift}>Swift</ProjectBadge>
                <ProjectBadge icon={SiKotlin}>Kotlin</ProjectBadge>
                <ProjectBadge icon={SiApple}>iOS</ProjectBadge>
                <ProjectBadge icon={SiApple}>macOS</ProjectBadge>
                <ProjectBadge icon={SiAndroid}>Android</ProjectBadge>
              </>
            )}
          >
            <motion.div
              className="airdrop-promo-panel"
              initial={reduceMotion ? false : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
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
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="airdrop-rings" aria-hidden="true">
                <span className="airdrop-ring airdrop-ring-outer" />
                <span className="airdrop-ring airdrop-ring-middle" />
                <span className="airdrop-ring airdrop-ring-inner" />
              </div>
              <picture className="airdrop-logo-lockup">
                <source media="(prefers-reduced-motion: reduce)" srcSet="/portfolio/airdrop-logo-static.png" />
                <img src="/portfolio/airdrop-logo-animated.webp" alt="" loading="lazy" />
              </picture>
            </motion.div>
          </ProjectWindow>
        </div>

        <div className="work-footnote">
          <span>05 products</span>
          <p>Distinct businesses. One standard of craft.</p>
        </div>
      </div>
    </section>
  );
}
