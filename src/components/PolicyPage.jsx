import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import usePageMetadata from '@/hooks/usePageMetadata';

export default function PolicyPage({ eyebrow, title, introduction, metadata, sections, action }) {
  usePageMetadata(metadata);

  return (
    <div className="policy-page">
      <header className="policy-hero">
        <div className="site-container policy-hero-grid">
          <div className="policy-hero-label">
            <span>{eyebrow}</span>
            <b>Effective August 26, 2026</b>
          </div>
          <div>
            <h1>{title}</h1>
            <p>{introduction}</p>
          </div>
        </div>
      </header>

      <div className="site-container policy-body-grid">
        <aside className="policy-index" aria-label={`${eyebrow} sections`}>
          <span>On this page</span>
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}><b>{String(index + 1).padStart(2, '0')}</b>{section.title}</a>
              </li>
            ))}
          </ol>
        </aside>

        <article className="policy-content">
          {sections.map((section, index) => (
            <section id={section.id} key={section.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{section.title}</h2>
                {section.content}
              </div>
            </section>
          ))}

          {action && (
            <a className="policy-action" href={action.href}>
              <span>{action.eyebrow}</span>
              <strong>{action.label}</strong>
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </article>
      </div>
    </div>
  );
}
