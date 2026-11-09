import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
function source(path: string) {
  return ts.createSourceFile(path, readFileSync(resolve(root, path), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function imports(path: string) {
  return source(path).statements.flatMap(node =>
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
      ? [node.moduleSpecifier.text] : []);
}
function elements(path: string) {
  const tags: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) tags.push(node.tagName.getText());
    ts.forEachChild(node, visit);
  }
  visit(source(path));
  return tags;
}

test('public frame retains interface tours without mounting the legacy auth provider', () => {
  const frame = 'src/providers/index.tsx';
  assert.ok(!imports(frame).includes('@/lib/auth/context'));
  assert.ok(!elements(frame).includes('BetterAuthProvider'));
  for (const tag of ['TourProvider']) assert.ok(elements(frame).includes(tag), tag);
  const layout = 'src/app/(site)/client-layout.tsx';
  for (const tag of ['TourOrchestrator', 'SitePage']) assert.ok(elements(layout).includes(tag), tag);
});

test('mobile frame context is nested inside its MenuProvider owner', () => {
  const frame = source('src/providers/index.tsx');
  let found = false;
  function visit(node: ts.Node, menu = false) {
    if (ts.isJsxElement(node)) {
      const name = node.openingElement.tagName.getText(frame);
      if (name === 'MobileProvider') {
        found = true;
        assert.ok(menu, 'MiddleMan consumes useFrameState and must be below MenuProvider');
      }
      menu ||= name === 'MenuProvider';
    }
    ts.forEachChild(node, child => visit(child, menu));
  }
  visit(frame);
  assert.ok(found);
});

test('tour composition retains interface overlay and trigger but not legacy registration', () => {
  const tour = 'src/components/UX/Tour/index.tsx';
  assert.deepEqual(elements(tour), ['InterfaceTourTrigger', 'InterfaceTour']);
  assert.ok(!imports(tour).includes('./RegistrationTour'));
  assert.ok(imports(tour).includes('./TourProvider'));
});

test('adopted interface tour retains full motion without preference gates', () => {
  for (const file of ['InterfaceTour', 'TextBlurIn']) {
    const text = readFileSync(resolve(root, `src/components/UX/Tour/${file}.tsx`), 'utf8');
    assert.doesNotMatch(text, /useReducedMotion|prefersReduced|prefers-reduced-motion/);
  }
});

test('static public frame dependency graph has no legacy session consumers', () => {
  const pending = ['src/providers/index.tsx'];
  const visited = new Set<string>();
  while (pending.length) {
    const path = pending.pop()!;
    if (visited.has(path)) continue;
    visited.add(path);
    for (const specifier of imports(path)) {
      assert.notEqual(specifier, '@/lib/auth/context', `${path} imports legacy session context`);
      const base = specifier.startsWith('@/') ? `src/${specifier.slice(2)}` : specifier.startsWith('.') ? resolve(root, dirname(path), specifier).slice(root.length) : null;
      if (base === null) continue;
      const child = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(candidate => /\.tsx?$/.test(candidate) && existsSync(resolve(root, candidate)));
      if (child) pending.push(child);
    }
  }
  assert.ok(visited.has('src/components/UX/Tour/InterfaceTour.tsx'));
});

test('canonical member account keeps its own session and client imports', () => {
  const account = imports('src/components/Authentication/member-auth/account-study.tsx');
  assert.ok(account.some(path => path.endsWith('/member-auth/client')));
  assert.ok(account.some(path => path.endsWith('/session')));
  assert.ok(!account.includes('@/lib/auth/context'));
});

test('tour client-only gate uses React hydration snapshots without an effect-driven state update', () => {
  const frame = source('src/app/(site)/client-layout.tsx');
  const calls: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  }
  visit(frame);
  assert.ok(!calls.some(node => node.expression.getText(frame) === 'useState'));
  const gate = calls.find(node => node.expression.getText(frame) === 'useSyncExternalStore');
  assert.ok(gate, 'use React external-store hydration snapshots directly');
  assert.equal(gate.arguments.length, 3);
  for (const [index, expected] of [[1, 'true'], [2, 'false']] as const) {
    const snapshot: ts.Expression = gate.arguments[index];
    assert.ok(ts.isArrowFunction(snapshot));
    assert.equal(snapshot.body.getText(frame), expected);
  }
  const subscribe = gate.arguments[0];
  assert.ok(ts.isArrowFunction(subscribe));
  assert.ok(ts.isArrowFunction(subscribe.body), 'subscription returns a cleanup without subscribing');
  assert.ok(ts.isBlock(subscribe.body.body));
  assert.equal(subscribe.body.body.statements.length, 0);
  const declaration = gate.parent;
  assert.ok(ts.isVariableDeclaration(declaration));
  const mounted = declaration.name.getText(frame);
  const gatedTour = frame.getText().includes(`${mounted} && <TourOrchestrator />`);
  assert.ok(gatedTour, 'hydration snapshot gates the tour itself');
  assert.ok(!elements('src/providers/index.tsx').includes('OnClient'));
});
