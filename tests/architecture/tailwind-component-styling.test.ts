import assert from "node:assert/strict";
import test from "node:test";
import { Linter } from "eslint";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import styling from "../../scripts/eslint/tailwind-component-styling.mjs";

function messages(code: string) {
  return new Linter().verify(code, {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: { local: { rules: { styling } } },
    rules: { "local/styling": "error" }
  });
}

const invalid = [
  [
    "direct interpolation",
    'const C = ({active}) => <div className={`flex ${active ? "block" : "hidden"}`} />;',
    "interpolation"
  ],
  [
    "interpolation inside cn",
    'const C = ({size}) => <div className={cn(`w-${size}`, "flex")} />;',
    "interpolation"
  ],
  [
    "hoisted string",
    'const primary = "rounded p-4"; const C = () => <button className={primary} />;',
    "storedClasses"
  ],
  [
    "hoisted cn result",
    'const primary = cn("rounded", "p-4"); const C = () => <button className={primary} />;',
    "storedClasses"
  ],
  [
    "cn argument alias",
    'const base = "flex"; const C = ({active}) => <div className={cn(base, active && "block")} />;',
    "storedClasses"
  ],
  [
    "class array lookup",
    'const points = ["top-0", "top-1"]; const C = ({index}) => <div className={cn(points[index])} />;',
    "storedClasses"
  ],
  [
    "class object lookup",
    'const tones = {dark: "bg-black"}; const C = ({tone}) => <div className={tones[tone]} />;',
    "storedClasses"
  ],
  [
    "conditional alias",
    'const base = active ? "block" : "hidden"; const C = () => <div className={base} />;',
    "storedClasses"
  ],
  [
    "transitive alias",
    'const base = "flex"; const alias = base; const C = () => <div className={alias} />;',
    "storedClasses"
  ],
  [
    "spread alias",
    'const base = ["flex", "gap-2"]; const C = () => <div className={cn(...base)} />;',
    "storedClasses"
  ],
  [
    "local shadowed alias",
    'const C = () => { const className = "flex"; return <div className={className} />; };',
    "storedClasses"
  ],
  [
    "logical string alias",
    'const base = active && "block"; const C = () => <div className={base} />;',
    "storedClasses"
  ],
  [
    "binary string alias",
    'const base = "flex " + name; const C = () => <div className={base} />;',
    "storedClasses"
  ],
  [
    "direct string concatenation",
    'const C = ({size}) => <div className={"w-" + size} />;',
    "interpolation"
  ],
  [
    "fallback string alias",
    'const base = "flex"; const C = ({className}) => <div className={className || base} />;',
    "storedClasses"
  ],
  [
    "inline array alias",
    'const base = "flex"; const C = () => <div className={cn([base, "gap-2"])} />;',
    "storedClasses"
  ],
  [
    "sparse class array",
    'const base = [, "flex"]; const C = () => <div className={base[1]} />;',
    "storedClasses"
  ],
  [
    "spread class object",
    'const base = {...other, active: "flex"}; const C = () => <div className={base.active} />;',
    "storedClasses"
  ],
  [
    "empty array initializer",
    'const base = []; const alias = [...base, "flex"]; const C = () => <div className={alias[0]} />;',
    "storedClasses"
  ],
  [
    "imported class constant",
    'import {primaryClass as primary} from "./styles"; const C = () => <div className={primary} />;',
    "storedClasses"
  ],
  [
    "imported class map",
    'import styles from "./styles"; const C = () => <div className={cn(styles.root)} />;',
    "storedClasses"
  ],
  [
    "font-module arbitrary class constants",
    'import {fonts} from "@/fonts"; const C = () => <div className={fonts.storedUtilities} />;',
    "storedClasses"
  ],
  [
    "arbitrary variable member",
    'import styles from "./styles"; const C = () => <div className={styles.variable} />;',
    "storedClasses"
  ],
  [
    "computed cn object key",
    'const stored = "flex"; const C = ({active}) => <div className={cn({[stored]: active})} />;',
    "storedClasses"
  ],
  [
    "aliased cn interpolation",
    'import {cn as cx} from "@/lib/utils"; const C = ({size}) => <div className={cx(`w-${size}`)} />;',
    "interpolation"
  ],
  [
    "joined class array",
    'const stored = ["flex", "gap-2"].join(" "); const C = () => <div className={stored} />;',
    "storedClasses"
  ]
] as const;

