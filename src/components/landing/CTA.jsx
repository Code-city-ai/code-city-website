import React from 'react';
import InquiryForm from '@/components/InquiryForm';

export default function CTA() {
  return (
    <section className="section contact-section" id="contact" aria-labelledby="contact-title">
      <div className="site-container contact-layout">
        <div className="contact-copy">
          <div className="section-label section-label-inverse"><span>06</span> Start a project</div>
          <h2 id="contact-title">Let’s build the thing people remember.</h2>
          <p>Tell us what you are solving, where you are stuck, and what success looks like. You do not need a perfect brief.</p>
          <div className="contact-note">
            <span>What happens next</span>
            <p>We review every inquiry ourselves, then respond with a clear recommendation—not a generic sales sequence.</p>
          </div>
        </div>

        <InquiryForm />
      </div>
    </section>
  );
}
