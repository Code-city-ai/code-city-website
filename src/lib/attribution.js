export const ATTRIBUTION_FIELDS = [
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'campaignExternalId',
  'adsetExternalId',
  'adExternalId',
];

export const ATTRIBUTION_FIELD_LIMITS = {
  utmSource: 120,
  utmMedium: 120,
  utmCampaign: 190,
  utmContent: 190,
  utmTerm: 190,
  gclid: 255,
  fbclid: 255,
  msclkid: 255,
  ttclid: 255,
  campaignExternalId: 255,
  adsetExternalId: 255,
  adExternalId: 255,
};

const PARAMS = {
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
  utmContent: 'utm_content',
  utmTerm: 'utm_term',
  gclid: 'gclid',
  fbclid: 'fbclid',
  msclkid: 'msclkid',
  ttclid: 'ttclid',
  campaignExternalId: 'campaign_id',
  adsetExternalId: 'adset_id',
  adExternalId: 'ad_id',
};

export const attributionFingerprint = (touch) => ATTRIBUTION_FIELDS
  .map((field) => touch?.[field] || '')
  .join('\u001f');

export const normalizeAttributionValue = (field, value) => (
  typeof value === 'string' ? value.trim().slice(0, ATTRIBUTION_FIELD_LIMITS[field]) : ''
);

export const normalizeSourceUrl = (sourceUrl = '') => {
  if (!sourceUrl) return '';
  try {
    const url = new URL(sourceUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return '';
  }
};

export const normalizeReferrer = (referrer = '') => {
  if (!referrer) return '';
  try {
    const url = new URL(referrer);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return `${url.origin}${url.pathname}`.slice(0, 1000);
  } catch {
    return '';
  }
};

export const parseAttribution = (search = '', referrer = '', capturedAt = new Date().toISOString()) => {
  const params = new URLSearchParams(search);
  const touch = Object.fromEntries(
    ATTRIBUTION_FIELDS.map((field) => [field, normalizeAttributionValue(field, params.get(PARAMS[field]))]),
  );

  const attributionPresent = ATTRIBUTION_FIELDS.some((field) => Boolean(touch[field]));

  if (!touch.utmSource) {
    if (touch.gclid) touch.utmSource = 'google';
    else if (touch.msclkid) touch.utmSource = 'microsoft_ads';
    else if (touch.ttclid) touch.utmSource = 'tiktok';
  }

  return {
    ...touch,
    referrer: normalizeReferrer(referrer),
    attributionPresent,
    attributionCapturedAt: attributionPresent ? capturedAt : null,
    fingerprint: attributionFingerprint(touch),
  };
};

export const emptyAttribution = (referrer = '') => ({
  ...Object.fromEntries(ATTRIBUTION_FIELDS.map((field) => [field, ''])),
  referrer: normalizeReferrer(referrer),
  attributionPresent: false,
  attributionCapturedAt: null,
  fingerprint: attributionFingerprint(null),
});

export const resolveAttributionSession = ({
  currentSession,
  storedTouch,
  incomingTouch,
  now,
  newSessionId,
  timeoutMs,
}) => {
  const active = Boolean(currentSession?.id && now - currentSession.lastActivityAt < timeoutMs);
  const storedForCurrentSession = active && storedTouch?.sessionId === currentSession.id ? storedTouch : null;
  const incomingMatchesStored = Boolean(
    incomingTouch.attributionPresent
    && storedForCurrentSession
    && incomingTouch.fingerprint === storedForCurrentSession.fingerprint,
  );
  const campaignChanged = Boolean(
    active
    && incomingTouch.attributionPresent
    && !incomingMatchesStored,
  );
  const isNew = !active || campaignChanged;
  const session = isNew
    ? { id: newSessionId, startedAt: now, lastActivityAt: now }
    : { ...currentSession, lastActivityAt: now };

  let touch;
  let touchOccurred = false;
  if (incomingTouch.attributionPresent) {
    if (!isNew && incomingMatchesStored) {
      touch = storedForCurrentSession;
    } else {
      touch = { ...incomingTouch, sessionId: session.id, version: 2 };
      touchOccurred = true;
    }
  } else if (!isNew && storedForCurrentSession) {
    touch = storedForCurrentSession;
  } else {
    touch = { ...emptyAttribution(incomingTouch.referrer), sessionId: session.id, version: 2 };
  }

  session.attributionFingerprint = touch.attributionPresent ? touch.fingerprint : '';
  return { session, touch, isNew, touchOccurred };
};
