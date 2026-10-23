import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLocalFixtureMessage } from '../scripts/phone-verification-fixture';
import { parseCarrierMessage } from '../lib/phone-verification/server/message';
test('local fixture uses a parseable synthetic MMS with stable synthetic sender', async () => {
  const token = 'A'.repeat(43);
  const raw = buildLocalFixtureMessage({ token, recipient: 'verify@example.invalid', messageId: '1792720110299936736' });
  const message = await parseCarrierMessage(raw, { recipient: 'verify@example.invalid' });
  assert.equal(message.phone, '+821012345678');
  assert.equal(message.token, token);
  assert.equal(message.carrier, 'skt');
});
