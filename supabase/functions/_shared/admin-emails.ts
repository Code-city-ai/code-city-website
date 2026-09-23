// Code City Admin is restricted to these three Auth identities. Project codes
// and active profiles are still required after the email check.
export const APPROVED_ADMIN_EMAILS = Object.freeze([
  'dev@codecity.ai',
  'hugosan8210@gmail.com',
  'tradecity.mc@proton.me',
]);

const approved = new Set<string>(APPROVED_ADMIN_EMAILS);

export function isApprovedAdminEmail(value: unknown): boolean {
  return typeof value === 'string' && approved.has(value.toLowerCase());
}

export function isOwnerAdminEmail(value: unknown): boolean {
  return typeof value === 'string' && value.toLowerCase() === 'dev@codecity.ai';
}
