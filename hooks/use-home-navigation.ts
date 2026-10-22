"use client";

import type { MouseEvent } from "react";
import { useLenis } from "lenis/react";
import { navigateHome } from "@/lib/teaser/home-navigation";

export function useHomeNavigation() {
  const lenis = useLenis();
  return (event: MouseEvent<HTMLAnchorElement>) =>
    navigateHome(event, {
      updateHash: () => {
        if (window.location.hash !== "#hero")
          window.history.pushState(window.history.state, "", "#hero");
      },
      scrollTo: (target) => {
        if (lenis) lenis.scrollTo(target);
        else window.scrollTo({ top: target, behavior: "instant" });
      }
    });
}
