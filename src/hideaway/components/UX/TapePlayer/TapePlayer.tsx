"use client";

import { useHasRadio } from "@/hideaway/providers/HideawayFM/hooks";
import { DrawerPlayer } from "./layouts/DrawerPlayer";
import { FullPlayer } from "./layouts/FullPlayer";
import { HeroPlayer } from "./layouts/HeroPlayer";
import { SidebarPlayer } from "./layouts/SidebarPlayer";
import type { TapePlayerProps } from "./types";

/**
 * TapePlayer — TE-inspired audio player component.
 *
 * Selects the appropriate layout variant based on the `variant` prop.
 * All variants share the same HideawayFMProvider for state.
 *
 * Variants:
 *   - "hero": Full-width scroll-linked section
 *   - "sidebar": Compact sidebar (PC)
 *   - "drawer": Compact drawer (Mobile)
 *   - "full": Complete tape deck
 */
export const TapePlayer = ({
  variant,
  className,
  scrollHint = true
}: TapePlayerProps) => {
  const hasRadio = useHasRadio();

  if (!hasRadio) return null;

  switch (variant) {
    case "hero":
      return <HeroPlayer className={className} scrollHint={scrollHint} />;
    case "sidebar":
      return <SidebarPlayer className={className} />;
    case "drawer":
      return <DrawerPlayer className={className} />;
    case "full":
      return <FullPlayer className={className} />;
    default:
      return null;
  }
};
