import messages from "../../../messages/en.json";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('generated reading, notification and search links target essays without renaming component imports', () => {
  for (const file of ['src/lib/content/map.ts', 'src/lib/content/menu.ts', 'tests/fixtures/reading/content.ts', 'src/lib/content/reading-surface.ts']) {
    assert.ok(!/["'`]\/read(?:ing)?(?:[\/"'`])/.test(read(file)), file);
  }
  const panels = read('src/components/shell/header-panels.tsx');
  // Through the essays switch (src/lib/content/essays.ts): the link shows only while essays are on.
  assert.match(panels, /reachableHref\(item\.href \?\? "\/essays"\)/);
  assert.match(panels, /<Link href="\/essays"[^>]*>[\s\S]*?t\('seeAll'\)/);
  assert.equal(messages.Customer.components_shell_header_panels.seeAll, 'See All');
  assert.match(panels, /\{ href: "\/essays", title: "reading", hint: "essays" \}/);
  assert.equal(messages.Customer.panelRows.reading, 'Reading');
  assert.equal(messages.Customer.panelRows.essays, 'Essays');
  assert.match(panels, /href: `\/essays\/\$\{post\.slug\}`/);
  assert.match(read('src/app/(site)/essays/page.tsx'), /@\/components\/reading\/reading-stage/);
});
