import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SUPPORT_ISSUE_MAX_LENGTH,
  STORED_INQUIRY_MESSAGE_MAX_LENGTH,
  composeSupportMessage,
} from '../../src/lib/support.js';

test('a maximum-length support issue remains within the stored inquiry limit', () => {
  const composed = composeSupportMessage({
    product: 'Other Code City product',
    issueType: 'Other support request',
    reference: 'R'.repeat(160),
    message: 'M'.repeat(SUPPORT_ISSUE_MAX_LENGTH),
  });

  assert.ok(composed.length <= STORED_INQUIRY_MESSAGE_MAX_LENGTH);
  assert.match(composed, /^Product: Other Code City product/);
});

test('an issue beyond the advertised form limit is rejected before transport', () => {
  assert.throws(
    () => composeSupportMessage({
      product: 'Rituals',
      issueType: 'Account or access',
      reference: '',
      message: 'M'.repeat(SUPPORT_ISSUE_MAX_LENGTH + 1),
    }),
    /under 2,700 characters/,
  );
});
