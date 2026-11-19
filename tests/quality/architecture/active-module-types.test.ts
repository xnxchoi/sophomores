import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('active auth actions resolve to their component module, not legacy constants', () => {
  for (const file of ['account-forms', 'sign-in-card', 'second-factor']) {
    const source = read(`src/components/auth/${file}.tsx`);
    assert.match(source, /from ["']\.\/auth-actions["']/);
  }
  assert.match(read('src/components/auth/auth-actions.tsx'), /export function AuthSubmit/);
  assert.match(read('src/components/auth/auth-actions.tsx'), /export function AuthAlternate/);
  assert.match(read('src/components/auth/auth-actions.tsx'), /className="inline-flex h-\[35px\]/);
});

test('duplicate UI exports use the existing React namespace', () => {
  for (const file of ['input-otp', 'textarea']) {
    assert.ok(!read(`src/components/ui/${file}.tsx`).includes('HA_React'));
  }
  assert.match(read('src/components/ui/textarea.tsx'), /React\.MouseEventHandler/);
  assert.match(read('src/components/ui/textarea.tsx'), /React\.useCallback/);
});
