import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(import.meta.dirname, "SettingsPane.tsx"), "utf8");
const nav = readFileSync(resolve(import.meta.dirname, "SettingsNav.tsx"), "utf8");
const layout = readFileSync(
  resolve(
    import.meta.dirname,
    "../../../app/(frontend)/(site)/(auth)/me/settings/layout.tsx"
  ),
  "utf8"
);
const provider = readFileSync(
  resolve(import.meta.dirname, "../../../providers/TransitionProvider.tsx"),
  "utf8"
);

describe("SettingsPane", () => {
  it("does not remount or translate the pane on path change", () => {
    expect(src).not.toMatch(/key=\{pathname\}/);
    expect(src).not.toMatch(/y:\s*8/);
  });

  it("starts fading the pane as soon as a rail click is pending", () => {
    expect(src).toMatch(/pendingHref/);
    expect(src).toMatch(/useAnimate/);
    expect(src).toMatch(/opacity:\s*0/);
    expect(src).toMatch(/data-leaving=\{leaving \? "true" : "false"\}/);
  });

  it("keeps the outgoing section mounted until the fade-out commits", () => {
    expect(src).toMatch(/setShown\(incomingRef\.current\)/);
    expect(src).toMatch(/\{shown\}/);
    expect(src).toMatch(/opacity:\s*1/);
    expect(src).not.toMatch(/>\s*\{children\}\s*</);
  });

  it("is mounted from the settings layout around the main slot", () => {
    expect(layout).toMatch(/SettingsPane/);
    expect(layout).toMatch(/SettingsNavProvider/);
  });
});

describe("SettingsNav pending href", () => {
  it("does not clear the pending href when the pathname updates", () => {
    expect(nav).not.toMatch(/setPendingHref\(null\)/);
    expect(src).toMatch(/setPendingHref\(/);
  });
});

describe("SHELL transition does not steal the pane fade", () => {
  it("leaves and enters SHELL without scroll or the 0.4s entry wait", () => {
    expect(provider).toMatch(/tro\.current === "SHELL"/);
    expect(provider).toMatch(/enteringTransition === "SHELL"/);
    expect(provider).toMatch(
      /if \(enteringTransition === "SHELL"\) \{[\s\S]*setTransitionOutType\(null\)/
    );
  });
});
