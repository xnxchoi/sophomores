import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import FooterFlame, { FlameFooterBackdrop, DEFAULT_FOOTER_CONFIG } from '../../flame-backdrop/footer';
import { FlameBackdrop } from '../../flame-backdrop';

test('footer entry selects the approved footer without changing the original ring export', () => {
  assert.equal(FooterFlame, FlameFooterBackdrop);
  assert.notEqual(FooterFlame, FlameBackdrop);
  assert.equal(DEFAULT_FOOTER_CONFIG.fire.plumeHeight, .25);
  const html = renderToStaticMarkup(<FooterFlame style={{ height: 480 }} />);
  assert.match(html, /height:480px/);
  assert.match(html, /data-flame-field/);
  assert.doesNotMatch(html, /<video|<img|<script/);
});

test('shipped runtime imports stay in this domain with React and Three as external dependencies', () => {
  const folders = [new URL('../../flame-backdrop/', import.meta.url)];
  for (const folder of folders) {
  for (const name of readdirSync(folder, { recursive: true }).filter((name): name is string => typeof name === 'string' && /\.tsx?$/.test(name) && !name.startsWith('flame-backdrop/'))) {
    const source = readFileSync(new URL(name, folder), 'utf8');
    for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.ok(['react', 'three', '@react-three/fiber', 'cn'].includes(match[1]) || match[1].startsWith('./') || match[1].startsWith('../'), `${name}: ${match[1]}`);
      assert.doesNotMatch(match[1], /(?:app|studies|devtools|teaser)\//);
    }
    assert.doesNotMatch(source, /\/Users\/|localhost|127\.0\.0\.1|backdrop-studies|footer-preview/);
  }
  }
});

test('component checkpoints elapsed animation time alongside ignition when replacing a renderer', () => {
  const source = readFileSync(new URL('../../flame-backdrop/react/FlameBackdrop.tsx', import.meta.url), 'utf8');
  assert.match(source, /const elapsedRef = useRef\(0\)/);
  assert.match(source, /initialElapsedSeconds: elapsedRef\.current/);
  assert.match(source, /elapsedRef\.current = renderer\.elapsedSeconds/);
  assert.match(source, /initialIgnitionProgress: viewport\.initialProgress/);
});
