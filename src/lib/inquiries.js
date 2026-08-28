import { getAttributionContext, trackEvent } from '@/lib/marketing';

const getInquiryEndpoint = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('The secure inquiry service is not connected yet.');
  }

  return {
    url: `${supabaseUrl}/functions/v1/submit-inquiry`,
    anonKey,
  };
};

export async function submitInquiry(payload) {
  const { url, anonKey } = getInquiryEndpoint();
  const attribution = getAttributionContext();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, ...attribution }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || 'We could not send your inquiry. Please try again.');
  }

  trackEvent(
    payload.projectType === 'product-support' ? 'support_form_submitted' : 'contact_form_submitted',
    { form_type: payload.projectType === 'product-support' ? 'support' : 'project-inquiry' },
  );

  return body;
}

export async function submitSupportRequest({ name, email, product, issueType, reference, message, website, sourceUrl }) {
  const supportMessage = [
    `Product: ${product}`,
    `Issue type: ${issueType}`,
    reference ? `Reference: ${reference}` : null,
    '',
    message,
  ].filter((line) => line !== null).join('\n');

  return submitInquiry({
    name,
    email,
    organization: product,
    projectType: 'product-support',
    budgetRange: '',
    message: supportMessage,
    website,
    sourceUrl,
  });
}
