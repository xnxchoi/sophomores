import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

test('non-React sibling-shared component modules use only the approved scoped exceptions', () => {
  const exceptions = [
    'arc/_shared/motion-tokens.ts',
    'Authentication/_shared/account-phase-copy.ts',
    'Authentication/_shared/account-phase-types.ts',
    'Authentication/member-auth/_shared/session.ts',
    // Server shell, client island and mesh consume one serializable config.
    'shell/ticker/_shared/field-config.ts',
    // Checkout and result must validate the same persisted recovery record.
    'tickets/_shared/checkout-intent.ts',
    // TickIndicator and TickDial share one feature-private geometry contract.
    'ui/tick-indicator/_shared/magnify.ts',
    'Warp/_shared/sequence-editor.ts',
    'Warp/_shared/tuning.ts',
    'Warp/sequence.ts',
    'Warp/warp-shaders.ts',
  ];
  const modules = readdirSync(resolve(repositoryRoot, 'src/components'), { recursive: true })
    .filter(file => typeof file === 'string' && file.endsWith('.ts') && !file.startsWith('gl/flame-backdrop/') && !file.startsWith('flame-backdrop/') && !file.toLowerCase().startsWith('devtools/'));
  assert.deepEqual(modules.toSorted(), exceptions.toSorted());
  assert.equal(existsSync(resolve(repositoryRoot, 'src/components/arc/lib/motion-tokens.ts')), false);
  assert.equal(existsSync(resolve(repositoryRoot, 'src/components/ui/direction.tsx')), false);
});

test('retained React hook modules contain actual lifecycle code rather than cosmetic TSX wrappers', () => {
  for (const file of [
    'src/components/UX/Tour/hooks/useAnchoredRect.tsx',
    'src/components/UX/Tour/hooks/useTourTarget.tsx',
    'src/components/gl/canvas-frameloop.tsx',
    'src/components/shell/ticker/useBezelDisplacementTexture.tsx',
    'src/components/shell/ticker/useLaneScheduler.tsx',
    'src/components/ui/tick-indicator/useSyncedMotionValue.tsx',
  ]) {
    const source = readFileSync(resolve(repositoryRoot, file), 'utf8');
    assert.match(source, /from ["']react["']/);
    assert.match(source, /export (?:function|const) use[A-Z]/);
    assert.match(source, /use(?:Effect|LayoutEffect|State|Ref|Frame|MotionValue)\(/);
  }
});

test('feature hooks stay beside actual consumers and contain real React hook code', () => {
  for (const file of [
    'src/components/Authentication/phone-verification/use-compose-fallback.tsx',
    'src/components/arc/copy-button/use-copy-feedback.tsx',
    'src/components/teaser/use-device-flags.tsx',
  ]) {
    const source = readFileSync(resolve(repositoryRoot, file), 'utf8');
    assert.match(source, /from ["']react["']/);
    assert.match(source, /export function use[A-Z]/);
    assert.match(source, /use(?:State|Effect|SyncExternalStore)\(/);
  }
});

test('preview route and reference rendering implementations stay private to their app owners', () => {
  for (const file of [
    'src/app/(auth)/_shared/route-response.ts',
    'src/components/devtools/flame-reference/historical-renderer.ts',
  ]) assert.equal(existsSync(resolve(repositoryRoot, file)), true, file);
});

test('app and component trees do not contain test implementations', () => {
  for (const directory of ['src/app', 'src/components']) {
    const tests = readdirSync(resolve(repositoryRoot, directory), { recursive: true }).filter(file =>
      typeof file === 'string' && /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
    );
    assert.deepEqual(tests, []);
  }
});
