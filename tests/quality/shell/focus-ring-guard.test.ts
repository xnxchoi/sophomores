import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { scan } from "../../support/client-namespaces";

// Focus rings show for keyboard focus only, drawn on the visible control, never around an enlarged hit box
// (owner, 23 Nov: "It seems that the focus ring reveals that we have a larger hit area. That's the issue.").
// Scope is the code a route can reach: every file under src/app and what it imports. src/hideaway is reference
// source nothing imports, so it is out of scope by construction. A narrow source check, not an a11y audit.

const root = process.cwd();

function routeEntries(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeEntries(full);
    return /\.(tsx?|jsx?|mjs|css|scss)$/.test(entry.name) ? [full] : [];
  });
}

const styleSuffixes = ["", ".css", ".scss"];
function styleImports(file: string, text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/@(?:import|use|forward)\s+(?:url\()?["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (!specifier.startsWith(".")) continue;
    const base = path.resolve(path.dirname(file), specifier);
    const partial = path.join(path.dirname(base), `_${path.basename(base)}`);
    const found = [base, partial].flatMap((stem) => styleSuffixes.map((suffix) => stem + suffix))
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (found) out.push(found);
  }
  return out;
}

/** Source and stylesheet files reachable from the route tree. */
function reachable(): { sources: string[]; styles: string[] } {
  const seen = new Set<string>();
  const stack = routeEntries(path.join(root, "src/app"));
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (/\.(css|scss)$/.test(file)) stack.push(...styleImports(file, fs.readFileSync(file, "utf8")));
    else if (/\.(tsx?|jsx?|mjs)$/.test(file)) stack.push(...scan(file).imports);
  }
  const all = [...seen].filter((file) => file.startsWith(path.join(root, "src") + path.sep)).sort();
  return { sources: all.filter((file) => /\.(tsx?|jsx?|mjs)$/.test(file)), styles: all.filter((file) => /\.(css|scss)$/.test(file)) };
}

// --- Tailwind tokens -------------------------------------------------------------------------------------

/** Splits a class token into its variants and utility, ignoring colons inside brackets and parentheses. */
export function parseToken(token: string): { variants: string[]; utility: string } {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of token) {
    if (char === "[" || char === "(") depth += 1;
    else if (char === "]" || char === ")") depth -= 1;
    if (char === ":" && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  // `staff:` is the prefix of the Payload staff pages' own Tailwind build, not a state.
  return { variants: parts.filter((part, index) => !(index === 0 && part === "staff")), utility: current.replace(/^!|!$/g, "") };
}

/** A variant's state, with any named-group suffix (`group-focus-visible/focus`) removed first. */
function focusKind(variant: string): "visible" | "pointer" | null {
  const bare = variant.startsWith("[") || variant.includes("[") ? variant : variant.split("/")[0];
  if (/focus-visible/.test(bare)) return "visible";
  if (/focus/.test(bare)) return "pointer";
  return null;
}

const drawsNothing = new Set(["outline-none", "outline-hidden", "outline-0", "outline-transparent", "ring-0", "ring-transparent", "ring-offset-0", "outline-offset-0"]);
const isRingUtility = (utility: string) => /^-?(outline|ring)(-|$)/.test(utility) && !drawsNothing.has(utility);

const layoutOnly = (variants: string[]) => variants.every((variant) => /^(sm|md|lg|xl|2xl|max-\w+|min-\w+|@\w+|pointer-(coarse|fine)|any-pointer-\w+|dark)$/.test(variant));
const atLeast44 = (value: string) => {
  const match = /^\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(value);
  return !!match && (match[2] === "px" ? Number(match[1]) >= 44 : Number(match[1]) >= 2.75);
};

function isHitSlop({ variants, utility }: { variants: string[]; utility: string }): boolean {
  if (variants.length === 1 && (variants[0] === "before" || variants[0] === "after")) return /^-inset(-[xy])?-|^inset(-[xy])?-\[-/.test(utility);
  if (!layoutOnly(variants)) return false;
  const size = /^(min-h|min-w|size|h|w)-(.+)$/.exec(utility);
  if (size) return /^(11|12)$/.test(size[2]) || atLeast44(size[2]) || /^\(--bar-target\)$/.test(size[2]);
  return /^-m[xytblrse]?-/.test(utility);
}

const notSurfaceBg = /^bg-(transparent|none|cover|contain|center|top|bottom|left|right|auto|fixed|local|scroll|repeat.*|no-repeat|clip-.*|origin-.*|blend-.*|position-.*|size-.*)$/;

function hasSurface(tokens: { variants: string[]; utility: string }[]): boolean {
  const atRest = tokens.filter((token) => token.variants.length === 0 || token.variants.every((variant) => /^(sm|md|lg|xl|2xl|dark)$/.test(variant))).map((token) => token.utility);
  if (atRest.some((utility) => utility.startsWith("bg-") && !notSurfaceBg.test(utility))) return true;
  if (atRest.some((utility) => /^shadow(-|$)/.test(utility) && utility !== "shadow-none")) return true;
  if (atRest.some((utility) => /^ring(-\d+|-\[[^\]]+\])?$/.test(utility))) return true;
  const borderWidth = atRest.some((utility) => /^border(-\d+|-\[[^\]]+\]|-\(length:[^)]+\))?$/.test(utility) && utility !== "border-0");
  return borderWidth && !atRest.includes("border-transparent");
}

