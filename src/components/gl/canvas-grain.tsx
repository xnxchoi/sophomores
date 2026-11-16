import { cn } from "@/lib/utils";

/**
 * The Hideaway's site grain: `.preview__gradient:before` (`src/app/(frontend)/estate.scss:161-171`) on its one
 * fixed, full-screen canvas (`components/core/Main.tsx:38-49`). `noise.png` tiled at 160px, masked by itself, with
 * a saturation blend, one layer above the canvas inside the canvas's own fixed layer, so it sits above the page
 * and under the header, the menu frame, the cursor and every sheet, as the canvas does. The values are pixels,
 * so nothing changes for this site's 16px root. `standalone` gives it its own fixed layer when the canvas has
 * failed, so the grain stays; with no canvas under it the blend is dropped, which paints it as the canvas layer
 * paints it over a clear canvas.
 */
export function CanvasGrain({ standalone = false }: { standalone?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-grain=""
      className={cn(
        "pointer-events-none absolute inset-0 z-1 bg-[url(/assets/noise.png)] mask-[url(/assets/noise.png)] bg-size-[160px_160px] mask-size-[160px_160px] mix-blend-saturation",
        standalone && "fixed mix-blend-normal"
      )}
    />
  );
}
