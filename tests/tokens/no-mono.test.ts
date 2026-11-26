import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Owner, 21 Nov: "don't fucking use mono as a default anywhere besides the places that I explicitly tell you".
// Nothing else in the site's own code may ask for a monospace face. src/hideaway is The Hideaway's reference copy and
// is left as it is; its --font-mono reads now resolve to the sans (globals.css). Each place the owner names is listed
// here with his words.
// Owner, 24 Nov, on the open book's bottom bar: "bottom bar is mono - Geist for now" ("No mono here is exception").
// That bar was book3d's, removed with it (26 Nov). The owner, 26 Nov, on the shop's bar: "The book's page turn bar
// should use Geist Mono".
const OWNER_NAMED: Record<string, string> = {
  "src/components/commerce/shop/look-inside-bar.tsx": "The book's page turn bar should use Geist Mono"
};

const root = new URL("../../", import.meta.url);
const files = globSync("src/**/*.{ts,tsx,css,scss}", {
  cwd: root.pathname
}).filter(
  (path) => !path.startsWith("src/hideaway/") && !(path in OWNER_NAMED)
);
const MONO = [
  { name: "font-mono utility", pattern: /(?<![\w-])font-mono(?![\w-])/ },
  { name: "--font-mono variable", pattern: /var\(--font-mono/ },
  { name: "Geist Mono loader", pattern: /geist\/font\/mono|GeistMono/ },
  {
    name: "monospace family",
    pattern: /font-family:[^;]*\bmonospace\b|fontFamily[^,}]*\bmonospace\b/i
  }
];

test("no site code asks for a monospace face", () => {
  assert.ok(files.length > 100, "the scan found the source tree");
  const hits: string[] = [];
  for (const path of files) {
    const lines = readFileSync(new URL(path, root), "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const { name, pattern } of MONO)
        if (pattern.test(line)) hits.push(`${path}:${index + 1} (${name})`);
    });
  }
  // The theme's own definition of the role is the one allowed mention.
  const allowed = hits.filter(
    (hit) => !hit.startsWith("src/styles/globals.css:")
  );
  assert.deepEqual(allowed, [], `mono uses:\n${allowed.join("\n")}`);
});

test("the mono role itself is the sans face", () => {
  const globals = readFileSync(new URL("src/styles/globals.css", root), "utf8");
  const sans = globals
    .match(/^\s*--font-sans:\s*([^;]+);/m)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  const mono = globals
    .match(/^\s*--font-mono:\s*([^;]+);/m)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  assert.ok(sans);
  assert.equal(
    mono,
    sans,
    "--font-mono resolves to the sans stack, so stray or ported uses get the sans"
  );
  assert.doesNotMatch(mono!, /monospace|geist/i);
});
