import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('the normal test command includes root and scoped TypeScript test files', () => {
  const root = fileURLToPath(new URL('../../tests/', import.meta.url));
  const { scripts } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const runner = scripts.test.includes("run-unit.mjs")
    ? readFileSync(new URL('../../tests/run-unit.mjs', import.meta.url), 'utf8')
    : scripts.test;
  for (const pattern of ['tests/**/*.test.ts', 'tests/**/*.test.tsx']) {
    assert.ok(runner.includes(pattern));
  }
  const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).map(String);
  assert.ok(files.includes('browser/visibility.test.ts'));
  assert.ok(files.includes('flame-backdrop/library-reuse.test.ts'));
  assert.ok(files.includes('deployment-package.test.ts'));
});
