import React, { useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, Box, Bug, KeyRound, LifeBuoy, ShieldCheck } from 'lucide-react';
import SupportForm from '@/components/SupportForm';

const routingSteps = [
  { number: '01', label: 'Choose the product', icon: Box },
  { number: '02', label: 'Name the issue', icon: Bug },
  { number: '03', label: 'Reach the right team', icon: ArrowUpRight },
];

export default function Support() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    const previousDescription = description?.getAttribute('content');
    const previousCanonical = canonical?.getAttribute('href');

    document.title = 'Code City Support — Product help';
    description?.setAttribute('content', 'Official customer support for software products designed and maintained by Code City.');
    canonical?.setAttribute('href', 'https://codecity.ai/support');

    return () => {
      document.title = previousTitle;
      if (previousDescription) description?.setAttribute('content', previousDescription);
      if (previousCanonical) canonical?.setAttribute('href', previousCanonical);
    };
  }, []);

  return (
    <div className="support-page">
      <section className="support-hero" aria-labelledby="support-page-title">
        <div className="site-container">
          <div className="support-kicker">
            <span><LifeBuoy aria-hidden="true" /> Official product support</span>
            <b>01 — 04</b>
          </div>

          <div className="support-hero-grid">
            <div className="support-hero-copy">
              <h1 id="support-page-title">Get support.<br /><em>Keep moving.</em></h1>
              <p>One clear route to the people who design, build, and maintain Code City products.</p>
              <a href="#support-request">Start a support request <ArrowDownRight aria-hidden="true" /></a>
            </div>

            <div className="support-routing-console" aria-label="How support requests are routed">
              <div className="support-console-head">
                <span>Request routing</span>
                <b><i /> Online</b>
              </div>
              <div className="support-console-core" aria-hidden="true">
                <span>CC</span>
                <i /><i /><i />
              </div>
              <ol>
                {routingSteps.map(({ number, label, icon: Icon }) => (
                  <li key={number}>
                    <span>{number}</span>
                    <strong>{label}</strong>
                    <Icon aria-hidden="true" />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="support-request-section" id="support-request" aria-labelledby="support-request-title">
        <div className="site-container support-request-grid">
          <aside className="support-request-intro">
            <span>Product help</span>
            <h2>Enough context.<br />No runaround.</h2>
            <p>Select the product, tell us what happened, and include a useful reference when you have one. Your request stays on a single support path.</p>

            <div className="support-guidance">
              <div><KeyRound aria-hidden="true" /><span>For access issues, tell us which account email is affected—never the password.</span></div>
              <div><ShieldCheck aria-hidden="true" /><span>For privacy or security concerns, choose “Data or privacy” so the request is clearly identified.</span></div>
            </div>
          </aside>

          <SupportForm />
        </div>
      </section>

      <section className="support-proof" aria-label="Code City support commitment">
        <div className="site-container support-proof-grid">
          <div>
            <span>03 — 04</span>
            <p>Designed by Code City.<br />Supported by Code City.</p>
          </div>
          <blockquote>“The support experience should be as considered as the product itself.”</blockquote>
        </div>
      </section>
    </div>
  );
}
