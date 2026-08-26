import React from 'react';
import { ArrowDownRight, Braces, Layers3, MoveUpRight, ScanLine } from 'lucide-react';
import usePageMetadata from '@/hooks/usePageMetadata';

const principles = [
  { number: '01', title: 'High ownership', copy: 'Own the problem, the decision, and the quality of the outcome.', icon: MoveUpRight },
  { number: '02', title: 'Craft before theatre', copy: 'Make the work clear, useful, durable, and worthy of attention.', icon: ScanLine },
  { number: '03', title: 'Product-minded engineering', copy: 'Understand the person, the system, and the consequences of every choice.', icon: Braces },
  { number: '04', title: 'One considered team', copy: 'Strategy, design, engineering, and growth move together.', icon: Layers3 },
];

export default function Careers() {
  usePageMetadata({
    title: 'Careers at Code City',
    description: 'Learn how Code City works and find current opportunities with our independent digital product studio.',
    path: '/careers',
  });

  return (
    <div className="careers-page">
      <section className="careers-hero" aria-labelledby="careers-title">
        <div className="site-container">
          <div className="careers-kicker"><span>Careers at Code City</span><b>Selective by design</b></div>
          <div className="careers-hero-grid">
            <h1 id="careers-title">Small team.<br /><em>Serious work.</em></h1>
            <div>
              <p>Code City brings ambitious digital products into the real world. We value excellent judgment, direct communication, technical depth, and the discipline to make complex work feel inevitable.</p>
              <a href="#open-roles">View open roles <ArrowDownRight aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="careers-principles" aria-labelledby="careers-principles-title">
        <div className="site-container">
          <div className="careers-section-heading">
            <span>How we work</span>
            <h2 id="careers-principles-title">The standard is the culture.</h2>
          </div>
          <div className="careers-principles-grid">
            {principles.map(({ number, title, copy, icon: Icon }) => (
              <article key={number}>
                <div><span>{number}</span><Icon aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="careers-openings" id="open-roles" aria-labelledby="open-roles-title">
        <div className="site-container careers-openings-grid">
          <div>
            <span>Open roles</span>
            <h2 id="open-roles-title">Nothing published right now.</h2>
          </div>
          <p>We hire deliberately and publish each opportunity here when the role, scope, and decision path are clear. Please check back for future openings.</p>
        </div>
      </section>
    </div>
  );
}
