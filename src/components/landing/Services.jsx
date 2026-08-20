import React from 'react';
import { motion } from 'framer-motion';
import { Blocks, ChartNoAxesCombined, CodeXml, Shapes } from 'lucide-react';

const services = [
  {
    number: '01',
    icon: Shapes,
    title: 'Product strategy',
    description: 'Turn a fuzzy opportunity into a focused product direction, a practical roadmap, and a measurable definition of success.',
    outputs: ['Research', 'Positioning', 'Roadmaps'],
  },
  {
    number: '02',
    icon: Blocks,
    title: 'Experience design',
    description: 'Create an interface and design system that feel unmistakably yours—and make every important action feel effortless.',
    outputs: ['UX systems', 'UI design', 'Prototypes'],
  },
  {
    number: '03',
    icon: CodeXml,
    title: 'Software engineering',
    description: 'Ship resilient web and mobile products with clean foundations, deliberate security, and performance built in from day one.',
    outputs: ['Web platforms', 'Mobile apps', 'AI products'],
  },
  {
    number: '04',
    icon: ChartNoAxesCombined,
    title: 'Growth systems',
    description: 'Connect product, analytics, and marketing into a growth loop that turns attention into adoption and adoption into loyalty.',
    outputs: ['Acquisition', 'Analytics', 'Optimization'],
  },
];

export default function Services() {
  return (
    <section className="section services-section" id="services" aria-labelledby="services-title">
      <div className="site-container">
        <div className="section-heading">
          <div className="section-label"><span>02</span> Capabilities</div>
          <div>
            <h2 id="services-title">From first principle to final pixel.</h2>
            <p>Four disciplines move as one team, so the product stays coherent from the first decision through launch and beyond.</p>
          </div>
        </div>

        <div className="services-grid">
          {services.map((service, index) => (
            <motion.article
              className="service-card"
              key={service.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
            >
              <div className="service-card-top">
                <span>{service.number}</span>
                <service.icon aria-hidden="true" />
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ul aria-label={`${service.title} deliverables`}>
                {service.outputs.map((output) => <li key={output}>{output}</li>)}
              </ul>
            </motion.article>
          ))}
        </div>

        <div className="service-principle">
          <span>Our operating principle</span>
          <p>Make the complex feel considered, clear, and inevitable.</p>
        </div>
      </div>
    </section>
  );
}
