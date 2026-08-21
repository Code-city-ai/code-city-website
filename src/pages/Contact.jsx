import React, { useEffect } from 'react';
import { ArrowDownRight, Clock3, Compass, MessagesSquare } from 'lucide-react';
import InquiryForm from '@/components/InquiryForm';

const expectations = [
  {
    icon: MessagesSquare,
    number: '01',
    title: 'A thoughtful reply',
    copy: 'Your inquiry is reviewed by the people who would shape and build the work.',
  },
  {
    icon: Compass,
    number: '02',
    title: 'A clear first move',
    copy: 'We identify the most useful next step before suggesting scope, schedule, or engagement.',
  },
  {
    icon: Clock3,
    number: '03',
    title: 'No sales maze',
    copy: 'You receive a direct response built around the opportunity—not an automated sequence.',
  },
];

export default function Contact() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Contact Code City — Start a project';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="contact-page">
      <section className="contact-page-hero" aria-labelledby="contact-page-title">
        <div className="site-container">
          <div className="contact-page-kicker"><span>New partnership</span><b>01 — 03</b></div>
          <div className="contact-page-hero-grid">
            <h1 id="contact-page-title">Tell us what <br />you’re building.</h1>
            <div className="contact-page-intro">
              <p>Bring the ambition, the friction, or simply the beginning of an idea. We’ll help make the next move precise.</p>
              <a href="#project-brief">Start the brief <ArrowDownRight aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-page-process" aria-label="What to expect">
        <div className="site-container contact-expectations">
          {expectations.map(({ icon: Icon, number, title, copy }) => (
            <article key={title}>
              <div><span>{number}</span><Icon aria-hidden="true" /></div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-page-brief" id="project-brief" aria-labelledby="project-brief-title">
        <div className="site-container contact-page-brief-grid">
          <div className="contact-page-brief-copy">
            <span>Project brief</span>
            <h2 id="project-brief-title">It doesn’t need to be polished.</h2>
            <p>A few honest details are enough to begin. Tell us what should exist, what is getting in the way, and why it matters now.</p>
          </div>
          <InquiryForm className="contact-page-form" />
        </div>
      </section>
    </div>
  );
}
