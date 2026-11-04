"use client";

import { Suspense } from "react";
import { InterfaceTour, InterfaceTourTrigger } from "./InterfaceTour";
import { RegistrationTourTrigger } from "./RegistrationTour";

export { TourProvider } from "./TourProvider";
export { useTourStore } from "./TourProvider";

/**
 * Drop this once inside the provider tree (at layout level).
 * It mounts both tour overlays and their activation triggers.
 */
export function TourOrchestrator() {
  return (
    <>
      {/* Triggers — zero-render, keyboard/session listeners */}
      <Suspense fallback={null}>
        <RegistrationTourTrigger />
      </Suspense>
      <InterfaceTourTrigger />

      <InterfaceTour />
    </>
  );
}
