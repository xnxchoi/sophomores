import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

// Compile-only repairs preserve runtime behavior; coverage is the owned import/type contract,
// not a claim of 80% application behavior coverage or live visual acceptance.
const root = resolve(import.meta.dirname, '../..');
// The map was quarantined rather than adopted; this fixture covers active UI exports only.
const files = ['alert', 'avatar', 'calendar', 'card', 'chart', 'command', 'dialog', 'dropdown-menu', 'popover', 'scroll-area', 'select', 'sheet', 'table', 'toggle-group'];
test('unadopted map remains reference-only, not a silently missing fixture import', () => {
  assert.equal(existsSync(resolve(root, 'src/components/ui/map.tsx')), false);
  assert.equal(existsSync(resolve(root, 'src/hideaway/components/ui/map.tsx')), true);
});
test('legacy UI exports satisfy their installed library compiler contracts', () => {
  const fixture = resolve(root, 'tests/architecture/__legacy_ui_fixture__.tsx');
  const source = files.map((name, index) => `import * as module${index} from '../../src/components/ui/${name}'; void module${index};`).join('\n');
  const options: ts.CompilerOptions = {
    strict: true, noEmit: true, skipLibCheck: true, types: [], jsx: ts.JsxEmit.ReactJSX,
    paths: { '@/*': [resolve(root, 'src/*')] }, esModuleInterop: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => file === fixture
    ? ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    : original(file, ...args);
  const program = ts.createProgram([fixture], options, host);
  const owned = new Set([fixture, ...files.map(name => resolve(root, `src/components/ui/${name}.tsx`))]);
  for (const file of owned) {
    assert.ok(program.getSourceFile(file), `Compiler fixture must actually include ${file}`);
  }
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(d =>
    d.file && owned.has(d.file.fileName));
  assert.deepEqual(diagnostics.map(d => `${d.file?.fileName}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`), []);
});
