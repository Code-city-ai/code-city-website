import React from 'react';
import Hero from '../components/landing/Hero';
import Services from '../components/landing/Services';
import SelectedWork from '../components/landing/SelectedWork';
import WhyUs from '../components/landing/WhyUs';
import TechShowcase from '../components/landing/TechShowcase';
import CTA from '../components/landing/CTA';

export default function Landing() {
  return (
    <div>
      <Hero />
      <Services />
      <SelectedWork />
      <WhyUs />
      <TechShowcase />
      <CTA />
    </div>
  );
}
