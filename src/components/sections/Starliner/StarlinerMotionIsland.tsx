"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for the Motion-powered Starliner.
 * Avoids SSR of a component that needs `IntersectionObserver` and
 * `ResizeObserver` to do anything visible. The static SCSS background of the
 * card stands in until hydration.
 */
export const StarlinerMotionIsland = dynamic(
  () =>
    import("./StarlinerMotion").then((m) => ({
      default: m.StarlinerMotion
    })),
  { ssr: false }
);
