import { cn } from "@/lib/utils";

/**
 * The Hideaway's site grain: `.preview__gradient:before` (`src/app/(frontend)/estate.scss:161-171`) on its one
 * fixed, full-screen canvas (`components/core/Main.tsx:38-49`). `noise.png` tiled at 160px, masked by itself, with
 * a saturation blend, one layer above the canvas inside the canvas's own fixed layer, so it sits above the page
 * and under the header, the menu frame, the cursor and every sheet, as the canvas does. The values are pixels,
 * so nothing changes for this site's 16px root. `standalone` gives it its own fixed layer when the canvas has
 * failed, so the grain stays; with no canvas under it the blend is dropped, which paints it as the canvas layer
 * paints it over a clear canvas.
 *
 * The saturation blend only shows over colour, so on this site's flat dark ground it vanishes. The second layer is
 * The Hideaway's grain for flat grounds (`me/settings/layout.tsx:47`): the same `noise.png` at 45px with an overlay
 * blend, 3% in light and 5% in dark, so the grain reads in both modes (owner: grain "all the way", 2026-11-16).
 */
export function CanvasGrain({ standalone = false }: { standalone?: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        data-grain=""
        className={cn(
          "pointer-events-none absolute inset-0 z-1 bg-[url(/assets/noise.png)] mask-[url(/assets/noise.png)] bg-size-[160px_160px] mask-size-[160px_160px] mix-blend-saturation",
          standalone && "fixed mix-blend-normal"
        )}
      />
      <span
        aria-hidden="true"
        data-grain-flat=""
        className={cn(
          "pointer-events-none absolute inset-0 z-1 bg-[url(/assets/noise.png)] bg-size-[45px_45px] opacity-[0.03] mix-blend-overlay dark:opacity-[0.05]",
          standalone && "fixed"
        )}
      />
    </>
  );
}
