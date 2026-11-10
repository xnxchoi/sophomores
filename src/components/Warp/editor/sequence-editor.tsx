"use client";

import { useTranslations } from "next-intl";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "cn";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward
} from "lucide-react";
import "@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css";
import "react-bezier-curve-editor/index.css";
import {
  SEQUENCE_CLIPS,
  validateSequenceDraft,
  type SequenceValidationParams,
  type SequenceClipId,
  type SequenceDomain,
  type SequenceDraft
} from "../_shared/sequence-editor";
import DomainTimeline from "./domain-timeline";
import ClipInspector from "./clip-inspector";
import EditorButton from "./editor-button";
import DraftTransfer from "./draft-transfer";
import NumericField from "./numeric-field";

export type SequenceEditorProps = {
  draft: SequenceDraft;
  defaults: SequenceDraft;
  onChange: (next: SequenceDraft) => void;
  openingTime: number;
  scrollProgress: number;
  ready: boolean;
  playing: SequenceDomain | null;
  onSeek: (domain: SequenceDomain, value: number) => void;
  onPlay: (domain: SequenceDomain) => void;
  onPause: () => void;
  onReplay: () => void;
};

export default function SequenceEditor({
  draft,
  defaults,
  onChange,
  openingTime,
  scrollProgress,
  ready,
  playing,
  onSeek,
  onPlay,
  onPause
}: SequenceEditorProps) {
  const t = useTranslations("Developer.sequenceEditor");
  const sequenceText = useTranslations("Developer.sequenceData");
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState<SequenceDomain>("opening");
  const [selected, setSelected] = useState<SequenceClipId>("openingText");
  const [autoSeek, setAutoSeek] = useState(true);
  const [seekTarget, setSeekTarget] = useState<"start" | "end" | "pointer">(
    "start"
  );
  const [showEasing, setShowEasing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [related, setRelated] = useState<SequenceClipId[]>([]);
  const [status, setStatus] = useState("");
  const launcher = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const hasOpened = useRef(false);
  const panelId = useId();
  const time = domain === "opening" ? openingTime : scrollProgress;
  const maximum = domain === "opening" ? draft.openingDuration : 100;
  const playbackEnd = domain === "opening" ? draft.openingDuration : 70;
  const referenceOnly = domain === "scroll" && time > playbackEnd;
  const editPoints = Array.from(
    new Set([
      0,
      playbackEnd,
      ...SEQUENCE_CLIPS.filter((clip) => clip.domain === domain).flatMap(
        ({ id }) => [draft.clips[id].start, draft.clips[id].end]
      )
    ])
  ).sort((left, right) => left - right);
  const previousEdit =
    editPoints.findLast((point) => point < time - 0.001) ?? 0;
  const nextEdit =
    editPoints.find((point) => point > time + 0.001) ?? playbackEnd;
  const seekTransport = (position: number) => {
    if (!ready) return;
    onPause();
    onSeek(domain, position);
  };
  const togglePlayback = () => {
    if (!ready || referenceOnly) return;
    if (playing === domain) onPause();
    else onPlay(domain);
  };

  useEffect(() => {
    if (open) {
      hasOpened.current = true;
      (ready && !playButton.current?.disabled ? playButton.current : close.current)?.focus({
        preventScroll: true
      });
    } else if (hasOpened.current)
      launcher.current?.focus({ preventScroll: true });
  }, [open, ready]);

  const select = useCallback(
    (id: SequenceClipId, pointerTime?: number) => {
      const metadata = SEQUENCE_CLIPS.find((clip) => clip.id === id)!;
      const clip = draft.clips[id];
      if (metadata.domain !== domain && playing) onPause();
      setDomain(metadata.domain);
      setSelected(id);
      if (autoSeek && ready) {
        const current =
          metadata.domain === "opening" ? openingTime : scrollProgress;
        onSeek(
          metadata.domain,
          seekTarget === "start"
            ? clip.start
            : seekTarget === "end"
              ? clip.end
              : Math.min(clip.end, Math.max(clip.start, pointerTime ?? current))
        );
      }
    },
    [
      autoSeek,
      domain,
      draft,
      onPause,
      onSeek,
      openingTime,
      playing,
      ready,
      scrollProgress,
      seekTarget
    ]
  );

  useEffect(() => {
    if (!open || !picking) return;
    const pick = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        event.target.closest("[data-warp-controls]")
      )
        return;
      let target = event.target.closest("[data-sequence-clips]");
      const root = event.target.closest("[data-warp-study]");
      // Pointer-transparent scene layers cannot be the browser's click target.
      // Inspect their visible element rectangles only when the actual hit has
      // no specific annotation; this does not pretend to hit-test canvas pixels.
      if (root && (!target || target === root)) {
        const visibleHits = Array.from(
          root.querySelectorAll("[data-sequence-clips]")
        )
          .filter((element) => {
            if (
              element.closest("[data-warp-controls]") ||
              !element.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true
              })
            )
              return false;
            // checkVisibility does not include overflow clipping. A translated
            // passage line must also contain the pointer inside every clip box.
            for (
              let ancestor = element.parentElement;
              ancestor && root.contains(ancestor);
              ancestor = ancestor.parentElement
            ) {
              const style = window.getComputedStyle(ancestor);
              const clipBounds = ancestor.getBoundingClientRect();
              if (
                /(hidden|clip|scroll|auto)/.test(
                  style.overflowX || style.overflow
                ) &&
                (event.clientX < clipBounds.left ||
                  event.clientX > clipBounds.right)
              )
                return false;
              if (
                /(hidden|clip|scroll|auto)/.test(
                  style.overflowY || style.overflow
                ) &&
                (event.clientY < clipBounds.top ||
                  event.clientY > clipBounds.bottom)
              )
                return false;
            }
            const bounds = element.getBoundingClientRect();
            return (
              bounds.width > 0 &&
              bounds.height > 0 &&
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom
            );
          })
          .map((element) => {
            let depth = 0;
            for (
              let ancestor = element.parentElement;
              ancestor && ancestor !== root;
              ancestor = ancestor.parentElement
            )
              depth++;
            return { element, depth };
          })
          .sort((a, b) => b.depth - a.depth);
        target = visibleHits[0]?.element ?? target;
      }
      if (!target) return;
      const names = (target.getAttribute("data-sequence-clips") ?? "").split(
        /\s+/
      );
      const candidates = SEQUENCE_CLIPS.filter((clip) =>
        names.includes(clip.id)
      );
      if (!candidates.length) return;
      event.preventDefault();
      event.stopPropagation();
      const active =
        candidates.find((metadata) => {
          if (
            metadata.domain === "opening" &&
            (scrollProgress > 0 || openingTime >= draft.openingDuration)
          )
            return false;
          const clip = draft.clips[metadata.id];
          const current =
            metadata.domain === "opening" ? openingTime : scrollProgress;
          return current >= clip.start && current <= clip.end;
        }) ??
        candidates.find(
          (clip) => clip.domain === (scrollProgress > 0 ? "scroll" : domain)
        ) ??
        candidates[0];
      setRelated(candidates.map((clip) => clip.id));
      select(active.id);
      setStatus(
        t("sceneGroupSelectedChooseARelatedPropertyBelowCanvas")
      );
    };
    document.addEventListener("click", pick, true);
    return () => document.removeEventListener("click", pick, true);
  }, [domain, draft, open, openingTime, picking, scrollProgress, select, t]);

  const update = (next: SequenceDraft) => {
    const result = validateSequenceDraft(next);
    if (!result.success) {
      const issue = result.error.issues[0];
      const detail = issue?.code === "custom" ? issue.params as SequenceValidationParams | undefined : undefined;
      setStatus(
        t("invalidEdit", { message: detail ? sequenceText(detail.messageKey, detail.values) : issue?.message ?? t("checkClipBoundsAndControlPoints") })
      );
      return;
    }
    onChange(result.data);
    setStatus(t("previewUpdatedForThisSessionOnly"));
  };

  return (
    <div
      data-warp-controls=""
      className="pointer-events-none fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[60] font-sans text-white"
    >
      <button
        ref={launcher}
        type="button"
        hidden={open}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(true)}
        className="pointer-events-auto min-h-11 rounded-lg border border-white/25 bg-black/85 px-4 text-xs shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4"
      >{t("sequenceEditor")}</button>
      {open && (
        <aside
          id={panelId}
          aria-label={t("sequenceEditor")}
          data-lenis-prevent=""
          className="pointer-events-auto flex max-h-[45svh] flex-col overflow-hidden rounded-xl border border-white/25 bg-neutral-950 shadow-2xl"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setPicking(false);
              setOpen(false);
              return;
            }
            // Keep native activation/editing and tab-list navigation intact.
            if (
              event.defaultPrevented ||
              event.repeat ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              !(event.target instanceof Element) ||
              event.target.closest(
                "input, textarea, select, a, summary, [contenteditable]:not([contenteditable='false']), [role='tab']"
              )
            )
              return;
            if (event.key === " " && event.target.closest("button")) return;
            if (![" ", "Home", "End"].includes(event.key) || !ready) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.key === " ") togglePlayback();
            else seekTransport(event.key === "Home" ? 0 : playbackEnd);
          }}
        >
          <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/15 px-3 py-1">
            <h2 className="mr-auto text-sm font-medium">{t("sequenceEditor")}</h2>
            <button
              ref={close}
              type="button"
              aria-label={t("closeSequenceEditor")}
              onClick={() => {
                setPicking(false);
                setOpen(false);
              }}
              className="min-h-9 rounded border border-white/25 px-3 text-xs hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
            >{t("close")}</button>
          </header>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/15 px-3 py-1.5">
            <div
              role="group"
              aria-label={t("playbackTransport")}
              className="flex items-center gap-1"
            >
              <EditorButton
                aria-label={t("goToBeginning")}
                title={t("goToBeginningHome")}
                disabled={!ready}
                onClick={() => seekTransport(0)}
                className="grid size-9 place-items-center px-0"
              >
                <SkipBack aria-hidden="true" size={15} />
              </EditorButton>
              <EditorButton
                aria-label={t("previousEdit")}
                title={t("previousEdit")}
                disabled={!ready || time <= 0}
                onClick={() => seekTransport(previousEdit)}
                className="grid size-9 place-items-center px-0"
              >
                <StepBack aria-hidden="true" size={15} />
              </EditorButton>
              <EditorButton
                ref={playButton}
                aria-label={playing === domain ? t("pause") : t("play")}
                title={
                  playing === domain
                    ? t("pauseSpace")
                    : t("playActiveTimelineSpace")
                }
                disabled={!ready || referenceOnly}
                onClick={togglePlayback}
                className="grid h-9 w-12 place-items-center border-white bg-white px-0 text-black hover:bg-white/85"
              >
                {playing === domain ? (
                  <Pause aria-hidden="true" size={17} fill="currentColor" />
                ) : (
                  <Play aria-hidden="true" size={17} fill="currentColor" />
                )}
              </EditorButton>
              <EditorButton
                aria-label={t("nextEdit")}
                title={t("nextEdit")}
                disabled={!ready || time >= playbackEnd}
                onClick={() => seekTransport(nextEdit)}
                className="grid size-9 place-items-center px-0"
              >
                <StepForward aria-hidden="true" size={15} />
              </EditorButton>
              <EditorButton
                aria-label={t("goToEnd")}
                title={t("goToEndEnd")}
                disabled={!ready || time === playbackEnd}
                onClick={() => seekTransport(playbackEnd)}
                className="grid size-9 place-items-center px-0"
              >
                <SkipForward aria-hidden="true" size={15} />
              </EditorButton>
            </div>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
              <span className="text-white/65">
                {domain === "opening"
                  ? t("pageReveal")
                  : referenceOnly
                    ? t("coronaReference")
                    : t("warp")}
              </span>
              <output
                aria-label={t("playbackPosition")}
                aria-live="off"
                className="font-mono text-xs tabular-nums"
              >
                {time.toFixed(2)} /{" "}
                {(referenceOnly ? maximum : playbackEnd).toFixed(2)}{" "}
                {domain === "opening" ? "s" : "%"}
              </output>
              <span className="text-[10px] text-white/45">
                {domain === "opening"
                  ? t("spacePlayPause")
                  : referenceOnly
                    ? t("coronaReferenceReadOnly")
                    : t("playbackEndsAtCorona70")}
              </span>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div
                role="tablist"
                aria-label={t("sequenceClock")}
                className="flex gap-1"
              >
                {(["opening", "scroll"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={domain === item}
                    tabIndex={domain === item ? 0 : -1}
                    aria-controls={`${panelId}-${item}`}
                    id={`${panelId}-${item}-tab`}
                    onClick={() => {
                      select(
                        item === "opening" ? "openingText" : "headlineSplit"
                      );
                      setRelated([]);
                    }}
                    onKeyDown={(event) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          event.key
                        )
                      )
                        return;
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? "opening"
                          : event.key === "End"
                            ? "scroll"
                            : item === "opening"
                              ? "scroll"
                              : "opening";
                      select(
                        next === "opening" ? "openingText" : "headlineSplit"
                      );
                      setRelated([]);
                      document
                        .getElementById(`${panelId}-${next}-tab`)
                        ?.focus();
                    }}
                    className={cn(
                      "min-h-9 rounded border px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2",
                      domain === item
                        ? "border-white bg-white text-black"
                        : "border-white/25 text-white/65 hover:bg-white/10"
                    )}
                  >
                    {item === "opening"
                      ? t("pageRevealSeconds")
                      : t("scrollPercent")}
                  </button>
                ))}
              </div>
              <label className="flex min-h-9 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={autoSeek}
                  onChange={(event) => setAutoSeek(event.currentTarget.checked)}
                  className="size-4 accent-white focus-visible:outline-2 focus-visible:outline-offset-2"
                />{t("autoSeekOnSelection")}</label>
              <label className="flex items-center gap-2 text-xs">{t("seekSelectionTo")}<select
                  aria-label={t("seekSelectionTo")}
                  value={seekTarget}
                  onChange={(event) =>
                    setSeekTarget(
                      event.currentTarget.value as typeof seekTarget
                    )
                  }
                  className="min-h-9 rounded border border-white/25 bg-black! px-2 text-white! focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <option value="start">{t("start")}</option>
                  <option value="end">{t("end")}</option>
                  <option value="pointer">{t("pointerCurrent")}</option>
                </select>
              </label>
              <label className="flex min-h-9 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={showEasing}
                  onChange={(event) =>
                    setShowEasing(event.currentTarget.checked)
                  }
                  className="size-4 accent-white focus-visible:outline-2 focus-visible:outline-offset-2"
                />{t("easingSubtracks")}</label>
              <EditorButton
                aria-pressed={picking}
                onClick={() => setPicking(!picking)}
              >
                {picking ? t("cancelScenePick") : t("inspectScene")}
              </EditorButton>
            </div>
            {picking && (
              <p role="status" className="mt-2 text-xs">{t("clickTextOrTheFieldInTheSceneCanvas")}</p>
            )}
            {related.length > 1 && (
              <div
                aria-label={t("relatedSceneProperties")}
                className="mt-2 flex flex-wrap gap-2"
              >
                {related.map((id) => (
                  <EditorButton
                    key={id}
                    aria-pressed={id === selected}
                    onClick={() => select(id)}
                  >
                    {sequenceText(SEQUENCE_CLIPS.find((clip) => clip.id === id)!.labelKey)}
                  </EditorButton>
                ))}
              </div>
            )}
            <div className="my-1 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs">
                {domain === "opening" ? t("timeS") : t("progress")}
                <input
                  aria-label={
                    domain === "opening"
                      ? t("openingTimeSeconds")
                      : t("scrollProgressPercent")
                  }
                  type="number"
                  min={0}
                  max={maximum}
                  step={domain === "opening" ? 0.05 : 0.1}
                  disabled={!ready}
                  value={Number(time.toFixed(3))}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    if (Number.isFinite(value))
                      onSeek(domain, Math.min(maximum, Math.max(0, value)));
                  }}
                  className="min-h-9 w-24 rounded border border-white/25 bg-black! px-2 text-white! focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
                />
              </label>
              <input
                aria-label={
                  domain === "opening" ? t("scrubPageReveal") : t("scrubScroll")
                }
                type="range"
                min={0}
                max={maximum}
                step={domain === "opening" ? 0.01 : 0.05}
                disabled={!ready}
                value={time}
                onChange={(event) =>
                  onSeek(domain, event.currentTarget.valueAsNumber)
                }
                className="h-9 min-w-28 flex-1 accent-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
              />
              {domain === "opening" && (
                <label className="flex items-center gap-2 text-xs">{t("masterDurationS")}<NumericField
                    aria-label={t("openingDurationSeconds")}
                    min={0.1}
                    max={60}
                    step={0.1}
                    value={draft.openingDuration}
                    onValueChange={(value) =>
                      update({ ...draft, openingDuration: value })
                    }
                    className="w-24"
                  />
                </label>
              )}
            </div>
            <div
              role="tabpanel"
              id={`${panelId}-${domain}`}
              aria-labelledby={`${panelId}-${domain}-tab`}
              className="grid min-h-40 min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_350px]"
            >
              <DomainTimeline
                key={domain}
                draft={draft}
                domain={domain}
                selected={selected}
                time={time}
                ready={ready}
                showEasing={showEasing}
                onChange={update}
                onSelect={select}
                onSeek={(value) => onSeek(domain, value)}
              />
              <ClipInspector
                draft={draft}
                selected={selected}
                onChange={update}
              />
            </div>
            <details className="mt-1 text-[11px]">
              <summary className="cursor-pointer py-1 text-white/65 focus-visible:outline-2">{t("sessionOnlyDraftResetJSONHelp")}</summary>
              <p className="text-white/65">{t("livePreviewOnlyNotSavedInProductionRevealSeconds")}{" "}
                {!ready && t("waitingForRendererTransportDisabled")}
              </p>
              <DraftTransfer
                draft={draft}
                defaults={defaults}
                onChange={update}
                onStatus={setStatus}
              />
            </details>
            <p
              role="status"
              aria-label={t("sequenceFeedback")}
              className="text-[11px] text-white/70"
            >
              {status}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
