import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlameFooterBackdrop } from '../components/flame-backdrop/FlameFooterBackdrop';
import { canPlayField } from '../components/flame-backdrop/field/playback';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('field playback respects visibility, pause, reduced motion and browser visibility independently', () => {
  const active = { paused: false, visible: true, respectReducedMotion: true, reducedMotion: false, hidden: false };
  assert.equal(canPlayField(active), true);
  for (const override of [{ paused: true }, { visible: false }, { reducedMotion: true }, { hidden: true }]) {
    assert.equal(canPlayField({ ...active, ...override }), false);
  }
  assert.equal(canPlayField({ ...active, respectReducedMotion: false, reducedMotion: true }), true);
});

test('footer and durable editor share image-backed runtime without production study dependencies', () => {
  for (const file of ['renderer', 'shader', 'texture', 'material']) {
    assert.doesNotMatch(source(`components/flame-backdrop/field/${file}.ts`), /from ['"][^'"]*(?:studies|devtools|teaser)/);
  }
  const footer = source('components/flame-backdrop/FlameFooterBackdrop.tsx');
  const editor = source('components/devtools/flame-editor/flame-editor.tsx');
  for (const text of [footer, editor]) assert.match(text, /field\/renderer/);
  assert.doesNotMatch(footer, /<FlameBackdrop|footerMaterial|ignition/);
  assert.match(footer, /setVisible\(visible\)/);
  assert.match(footer, /setRespectReducedMotion\(respectReducedMotion\)/);
  assert.match(footer, /setMaskSource\(maskSource\)/);
  const html = renderToStaticMarkup(createElement(FlameFooterBackdrop, { maskSource: '/masks/custom.svg', paused: true }));
  assert.match(html, /data-flame-backdrop/);
  assert.match(html, /data-flame-field/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /<canvas/);
  const renderer = source('components/flame-backdrop/field/renderer.ts');
  assert.equal((renderer.match(/let seconds = 0/g) ?? []).length, 1);
  assert.match(renderer, /setVisible\(value: boolean\) \{ visible = value; sync\(\); \}/);
});
