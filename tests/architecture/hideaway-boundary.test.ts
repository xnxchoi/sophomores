import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../..');
const reference = resolve(root, 'src/hideaway');
const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (path === reference || ['node_modules', '.git', '.next', '.deployment', 'dist', 'coverage'].includes(entry.name)) return [];
    return entry.isDirectory() ? files(path) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

function isReference(path: string) {
  return path === reference || path.startsWith(`${reference}${sep}`);
}

function target(specifier: string, owner: string): string | undefined {
  if (specifier.startsWith('.')) return resolve(dirname(owner), specifier);
  if (specifier.startsWith('/')) return resolve(specifier);
  const base = resolve(root, options.baseUrl ?? '.');
  for (const [alias, replacements] of Object.entries(options.paths ?? {})) {
    const [prefix, suffix = ''] = alias.split('*');
    if (alias.includes('*') ? specifier.startsWith(prefix) && specifier.endsWith(suffix) : specifier === alias) {
      const value = alias.includes('*') ? specifier.slice(prefix.length, suffix ? -suffix.length : undefined) : '';
      for (const replacement of replacements) {
        const candidate = resolve(base, replacement.replace('*', value));
        if (isReference(candidate)) return candidate;
      }
    }
  }
  return ts.resolveModuleName(specifier, owner, options, ts.sys).resolvedModule?.resolvedFileName;
}

test('reference resolution catches aliases and normalized relative paths', () => {
  const owner = join(root, 'src/components/example.tsx');
  for (const specifier of ['@/hideaway/components/UX/Tour', '../hideaway/components/UX/Tour', './unused/../../hideaway/components/UX/Tour']) {
    assert.ok(isReference(target(specifier, owner)!), specifier);
  }
  assert.ok(!isReference(target('@/components/core/Link/Link', owner)!));
});

test('nothing outside the reference folder imports or re-exports Hideaway source', () => {
  const violations: string[] = [];
  for (const file of files(root)) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      const module = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier
        : ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) ? node.moduleReference.expression
          : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require') ? node.arguments[0]
            : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined;
      if (module && (ts.isStringLiteral(module) || ts.isNoSubstitutionTemplateLiteral(module))) {
        const destination = target(module.text, file);
        if (destination && isReference(destination)) violations.push(`${relative(root, file)}: ${module.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(violations, [], `Reference-only source has inbound dependencies:\n${violations.join('\n')}`);
});
