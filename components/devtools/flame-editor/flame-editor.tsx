"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState
} from "react";
import {
  CENTER_FADE,
  EDGE_FALLOFF
} from "@/components/flame-backdrop/mask/profile";
import { FLAME_APPEARANCE } from "@/components/flame-backdrop/appearance";
import { createEnvelopeMaskUrl } from "@/components/flame-backdrop/mask/svg";
import { FieldCanvas } from "@/components/flame-backdrop/FieldCanvas";
import { DEFAULT_MASK_URL } from "@/components/flame-backdrop/field/parameters";

interface EnvelopeErrors {
  readonly fatal: string;
  readonly mask: string;
}

type EnvelopeErrorAction =
  | { readonly type: "renderer-failed"; readonly message: string }
  | { readonly type: "mask-failed"; readonly message: string }
  | { readonly type: "mask-ready" };

export const INITIAL_ENVELOPE_ERRORS: EnvelopeErrors = { fatal: "", mask: "" };

/** Mask replacements can recover independently; a stopped renderer still requires a reload. */
export function envelopeErrorReducer(
  state: EnvelopeErrors,
  action: EnvelopeErrorAction
): EnvelopeErrors {
  switch (action.type) {
    case "renderer-failed":
      return { ...state, fatal: action.message };
    case "mask-failed":
      return { ...state, mask: action.message };
    case "mask-ready":
      return { ...state, mask: "" };
  }
}

