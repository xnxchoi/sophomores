"use client";
import { useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

const subscribeHydration = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false
  );
}
const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
export function useMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false
  );
}
const subscribeReduced = (callback: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

export function useLiveReducedMotion() {
  const initial = useReducedMotion();
  // Motion 12's hook snapshots its initial value. Subscribe for live OS changes too.
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => initial ?? false
  );
}
