"use client";
import { useState, useSyncExternalStore } from "react";
import { motion, useTransform } from "motion/react";
import { FlameBackdrop } from "@/components/flame-backdrop/FlameBackdrop";
import { FlameFooterBackdrop } from "@/components/flame-backdrop/footer";
import {
  backdropTokens,
  resolveFooterComposition
} from "@/lib/teaser/backdrop-tokens";
import type { SceneProps } from "./scene-loader";

export function subscribeViewport(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 150);
  };
  window.addEventListener("resize", onResize);
  return () => {
    window.removeEventListener("resize", onResize);
    clearTimeout(timer);
  };
}

function viewportSnapshot() {
  return `${window.innerWidth}:${window.innerHeight}`;
}

export default function Scene(props: SceneProps) {
  const viewport = useSyncExternalStore(
    subscribeViewport,
    viewportSnapshot,
    () => "1440:900"
  );
  const [width, height] = viewport.split(":").map(Number);
  const footerComposition = resolveFooterComposition(width, height);
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
          footerMaterial={backdropTokens.footerMaterial}
          paused={props.reducedMotion}
          visible={Boolean(props.footer && props.active)}
          respectReducedMotion
          // App pause and low-power modes also need a fully lit still, not ignition frozen at zero.
          config={{
            composition: footerComposition,
            ...(props.reducedMotion ? { ignition: { enabled: false } } : {})
          }}
          style={{
            position: "absolute",
            bottom: 0,
            height: "100%",
            display: props.footer ? undefined : "none"
          }}
        />
      )}
    </>
  );
}