/** The problems in one element's class tokens. `surface` marks an element whose variant (not its class list) draws one. */
export function elementProblems(classTokens: string[], surface = false): string[] {
  const tokens = classTokens.map(parseToken);
  const problems: string[] = [];
  const pointerRings = classTokens.filter((_, index) => isRingUtility(tokens[index].utility) && tokens[index].variants.some((variant) => focusKind(variant) === "pointer"));
  if (pointerRings.length > 0) problems.push(`ring on pointer focus: ${pointerRings.join(" ")}`);
  const visibleRings = classTokens.filter((_, index) => isRingUtility(tokens[index].utility) && tokens[index].variants.some((variant) => focusKind(variant) === "visible")
    // FocusShape's own ring is drawn on the inner visible span through its named group.
    && !tokens[index].variants.some((variant) => variant.startsWith("group-focus-visible/") || variant.startsWith("peer-focus-visible/")));
  const slop = classTokens.filter((_, index) => isHitSlop(tokens[index]));
  if (visibleRings.length > 0 && slop.length > 0 && !surface && !hasSurface(tokens)) problems.push(`ring around hit slop (${slop.join(" ")}): ${visibleRings.join(" ")}`);
  return problems;
}

// --- Source walk -----------------------------------------------------------------------------------------

const classCalls = new Set(["cn", "clsx", "cx", "twMerge", "classNames"]);

function literalTexts(node: ts.Node, used: Set<ts.Node>): string[] {
  const out: string[] = [];
  const visit = (child: ts.Node) => {
    if (ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) {
      used.add(child);
      out.push(child.text);
    } else if (ts.isTemplateExpression(child)) {
      used.add(child);
      out.push(child.head.text, ...child.templateSpans.map((span) => span.literal.text));
      child.templateSpans.forEach((span) => visit(span.expression));
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return out;
}

const split = (texts: string[]) => texts.flatMap((text) => text.split(/\s+/)).filter(Boolean);

/** Each cva variant combination is one element: base plus one value from every group. */
function cvaUnits(call: ts.CallExpression, used: Set<ts.Node>): string[][] {
  const base = call.arguments[0] ? split(literalTexts(call.arguments[0], used)) : [];
  const config = call.arguments[1];
  let groups: string[][][] = [];
  if (config && ts.isObjectLiteralExpression(config)) {
    for (const property of config.properties) {
      if (ts.isPropertyAssignment(property) && property.name.getText() === "variants" && ts.isObjectLiteralExpression(property.initializer)) {
        groups = property.initializer.properties.filter(ts.isPropertyAssignment).filter((group) => ts.isObjectLiteralExpression(group.initializer))
          .map((group) => (group.initializer as ts.ObjectLiteralExpression).properties.filter(ts.isPropertyAssignment).map((value) => split(literalTexts(value.initializer, used))));
      }
    }
    literalTexts(config, used);
  }
  return groups.reduce<string[][]>((combos, values) => values.length === 0 ? combos : combos.flatMap((combo) => values.map((value) => [...combo, ...value])), [base]);
}

type Finding = { at: string; problem: string };

function sourceFindings(file: string): Finding[] {
  const kind = /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, kind);
  const used = new Set<ts.Node>();
  const units: { node: ts.Node; tokens: string[]; surface?: boolean }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cva") {
      cvaUnits(node, used).forEach((tokens) => units.push({ node, tokens }));
      return;
    }
    if (ts.isJsxAttribute(node) && /className$/i.test(node.name.getText()) && node.initializer) {
      // A variant component (Button, Badge, Toggle) draws its surface from the variant: every variant but ghost and
      // link has a fill or a border.
      const variant = node.parent.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "variant");
      const value = variant && ts.isJsxAttribute(variant) && variant.initializer && ts.isStringLiteral(variant.initializer) ? variant.initializer.text : null;
      units.push({ node, tokens: split(literalTexts(node.initializer, used)), surface: value !== null && value !== "ghost" && value !== "link" });
      return;
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && classCalls.has(node.expression.text)) {
      units.push({ node, tokens: split(literalTexts(node, used)) });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  // Class strings held anywhere else (style maps, constants) are judged on their own.
  const loose = (node: ts.Node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) && !used.has(node)) {
      const texts = ts.isTemplateExpression(node) ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)] : [node.text];
      if (texts.some((text) => /(outline|ring)/.test(text))) units.push({ node, tokens: split(texts) });
    }
    ts.forEachChild(node, loose);
  };
  loose(source);
  return units.flatMap(({ node, tokens, surface }) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    return [...new Set(elementProblems(tokens, surface))].map((problem) => ({ at: `${path.relative(root, file)}:${line}`, problem }));
  });
}

