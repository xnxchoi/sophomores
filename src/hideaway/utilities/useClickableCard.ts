"use client";

import { useTransitionRouter } from "next-transition-router";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useCursor, useRPStore } from "@/hideaway/providers/RP_Pro";
import { delay } from "@/hideaway/utilities/rp_utils";

type UseClickableCardType<T extends HTMLElement> = {
  card: {
    ref: RefObject<T | null>;
  };
  link: {
    ref: RefObject<HTMLAnchorElement | null>;
  };
};

interface Props {
  external?: boolean;
  newTab?: boolean;
  scroll?: boolean;
}

export function useClickableCard<T extends HTMLElement>({
  external = false,
  newTab = false,
  scroll = true
}: Props): UseClickableCardType<T> {
  const router = useTransitionRouter();
  const card = useRef<T>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const timeDown = useRef<number>(0);
  const hasActiveParent = useRef<boolean>(false);
  const pressedButton = useRef<number>(0);
  const setPageIsTransitioning = useRPStore((r) => r.setPageIsTransitioning);
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.target) {
        const target = e.target as Element;

        const timeNow = +new Date();
        const parent = target?.closest("a");

        pressedButton.current = e.button;

        if (!parent) {
          hasActiveParent.current = false;
          timeDown.current = timeNow;
        } else {
          hasActiveParent.current = true;
        }
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, card, link, timeDown]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (link.current?.href) {
        const timeNow = +new Date();
        const difference = timeNow - timeDown.current;

        if (link.current.href && difference <= 250) {
          if (
            !hasActiveParent.current &&
            pressedButton.current === 0 &&
            !e.ctrlKey
          ) {
            if (external) {
              const target = newTab ? "_blank" : "_self";
              window.open(link.current.href, target);
            } else {
              e.preventDefault();
              router.push(link.current!.href, { scroll });
            }
          }
        }
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, card, link, timeDown]
  );

  useEffect(() => {
    const cardNode = card.current;

    if (cardNode) {
      cardNode.addEventListener("mousedown", handleMouseDown);
      cardNode.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      if (cardNode) {
        if (cardNode) {
          cardNode?.removeEventListener("mousedown", handleMouseDown);
          cardNode?.removeEventListener("mouseup", handleMouseUp);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, link, router]);

  return {
    card: {
      ref: card
    },
    link: {
      ref: link
    }
  };
}

export function useClickableCardRP<T extends HTMLElement>({
  external = false,
  newTab = false,
  scroll = true
}: Props): UseClickableCardType<T> {
  const router = useTransitionRouter();
  const card = useRef<T>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const timeDown = useRef<number>(0);
  const hasActiveParent = useRef<boolean>(false);
  const pressedButton = useRef<number>(0);
  const setCursorState = useCursor((store) => store.setCursorState);
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.target) {
        const target = e.target as Element;

        const timeNow = +new Date();
        const parent = target?.closest("a");

        pressedButton.current = e.button;

        if (!parent) {
          hasActiveParent.current = false;
          timeDown.current = timeNow;
        } else {
          hasActiveParent.current = true;
        }
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, card, link, timeDown]
  );
  const setPageIsTransitioning = useRPStore((r) => r.setPageIsTransitioning);
  const handleMouseUp = useCallback(
    async (e: MouseEvent) => {
      if (link.current?.href) {
        const timeNow = +new Date();
        const difference = timeNow - timeDown.current;
        if (link.current && link.current.href && difference <= 250) {
          e.preventDefault();
          if (
            !hasActiveParent.current &&
            pressedButton.current === 0 &&
            !e.ctrlKey
          ) {
            if (external) {
              const target = newTab ? "_blank" : "_self";
              window.open(link.current.href, target);
            } else {
              setPageIsTransitioning(true);
              router.push(link.current!.href, { scroll });
            }
          }
        }
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, card, link, timeDown, scroll]
  );
  const handleMouseEnter = useCallback(() => {
    setCursorState("FOCUS");
  }, [setCursorState]);
  const handleMouseLeave = useCallback(() => {
    setCursorState(null);
  }, [setCursorState]);
  useEffect(() => {
    const cardNode = card.current;

    if (cardNode) {
      cardNode.addEventListener("mousedown", handleMouseDown);
      cardNode.addEventListener("mouseup", handleMouseUp);
      cardNode.addEventListener("mouseenter", handleMouseEnter, {
        capture: true
      });
      cardNode.addEventListener("mouseleave", handleMouseLeave, {
        capture: true
      });
    }

    return () => {
      if (cardNode) {
        if (cardNode) {
          cardNode?.removeEventListener("mousedown", handleMouseDown);
          cardNode?.removeEventListener("mouseup", handleMouseUp);
          cardNode?.removeEventListener("mouseenter", handleMouseEnter);
          cardNode?.removeEventListener("mouseleave", handleMouseLeave);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, link, router, scroll]);

  return {
    card: {
      ref: card
    },
    link: {
      ref: link
    }
  };
}
