import { cva } from "class-variance-authority";

/** Chapter and playback controls share appearance, but never compete for width. */
export const storyControlVariants = cva(
  "h-7 bg-teaser-card text-teaser-control text-[12px] aria-pressed:bg-white aria-pressed:text-black md:h-9",
  {
    variants: {
      kind: {
        chapter: "w-7 md:w-9",
        playback: "w-auto min-w-14 px-2"
      }
    },
    defaultVariants: { kind: "chapter" }
  }
);
