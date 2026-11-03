"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
  onClick
}: {
  label: string;
  mirror?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="port-control flex size-11 items-center justify-center rounded-full"
      onClick={onClick}
    >
      <svg viewBox="0 0 15 15" className={mirror ? "h-[55%] w-[55%] -scale-x-100" : "h-[55%] w-[55%]"} aria-hidden="true">
        <path d={REWIND_PATH} fill="currentColor" />
      </svg>
    </button>
  );
}

export function TrackPlayer({ track }: { track: Track }) {
  const howlRef = useRef<Howl | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(track.duration);

  const ensureHowl = () => {
    if (howlRef.current) return howlRef.current;
    const howl = new Howl({ src: [track.audioUrl], html5: true });
    const stop = () => setPlaying(false);
    howl.on("end", stop);
    howl.on("loaderror", stop);
    howl.on("playerror", stop);
    howlRef.current = howl;
    return howl;
  };

  const seek = (delta: number) => {
    const howl = ensureHowl();
    const span = howl.duration() || track.duration;
    const current = typeof howl.seek() === "number" ? howl.seek() : position;
    const next = clampSeek(current, delta, span);
    howl.seek(next);
    setDuration(span);
    setPosition(next);
  };

  useEffect(() => {
    return () => {
      const howl = howlRef.current;
      howl?.off("end");
      howl?.off("loaderror");
      howl?.off("playerror");
      howl?.unload();
      howlRef.current = null;
    };
  }, [track.audioUrl]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const howl = howlRef.current;
      if (!howl) return;
      const span = howl.duration() || track.duration;
      const current = typeof howl.seek() === "number" ? howl.seek() : 0;
      setDuration((previous) => (previous === span ? previous : span));
      setPosition((previous) => (Math.floor(previous) === Math.floor(current) ? previous : current));
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, track.duration]);

  return (
    <div className="flex flex-col gap-3">
      <TrackRow track={track} />
      <CanvasBoundary fallback={<div className="port-rule aspect-video w-full rounded-[10px] border" />}>
        <Suspense fallback={<div className="port-rule aspect-video w-full rounded-[10px] border" />}>
          <TapeModel playing={playing} label={`${track.artist} - ${track.title}`} />
        </Suspense>
      </CanvasBoundary>
      <TapeReels playing={playing} progress={playbackProgress(position, duration)} />
      <TapeCounter position={position} duration={duration} />
      <ProgressRail progress={playbackProgress(position, duration)} />
      <div className="flex items-center justify-center gap-6">
        <SkipButton label="Rewind" onClick={() => seek(-SEEK_STEP_SECONDS)} />
        <PlayPauseButton
          playing={playing}
          onToggle={() => {
            const howl = ensureHowl();
            if (playing) {
              howl.pause();
              setPlaying(false);
              return;
            }
            howl.play();
            setPlaying(true);
          }}
        />
        <SkipButton label="Forward" mirror onClick={() => seek(SEEK_STEP_SECONDS)} />
      </div>
    </div>
  );
}
