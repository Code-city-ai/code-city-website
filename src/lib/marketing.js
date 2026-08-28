const VISITOR_KEY = 'codecity-marketing-visitor';
const SESSION_KEY = 'codecity-marketing-session';
const ATTRIBUTION_KEY = 'codecity-marketing-attribution';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const uuid = () => crypto.randomUUID();

const readJson = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

const writeJson = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Tracking is best-effort and must never interrupt the public experience.
  }
};

const getVisitorId = () => {
  try {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = uuid();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  } catch {
    return uuid();
  }
};

const getSession = () => {
  const now = Date.now();
  const current = readJson(sessionStorage, SESSION_KEY);
  if (current?.id && now - current.lastActivityAt < SESSION_TIMEOUT_MS) {
    const active = { ...current, lastActivityAt: now };
    writeJson(sessionStorage, SESSION_KEY, active);
    return { ...active, isNew: false };
  }

  const next = { id: uuid(), startedAt: now, lastActivityAt: now };
  writeJson(sessionStorage, SESSION_KEY, next);
  return { ...next, isNew: true };
};

const currentDevice = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1100) return 'tablet';
  return 'desktop';
};

const captureAttribution = () => {
  const existing = readJson(sessionStorage, ATTRIBUTION_KEY) || {};
  const params = new URLSearchParams(window.location.search);
  const captured = {
    utmSource: params.get('utm_source') || existing.utmSource || '',
    utmMedium: params.get('utm_medium') || existing.utmMedium || '',
    utmCampaign: params.get('utm_campaign') || existing.utmCampaign || '',
    utmContent: params.get('utm_content') || existing.utmContent || '',
    utmTerm: params.get('utm_term') || existing.utmTerm || '',
    referrer: existing.referrer || document.referrer || '',
  };
  writeJson(sessionStorage, ATTRIBUTION_KEY, captured);
  return captured;
};

export const getAttributionContext = () => {
  try {
    const session = getSession();
    return {
      visitorId: getVisitorId(),
      sessionId: session.id,
      ...captureAttribution(),
    };
  } catch {
    return { visitorId: uuid(), sessionId: uuid() };
  }
};

export const trackEvent = (eventName, properties = {}) => {
  try {
    const session = getSession();
    const attribution = captureAttribution();
    const payload = {
      eventId: uuid(),
      visitorId: getVisitorId(),
      sessionId: session.id,
      eventName,
      occurredAt: new Date().toISOString(),
      path: `${window.location.pathname}${window.location.hash}`.slice(0, 500),
      deviceType: currentDevice(),
      properties,
      ...attribution,
    };

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});

    if (session.isNew && eventName !== 'session_started') {
      trackEvent('session_started', { component: 'site' });
    }
  } catch {
    // Local storage and tracking failures are deliberately non-blocking.
  }
};

export const initializeMarketingTracking = () => {
  if (window.location.pathname === '/sign-in' || window.location.pathname.startsWith('/admin')) return;
  trackEvent('page_viewed', { component: 'site' });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a, button');
    if (!(link instanceof HTMLElement)) return;
    const explicitLabel = link.dataset.trackLabel;
    const isPrimaryCta = link.matches('.header-cta, .mobile-nav-cta, .hero-primary, .submit-button');
    if (!explicitLabel && !isPrimaryCta) return;
    trackEvent('cta_clicked', {
      component: link.dataset.trackComponent || 'site',
      label: (explicitLabel || link.textContent || '').trim().slice(0, 200),
      destination: link.getAttribute('href') || '',
    });
  }, { passive: true });
};
