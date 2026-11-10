import messages from "../../messages/en.json";
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

test('canonical essays route retains index, slug, view and original font identities with existing files', () => {
  for (const file of ['page.tsx', '[slug]/page.tsx', 'reading-view.tsx', 'layout.tsx']) {
    assert.ok(existsSync(resolve(root, 'src/app/(site)/essays', file)), file);
  }
  for (const alias of ['read', 'reading']) {
    assert.equal(existsSync(resolve(root, `src/app/(site)/${alias}`)), false,
      `${alias} remains a redirect, not another filesystem page owner`);
  }
  const layout = read('src/app/(site)/essays/layout.tsx');
  const fonts = [...layout.matchAll(/src: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(fonts.length, 2);
  for (const font of fonts) {
    assert.ok(font.startsWith('../../../../public/fonts/'), font);
    assert.ok(existsSync(resolve(root, 'src/app/(site)/essays', font)), font);
  }
  assert.match(layout, /SUIT-Variable\.woff2/);
  assert.match(layout, /NarcissianNectare-Regular\.woff2/);
  assert.match(layout, /weight: "100 900"/);
  assert.match(layout, /variable: "--font-port-serif"/);
});

test('both permanent legacy aliases preserve suffix and queries without changing IE rule', () => {
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
  for (const alias of ['/read', '/reading']) {
    const legacy = redirects.find((rule: {source: string}) => rule.source === `${alias}/:path*`);
    assert.ok(legacy, `${alias} must redirect directly to the canonical route`);
    assert.equal(legacy.permanent, true);
    assert.equal(legacy.destination, '/essays/:path*');
    for (const suffix of ['', '/lights-low', '/nested/article', '/repeat/repeat', '/a%2Fb', '/caf%C3%A9']) {
      const params = getPathMatch(legacy.source)(`${alias}${suffix}`);
      assert.ok(params);
      const result = prepareDestination({ destination: legacy.destination, params, query: { q: 'two words', page: '2', tag: ['notes', 'essays'] }, appendParamsToQuery: false });
      assert.equal(result.parsedDestination.pathname, `/essays${suffix}`);
      assert.equal(result.parsedDestination.query.q, 'two words');
      assert.equal(result.parsedDestination.query.page, '2');
      assert.deepEqual(result.parsedDestination.query.tag, ['notes', 'essays']);
    }
    for (const suffix of ['', '/a%2Fb', '/a/../story', '/%2e%2e/story']) {
      const params = getPathMatch(legacy.source)(`${alias}${suffix}`);
      assert.ok(params);
      const result = prepareDestination({
        destination: legacy.destination, params,
        query: { path: '//foreign.test', destination: 'https://foreign.test/' },
        appendParamsToQuery: false,
      });
      // Exercise Next's matcher/compiler, including its encoded-segment handling;
      // query values must remain data rather than become routing authority.
      const resolved = new URL(result.newUrl, 'https://example.test');
      assert.equal(resolved.origin, 'https://example.test');
      assert.equal(result.parsedDestination.query.path, '//foreign.test');
      assert.equal(result.parsedDestination.query.destination, 'https://foreign.test/');
    }
    assert.equal(getPathMatch(legacy.source)(`${alias}//foreign.test/story`), false);
  }
  const ie = redirects.find((rule: {destination: string}) => rule.destination === '/ie-incompatible.html');
  assert.equal(redirects[0], ie);
  assert.deepEqual(JSON.parse(JSON.stringify(ie)), {
    destination: '/ie-incompatible.html',
    has: [{ type: 'header', key: 'user-agent', value: '(.*Trident.*)' }],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)'
  });
  for (const pathname of ['/essays', '/essays/lights-low', '/essays/nested/article']) {
    for (const rule of redirects.filter((rule: {has?: unknown}) => !rule.has))
      assert.equal(getPathMatch(rule.source)(pathname), false, `${pathname} must not self-redirect`);
  }
});

test('generated reading, notification and search links target essays without renaming component imports', () => {
  for (const file of ['src/lib/content/map.ts', 'src/lib/content/menu.ts', 'src/lib/content/fixtures.ts', 'src/lib/content/reading-surface.ts']) {
    assert.ok(!/["'`]\/read(?:ing)?(?:[\/"'`])/.test(read(file)), file);
  }
  const panels = read('src/components/shell/header-panels.tsx');
  assert.match(panels, /href=\{item\.href \?\? "\/essays"\}/);
  assert.match(panels, /<Link href="\/essays"[^>]*>[\s\S]*?t\('seeAll'\)/);
  assert.equal(messages.Customer.components_shell_header_panels.seeAll, 'See All');
  assert.match(panels, /\{ href: "\/essays", title: "reading", hint: "essays" \}/);
  assert.equal(messages.Customer.panelRows.reading, 'Reading');
  assert.equal(messages.Customer.panelRows.essays, 'Essays');
  assert.match(panels, /href: `\/essays\/\$\{post\.slug\}`/);
  assert.match(read('src/app/(site)/essays/reading-view.tsx'), /@\/components\/reading\/reading-stage/);
});
