import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(import.meta.dirname, "SettingsRail.tsx"), "utf8");

describe("SettingsRail in-shell highlight", () => {
  it("moves a shared layout highlight instead of swapping background classes", () => {
    expect(src).toMatch(/layoutId=["']settings-rail-active["']/);
    expect(src).toMatch(/LayoutGroup/);
    expect(src).not.toMatch(/active \? "bg-foreground\/10"/);
  });

  it("moves the highlight on click instead of waiting for the pathname", () => {
    expect(src).toMatch(/pendingHref/);
    expect(src).toMatch(/setPendingHref/);
    expect(src).toMatch(/useSettingsNav/);
    expect(src).toMatch(/from ["']next\/link["']/);
    expect(src).not.toMatch(/@\/components\/core\/Link\/Link/);
  });

  it("does not restart a fade when the active row is clicked again", () => {
    expect(src).toMatch(/if \(href === activePath\) return/);
  });
});
