import { getAttributionContext } from '@/lib/marketing';
import { normalizeSourceUrl } from '@/lib/attribution';
import { composeSupportMessage } from '@/lib/support';

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
    body: JSON.stringify({
      ...payload,
      sourceUrl: normalizeSourceUrl(payload.sourceUrl),
      ...attribution,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || 'We could not send your inquiry. Please try again.');
  }

  return body;
}

export async function submitSupportRequest({ name, email, product, issueType, reference, message, website, sourceUrl, submissionId }) {
  const supportMessage = composeSupportMessage({ product, issueType, reference, message });

  return submitInquiry({
    name,
    email,
    organization: product,
    projectType: 'product-support',
    budgetRange: '',
    message: supportMessage,
    website,
    sourceUrl,
    submissionId,
  });
}
