import { useEffect } from 'react';

export default function usePageMetadata({ title, description, path }) {
  useEffect(() => {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    const previous = {
      title: document.title,
      description: descriptionMeta?.getAttribute('content'),
      canonical: canonical?.getAttribute('href'),
    };

    document.title = title;
    descriptionMeta?.setAttribute('content', description);
    canonical?.setAttribute('href', `https://codecity.ai${path}`);

    return () => {
      document.title = previous.title;
      if (previous.description) descriptionMeta?.setAttribute('content', previous.description);
      if (previous.canonical) canonical?.setAttribute('href', previous.canonical);
    };
  }, [description, path, title]);
}
