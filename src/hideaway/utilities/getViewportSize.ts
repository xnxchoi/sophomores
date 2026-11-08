import type { ViewportSizes } from "@/hideaway/components/core/Media/types";
import { cssVariables } from "@/cssVariables";

const ORDERED_VIEWPORTS = (
  Object.entries(cssVariables.breakpoints) as [ViewportSizes, number][]
).sort((a, b) => a[1] - b[1]);

export const getViewportSize = (width: number): ViewportSizes => {
  for (const [name, max] of ORDERED_VIEWPORTS) {
    if (width < max) return name;
  }
  return ORDERED_VIEWPORTS[ORDERED_VIEWPORTS.length - 1][0];
};
