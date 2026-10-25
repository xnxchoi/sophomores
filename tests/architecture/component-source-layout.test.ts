import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

test('non-React sibling-shared component modules use only the approved scoped exceptions', () => {
  const exceptions = [
    'arc/_shared/motion-tokens.ts',
    'authentication-studies/_shared/account-phase-copy.ts',
    'authentication-studies/_shared/account-phase-types.ts',
    'member-auth/_shared/session.ts',
    'Warp/_shared/tuning.ts',
    'Warp/sequence.ts',
    'Warp/warp-shaders.ts',
  ];
  const modules = readdirSync(resolve(repositoryRoot, 'components'), { recursive: true })
    .filter(file => typeof file === 'string' && file.endsWith('.ts') && !file.startsWith('flame-backdrop/') && !file.startsWith('devtools/'));
  assert.deepEqual(modules.toSorted(), exceptions.toSorted());
  assert.equal(existsSync(resolve(repositoryRoot, 'components/arc/lib/motion-tokens.ts')), false);
  assert.equal(existsSync(resolve(repositoryRoot, 'components/ui/direction.tsx')), false);
});

test('feature hooks stay beside actual consumers and contain real React hook code', () => {
  for (const file of [
    'components/phone-verification/use-compose-fallback.tsx',
    'components/arc/copy-button/use-copy-feedback.tsx',
    'components/teaser/use-device-flags.tsx',
  ]) {
    const source = readFileSync(resolve(repositoryRoot, file), 'utf8');
    assert.match(source, /from ["']react["']/);
    assert.match(source, /export function use[A-Z]/);
    assert.match(source, /use(?:State|Effect|SyncExternalStore)\(/);
  }
});

test('preview route and reference rendering implementations stay private to their app owners', () => {
  for (const file of [
    'app/(auth)/_shared/route-response.ts',
    'components/devtools/flame-reference/historical-renderer.ts',
  ]) assert.equal(existsSync(resolve(repositoryRoot, file)), true, file);
});

test('app and component trees do not contain test implementations', () => {
  for (const directory of ['app', 'components']) {
    const tests = readdirSync(resolve(repositoryRoot, directory), { recursive: true }).filter(file =>
      typeof file === 'string' && /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
    );
    assert.deepEqual(tests, []);
  }
});
