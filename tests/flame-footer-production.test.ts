import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('production footer opts into gas ignition without changing the canonical editor', () => {
  const footer = readFileSync(new URL('../components/flame-backdrop/FlameFooterBackdrop.tsx', import.meta.url), 'utf8');
  const editor = readFileSync(new URL('../components/devtools/flame-editor/flame-editor.tsx', import.meta.url), 'utf8');
  assert.match(footer, /<FieldCanvas\b[^>]*\bignition(?:\s|[=>])/);
  assert.doesNotMatch(editor, /\bignition[=\s]/);
});

test('production motion receives a continuous active clock without changing the historical loop', () => {
  const canvas = readFileSync(new URL('../components/flame-backdrop/FieldCanvas.tsx', import.meta.url), 'utf8');
  assert.match(canvas, /uMotionTime: \{ value: 0 \}/);
  assert.match(canvas, /values\.uMotionTime\.value = seconds;/);
  assert.match(canvas, /values\.uTime\.value = seconds % config\.motion\.loopSeconds;/);
});
