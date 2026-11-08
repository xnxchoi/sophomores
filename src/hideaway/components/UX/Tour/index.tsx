"use client";

import { InterfaceTour, InterfaceTourTrigger } from "./InterfaceTour";

export { TourProvider } from "./TourProvider";
export { useTourStore } from "./TourProvider";

/**
 * Drop this once inside the provider tree (at layout level).
 * It mounts the interface tour and its activation trigger.
 */
export function TourOrchestrator() {
  return (
    <>
      <InterfaceTourTrigger />

      <InterfaceTour />
    </>
  );
}
