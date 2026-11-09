import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('read route retains index, slug, view and original font identities with existing files', () => {
  for (const file of ['page.tsx', '[slug]/page.tsx', 'reading-view.tsx', 'layout.tsx']) {
    assert.ok(existsSync(resolve(root, 'app/(site)/read', file)), file);
  }
  const layout = read('app/(site)/read/layout.tsx');
  const fonts = [...layout.matchAll(/src: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(fonts.length, 2);
  for (const font of fonts) {
    assert.ok(font.startsWith('../../../public/fonts/'), font);
    assert.ok(existsSync(resolve(root, 'app/(site)/read', font)), font);
  }
  assert.match(layout, /SUIT-Variable\.woff2/);
  assert.match(layout, /NarcissianNectare-Regular\.woff2/);
  assert.match(layout, /weight: "100 900"/);
  assert.match(layout, /variable: "--font-port-serif"/);
});

test('permanent legacy reading redirect preserves suffix and queries without changing IE rule', () => {
  const config = read('next.config.ts');
  const file = ts.createSourceFile('next.config.ts', config, ts.ScriptTarget.Latest, true);
  let array: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(file) === 'redirects') {
      const statement = node.body?.statements.find(ts.isReturnStatement);
      array = statement?.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(array);
  const redirects = runInNewContext(`(${array.getText(file)})`);
  const legacy = redirects.find((rule: {source: string}) => rule.source === '/reading/:path*');
  assert.ok(legacy);
  assert.equal(legacy.permanent, true);
  assert.equal(legacy.destination, '/read/:path*');
  for (const suffix of ['', '/lights-low', '/nested/article']) {
    const params = getPathMatch(legacy.source)(`/reading${suffix}`);
    assert.ok(params);
    const result = prepareDestination({ destination: legacy.destination, params, query: { q: 'two words', page: '2' }, appendParamsToQuery: false });
    assert.equal(result.parsedDestination.pathname, `/read${suffix}`);
    assert.equal(result.parsedDestination.query.q, 'two words');
    assert.equal(result.parsedDestination.query.page, '2');
  }
  for (const suffix of ['/a%2Fb', '/a/../story', '/%2e%2e/story']) {
    const params = getPathMatch(legacy.source)(`/reading${suffix}`);
    assert.ok(params);
    const result = prepareDestination({
      destination: legacy.destination, params,
      query: { path: '//foreign.test', destination: 'https://foreign.test/' },
      appendParamsToQuery: false,
    });
    // Check the real Next matcher/compiler result, without assuming its
    // path-segment normalization rules or treating query values as routing.
    const resolved = new URL(result.newUrl, 'https://example.test');
    assert.equal(resolved.origin, 'https://example.test');
    assert.equal(result.parsedDestination.query.path, '//foreign.test');
    assert.equal(result.parsedDestination.query.destination, 'https://foreign.test/');
  }
  assert.equal(getPathMatch(legacy.source)('/reading//foreign.test/story'), false);
  const ie = redirects.find((rule: {destination: string}) => rule.destination === '/ie-incompatible.html');
  assert.equal(redirects[0], ie);
  assert.equal(ie.permanent, false);
  assert.equal(ie.has[0].value, '(.*Trident.*)');
});

test('active generated links target read without renaming reading component imports', () => {
  for (const file of ['src/lib/content/map.ts', 'src/lib/content/menu.ts', 'src/lib/content/fixtures.ts', 'src/lib/content/reading-surface.ts', 'src/components/shell/header-panels.tsx']) {
    assert.ok(!/["'`]\/reading(?:[\/"'`])/.test(read(file)), file);
  }
  assert.match(read('app/(site)/read/reading-view.tsx'), /@\/components\/reading\/reading-stage/);
});
