import {
  ATTRIBUTION_FIELDS,
  emptyAttribution,
  normalizeAttributionValue,
  parseAttribution,
  resolveAttributionSession,
} from '@/lib/attribution';

const VISITOR_KEY = 'codecity-marketing-visitor';
const SESSION_KEY = 'codecity-marketing-session';
const ATTRIBUTION_KEY = 'codecity-marketing-attribution-v2';
const CONSENT_KEY = 'codecity-tracking-consent';
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

const removeItem = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in strict privacy modes.
  }
};

const readSessionItem = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const trackingAllowed = () => {
  if (window.location.pathname === '/sign-in' || window.location.pathname.startsWith('/admin')) return false;
  try {
    if (localStorage.getItem(CONSENT_KEY) === 'denied') return false;
  } catch {
    // Continue without a stored preference.
  }
  return Reflect.get(navigator, 'globalPrivacyControl') !== true && navigator.doNotTrack !== '1';
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

const resolveTrackingContext = () => {
  const now = Date.now();
  const incoming = parseAttribution(window.location.search, document.referrer);
  const current = readJson(sessionStorage, SESSION_KEY);
  const storedTouch = readJson(sessionStorage, ATTRIBUTION_KEY);
  const resolved = resolveAttributionSession({
    currentSession: current,
    storedTouch,
    incomingTouch: incoming,
    now,
    newSessionId: uuid(),
    timeoutMs: SESSION_TIMEOUT_MS,
  });
  const { session, touch, isNew, touchOccurred } = resolved;

  if (isNew) {
    removeItem(sessionStorage, ATTRIBUTION_KEY);
  }
  if (touch.attributionPresent && (touchOccurred || storedTouch?.sessionId !== session.id)) {
    writeJson(sessionStorage, ATTRIBUTION_KEY, touch);
  }

  writeJson(sessionStorage, SESSION_KEY, session);

  return {
    visitorId: getVisitorId(),
    sessionId: session.id,
    sessionStartedAt: new Date(session.startedAt).toISOString(),
    isNew,
    attributionTouchOccurred: touchOccurred,
    ...touch,
  };
};

const currentDevice = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1100) return 'tablet';
  return 'desktop';
};

const publicContext = (context) => ({
  visitorId: context.visitorId,
  sessionId: context.sessionId,
  sessionStartedAt: context.sessionStartedAt || null,
  ...Object.fromEntries(
    ATTRIBUTION_FIELDS.map((field) => [field, normalizeAttributionValue(field, context[field])]),
  ),
  attributionPresent: Boolean(context.attributionPresent),
  attributionTouchOccurred: Boolean(context.attributionTouchOccurred),
  attributionCapturedAt: context.attributionCapturedAt || null,
  referrer: context.referrer || '',
});

export const getAttributionContext = () => {
  try {
    if (!trackingAllowed()) {
      const touch = emptyAttribution('');
      return { ...publicContext(touch), visitorId: null, sessionId: null };
    }
    return publicContext(resolveTrackingContext());
  } catch {
    return { visitorId: null, sessionId: null };
  }
};

const dispatchEvent = (context, eventName, properties) => {
  const payload = {
    eventId: uuid(),
    ...publicContext(context),
    eventName,
    occurredAt: new Date().toISOString(),
    path: `${window.location.pathname}${window.location.hash}`.slice(0, 500),
    deviceType: currentDevice(),
    properties,
  };

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
};

export const trackEvent = (eventName, properties = {}) => {
  try {
    if (!trackingAllowed()) return null;
    const context = resolveTrackingContext();
    if (context.isNew && eventName !== 'session_started') {
      dispatchEvent(context, 'session_started', { component: 'site' });
    }
    dispatchEvent(context, eventName, properties);
    return context.sessionId;
  } catch {
    return null;
  }
};

export const initializeMarketingTracking = () => {
  if (!trackingAllowed() || document.documentElement.dataset.codeCityMarketingInitialized === 'true') return;
  document.documentElement.dataset.codeCityMarketingInitialized = 'true';

  const initialSessionId = trackEvent('page_viewed', { component: 'site' });
  let engaged = initialSessionId
    ? readSessionItem(`codecity-marketing-engaged:${initialSessionId}`) === '1'
    : false;

  const handleScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable > 0 && window.scrollY / scrollable >= 0.4) markEngaged();
  };

  const markEngaged = () => {
    if (engaged) return;
    const sessionId = trackEvent('session_engaged', { component: 'site' });
    if (!sessionId) return;
    engaged = true;
    try {
      sessionStorage.setItem(`codecity-marketing-engaged:${sessionId}`, '1');
    } catch {
      // Engagement remains best-effort when storage is unavailable.
    }
    window.removeEventListener('scroll', handleScroll);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.setTimeout(markEngaged, 15_000);

  document.addEventListener('click', (event) => {
    markEngaged();
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
