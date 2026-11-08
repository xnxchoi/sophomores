"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import { useAmbientAudio } from "./AmbientAudioProvider";

const fadeSpring = {
  type: "spring" as const,
  bounce: 0.2,
  visualDuration: 0.28
};

/**
 * Compact audio control designed to sit inside the Highlightr DynamicBreadcrumb
 * as a sibling widget of the bookmark button. Morphs between three states —
 * available, armed, and scoring — with a soft spring motion that mirrors
 * Apple's Dynamic Island choreography.
 */
export function AmbientAudioWidget() {
  const ambient = useAmbientAudio();

  const { hasAnchors, enabled, playing, activeTrack, groupCount, toggle } =
    ambient;

  const label = playing
    ? (activeTrack?.title ?? "Scoring")
    : enabled
      ? "Armed"
      : `${groupCount}`;

  return (
    hasAnchors && (
      <m.button
        key="widget-audio"
        layout
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={
          playing
            ? "Mute ambient score"
            : enabled
              ? "Disarm ambient audio"
              : "Arm ambient audio"
        }
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", bounce: 0.28, visualDuration: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        className="relative inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-2.5 select-none"
        style={{
          background: enabled
            ? "oklch(0.97 0 0 / 0.08)"
            : "oklch(0.97 0 0 / 0.04)",
          color: "inherit",
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase"
        }}
      >
        <WidgetGlyph playing={playing} enabled={enabled} />

        <AnimatePresence key={"play-label"} initial={false} mode="popLayout">
          {playing && (
            <m.span
              key={label}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={fadeSpring}
              className="max-w-[16ch] truncate"
              style={
                playing
                  ? {
                      textTransform: "none",
                      letterSpacing: "0.02em",
                      fontSize: 11
                    }
                  : undefined
              }
            >
              {label}
            </m.span>
          )}
        </AnimatePresence>
      </m.button>
    )
  );
}

function WidgetGlyph({
  playing,
  enabled
}: {
  playing: boolean;
  enabled: boolean;
}) {
  return (
    <m.span
      layout
      aria-hidden
      className="relative inline-flex h-[14px] w-[14px] items-center justify-center"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: playing ? 1 : enabled ? 0.9 : 0.7 }}
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {!enabled ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path
              d="M15.54 8.46a5 5 0 0 1 0 7.07"
              style={{ opacity: playing ? 1 : 0.6 }}
            />
            <path
              d="M19.07 4.93a10 10 0 0 1 0 14.14"
              style={{ opacity: playing ? 1 : 0.35 }}
            />
          </>
        )}
      </svg>
      {playing ? (
        <m.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            border:
              "1px solid color-mix(in oklab, currentColor 35%, transparent)"
          }}
          animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
    </m.span>
  );
}
