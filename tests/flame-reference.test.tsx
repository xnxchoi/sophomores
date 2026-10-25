import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlameReference } from '../app/(site)/studies/flame-reference/reference';

test('reference defaults to selected B and offers optional breathing without replacing originals', () => {
  const html = renderToStaticMarkup(createElement(FlameReference));
  assert.match(html, /B is the selected baseline/);
  assert.match(html, /B \+ A↔B breathing \(24s\)/);
  assert.match(html, /value="stronger" selected=""/);
  assert.match(html, /A — Original gas · 01:46/);
  assert.match(html, /B — Increased emission · 01:50/);
  assert.match(html, /data-render-status="loading"/);
  assert.match(html, /Pause/);
  assert.doesNotMatch(html, /opacity:0.85|Silk study/);
});

test('historical renderer retains clocks during material switching and cleans up resources', () => {
  const source = readFileSync(new URL('../app/(site)/studies/flame-reference/_rendering/historical-renderer.ts', import.meta.url), 'utf8');
  assert.match(source, /visibilitychange/);
  assert.doesNotMatch(source, /prefers-reduced-motion/);
  for (const cleanup of ['geometry.dispose()', 'material.dispose()', 'renderer.dispose()', 'observer.disconnect()', 'cancelAnimationFrame']) assert.ok(source.includes(cleanup));
  assert.match(source, /setVariant\(next: HistoricalVariant\)/);
  assert.match(source, /uPaletteWeights: \{ value: new Vector3\(0, 1, 0\)/);
  assert.doesNotMatch(source, /opacity:|AdditiveBlending/);
  assert.match(source, /options\.variant/);
  assert.match(source, /options\.paused/);
});