// --- Stylesheets -----------------------------------------------------------------------------------------

type Rule = { selectors: string[]; declarations: string; line: number };

/** Flattens nested CSS/SCSS into rules with their full selector chain. Comments and strings are blanked first. */
export function cssRules(text: string): Rule[] {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/[^\n]*/g, (match, lead: string) => lead + " ".repeat(match.length - lead.length));
  const rules: Rule[] = [];
  const stack: { selector: string; declarations: string; line: number }[] = [];
  let buffer = "";
  let line = 1;
  for (const char of clean) {
    if (char === "\n") line += 1;
    if (char === "{") {
      stack.push({ selector: buffer.trim(), declarations: "", line });
      buffer = "";
    } else if (char === "}") {
      const closed = stack.pop();
      if (closed) {
        closed.declarations += buffer;
        rules.push({ selectors: [...stack.map((entry) => entry.selector), closed.selector], declarations: closed.declarations, line: closed.line });
      }
      buffer = "";
    } else if (char === ";") {
      if (stack.length > 0) stack[stack.length - 1].declarations += `${buffer};`;
      buffer = "";
    } else buffer += char;
  }
  return rules;
}

function styleFindings(file: string): Finding[] {
  return cssRules(fs.readFileSync(file, "utf8")).flatMap((rule) => {
    if (rule.selectors.some((selector) => /forced-colors/.test(selector))) return [];
    const selector = rule.selectors.join(" ");
    if (!/:focus(?!-visible)/.test(selector)) return [];
    const drawn = rule.declarations.split(";").map((declaration) => declaration.trim()).filter((declaration) => {
      const match = /^(outline|outline-width|outline-style|outline-color|box-shadow)\s*:\s*(.+)$/.exec(declaration);
      return !!match && !/^(none|0|transparent)(\s*!important)?$/.test(match[2].trim());
    });
    return drawn.length > 0 ? [{ at: `${path.relative(root, file)}:${rule.line}`, problem: `${selector} { ${drawn.join("; ")} }` }] : [];
  });
}

function hasBaseRule(): boolean {
  return cssRules(fs.readFileSync(path.join(root, "src/styles/globals.css"), "utf8")).some((rule) =>
    rule.selectors[0] === "@layer base"
    && ["focus", "focus-visible"].every((state) => rule.selectors.at(-1)!.split(",").map((part) => part.trim()).includes(`:${state}`))
    && /(^|;)\s*outline(-style)?\s*:\s*none\s*(;|$)/.test(rule.declarations));
}

// --- Controls with no keyboard cue -----------------------------------------------------------------------

