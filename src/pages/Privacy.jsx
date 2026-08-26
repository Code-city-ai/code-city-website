import React from 'react';
import PolicyPage from '@/components/PolicyPage';

const sections = [
  {
    id: 'scope',
    title: 'Scope',
    content: <p>This policy covers information collected through codecity.ai, including project inquiries and product-support requests. A Code City product may provide an additional product-specific privacy notice where its data practices differ.</p>,
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    content: (
      <>
        <p>We collect the information you choose to provide, such as your name, email address, company, project details, product, account reference, and the content of your message.</p>
        <p>We may also receive limited technical information needed to operate and protect the website, including device, browser, network, usage, and security-event data.</p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    content: (
      <ul>
        <li>Respond to project, partnership, and support requests.</li>
        <li>Operate, maintain, protect, and improve our website and products.</li>
        <li>Diagnose technical issues and prevent fraud, abuse, or security threats.</li>
        <li>Meet legal, accounting, and regulatory obligations.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'How information is shared',
    content: <p>We do not sell personal information. We may share information with service providers that support hosting, infrastructure, communications, security, and business operations; when required by law; or as part of a legitimate business transfer. These parties receive only the access reasonably needed for their role.</p>,
  },
  {
    id: 'retention-and-security',
    title: 'Retention and security',
    content: <p>We retain information only as long as reasonably needed for the request, service, security, contractual, or legal purpose for which it was collected. We use practical administrative and technical safeguards, but no internet-based system can be guaranteed completely secure.</p>,
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    content: <p>You may ask to access, correct, or delete personal information by using our official support form and choosing “Data or privacy.” We may need to verify your identity before acting. Never send a password, payment-card number, or authentication code.</p>,
  },
  {
    id: 'children-and-updates',
    title: 'Children and policy updates',
    content: <p>Code City’s website and business services are not directed to children. We may update this policy as our services or legal obligations change; the effective date at the top identifies the current version.</p>,
  },
];

export default function Privacy() {
  return (
    <PolicyPage
      eyebrow="Privacy policy"
      title={<>Privacy,<br />without ambiguity.</>}
      introduction="A plain-language account of what Code City collects through this website, why we use it, and the choices available to you."
      metadata={{
        title: 'Code City Privacy Policy',
        description: 'Learn how Code City collects, uses, protects, and handles personal information submitted through codecity.ai.',
        path: '/privacy',
      }}
      sections={sections}
      action={{ eyebrow: 'Privacy request', label: 'Contact product support', href: '/support' }}
    />
  );
}
