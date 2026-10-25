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
  assertShaderFloat32Equivalent(source, original);
}
