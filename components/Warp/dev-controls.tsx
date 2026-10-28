"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_WARP_TUNING,
  WARP_TUNING_CONTROLS,
  type WarpTuning
} from "./_shared/tuning";

type Props = {
  tuning: WarpTuning;
  onChange: (next: WarpTuning) => void;
  progress: number;
  onSeek: (fraction: number) => void;
  onReplay: () => void;
  onPlay: () => void;
  playing: boolean;
};

// Native range inputs match the existing flame editor, with no added UI package.
export default function WarpControls({
  tuning,
  onChange,
  progress,
  onSeek,
  onReplay,
  onPlay,
  playing
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [copying, setCopying] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const hasOpened = useRef(false);
  const id = useId();

  useEffect(() => {
    if (open) {
      hasOpened.current = true;
      closeButton.current?.focus({ preventScroll: true });
    } else if (hasOpened.current) {
      launcher.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const copySettings = async () => {
    if (!navigator.clipboard?.writeText) {
      setStatus("Could not copy: clipboard unavailable in this browser.");
      return;
    }
    setCopying(true);
    setStatus("");
    try {
      await navigator.clipboard.writeText(JSON.stringify(tuning, null, 2));
      setStatus("Copied current settings as JSON.");
    } catch {
      setStatus("Could not copy. Check clipboard permissions and try again.");
    } finally {
      setCopying(false);
    }
  };

  return (
    <div
      className="fixed right-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 font-sans text-xs text-white"
      data-warp-controls=""
    >
      <button
        ref={launcher}
        type="button"
        hidden={open}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg border border-white/25 bg-black/85 px-4 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Warp controls
      </button>
      {open && (
        <aside
          id={id}
          aria-label="Warp controls"
          data-lenis-prevent=""
          className="max-h-[calc(100svh-24px-env(safe-area-inset-bottom))] w-[min(360px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-xl border border-white/25 bg-black/95 shadow-2xl"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/15 bg-black px-4 py-2">
            <h2 className="text-sm font-medium">Warp controls</h2>
            <button
              ref={closeButton}
              type="button"
              aria-label="Close warp controls"
              onClick={() => setOpen(false)}
              className="min-h-11 min-w-11 rounded border border-white/20 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Close
            </button>
          </div>
          <div className="flex flex-col gap-5 p-4">
            <p className="text-[11px] leading-relaxed text-white/65">
              Live, session-only adjustments. Reset or reload restores the
              current look. Copy settings before leaving. Ring tuning returns to
              the original corona look during handoff; layer visibility stays
              under your control. Interior controls keep light inside the forming
              ring and fade out by the corona handoff.
            </p>
            <fieldset className="min-w-0 border-b border-white/15 pb-4">
              <legend className="mb-2 text-[11px] tracking-wider text-white/70 uppercase">
                Sequence
              </legend>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="flex justify-between gap-3">
                  Progress <output>{Math.round(progress)}%</output>
                </span>
                <input
                  aria-label="Sequence progress"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={progress}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    if (Number.isFinite(value)) onSeek(value / 100);
                  }}
                  className="h-11 w-full accent-white focus-visible:outline-2 focus-visible:outline-offset-2"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPlay}
                  aria-pressed={playing}
                  className="min-h-11 flex-1 rounded border border-white/25 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {playing ? "Stop" : "Play jump"}
                </button>
                <button
                  type="button"
                  onClick={onReplay}
                  className="min-h-11 flex-1 rounded border border-white/25 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Replay
                </button>
              </div>
            </fieldset>
            <fieldset className="min-w-0 border-b border-white/15 pb-4">
              <legend className="mb-2 text-[11px] tracking-wider text-white/70 uppercase">
                Layers
              </legend>
              <div className="grid grid-cols-2 gap-x-4">
                {(
                  [
                    ["showRing", "Show ring"],
                    ["showPoint", "Show point"],
                    ["showBloom", "Show bloom"],
                    ["showRays", "Show rays"]
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tuning[key]}
                      onChange={(event) =>
                        onChange({
                          ...tuning,
                          [key]: event.currentTarget.checked
                        })
                      }
                      className="size-4 accent-white focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {[
              ...new Set(WARP_TUNING_CONTROLS.map((control) => control.group))
            ].map((group) => (
              <fieldset
                key={group}
                className="min-w-0 border-b border-white/15 pb-2"
              >
                <legend className="mb-2 text-[11px] tracking-wider text-white/70 uppercase">
                  {group}
                </legend>
                {group === "Interior" && (
                  <label className="flex min-h-11 items-center justify-between gap-3">
                    Interior color
                    <input
                      aria-label="Interior color"
                      type="color"
                      value={tuning.interiorColor}
                      onChange={(event) => {
                        const color = event.currentTarget.value;
                        if (/^#[\da-f]{6}$/i.test(color))
                          onChange({ ...tuning, interiorColor: color });
                      }}
                      className="h-11 w-14 cursor-pointer rounded border border-white/25 bg-transparent p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                  </label>
                )}
                {WARP_TUNING_CONTROLS.filter(
                  (control) => control.group === group
                ).map((control) => (
                  <label
                    key={control.key}
                    className="flex min-w-0 flex-col gap-1"
                  >
                    <span className="flex justify-between gap-3">
                      {control.label}
                      <output>{Number(tuning[control.key].toFixed(2))}</output>
                    </span>
                    <input
                      aria-label={control.label}
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={tuning[control.key]}
                      onChange={(event) => {
                        const value = event.currentTarget.valueAsNumber;
                        if (Number.isFinite(value))
                          onChange({ ...tuning, [control.key]: value });
                      }}
                      className="h-11 w-full accent-white focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                  </label>
                ))}
              </fieldset>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange({ ...DEFAULT_WARP_TUNING });
                  setStatus("Reset to current defaults.");
                }}
                className="min-h-11 flex-1 rounded border border-white/25 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Reset look
              </button>
              <button
                type="button"
                onClick={copySettings}
                disabled={copying}
                className="min-h-11 flex-1 rounded border border-white/25 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
              >
                {copying ? "Copying…" : "Copy settings"}
              </button>
            </div>
            <p
              role="status"
              aria-label="Settings feedback"
              className="min-h-8 text-[11px] leading-relaxed text-white/70"
            >
              {status}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
