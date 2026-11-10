"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("Developer.devControls");
  const tuningText = useTranslations("Developer.tuningData");
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
      setStatus(t("couldNotCopyClipboardUnavailableInThisBrowser"));
      return;
    }
    setCopying(true);
    setStatus("");
    try {
      await navigator.clipboard.writeText(JSON.stringify(tuning, null, 2));
      setStatus(t("copiedCurrentSettingsAsJSON"));
    } catch {
      setStatus(t("couldNotCopyCheckClipboardPermissionsAndTryAgain"));
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
      >{t("warpControls")}</button>
      {open && (
        <aside
          id={id}
          aria-label={t("warpControls")}
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
            <h2 className="text-sm font-medium">{t("warpControls")}</h2>
            <button
              ref={closeButton}
              type="button"
              aria-label={t("closeWarpControls")}
              onClick={() => setOpen(false)}
              className="min-h-11 min-w-11 rounded border border-white/20 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
            >{t("close")}</button>
          </div>
          <div className="flex flex-col gap-5 p-4">
            <p className="text-[11px] leading-relaxed text-white/65">{t("liveSessionOnlyAdjustmentsResetOrReloadRestoresThe")}</p>
            <fieldset className="min-w-0 border-b border-white/15 pb-4">
              <legend className="mb-2 text-[11px] tracking-wider text-white/70 uppercase">{t("sequence")}</legend>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="flex justify-between gap-3">{t("progress")}{" "}<output>{Math.round(progress)}%</output>
                </span>
                <input
                  aria-label={t("sequenceProgress")}
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
                  {playing ? t("stop") : t("playJump")}
                </button>
                <button
                  type="button"
                  onClick={onReplay}
                  className="min-h-11 flex-1 rounded border border-white/25 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                >{t("replay")}</button>
              </div>
            </fieldset>
            <fieldset className="min-w-0 border-b border-white/15 pb-4">
              <legend className="mb-2 text-[11px] tracking-wider text-white/70 uppercase">{t("layers")}</legend>
              <div className="grid grid-cols-2 gap-x-4">
                {(
                  [
                    ["showRing", t("showRing")],
                    ["showPoint", t("showPoint")],
                    ["showBloom", t("showBloom")],
                    ["showRays", t("showRays")]
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
                  {t(`groups.${group}`)}
                </legend>
                {group === "Interior" && (
                  <label className="flex min-h-11 items-center justify-between gap-3">{t("interiorColor")}<input
                      aria-label={t("interiorColor")}
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
                      {tuningText(control.labelKey)}
                      <output>{Number(tuning[control.key].toFixed(2))}</output>
                    </span>
                    <input
                      aria-label={tuningText(control.labelKey)}
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
                  setStatus(t("resetToCurrentDefaults"));
                }}
                className="min-h-11 flex-1 rounded border border-white/25 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
              >{t("resetLook")}</button>
              <button
                type="button"
                onClick={copySettings}
                disabled={copying}
                className="min-h-11 flex-1 rounded border border-white/25 px-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
              >
                {copying ? t("copying") : t("copySettings")}
              </button>
            </div>
            <p
              role="status"
              aria-label={t("settingsFeedback")}
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
