import { describe, expect, it } from "vitest";
import { pickTransitionType } from "./pageGroups";

describe("pickTransitionType settings shell", () => {
  it("keeps the settings shell in place between section paths", () => {
    const decision = pickTransitionType({
      fromHref: "/me/settings/profile",
      toHref: "/me/settings/security",
      navIsOpen: false
    });
    expect(decision.type).toBe("SHELL");
  });

  it("keeps the settings shell from the hub to a section", () => {
    const decision = pickTransitionType({
      fromHref: "/me/settings",
      toHref: "/me/settings/general",
      navIsOpen: false
    });
    expect(decision.type).toBe("SHELL");
  });

  it("does not reuse the in-shell handoff when leaving settings", () => {
    const decision = pickTransitionType({
      fromHref: "/me/settings/security",
      toHref: "/me",
      navIsOpen: false
    });
    expect(decision.type).not.toBe("SHELL");
  });
});
