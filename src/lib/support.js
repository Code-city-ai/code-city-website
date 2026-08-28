export const SUPPORT_ISSUE_MAX_LENGTH = 2700;
export const STORED_INQUIRY_MESSAGE_MAX_LENGTH = 3000;

export function composeSupportMessage({ product, issueType, reference, message }) {
  if (message.length > SUPPORT_ISSUE_MAX_LENGTH) {
    throw new Error(`Please keep the issue description under ${SUPPORT_ISSUE_MAX_LENGTH.toLocaleString()} characters.`);
  }

  const supportMessage = [
    `Product: ${product}`,
    `Issue type: ${issueType}`,
    reference ? `Reference: ${reference}` : null,
    '',
    message,
  ].filter((line) => line !== null).join('\n');

  if (supportMessage.length > STORED_INQUIRY_MESSAGE_MAX_LENGTH) {
    throw new Error('Please shorten the issue description or reference before sending.');
  }

  return supportMessage;
}
