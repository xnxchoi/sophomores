import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Owner, 24 Nov: "STOP MAKING THE NATIVE CURSOR APPEAR KILL THE FUCKING cursor:pointer; SHIT WITH *{cursor:none;}".
// The site's own cursor (UX/Cursor) is the only cursor: one global rule hides the native one everywhere on fine
// pointers, and no site component asks for a native cursor. The Payload admin (src/payload, src/app/(payload)) and the
// Hideaway reference copy (src/hideaway) keep theirs.
const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

// A Tailwind cursor utility with any variants (`hover:`, `disabled:`, `data-[x=y]:`, `has-[:disabled]:`, `!`), bounded
// as a class token: preceded by a quote, backtick or space, followed by one of those.
const cursorUtility = /(?<=["'` ])(?:[a-z0-9-]*(?:\[[^\]\s]*\])?(?:\/[a-z0-9-]+)?:)*!?cursor-[a-z0-9[\]_()-]+(?=["'` ])/;
// An inline style object or string that sets the cursor.
const inlineCursor = /\bcursor\s*:\s*["'`]|style=["'][^"']*cursor\s*:/;

test("no site component asks for a native cursor", () => {
  const offenders = globSync("src/**/*.{ts,tsx}", { cwd: new URL(root) })
    .filter((file) => !/^src\/(?:hideaway|payload)\/|^src\/app\/\(payload\)\//.test(file))
    .flatMap((file) =>
      read(file)
        .split("\n")
        .map((line, index) => ({ line, at: `${file}:${index + 1}` }))
        .filter(({ line }) => !/^\s*(?:\/\/|\*|\/\*)/.test(line) && (cursorUtility.test(line) || inlineCursor.test(line)))
        .map(({ at }) => at)
    );
  assert.deepEqual(offenders, []);
});

test("one global rule hides the native cursor on the site, ahead of every utility", () => {
  const sheet = read("src/styles/sphmrs.scss");
  assert.match(
    sheet,
    /@layer base \{\s*@media \(pointer: fine\) \{\s*\*,\s*\*::before,\s*\*::after \{\s*cursor: none !important;\s*\}\s*\}\s*\}/
  );
  // The sheet is the site's, not the admin's.
  assert.match(read("src/app/(site)/layout.tsx"), /import "@\/styles\/sphmrs\.scss";/);
  for (const file of globSync("src/app/(payload)/**/*.{ts,tsx}", { cwd: new URL(root) })) {
    assert.equal(read(file).includes("sphmrs.scss"), false, file);
  }
});
