import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetDocumentHydratedForTests,
  consumeHydrationSafeInitial
} from "./pageTransitionInitial";

beforeEach(() => {
  vi.stubGlobal("window", {
    document: { createElement: () => ({}) }
  });
  __resetDocumentHydratedForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  __resetDocumentHydratedForTests();
});

describe("pageTransitionInitial", () => {
  it("skips the none variant for every remount of the first document path", () => {
    expect(consumeHydrationSafeInitial("/")).toBe(true);
    expect(consumeHydrationSafeInitial("/")).toBe(true);
    expect(consumeHydrationSafeInitial("/")).toBe(true);
  });

  it("animates from none only after the document leaves the first path", () => {
    expect(consumeHydrationSafeInitial("/")).toBe(true);
    expect(consumeHydrationSafeInitial("/essays/hello")).toBe(false);
    expect(consumeHydrationSafeInitial("/")).toBe(false);
  });

  it("always skips none during SSR where window has no document", () => {
    vi.unstubAllGlobals();
    __resetDocumentHydratedForTests();
    expect(consumeHydrationSafeInitial("/")).toBe(true);
    expect(consumeHydrationSafeInitial("/essays/hello")).toBe(true);
  });
});
