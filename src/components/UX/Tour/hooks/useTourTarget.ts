"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

import { useTourStore } from "../TourProvider";
import type { NudgePlacement } from "@/stores/Tour/types";

export type UseTourTargetOptions = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  placement?: NudgePlacement;
};

export function useTourTarget<T extends HTMLElement = HTMLElement>(
  opts: UseTourTargetOptions
) {
  const { id, label, description, shortcut, placement } = opts;
  const registerTarget = useTourStore((s) => s.registerTarget);
  const unregisterTarget = useTourStore((s) => s.unregisterTarget);
  const elementRef = useRef<T | null>(null);

  const ref = useCallback((node: T | null) => {
    elementRef.current = node;
  }, []);

  useLayoutEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    registerTarget({
      id,
      element: el,
      label,
      description,
      shortcut,
      placement
    });
    return () => unregisterTarget(id);
  }, [
    id,
    label,
    description,
    shortcut,
    placement,
    registerTarget,
    unregisterTarget
  ]);

  return ref;
}
