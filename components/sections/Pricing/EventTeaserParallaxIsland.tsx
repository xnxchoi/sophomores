"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for the parallax FOMO section.
 * Motion's `useScroll` reads from `window` on mount; isolating to client-only
 * keeps SSR streaming clean and lets us reserve the layout space before hydration.
 */
export const EventTeaserParallaxIsland = dynamic(
  () =>
    import("./EventTeaserParallax").then((m) => ({
      default: m.EventTeaserParallax
    })),
  {
    ssr: false,
    loading: () => (
      <section
        aria-hidden
        style={{
          minHeight: "120vh",
          background: "oklch(0.08 0.005 240)"
        }}
      />
    )
  }
);
