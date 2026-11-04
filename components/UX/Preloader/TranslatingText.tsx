"use client";
import styles from "*.module.css";
import { computeGridOffset } from "@/components/UX/Preloader/utils/computeGridOffset";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/providers/MiddleMan";
import { useRPStore } from "@/providers/RP_Pro";
import { wait } from "@/utilities/wait";
import { cva } from "class-variance-authority";
import { gsap } from "gsap";
import React, { ComponentProps, useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import { TranslatePosition, TranslatingItemProps } from "./types";

const ANIMATION_CONFIG = {
  DURATION: 1,
  EASE: "power3.inOut"
};
const getOffsetFromCorner = (
  corner: `${"TOP" | "BOTTOM"}_${"RIGHT" | "LEFT"}`,
  width: number,
  height: number
) => {
  switch (corner) {
    case "TOP_LEFT":
      return { x: 0, y: 0 };
    case "TOP_RIGHT":
      return { x: -width, y: 0 };
    case "BOTTOM_RIGHT":
      return { x: -width, y: -height };
    case "BOTTOM_LEFT":
      return { x: 0, y: -height };
    default:
      return { x: 0, y: 0 };
  }
};

const variants = cva("absolute z-[10] opacity-0 font-normal", {
  variants: {
    hideMobile: {
      true: "hidden lg:block",
      false: "block"
    },
    size: {
      default:
        "text-[1.4rem] leading-[1] whitespace-nowrap -tracking-[.01em] lg:text-[1.6rem] font-sans",
      large:
        "font-300 text-[4.4rem] -tracking-[.02em] leading-[.8] lg:text-[8.8rem] font-serif"
    },

  },
  defaultVariants: {
    size: "default",
    hideMobile: false
  }
});
export const TranslatingText = (
  l: ComponentProps<"p"> & TranslatingItemProps
) => {
  let {
    size,
    text,
    id,
    className,
    introPosition,
    positions,
    hideMobile,
    introPositionMobile,
    positionsMobile = []
  } = l;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mainTextRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<GSAPTimeline>(null);

  const { isMobile } = useIsMobile();
  const enableAnimation = useRPStore(
    useShallow((state) => state.enablePreloaderAnimation)
  );
  const initiatedRef = useRef(false);
  const timeStampRef = useRef(Date.now());
  const getSize = useCallback(() => {
    if (!mainTextRef.current) return { width: 0, height: 0 };
    return {
      width: mainTextRef.current.offsetWidth,
      height: mainTextRef.current.offsetHeight
    };
  }, []);

  const getFinalPosition = useCallback(
    (pos: TranslatePosition) => {
      const base = computeGridOffset(pos);
      const { width, height } = getSize();
      const offset = getOffsetFromCorner(pos.corner, width, height);
      return {
        x: base.x + offset.x,
        y: base.y + offset.y
      };
    },
    [getSize]
  );

  const moveToIntroPosition = useCallback(() => {
    if (!wrapperRef.current || !introPosition) return;
    const pos =
      isMobile && introPositionMobile ? introPositionMobile : introPosition;
    const { x, y } = getFinalPosition(pos);
    gsap.set(wrapperRef.current, { x, y });
  }, [introPosition, introPositionMobile, isMobile, getFinalPosition]);

  const animateToFirstPosition = useCallback(async () => {
    if (!positions.length || !wrapperRef.current) return;
    await wait(50);

    const first =
      isMobile && positionsMobile.length ? positionsMobile[0] : positions[0];
    const { x, y } = getFinalPosition(first);

    gsap.killTweensOf(wrapperRef.current);
    return gsap.to(wrapperRef.current, {
      x,
      y,
      duration: ANIMATION_CONFIG.DURATION,
      ease: ANIMATION_CONFIG.EASE
    });
  }, [positions, positionsMobile, isMobile, getFinalPosition]);

  const startLoopingAnimation = useCallback(() => {
    if (!positions.length || !wrapperRef.current || (isMobile && hideMobile))
      return;

    const sequence = (isMobile ? positionsMobile : positions).slice(1);
    const loopPositions = [...sequence, positions[1], positions[0]];

    const tl = gsap.timeline({ repeat: -1 });
    loopPositions.forEach((pos) => {
      const { x, y } = getFinalPosition(pos);
      tl.to(wrapperRef.current, {
        x,
        y,
        duration: ANIMATION_CONFIG.DURATION,
        ease: ANIMATION_CONFIG.EASE
      });
    });

    timelineRef.current = tl;
  }, [positions, positionsMobile, getFinalPosition, isMobile, hideMobile]);

  const initiateAnimation = useCallback(async () => {
    if (initiatedRef.current) return;

    moveToIntroPosition();

    if (enableAnimation) {
      initiatedRef.current = true;
      gsap.set(wrapperRef.current, { autoAlpha: 1 });
      await animateToFirstPosition();
      startLoopingAnimation();
    }
  }, [
    moveToIntroPosition,
    animateToFirstPosition,
    startLoopingAnimation,
    enableAnimation
  ]);
  useEffect(() => {
    initiateAnimation();
  }, [initiateAnimation]);

  return text ? (
    <p
      className={cn(variants({ size, hideMobile }), className)}
      ref={wrapperRef}
      data-id={id}
    >
      <span className={styles.mainText} ref={mainTextRef}>
        {text}
      </span>
    </p>
  ) : null;
};

/**
 *       <span className={styles.textTopLeft}>{text}</span>
 *       <span className={styles.textTopMiddle}>{text}</span>
 *       <span className={styles.textTopRight}>{text}</span>
 *       <span className={styles.textRightMiddle}>{text}</span>
 *       <span className={styles.textBottomLeft}>{text}</span>
 *       <span className={styles.textBottomMiddle}>{text}</span>
 *       <span className={styles.textBottomRight}>{text}</span>
 *       <span className={styles.textLeftMiddle}>{text}</span>
 */
