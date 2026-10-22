"use client";
import { useState } from "react";
import { motion, useTransform } from "motion/react";
import { FlameBackdrop } from "@/components/flame-backdrop/FlameBackdrop";
import { FlameFooterBackdrop } from "@/components/flame-backdrop/footer";
import { backdropTokens } from "@/lib/teaser/backdrop-tokens";
import type { SceneProps } from "./scene-loader";

export default function Scene(props: SceneProps) {
  const scale = useTransform(
    () =>
      (props.entryScale?.get() ?? 1) *
      backdropTokens.heroScale *
      (1 + props.progress.get() * backdropTokens.scrollZoom)
  );
  const y = useTransform(
    props.progress,
    [0, 1],
    ["0%", `${backdropTokens.scrollY}%`]
  );
  const [footerVisited, setFooterVisited] = useState(false);
  // Latch the first visit without mounting an unused WebGL renderer at page entry.
  if (props.footer && !footerVisited) setFooterVisited(true);

  return (
    <>
      {!props.footer && (
        <motion.div
          className="flame-hero-surface"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            scale: props.reducedMotion ? backdropTokens.heroScale : scale,
            y: props.reducedMotion ? 0 : y
          }}
        >
          <FlameBackdrop
            palette={backdropTokens.palette}
            transitionSeconds={backdropTokens.paletteTransition}
            paused={props.reducedMotion}
            visible={props.active}
            respectReducedMotion
            fallback={<div className="flame-still" />}
          />
        </motion.div>
      )}
      {footerVisited && (
        <FlameFooterBackdrop
          paused={props.reducedMotion}
          visible={Boolean(props.footer && props.active)}
          respectReducedMotion
          style={{
            position: "absolute",
            bottom: 0,
            display: props.footer ? undefined : "none",
            height: "100%",
          }}
        />
      )}
    </>
  );
}
