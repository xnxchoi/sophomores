"use client";
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
  // Scene kind is stable; activity only controls the renderer, never DOM visibility.
  if (props.footer)
    return (
      <FlameFooterBackdrop
        visible={props.active}
        verticalStretch={backdropTokens.footerVerticalStretch}
        className="absolute inset-0"
      />
    );

  return (
    <>
      <motion.div
        className="flame-hero-surface"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          scale,
          y
        }}
      >
        <FlameBackdrop
          palette={backdropTokens.palette}
          transitionSeconds={backdropTokens.paletteTransition}
          visible={props.active}
          fallback={<div className="flame-still" />}
        />
      </motion.div>
    </>
  );
}
