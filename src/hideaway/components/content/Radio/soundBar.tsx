"use client";

import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";
import { cn } from "@/lib/utils";
import { useHideawayFMControls } from "@/hideaway/providers/HideawayFM";
import { usePlayState } from "@/hideaway/providers/HideawayFM/hooks";
import { useCursor } from "@/hideaway/providers/RP_Pro";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";

type SoundBarProps = {};
export const SoundBar = ({}: SoundBarProps) => {
  const { optimistic, real } = usePlayState();
  const playing = optimistic === "playing";
  const trackStatus =
    real === "playing" ? "playing" : real === "loading" ? "seeking" : "paused";
  const { toggle } = useHideawayFMControls();
  const [hovered, setHovered] = useState(false);
  const cursorState = useCursor((state) => state.cursorState);
  const lastHovered = useRef<boolean>(hovered);
  const lastCursorState = useRef<string | null>(cursorState);
  const setMarquee = useCursor((l) => l.setMarquee);

  useEffect(() => {
    if (
      lastHovered.current !== hovered ||
      (lastCursorState.current !== cursorState && hovered)
    ) {
      setMarquee(hovered);
    }
    lastHovered.current = hovered;
    lastCursorState.current = cursorState;
  }, [hovered, cursorState]);
  const setCursor = useCursor((state) => state.setCursorState);
  const stateRef = useRef(trackStatus);
  useEffect(() => {
    stateRef.current = trackStatus;
  }, [trackStatus]);
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    enterCondition: () => {
      switch (stateRef.current) {
        case "playing":
          return (setHovered(true), "MUTE");
        case "seeking":
          return (setHovered(true), "SEEKING");
        case "paused":
        case "stopped":
        case "idle":
        case "ended":
          return (setHovered(true), "RP.FM");
        default:
          return null;
      }
    },

    onLeave: () => setHovered(false)
  });

  const onClick = useCallback(() => {
    switch (stateRef.current) {
      case "playing":
        setCursor("RP.FM");
        setHovered(true);
        toggle();
        break;
      case "paused":
      case "idle":
      case "stopped":
      case "ended":
        setCursor("MUTE");
        setHovered(true);
        toggle();
        break;
      default:
        return;
    }
  }, [setCursor, toggle]);
  return (
    <m.button
      initial={{
        opacity: 0
      }}
      animate={{
        opacity: 1,
        transition: {
          duration: 0.3,
          ease: "easeInOut",
          type: "tween"
        }
      }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.3,
          ease: "easeInOut",
          type: "tween"
        }
      }}
      className={cn(
        "group/soundbar flex h-[32px] w-[32px] shrink-0 items-center justify-center gap-[1.5px] rounded-[50%]"
      )}
      data-themed="color, background-color"
      data-active={trackStatus === "playing"}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        data-themed="color, background-color"
        className={cn(
          "c-soundwave__bar group-soundbar:data-[active=true]:animate-soundwave h-[4px] w-[2px] origin-center rounded-[1px] transition-[background-color] duration-300 ease-power4",
          playing ? "bg-nav-foreground" : "bg-nav-foreground/50",
          "delay-[0s]"
        )}
      ></div>
      <div
        data-themed="color, background-color"
        className={cn(
          "c-soundwave__bar group-soundbar:data-[active=true]:animate-soundwave h-[4px] w-[2px] origin-center rounded-[1px] transition-[background-color] duration-300 ease-power4",
          playing ? "bg-nav-foreground" : "bg-nav-button-foreground/50",
          "delay-[-0.4s]"
        )}
      ></div>
      <div
        data-themed="color, background-color"
        className={cn(
          "c-soundwave__bar group-soundbar:data-[active=true]:animate-soundwave h-[4px] w-[2px] origin-center rounded-[1px] transition-[background-color] duration-300 ease-power4",
          playing ? "bg-nav-foreground" : "bg-nav-foreground/50",
          "delay-[-0.2s]"
        )}
      ></div>
      <div
        data-themed="color, background-color"
        className={cn(
          "c-soundwave__bar group-soundbar:data-[active=true]:animate-soundwave h-[4px] w-[2px] origin-center rounded-[1px] transition-[background-color] duration-300 ease-power4",
          playing ? "bg-nav-foreground" : "bg-nav-foreground/50",
          "delay-[-0.4s]"
        )}
      ></div>
    </m.button>
  );
};
