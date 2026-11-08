import { describe, expect, it } from "vitest";
import { getViewportSize } from "./getViewportSize";

describe("getViewportSize", () => {
  it("maps widths to the smallest matching named breakpoint", () => {
    expect(getViewportSize(390)).toBe("xs");
    expect(getViewportSize(479)).toBe("xs");
    expect(getViewportSize(480)).toBe("sm");
    expect(getViewportSize(639)).toBe("sm");
    expect(getViewportSize(640)).toBe("md");
    expect(getViewportSize(767)).toBe("md");
    expect(getViewportSize(768)).toBe("lg");
    expect(getViewportSize(1023)).toBe("lg");
    expect(getViewportSize(1024)).toBe("xl");
    expect(getViewportSize(1279)).toBe("xl");
    expect(getViewportSize(1280)).toBe("2xl");
    expect(getViewportSize(1439)).toBe("2xl");
    expect(getViewportSize(1440)).toBe("3xl");
    expect(getViewportSize(1919)).toBe("3xl");
  });

  it("uses the largest named breakpoint at and above 3xl", () => {
    expect(getViewportSize(1920)).toBe("3xl");
    expect(getViewportSize(3000)).toBe("3xl");
  });
});
