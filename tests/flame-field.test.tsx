import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlameFooterBackdrop } from '../components/flame-backdrop/FlameFooterBackdrop';
import { canPlayField } from '../components/flame-backdrop/field/playback';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('field playback respects visibility, manual pause and browser visibility independently', () => {
  const active = { paused: false, visible: true, hidden: false };
  assert.equal(canPlayField(active), true);
  for (const override of [{ paused: true }, { visible: false }, { hidden: true }]) {
    assert.equal(canPlayField({ ...active, ...override }), false);
  }
});

test('footer and durable editor share image-backed runtime without production study dependencies', () => {
  for (const file of ['renderer', 'shader', 'texture', 'material']) {
    assert.doesNotMatch(source(`components/flame-backdrop/field/${file}.ts`), /from ['"][^'"]*(?:studies|devtools|teaser)/);
  }
  const footer = source('components/flame-backdrop/FlameFooterBackdrop.tsx');
  const editor = source('components/devtools/flame-editor/flame-editor.tsx');
  for (const text of [footer, editor]) assert.match(text, /field\/FieldCanvas/);
  assert.doesNotMatch(footer, /<FlameBackdrop|footerMaterial/);
  assert.match(footer, /<FieldCanvas ignition\b/);
  assert.doesNotMatch(editor, /<FieldCanvas ignition\b/);
  assert.match(footer, /visible=\{visible\}/);
  assert.doesNotMatch(footer, /ReducedMotion/);
  assert.match(footer, /maskSource=\{maskSource\}/);
  const html = renderToStaticMarkup(createElement(FlameFooterBackdrop, { maskSource: '/masks/custom.svg', paused: true }));
  assert.match(html, /data-flame-backdrop/);
  assert.match(html, /data-flame-field/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /<video|<img/);
  const renderer = source('components/flame-backdrop/field/FieldCanvas.tsx');
  assert.match(renderer, /canPlayField/);
  assert.match(renderer, /advanceFieldTime/);
});
