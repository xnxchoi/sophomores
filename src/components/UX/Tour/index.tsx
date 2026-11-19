"use client";

import { InterfaceTour } from "./InterfaceTour";

export { TourProvider } from "./TourProvider";
export { useTourStore } from "./TourProvider";

/**
 * Drop this once inside the provider tree (at layout level).
 * It mounts the interface tour. Visible openers (InterfaceTourOpener) open it; there is no global key shortcut.
 */
export function TourOrchestrator() {
  return (
    <InterfaceTour />
  );
}