// The base layer removes the browser's ring, so a control that brings no cue of its own shows nothing on keyboard
// focus. Arc internals are Arc's (their roots take the ring through ArcFocus); these files' controls render inside
// `.teaser`, whose stylesheet rings every button and link on keyboard focus.
// core/Button's MotionPillButton renders only inside the header's ring wrappers (legacy .rp_btn sets outline: none).
const cueExempt = [/^src\/components\/arc\//, /^src\/components\/teaser\/(chapter-nav|story|narrative)\.tsx$/, /^src\/components\/Warp\/index\.tsx$/, /^src\/components\/core\/Button\/index\.tsx$/];
const controlTags = new Set(["a", "button", "summary", "Link", "NextLink", "m.a", "m.button", "motion.a", "motion.button"]);

export function controlsWithoutCue(file: string): string[] {
  const rel = path.relative(root, file);
  if (!/\.[jt]sx$/.test(file) || cueExempt.some((pattern) => pattern.test(rel))) return [];
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node, covered: boolean) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      const attributes = node.attributes.properties;
      const attribute = (name: string) => attributes.find((item): item is ts.JsxAttribute => ts.isJsxAttribute(item) && item.name.getText(source) === name);
      const literal = (name: string) => { const value = attribute(name)?.initializer; return value && ts.isStringLiteral(value) ? value.text : null; };
      const className = attribute("className");
      const tokens = className?.initializer ? split(literalTexts(className.initializer, new Set())) : [];
      const cue = tokens.some((token) => {
        const { variants, utility } = parseToken(token);
        return token === "group/focus" || /has-\[:focus-visible\]/.test(token)
          || (variants.some((variant) => focusKind(variant) === "visible") && !drawsNothing.has(utility));
      });
      const element = ts.isJsxOpeningElement(node) ? node.parent : node;
      const childCue = /group-focus-visible|<FocusShape\b/.test(element.getText(source).slice(node.getText(source).length));
      const control = controlTags.has(tag) || ["button", "link"].includes(literal("role") ?? "")
        || (tag === "input" && ["range", "checkbox", "radio"].includes(literal("type") ?? ""));
      // A component that forwards its caller's className is judged at its call sites.
      const forwards = attributes.some(ts.isJsxSpreadAttribute) && tokens.length === 0;
      const unreachable = /tabIndex=\{-1\}/.test(node.getText(source));
      if (control && !cue && !childCue && !covered && !forwards && !unreachable) {
        out.push(`${rel}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} <${tag}> ${tokens.join(" ").slice(0, 80)}`);
      }
    }
    if (ts.isJsxElement(node)) {
      visit(node.openingElement, covered);
      const opening = node.openingElement;
      const tag = opening.tagName.getText(source);
      const rings = tag === "HitArea" || /has-\[:focus-visible\]/.test(opening.attributes.getText(source));
      node.children.forEach((child) => visit(child, covered || rings));
      return;
    }
    ts.forEachChild(node, (child) => visit(child, covered));
  };
  visit(source, false);
  return out;
}

// --- Tests -----------------------------------------------------------------------------------------------

test("the classifier tells keyboard rings from pointer rings and hit slop from drawn surfaces", () => {
  assert.deepEqual(elementProblems(["focus:ring-2"]).length, 1);
  assert.deepEqual(elementProblems(["focus-within:outline-2"]).length, 1);
  assert.deepEqual(elementProblems(["focus:outline-none", "focus-visible:ring-0"]), []);
  assert.deepEqual(elementProblems(["min-h-12", "focus-visible:outline-2"]).length, 1);
  assert.deepEqual(elementProblems(["min-h-12", "border", "focus-visible:outline-2"]), []);
  assert.deepEqual(elementProblems(["min-h-12", "hover:bg-muted", "focus-visible:outline-2"]).length, 1);
  assert.deepEqual(elementProblems(["group/focus", "min-h-12"]), []);
  assert.deepEqual(elementProblems(["rounded-sm", "group-focus-visible/focus:outline-2", "group-focus-visible/focus:outline-current"]), []);
  assert.deepEqual(elementProblems(["staff:min-h-[44px]", "staff:bg-transparent", "staff:focus-visible:outline-2"]).length, 1);
});

test("rings never reveal a hit area and never show on pointer focus", () => {
  const { sources, styles } = reachable();
  assert.ok(sources.some((file) => file.endsWith(path.join("components", "shell", "site-header.tsx"))), "the route walk reaches the shell");
  const findings = [...sources.flatMap(sourceFindings), ...styles.flatMap(styleFindings)];
  assert.deepEqual(findings.map(({ at, problem }) => `${at}  ${problem}`), []);
});

test("the base layer removes the browser's focus outline", () => {
  assert.ok(hasBaseRule(), "src/styles/globals.css @layer base needs `:focus, :focus-visible { outline-style: none; }`");
});

test("every control shows some keyboard focus cue", () => {
  const { sources } = reachable();
  assert.deepEqual(sources.flatMap(controlsWithoutCue), []);
});
