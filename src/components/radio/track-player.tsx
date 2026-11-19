"use client";
import { useTranslations } from "next-intl";

import { Suspense, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { Howl } from "howler";
import type { Track } from "@/lib/content/slots";
import { clampSeek, playbackProgress, SEEK_STEP_SECONDS } from "@/lib/content/transport";
import { PlayPauseButton } from "./play-pause";
import { ProgressRail } from "./progress-rail";
import { TapeCounter } from "./tape-counter";
import { TapeModel } from "./tape-model";
import { TapeReels } from "./tape-reels";
import { TrackRow } from "./track-row";

const REWIND_PATH =
  "M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7L6.85355 10.1464C7.04882 10.3417 7.04882 10.6583 6.85355 10.8536C6.65829 11.0488 6.34171 11.0488 6.14645 10.8536L2.64645 7.35355C2.45118 7.15829 2.45118 6.84171 2.64645 6.64645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645ZM12.8536 3.14645C13.0488 3.34171 13.0488 3.65829 12.8536 3.85355L9.70711 7L12.8536 10.1464C13.0488 10.3417 13.0488 10.6583 12.8536 10.8536C12.6583 11.0488 12.3417 11.0488 12.1464 10.8536L8.64645 7.35355C8.45118 7.15829 8.45118 6.84171 8.64645 6.64645L12.1464 3.14645C12.3417 2.95118 12.6583 2.95118 12.8536 3.14645Z";

function SkipButton({
  label,
  mirror = false,
  disabled,
  onClick
}: {
  label: string;
  mirror?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <m.button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="flex size-12 items-center justify-center rounded-full text-faded-fg disabled:opacity-35"
      onClick={onClick}
      whileTap={disabled ? undefined : { scale: 0.88, rotate: mirror ? 30 : -30 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      <svg viewBox="0 0 15 15" className={mirror ? "h-[55%] w-[55%] -scale-x-100" : "h-[55%] w-[55%]"} aria-hidden="true">
        <path d={REWIND_PATH} fill="currentColor" />
      </svg>
    </m.button>
  );
}

function Deck({
  track,
  playing,
  setPlaying
}: {
  track: Track;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
}) {
  const t = useTranslations("Interface.radio");
  const howlRef = useRef<Howl | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const toggle = () => {
    if (status === "loading" || !track.audioUrl) return;
    if (playing) {
      howlRef.current?.pause();
      return;
    }
    const previous = howlRef.current;
    if (status === "error") {
      howlRef.current = null;
      previous?.off().unload();
      setDuration(0);
      setPosition(0);
    }
    let howl = howlRef.current;
    if (!howl) {
      const next = new Howl({ src: [track.audioUrl], html5: true, preload: false });
      howlRef.current = next;
      const fail = () => {
        if (howlRef.current !== next) return;
        setStatus("error");
        setDuration(0);
        setPosition(0);
        setPlaying(false);
      };
      next.on("load", () => {
        const seconds = next.duration();
        if (howlRef.current === next && Number.isFinite(seconds) && seconds > 0) setDuration(seconds);
      });
      next.on("play", () => {
        if (howlRef.current !== next) return;
        setStatus("idle");
        setPlaying(true);
      });
      next.on("pause", () => { if (howlRef.current === next) setPlaying(false); });
      next.on("end", () => {
        if (howlRef.current !== next) return;
        setPlaying(false);
        const seconds = next.duration();
        if (Number.isFinite(seconds) && seconds > 0) setPosition(seconds);
      });
      next.on("loaderror", fail);
      next.on("playerror", fail);
      next.load();
      howl = next;
    }
    setStatus("loading");
    howl.play();
  };

  const canSeek = duration > 0 && status === "idle";
  const seek = (delta: number) => {
    const howl = howlRef.current;
    if (!howl || !canSeek) return;
    const current = howl.seek();
    const next = clampSeek(typeof current === "number" && Number.isFinite(current) ? current : position, delta, duration);
    howl.seek(next);
    setPosition(next);
  };

  useEffect(() => () => {
    const howl = howlRef.current;
    howlRef.current = null;
    howl?.off().unload();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const update = () => {
      const current = howlRef.current?.seek();
      if (typeof current === "number" && Number.isFinite(current)) {
        setPosition((previous) => (Math.floor(previous) === Math.floor(current) ? previous : current));
      }
    };
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-4 px-4 pb-8">
      <TapeReels playing={playing} progress={playbackProgress(position, duration)} />
      <TapeCounter position={position} duration={duration} />
      <ProgressRail progress={playbackProgress(position, duration)} />
      <div className="flex w-full items-center justify-center gap-6">
        <SkipButton label={t("rewind", { seconds: SEEK_STEP_SECONDS })} disabled={!canSeek} onClick={() => seek(-SEEK_STEP_SECONDS)} />
        <PlayPauseButton
          size={56}
          playing={playing}
          busy={status === "loading"}
          unavailable={!track.audioUrl}
          retry={status === "error"}
          onToggle={toggle}
        />
        <SkipButton label={t("forward", { seconds: SEEK_STEP_SECONDS })} mirror disabled={!canSeek} onClick={() => seek(SEEK_STEP_SECONDS)} />
      </div>
      <p role="status" className="min-h-5 text-center text-sm text-muted-foreground">
        {status === "loading" ? t("loadingAudio")
          : status === "error" ? t("audioError")
          : !track.audioUrl ? t("audioUnavailable")
          : null}
      </p>
    </div>
  );
}

export function TrackPlayer({ track }: { track: Track }) {
  return <TrackPlayback key={track.audioUrl} track={track} />;
}

function TrackPlayback({ track }: { track: Track }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <TrackRow track={track} />
      <CanvasBoundary fallback={<div className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] aspect-video w-full rounded-[10px] border" />}>
        <Suspense fallback={<div className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] aspect-video w-full rounded-[10px] border" />}>
          <TapeModel playing={playing} label={`${track.artist} - ${track.title}`} />
        </Suspense>
      </CanvasBoundary>
      <Deck track={track} playing={playing} setPlaying={setPlaying} />
    </div>
  );
}
