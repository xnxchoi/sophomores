import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { compile } from 'tailwindcss';

test('legacy calendar selected dark hover retains its primary foreground', async () => {
  const source = readFileSync(resolve(import.meta.dirname, '../../src/components/ui/calendar.tsx'), 'utf8');
  const legacy = source.slice(source.indexOf('function HA_CalendarDayButton'));
  const candidates = ['selected-single', 'range-start', 'range-end'].map(state =>
    `dark:data-[${state}=true]:hover:text-primary-foreground`);
  for (const candidate of candidates) assert.ok(legacy.includes(candidate), candidate);
  assert.ok(legacy.includes('dark:hover:text-accent-foreground'), 'unselected hover remains unchanged');
  const compiler = await compile(`
    @theme { --color-primary-foreground: #222; --color-accent-foreground: #eee; }
    @custom-variant dark (&:where(.dark, .dark *));
    @tailwind utilities;
  `);
  const css = compiler.build(['dark:hover:text-accent-foreground', ...candidates]);
  assert.match(css, /:where\(\.dark, \.dark \*\):hover \{\s*color: var\(--color-accent-foreground\)/);
  for (const state of ['selected-single', 'range-start', 'range-end']) {
    // Real generated selectors: class + attribute + :hover (0,3,0) beats
    // the ghost hover's class + :hover (0,2,0); :where contributes zero.
    assert.ok(css.includes(`:where(.dark, .dark *)[data-${state}="true"]:hover {\n    color: var(--color-primary-foreground);`));
  }
});
