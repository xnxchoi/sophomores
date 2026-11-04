import { describe, expect, it } from "vitest";
import { createTransStore } from "./RP_Ui";

describe("RP transition animations", () => {
  it("uses CSS-serializable values on FADE.none so SSR style matches hydration", () => {
    const none = createTransStore().getState().transitionAnimations.FADE.none;
    expect(none).toMatchObject({
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      overflowX: "hidden",
      overflowY: "hidden",
      opacity: "0"
    });
    expect(none).not.toHaveProperty("overflow");
  });

  it("uses CSS-serializable values on FADE.entering so SSR style matches hydration", () => {
    const entering =
      createTransStore().getState().transitionAnimations.FADE.entering;
    expect(entering).toMatchObject({
      position: "relative",
      overflowX: "visible",
      overflowY: "visible",
      opacity: "1",
      pointerEvents: "auto"
    });
    expect(entering).not.toHaveProperty("overflow");
  });

  it("exposes the LOSTINSEOUL product handoff variant used by RPage", () => {
    const animations = createTransStore().getState().transitionAnimations;

    expect(animations.LOST_PRODUCT.none).toMatchObject({
      y: "100svh",
      position: "fixed"
    });
    expect(animations.LOST_PRODUCT.entering).toMatchObject({
      y: 0,
      position: "relative"
    });
    expect(animations.LOST_PRODUCT.leaving).toMatchObject({
      scale: 0.5,
      scaleX: 0.9,
      position: "fixed"
    });
  });

  it("uses CSS-serializable string opacity on every leaving variant that sets opacity", () => {
    const animations = createTransStore().getState().transitionAnimations;

    expect(animations.CURTAIN.leaving.opacity).toBe("0");
    expect(animations.LOST_PRODUCT.leaving.opacity).toBe("1");
    expect(animations.IMMEDIATE.leaving.opacity).toBe("0");
  });

  it("never uses numeric opacity in any transition variant", () => {
    const animations = createTransStore().getState().transitionAnimations;

    for (const [name, steps] of Object.entries(animations)) {
      for (const [step, variant] of Object.entries(steps)) {
        if (!("opacity" in variant)) continue;
        expect(
          typeof variant.opacity,
          `${name}.${step}.opacity must be a CSS string`
        ).toBe("string");
      }
    }
  });
});