for (const [name, code, messageId] of invalid) {
  test(`rejects ${name}`, () => {
    const result = messages(code);
    assert.ok(
      result.some((message) => message.messageId === messageId),
      JSON.stringify(result)
    );
    assert.ok(
      result.every((message) => message.ruleId === "local/styling"),
      JSON.stringify(result)
    );
  });
}

const valid = [
  'const C = () => <div className="flex gap-2" />;',
  'const C = ({active, className}) => <div className={cn("flex", active && "block", className)} />;',
  'const C = ({active}) => <div className={cn("flex", {"block": active})} />;',
  'const C = ({kind}) => <div className={cn("flex", kind === "dark" ? "bg-black" : "bg-white")} />;',
  'const C = ({className = ""}) => <div className={className} />;',
  'const variants = cva("flex", {variants: {size: {large: "p-4"}}}); const C = ({size}) => <div className={cn(variants({size}))} />;',
  'const defaultClassNames = getDefaultClassNames(); const C = () => <div className={cn(defaultClassNames.root, "flex")} />;',
  'const label = "Hello"; const C = () => <div className="flex">{label}</div>;',
  'const C = ({text}) => <div title={`Hello ${text}`} className="flex" />;',
  "const C = (props) => <div className={props.className} />;",
  'const isReady = status === "ready"; const C = () => <div className={cn(isReady && "block")} />;',
  'const tone = "dark"; const C = () => <div className={cn({"bg-black": tone === "dark"})} />;',
  "const base = []; const C = () => <div className={cn(base)} />;",
  'const count = 3; const C = () => <div className={cn(count && "block")} />;',
  "let base = alias; let alias = base; const C = () => <div className={base} />;",
  "const base = unknown; const C = () => <div className={base} />;",
  "const C = () => <div className={buildThirdPartyClassName()} />;",
  "const C = () => <div className={`flex gap-2`} />;",
  "const C = () => <div className={null} />;",
  "const C = () => <div className={cn()} />;",
  'import {message} from "@/fonts"; const C = () => <div className={message.variable} />;',
  'import {message} from "@/fonts"; const C = () => <div className={cn(message.className, "flex")} />;',
  'import styles from "./legacy.module.css"; const C = () => <div className={styles.root} />;',
  'import styles from "./legacy.module.scss"; const C = ({kind}) => <div className={cn(styles[kind], "flex")} />;',
  'const C = ({className}) => { const forwarded = {className, id: "x"}; return <div className={forwarded.className} />; };',
  'const C = ({className}) => { const forwarded = {className, id: "x"}; const alias = forwarded; return <div className={alias.className} />; };',
  'const C = ({id, x}) => <div className={cn({"bg-black": id === `id-${x}`})} />;'
];

for (const [index, code] of valid.entries()) {
  test(`accepts inline classes, components, variants and prop forwarding ${index + 1}`, () => {
    assert.deepEqual(messages(code), []);
  });
}

test("rejects interpolated cva configuration outside JSX", () => {
  const result = messages(
    'const variants = cva("flex", {variants: {tone: {dark: `bg-${tone}`}}}); const C = () => <div className={variants()} />;'
  );
  assert.ok(
    result.some((message) => message.messageId === "interpolation"),
    JSON.stringify(result)
  );
});

for (const code of [
  'const base = "flex"; const variants = cva(base);',
  'const dark = "bg-black"; const variants = cva("flex", {variants: {tone: {dark}}});',
  'const options = {variants: {tone: {dark: "bg-black"}}}; const variants = cva("flex", options);'
]) {
  test(`rejects stored utility strings in cva configuration: ${code}`, () => {
    assert.ok(
      messages(code).some((message) => message.messageId === "storedClasses")
    );
  });
}

test("project ESLint configuration enforces the policy on TypeScript JSX", () => {
  const result = spawnSync(
    process.execPath,
    [
      join(
        dirname(createRequire(import.meta.url).resolve("eslint/package.json")),
        "bin/eslint.js"
      ),
      "--stdin",
      "--stdin-filename",
      "components/policy-probe.tsx",
      "--format",
      "json"
    ],
    {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      // The CLI integration process must not duplicate the unit rule's counters.
      env: { ...process.env, NODE_V8_COVERAGE: "" },
      input:
        'const classes = "flex" as const; export function PolicyProbe() { return <div className={classes satisfies string} />; }',
      encoding: "utf8"
    }
  );
  assert.equal(result.status, 1, result.stderr);
  const [report] = JSON.parse(result.stdout);
  assert.ok(
    report.messages.some(
      (message: Linter.LintMessage) =>
        message.ruleId === "local/tailwind-component-styling" &&
        message.messageId === "storedClasses"
    ),
    result.stdout
  );
});
