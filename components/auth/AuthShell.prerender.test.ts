import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(import.meta.dirname, "AuthShell.tsx"), "utf8");

describe("AuthShell partial prerender contract", () => {
  it("keeps the frost and wordmark outside the children Suspense", () => {
    const beforeCard = src.slice(
      0,
      src.indexOf("<Suspense fallback={<AuthCardFallback")
    );
    expect(beforeCard).toMatch(/<Logo/);
    expect(beforeCard).toMatch(/The Hideaway\./);
    expect(beforeCard).not.toMatch(/<Suspense/);
  });

  it("streams page content through Suspense with a static fallback", () => {
    expect(src).toMatch(/<Suspense[\s\S]*fallback=\{<AuthCardFallback/);
    expect(src).toMatch(/\{children\}/);
  });
});
