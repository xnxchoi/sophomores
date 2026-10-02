"use client";
import dynamic from "next/dynamic";
import { motion, useTransform } from "motion/react";
import { FlameBackdrop } from "@/components/flame-backdrop/FlameBackdrop";
import { backdropTokens } from "@/lib/teaser/backdrop-tokens";
import type { SceneProps } from "./scene-loader";

// Temporary existing footer: the separate flame-footer study is not approved yet.
const FooterOrb = dynamic(() => import("./footer-orb"), { ssr: false });

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
  if (props.footer) return <FooterOrb {...props} />;
  return (
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
  );
}
