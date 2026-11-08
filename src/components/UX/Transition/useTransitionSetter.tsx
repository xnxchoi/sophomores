"use client";

import { useRPStore } from "@/providers/RP_Pro";
import { useTransitionRouter } from "next-transition-router";
import { usePathname } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import type { PageTransitionType } from "./index";
import { pickTransitionType, type TransitionDecision } from "./pageGroups";

type TransitionSetOptions = {
  override?: PageTransitionType | null;
};

const scheduleTransitionPush = (work: () => void) => {
  requestAnimationFrame(() => {
    startTransition(work);
  });
};

export const useTransitionSetter = () => {
  const navisopref = useRef(false);
  const currentPathRef = useRef("/");
  const setTransitionOutType = useRPStore((l) => l.setTransitionOutType),
    setNavigationPageItemSelected = useRPStore(
      (l) => l.setNavigationPageItemSelected
    ),
    setIsTransitioningWipe = useRPStore((l) => l.setIsTransitioningWipe),
    router = useTransitionRouter(),
    navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const currentPath = usePathname();
  useEffect(() => {
    navisopref.current = navIsOpen;
  }, [navIsOpen]);
  useEffect(() => {
    currentPathRef.current = currentPath || "/";
  }, [currentPath]);

  const setGenericPageTransition = useCallback(
    (
      targetHref?: string,
      options?: TransitionSetOptions
    ): TransitionDecision => {
      const fromHref = currentPathRef.current;
      const toHref = targetHref ?? fromHref;
      const decision = pickTransitionType({
        fromHref,
        toHref,
        navIsOpen: navisopref.current,
        override: options?.override ?? null
      });
      setTransitionOutType(decision.type);
      setIsTransitioningWipe(decision.type === "CURTAIN");
      setNavigationPageItemSelected(-1);
      return decision;
    },
    [
      setTransitionOutType,
      setIsTransitioningWipe,
      setNavigationPageItemSelected
    ]
  );
  const goToPage = useCallback(
    (l: string, options?: TransitionSetOptions) => {
      const decision = setGenericPageTransition(l, options);
      const push = () => {
        l &&
          router.push(l, {
            scroll: false
          });
      };
      if (decision.type === "LOST_PRODUCT") {
        scheduleTransitionPush(push);
        return;
      }
      setTimeout(() => {
        scheduleTransitionPush(push);
      }, 120);
    },
    [router, setGenericPageTransition]
  );
  return {
    goToPage,
    setGenericPageTransition
  };
};
