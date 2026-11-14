import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = new URL("../../", import.meta.url).pathname;
function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.name === "flame-backdrop") return [];
    return entry.isDirectory() ? sources(path) : /\.(?:tsx?|css)$/.test(path) ? [path] : [];
  });
}

test("runtime motion never branches on the system motion preference", () => {
  const violations = ["src/components", "src/hooks", "src/lib", "src/payload", "src/styles", "src/app", "public"].flatMap((directory) =>
    sources(join(root, directory)).filter((path) => {
      // Lenis requires an explicit false opt-out to retain smooth scrolling.
      const source = readFileSync(path, "utf8").replace(/respectReducedMotion:\s*false/g, "");
      return /prefers-reduced-motion|use(?:Live)?ReducedMotion|reducedMotion|respectReducedMotion|prefersReduced|motion-reduce:|motion-safe:/.test(source);
    }).map((path) => relative(root, path))
  );
  assert.deepEqual(violations, []);
});
