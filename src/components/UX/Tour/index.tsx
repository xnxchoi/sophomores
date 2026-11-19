"use client";

import { useEffect } from "react";
import { InterfaceTour } from "./InterfaceTour";
import { useTourStore } from "./TourProvider";

export { TourProvider } from "./TourProvider";
export { useTourStore } from "./TourProvider";

/**
 * Opens the site guide on the `?` key, as The Hideaway did (its `InterfaceTourTrigger`): anywhere on the
 * site, except while typing in a field, during the registration tour or while the guide is already open.
 */
function InterfaceTourTrigger() {
  const open = useTourStore((state) => state.openInterfaceTour);
  const active = useTourStore((state) => state.ifActive);
  const registering = useTourStore((state) => state.regActive);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      if (event.key !== "?" || typing || registering || active) return;
      event.preventDefault();
      open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, open, registering]);
  return null;
}

/** Drop this once inside the provider tree (at layout level): the guide and its `?` key. */
export function TourOrchestrator() {
  return (
    <>
      <InterfaceTourTrigger />
      <InterfaceTour />
    </>
  );
}
