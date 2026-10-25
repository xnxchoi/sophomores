import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Allow only alternate decimal spellings of identical GPU Float32 values. */
export function assertShaderFloat32Equivalent(source: string, original: string): void {
  const numericToken = /(?<![\w.])(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?(?![\w.])/g;
  assert.deepEqual(source.split(numericToken), original.split(numericToken));
  const before = [...original.matchAll(numericToken)].map(match => match[0]);
  const after = [...source.matchAll(numericToken)].map(match => match[0]);
  assert.equal(after.length, before.length);
  before.forEach((value, index) => assert.equal(Math.fround(Number(after[index])), Math.fround(Number(value))));
}

/** Guard historic source integrity while allowing library-equivalent Float32 spellings. */
export function assertShaderFixture(
  source: string,
  name: 'ring' | 'gas' | 'footer-light' | 'footer-substance',
  expectedDigest: string,
): void {
  const original = readFileSync(new URL(`../fixtures/shaders/flame-${name}-before-library-color.glsl`, import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(original).digest('hex'), expectedDigest);
  // 4aedf35 deliberately consolidated/retuned these controls. Preserve the old
  // fixture digest and every equation; permit only the four committed settings.
  const tuned = original
    .replace('float softness = 0.065 +', 'float softness = 0.045 +')
    .replace('float body = smoothstep(0.0, .25, reaction) * 0.04;', 'float body = smoothstep(0.0, .25, reaction) * 0.15;')
    .replaceAll('(0.6 + 0.4 * materialBacklight)', '(0.6 + 0.74 * materialBacklight)')
    .replace('(0.6 + 0.74 * materialBacklight) * 0.08;', '(0.6 + 0.74 * materialBacklight) * 0.18;');
  assertShaderFloat32Equivalent(source, tuned);
}
