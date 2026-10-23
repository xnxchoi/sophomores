import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localPreviewArguments } from '../scripts/phone-verification-preview';
test('local preview binds only loopback and never inherits Node env-file arguments', () => {
  const args = localPreviewArguments('/owned/preview', 'http://127.0.0.1:3217');
  assert.deepEqual(args, ['dev', '/owned/preview', '--hostname', '127.0.0.1', '--port', '3217', '--webpack']);
  assert.throws(() => localPreviewArguments('/owned/preview', 'https://sophomores.co'), /local/);
  assert.throws(() => localPreviewArguments('/owned/preview', 'http://localhost:3217'), /127/);
});
