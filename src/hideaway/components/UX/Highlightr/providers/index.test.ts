import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(import.meta.dirname, "index.tsx"), "utf8");

describe("Highlightr ContentProvider SSR", () => {
  it("does not hide RangerProvider behind next/dynamic ssr:false", () => {
    expect(src).not.toMatch(/ssr:\s*false/);
  });
});
