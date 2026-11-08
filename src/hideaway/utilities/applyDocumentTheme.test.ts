import { describe, expect, it } from "vitest";
import { applyDocumentTheme, clearThemedTransitions } from "./applyDocumentTheme";

const createRoot = () => {
  const attrs: Record<string, string> = {};
  const classes = new Set<string>();
  return {
    attrs,
    classes,
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
    classList: {
      add(name: string) {
        classes.add(name);
      },
      remove(name: string) {
        classes.delete(name);
      },
      toggle(name: string, force?: boolean) {
        if (force) classes.add(name);
        else classes.delete(name);
      }
    }
  };
};

describe("applyDocumentTheme", () => {
  it("arms theme transitions on the document root, not descendant style attributes", () => {
    const root = createRoot();

    applyDocumentTheme(root, "dark", { armTransitions: true });

    expect(root.attrs["data-theme"]).toBe("dark");
    expect(root.classes.has("dark")).toBe(true);
    expect(root.classes.has("theme-animating")).toBe(true);
  });

  it("writes the theme without arming or leaving a descendant style mutation", () => {
    const root = createRoot();
    root.classList.add("theme-animating");

    applyDocumentTheme(root, "light", { armTransitions: false });

    expect(root.attrs["data-theme"]).toBe("light");
    expect(root.classes.has("dark")).toBe(false);
    expect(root.classes.has("theme-animating")).toBe(true);
  });

  it("clears the document-root theme animation class", () => {
    const root = createRoot();
    root.classList.add("theme-animating");

    clearThemedTransitions(root);

    expect(root.classes.has("theme-animating")).toBe(false);
  });
});
