import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

// Walks the import graph from route files with the TypeScript parser and collects (1) the namespaces passed to
// useTranslations and (2) value imports of a whole catalogue inside client bundles. Only the hook counts as a
// namespace read: getTranslations runs on the server and is never delivered. A namespace under Customer is cut at
// its page subtree (Customer.<page>), as the providers deliver it; any other namespace is cut at the top level.
// Static imports, side-effect imports, re-exports, dynamic import() and require() are followed; type-only imports
// and re-exports are not, because TypeScript erases them. Package internals are not followed.

const root = process.cwd();
const suffixes = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];
const unparsed = /\.(json|css|scss|svg|png|jpg|woff2?)$/;
const catalogues = new Set(
  ["messages/en.json", "messages/ko.json", "src/i18n/messages.ts"].map((file) => path.join(root, file))
);

function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = path.join(root, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(from), specifier);
  else return null;
  for (const suffix of suffixes) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

type Scan = { directive: "use client" | "use server" | null; imports: string[]; namespaces: string[]; untyped: boolean };
const scans = new Map<string, Scan>();

const literal = (node: ts.Node | undefined): string | null =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;

/** True when TypeScript erases the whole import: `import type`, or only `type` named bindings. */
function typeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const named = clause.namedBindings;
  return !clause.name && !!named && ts.isNamedImports(named) && named.elements.length > 0
    && named.elements.every((element) => element.isTypeOnly);
}

function typeOnlyExport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  return !!clause && ts.isNamedExports(clause) && clause.elements.length > 0
    && clause.elements.every((element) => element.isTypeOnly);
}

export function scan(file: string): Scan {
  const cached = scans.get(file);
  if (cached) return cached;
  const kind = file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, kind);
  const specifiers: string[] = [];
  const namespaces: string[] = [];
  let untyped = false;

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const specifier = literal(node.moduleSpecifier);
      if (specifier && !typeOnlyImport(node)) specifiers.push(specifier);
    } else if (ts.isExportDeclaration(node)) {
      const specifier = literal(node.moduleSpecifier);
      if (specifier && !typeOnlyExport(node)) specifiers.push(specifier);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(callee) && callee.text === "require")) {
        const specifier = literal(node.arguments[0]);
        if (specifier) specifiers.push(specifier);
      } else if (ts.isIdentifier(callee) && callee.text === "useTranslations") {
        const namespace = literal(node.arguments[0]);
        // A hook without a literal namespace can read anything; the caller must look at it by hand.
        if (namespace) namespaces.push(namespace);
        else untyped = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const first = source.statements[0];
  const directive = first && ts.isExpressionStatement(first) ? literal(first.expression) : null;
  const result: Scan = {
    directive: directive === "use client" || directive === "use server" ? directive : null,
    imports: specifiers
      .map((specifier) => resolveImport(file, specifier))
      .filter((value): value is string => value !== null),
    namespaces,
    untyped,
  };
  scans.set(file, result);
  return result;
}

export function deliveredPath(namespace: string): string {
  const parts = namespace.split(".");
  return parts[0] === "Customer" ? parts.slice(0, 2).join(".") : parts[0];
}

export function clientNamespaces(entries: readonly string[]): { namespaces: string[]; untyped: string[] } {
  const seen = new Set<string>();
  const namespaces = new Set<string>();
  const untyped: string[] = [];
  const stack = entries.map((entry) => path.join(root, entry));
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file) || unparsed.test(file)) continue;
    seen.add(file);
    const result = scan(file);
    result.namespaces.forEach((namespace) => namespaces.add(deliveredPath(namespace)));
    if (result.untyped) untyped.push(path.relative(root, file));
    stack.push(...result.imports);
  }
  return { namespaces: [...namespaces].sort(), untyped };
}

/** Route files of one segment: every route file under it, skipping private (_) folders. */
export function segmentEntries(directory: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith("_")) out.push(...segmentEntries(full));
    } else if (/^(page|layout|loading|error|not-found|template)\.tsx$/.test(entry.name)) {
      out.push(path.relative(root, full));
    }
  }
  return out.sort();
}

/**
 * Files in a client bundle (a "use client" module or anything it imports, statically or dynamically) that
 * value-import a whole catalogue: messages/en.json, messages/ko.json or src/i18n/messages.ts. A "use server"
 * module reached from client code is not followed.
 */
export function clientCatalogueImports(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const found = new Set<string>();
  const stack = entries.map((entry) => ({ file: path.join(root, entry), client: false }));
  while (stack.length > 0) {
    const { file, client: inherited } = stack.pop()!;
    if (unparsed.test(file)) continue;
    const result = scan(file);
    // A client import of a "use server" module becomes a server-action reference; its code never ships.
    if (inherited && result.directive === "use server") continue;
    const client = inherited || result.directive === "use client";
    const key = `${client}:${file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (client && result.imports.some((next) => catalogues.has(next))) found.add(path.relative(root, file));
    for (const next of result.imports) stack.push({ file: next, client });
  }
  return [...found].sort();
}
