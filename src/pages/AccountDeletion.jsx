import React from 'react';
import PolicyPage from '@/components/PolicyPage';

const sections = [
  {
    id: 'request-deletion',
    title: 'How to request deletion',
    content: (
      <ol>
        <li>Open Code City’s official product-support form.</li>
        <li>Select the product connected to your account.</li>
        <li>Choose “Data or privacy” as the issue type.</li>
        <li>Write “Delete my account” and submit the request using the email associated with that account.</li>
        <li>Include an account, order, or case reference when available. Do not include a password or authentication code.</li>
      </ol>
    ),
  },
  {
    id: 'identity-verification',
    title: 'Identity verification',
    content: <p>Before deleting an account, Code City or the relevant product team may verify that the requester controls the affected account. This protects customers from unauthorized or fraudulent deletion requests.</p>,
  },
  {
    id: 'what-is-deleted',
    title: 'What is deleted',
    content: <p>Once a verified request is approved, we delete or de-identify the account profile, authentication data, preferences, and product content that is not required for an ongoing legal, security, financial, or contractual purpose.</p>,
  },
  {
    id: 'what-may-remain',
    title: 'What may be retained',
    content: <p>Limited records may be retained where required for accounting, transaction history, fraud prevention, security auditing, dispute resolution, or legal compliance. De-identified or aggregated information that can no longer reasonably identify you may also remain.</p>,
  },
  {
    id: 'timing-and-backups',
    title: 'Timing and backups',
    content: <p>Verified requests are generally completed within 30 days. If a longer retention period is legally required, we will explain that in our response. Residual copies may remain in encrypted backups until those backups are replaced on their normal schedule.</p>,
  },
  {
    id: 'before-you-delete',
    title: 'Before you delete',
    content: <p>Account deletion is permanent and may remove access to product history, content, settings, and connected services. Download anything you are entitled to keep before submitting the request.</p>,
  },
];

export default function AccountDeletion() {
  return (
    <PolicyPage
      eyebrow="Account deletion"
      title={<>Your account.<br />Your decision.</>}
      introduction="The official route for requesting deletion of an account connected to a product designed or maintained by Code City."
      metadata={{
        title: 'Code City Account Deletion Policy',
        description: 'Official instructions for requesting deletion of an account connected to a Code City product.',
        path: '/account-deletion',
      }}
      sections={sections}
      action={{ eyebrow: 'Official request channel', label: 'Request account deletion', href: '/support' }}
    />
  );
}
