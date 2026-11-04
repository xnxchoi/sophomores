import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(__dirname + "/index.tsx", "utf8");

describe("global cursor motion", () => {
  it("binds pointer coordinates directly without a trailing position spring", () => {
    expect(source).toContain('document.addEventListener("pointermove"');
    expect(source).toContain("x: cursorX,");
    expect(source).toContain("y: cursorY,");
    expect(source).not.toContain("cursorXSpring");
    expect(source).not.toContain("cursorYSpring");
  });

  it("maps the route theme to the contrasting cursor color", () => {
    expect(source).toContain(
      'const baseCursorTheme = theme === "light" ? "dark" : "light"'
    );
    expect(source).toContain("setBaseCursorTheme(baseCursorTheme)");
    expect(source).toContain("style={{ fill: strokeColor }}");
    expect(source).not.toContain('className="inline fill-nav-button stroke-0"');
  });
});
