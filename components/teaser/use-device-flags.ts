"use client";
import { useSyncExternalStore } from "react";

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