export function FlameEditor() {
  const surface = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const [size, setSize] = useState({ width: 1440, height: 900 });
  const [feather, setFeather] = useState<number>(CENTER_FADE.smoothing);
  const [falloff, setFalloff] = useState<number>(CENTER_FADE.exponent);
  const [centerLift, setCenterLift] = useState<number>(CENTER_FADE.centerLift);
  const [showBefore, setShowBefore] = useState(false);
  const [showText, setShowText] = useState(false);
  const [view, setView] = useState<"render" | "mask">("render");
  const [paused, setPaused] = useState(false);
  const [errors, reportError] = useReducer(
    envelopeErrorReducer,
    INITIAL_ENVELOPE_ERRORS
  );
  const [source, setSource] = useState<"saved" | "procedural" | "file">(
    "saved"
  );
  const [localFile, setLocalFile] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [fileFailure, setFileFailure] = useState("");
  const proceduralUrl = useMemo(
    () =>
      source === "procedural"
        ? createEnvelopeMaskUrl(
            size.width,
            size.height,
            feather,
            falloff,
            showBefore,
            centerLift
          )
        : "",
    [size, feather, showBefore, falloff, source, centerLift]
  );
  const maskUrl =
    source === "procedural"
      ? proceduralUrl
      : source === "file" && localFile
        ? localFile.url
        : DEFAULT_MASK_URL;
  const editing = source === "procedural";

  useEffect(
    () => () => {
      if (localFile) URL.revokeObjectURL(localFile.url);
    },
    [localFile]
  );

  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 0 && box.height > 0)
        setSize({ width: box.width, height: box.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onFailure = useCallback(
    (message: string) => reportError({ type: "renderer-failed", message }),
    []
  );
  const onMaskFailure = useCallback(
    (message: string) => reportError({ type: "mask-failed", message }),
    []
  );
  const onMaskReady = useCallback(
    () => reportError({ type: "mask-ready" }),
    []
  );

  function chooseMask(file: File | undefined) {
    if (!file) return;
    if (
      !["image/png", "image/svg+xml"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setFileFailure(
        "Choose a PNG or SVG under 8 MB. Its transparency controls the mask; RGB color is ignored."
      );
      return;
    }
    setLocalFile({ url: URL.createObjectURL(file), name: file.name });
    setSource("file");
    setShowBefore(false);
    setFileFailure("");
  }

  return (
    <main className="relative min-h-svh bg-black text-white">
      <div
        ref={surface}
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
      >
        <div
          data-envelope-render
          hidden={view !== "render"}
          className="absolute inset-0 h-full w-full"
        >
          <FieldCanvas
            maskSource={maskUrl}
            paused={paused}
            visible={view === "render"}
            onFailure={onFailure}
            onMaskFailure={onMaskFailure}
            onMaskReady={onMaskReady}
          />
        </div>
        {/* White reveals only the source alpha, matching shader semantics even for black/colored images. */}
        <div
          data-envelope-mask
          data-mask-source={maskUrl}
          hidden={view !== "mask"}
          className="absolute inset-0 h-full w-full bg-white"
          style={{
            maskImage: `url("${maskUrl}")`,
            WebkitMaskImage: `url("${maskUrl}")`,
            maskMode: "alpha",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat"
          }}
        />
      </div>
      <header className="relative z-10 flex flex-wrap items-start justify-between gap-x-8 gap-y-3 px-5 py-4 text-xs text-white sm:px-8 sm:py-6">
        <div>
          <h1 className="text-sm">Flame field — shader editor</h1>
          <a
            className="mt-2 inline-block underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
            href="/studies/flame-reference"
          >
            Accepted B + breathing reference
          </a>
          <p className="mt-2">
            Shared footer material and image mask. Editor changes stay local.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-2 sm:w-136">
          <label className="flex min-w-0 flex-col gap-1">
            <span>Mask source</span>
            <select
              aria-label="Mask source"
              value={source}
              onChange={(event) => {
                setSource(event.currentTarget.value as typeof source);
                setShowBefore(false);
              }}
              className="min-h-11 min-w-0 rounded border border-white/40 bg-black/60 px-2 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <option value="saved">Saved mask image</option>
              <option value="procedural">Procedural editor</option>
              {localFile && (
                <option value="file">Local image: {localFile.name}</option>
              )}
            </select>
          </label>
          <div className="flex min-w-0 flex-col gap-1">
            <span>Try a local mask image</span>
            <input
              ref={fileInput}
              aria-label="Choose mask image"
              type="file"
              hidden
              accept="image/png,image/svg+xml"
              onChange={(event) => {
                chooseMask(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              aria-label="Choose mask file"
              aria-describedby={`${id}-filename`}
              onClick={() => fileInput.current?.click()}
              className="min-h-11 rounded border border-white/40 bg-white/10 px-3 text-xs tracking-normal text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Choose file
            </button>
            <span
              id={`${id}-filename`}
              data-mask-filename
              aria-live="polite"
              className="min-w-0 text-xs tracking-normal break-all text-white/75"
            >
              {localFile?.name ?? "No file selected"}
            </span>
          </div>
          <p className="col-span-2 text-white/65">
            PNG/SVG transparency is the mask. Local files stay on this device.
          </p>
          <label
            htmlFor={`${id}-slider`}
            className="flex min-w-0 flex-col gap-1"
          >
            <span>
              Edge smoothing: <output>{feather.toFixed(2)}% height</output>
            </span>
            <input
              id={`${id}-slider`}
              aria-label="Edge smoothing"
              aria-valuetext={`${feather.toFixed(2)} percent of viewport height, procedural editor only`}
              type="range"
              min={0}
              max={CENTER_FADE.maxSmoothing}
              step={0.01}
              value={feather}
              disabled={!editing || showBefore}
              onChange={(event) =>
                setFeather(event.currentTarget.valueAsNumber)
              }
              className="min-h-9 w-full accent-white focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-40"
            />
          </label>
          <label
            htmlFor={`${id}-falloff`}
            className="flex min-w-0 flex-col gap-1"
          >
            <span>
              Center falloff: <output>{falloff.toFixed(2)}</output>
            </span>
            <input
              id={`${id}-falloff`}
              aria-label="Center falloff"
              aria-valuetext={`${falloff.toFixed(2)} contour falloff strength, procedural editor only`}
              type="range"
              min={EDGE_FALLOFF.min}
              max={EDGE_FALLOFF.max}
              step={0.01}
              value={falloff}
              disabled={!editing || showBefore}
              onChange={(event) =>
                setFalloff(event.currentTarget.valueAsNumber)
              }
              className="min-h-9 w-full accent-white focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-40"
            />
          </label>
          <label
            htmlFor={`${id}-center-lift`}
            className="col-span-2 flex min-w-0 flex-col gap-1"
          >
            <span>
              Center opacity lift: <output>{centerLift.toFixed(2)}</output>
            </span>
            <input
              id={`${id}-center-lift`}
              aria-label="Center opacity lift"
              type="range"
              min={0}
              max={CENTER_FADE.maxCenterLift}
              step={0.01}
              value={centerLift}
              disabled={!editing || showBefore}
              onChange={(event) =>
                setCenterLift(event.currentTarget.valueAsNumber)
              }
              className="min-h-9 w-full accent-white focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-40"
            />
          </label>
          <div className="col-span-2 grid grid-cols-4 items-center gap-2">
            <select
              aria-label="Study view"
              value={view}
              onChange={(event) =>
                setView(
                  event.currentTarget.value === "mask" ? "mask" : "render"
                )
              }
              className="min-h-11 min-w-0 rounded border border-white/40 bg-black/60 px-2 text-white focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <option value="render">Render</option>
              <option value="mask">Mask</option>
            </select>
            <button
              type="button"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
              className="min-h-11 rounded border border-white/40 bg-black/40 px-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Pause motion
            </button>
            <button
              type="button"
              aria-pressed={showBefore}
              disabled={!editing}
              onClick={() => setShowBefore((value) => !value)}
              className="min-h-11 rounded border border-white/40 bg-black/40 px-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-40"
            >
              Show before
            </button>
            <button
              type="button"
              aria-pressed={showText}
              onClick={() => setShowText((value) => !value)}
              className="min-h-11 rounded border border-white/40 bg-black/40 px-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Show text
            </button>
          </div>
          <p role="status" className="col-span-2">
            {source === "saved"
              ? `Saved mask image — ${CENTER_FADE.smoothing.toFixed(2)}% smoothing / ${CENTER_FADE.exponent.toFixed(2)} falloff`
              : source === "file"
                ? `Local mask — ${localFile?.name}`
                : showBefore
                  ? `Before — fixed previous ${FLAME_APPEARANCE.legacy.beforeFeather}% smoothing / ${FLAME_APPEARANCE.legacy.beforeFalloff} gamma`
                  : "Procedural preview — changes do not overwrite the saved image"}
          </p>
        </div>
      </header>
      {showText && (
        <div
          data-sample-text
          className="pointer-events-none relative z-10 px-6 pt-6 sm:fixed sm:inset-x-0 sm:top-[30svh] sm:px-12 sm:pt-0"
        >
          <p className="max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">
            For Those Who Have Been Somewhere. And Still Wonder What Else Is Out
            There.
          </p>
        </div>
      )}
      {(errors.fatal || fileFailure || errors.mask) && (
        <p
          role="alert"
          className="fixed inset-x-5 bottom-5 z-20 rounded bg-black/80 p-3 text-center text-sm"
        >
          {errors.fatal || fileFailure || errors.mask}
        </p>
      )}
    </main>
  );
}
