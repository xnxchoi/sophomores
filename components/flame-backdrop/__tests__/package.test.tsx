import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import FooterFlame, { FlameFooterBackdrop, DEFAULT_FOOTER_CONFIG } from '../footer';
import { FlameBackdrop } from '../index';

test('footer entry selects the approved footer without changing the original ring export', () => {
  assert.equal(FooterFlame, FlameFooterBackdrop);
  assert.notEqual(FooterFlame, FlameBackdrop);
  assert.equal(DEFAULT_FOOTER_CONFIG.fire.plumeHeight, .25);
  const html = renderToStaticMarkup(<FooterFlame style={{ height: 480 }} />);
  assert.match(html, /height:480px/);
  assert.match(html, /<canvas[^>]*hidden/);
  assert.doesNotMatch(html, /<video|<img|<script/);
});

test('shipped runtime imports stay in this folder with React as the only external dependency', () => {
  const folder = new URL('../', import.meta.url);
  for (const name of readdirSync(folder).filter(name => /\.tsx?$/.test(name))) {
    const source = readFileSync(new URL(name, folder), 'utf8');
    for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.ok(match[1] === 'react' || match[1].startsWith('./'), `${name}: ${match[1]}`);
    }
    assert.doesNotMatch(source, /\/Users\/|localhost|127\.0\.0\.1|backdrop-studies|footer-preview/);
  }
});
