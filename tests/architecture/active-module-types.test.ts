import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('active auth actions resolve to their component module, not legacy constants', () => {
  for (const file of ['account-forms', 'sign-in-card', 'second-factor']) {
    const source = read(`components/auth/${file}.tsx`);
    assert.match(source, /from ["']\.\/auth-actions["']/);
  }
  assert.match(read('components/auth/auth-actions.tsx'), /export function AuthSubmit/);
  assert.match(read('components/auth/auth-actions.tsx'), /export function AuthAlternate/);
  assert.match(read('components/auth/auth-styles.ts'), /AUTH_PRIMARY_BUTTON_CLASS/);
});

test('menu spring receives a numeric rather than literal-union motion value', () => {
  assert.match(read('components/shell/menu-button.tsx'), /useTransform<number, number>\(/);
});

test('active Howler and shader APIs typecheck without broad escape hatches', () => {
  const fixture = resolve(root, 'tests/architecture/__active_module_fixture__.ts');
  const source = `import { Howl, Howler, type HowlOptions, type HowlListeners } from 'howler';
    import { useTransform, useSpring } from 'motion/react';
    import { AuthSubmit, AuthAlternate } from '@/components/auth/auth-actions';
    import { InputOTP, HA_InputOTP } from '@/components/ui/input-otp';
    import { Textarea, HA_Textarea } from '@/components/ui/textarea';
    void [AuthSubmit, AuthAlternate, InputOTP, HA_InputOTP, Textarea, HA_Textarea];
    const derived = useTransform<number, number>(() => Math.random() ? 0 : 50);
    useSpring(derived);
    import fragment from '@/hideaway/components/layouts/Missing/shader/fragment.glsl';
    const shader: string = fragment;
    const listeners: HowlListeners = { onend: () => {} };
    const options: HowlOptions = {src: ['track.mp3'], html5: true, ...listeners};
    Howler.volume(0.5);
    const howl = new Howl(options);
    const duration: number = howl.duration();
    const position: number = howl.seek();
    howl.seek(position + duration);
    const stop = () => {};
    howl.on('end', stop).off('end', stop);
    howl.on('loaderror', stop).off('loaderror');
    howl.on('playerror', stop).off('playerror');
    void shader;
    // @ts-expect-error seek accepts seconds, not a string.
    howl.seek('invalid');
    // @ts-expect-error shader imports are strings, not numbers.
    const invalidShader: number = fragment;
  `;
  const options: ts.CompilerOptions = {
    strict: true, noEmit: true, skipLibCheck: true, types: [], jsx: ts.JsxEmit.ReactJSX,
    paths: { '@/*': [resolve(root, '*')] }, esModuleInterop: true,
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => file === fixture
    ? ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    : original(file, ...args);
  const program = ts.createProgram([
    fixture, resolve(root, 'lib/environment.d.ts'),
  ], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
});

test('duplicate UI exports use the existing React namespace', () => {
  for (const file of ['input-otp', 'textarea']) {
    assert.ok(!read(`components/ui/${file}.tsx`).includes('HA_React'));
  }
  assert.match(read('components/ui/textarea.tsx'), /React\.MouseEventHandler/);
  assert.match(read('components/ui/textarea.tsx'), /React\.useCallback/);
});
