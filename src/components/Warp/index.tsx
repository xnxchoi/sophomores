"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps
} from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { MathUtils } from "three";
import {
  animate,
  type AnimationPlaybackControls,
  type MotionStyle,
  type MotionValue,
  motion,
  stagger,
  transform,
  useAnimate,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform
} from "motion/react";
import { Story } from "@/components/teaser/story";
import { TeaserContinuation } from "@/components/teaser/continuation";
import { Hero } from "@/components/teaser/hero";
import { useTeaserContent } from "@/components/teaser/content-provider";
import { entryTokens } from "@/lib/teaser/entry-tokens";
import { scrollSmoothing } from "@/lib/motion-tokens";
import {
  chapterExitHoldVh,
  createTimeline,
  heroAuroraZoomVh,
  type ChapterId,
  type PinnedChapter,
  scrollChapters
} from "@/lib/teaser/choreography";
import {
  analogueRunwayHeightVh,
  chapterGeometry,
  stepMotionTokens
} from "@/lib/teaser/step-motion";
import {
  serverSnapshot,
  subscribeVisibility
} from "@/utils/browser/visibility";
import {
  createSequenceMappers,
  HANDOFF,
  OPENING_TIMING,
  TOR
} from "./sequence";
import {
  createDefaultSequence,
  validateSequenceDraft,
  type SequenceDomain,
  type SequenceDraft
} from "./_shared/sequence-editor";
import Link from "next/link";
import {
  coronaRestoreBlend,
  DEFAULT_WARP_TUNING,
  type WarpTuning
} from "./_shared/tuning";

const WarpField = dynamic(() => import("./warp-field"), { ssr: false });
const WarpControls = dynamic(() => import("./dev-controls"), { ssr: false });
const SequenceEditorPanel = dynamic(() => import("./editor/sequence-editor"), {
  ssr: false
});
const tourProgress = transform([...TOR.seconds], [...TOR.progress]);
const tourTime = transform([...TOR.progress], [...TOR.seconds]);

// Precise editor clock samples must not recommit the projected Warp scene:
// Motion's projection update can synchronously flush animation samples again.
function SequenceEditor({
  opening,
  progress,
  ...props
}: {
  opening: MotionValue<number>;
  progress: MotionValue<number>;
} & Omit<
  ComponentProps<typeof SequenceEditorPanel>,
  "openingTime" | "scrollProgress"
>) {
  const [openingPosition, setOpeningPosition] = useState(opening.get());
  const [scrollPosition, setScrollPosition] = useState(progress.get());
  useMotionValueEvent(opening, "change", setOpeningPosition);
  useMotionValueEvent(progress, "change", setScrollPosition);
  return (
    <SequenceEditorPanel
      {...props}
      openingTime={openingPosition * props.draft.openingDuration}
      scrollProgress={scrollPosition * 100}
    />
  );
}

export function useChapterScroll(id: PinnedChapter) {
  const ref = useRef<HTMLElement>(null);
  const timing = scrollChapters[id];
  const timeline = createTimeline(timing);
  const geometry = chapterGeometry(timeline.travelVh, chapterExitHoldVh[id]);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  });
  const chapterProgress = useTransform(scrollYProgress, [0, geometry.motionEnd], [0, 1]);
  // Scroll selects a destination; Motion owns the time needed to reach it.
  const rawPosition = useTransform(chapterProgress, [0, 1], [0, timing.steps - 1]);
  const position = useMotionValue(0);
  const displayed = useMotionValue(0);
  const settled = useMotionValue(true);
  const [step, setStep] = useState(0);
  useMotionValueEvent(displayed, "change", setStep);

  useEffect(() => {
    let playback: AnimationPlaybackControls | null = null;
    let target = Math.round(position.get());
    let initialized = false;

    const advance = (destination: number) => {
      playback?.stop();
      settled.set(false);
      displayed.set(destination);
      playback = animate(position, destination, {
        ...stepMotionTokens[id],
        onComplete: () => {
          playback = null;
          settled.set(true);
        }
      });
      if (document.visibilityState === "hidden") playback.pause();
    };

    // Holds are the timeline plateaus. Equal slices would spend the same
    // distance on the short aurora as on the notification and statement.
    const pose = transform(timeline.input, timeline.output);
    const seek = (progress: number) => {
      const destination = Math.min(
        timing.steps - 1,
        Math.max(0, Math.floor(pose(progress) + 1e-6))
      );
      const changed = destination !== target;
      target = destination;

      if (!initialized) {
        initialized = true;
        playback?.stop();
        playback = null;
        position.jump(destination);
        displayed.set(destination);
        settled.set(true);
      } else if (playback && changed) {
        const next = destination;
        advance(next);
      } else if (changed) {
        advance(destination);
      }
    };

    const syncVisibility = () => {
      if (document.visibilityState === "hidden") playback?.pause();
      else playback?.play();
    };

    const unsubscribe = chapterProgress.on("change", seek);
    document.addEventListener("visibilitychange", syncVisibility);
    syncVisibility();
    seek(chapterProgress.get());

    return () => {
      playback?.stop();
      unsubscribe();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [id, timing.steps, position, displayed, settled, chapterProgress]);

  return {
    ref,
    position,
    rawPosition,
    displayed,
    settled,
    step,
    timeline,
    geometry,
    sectionStyle: { height: `${geometry.heightVh}svh` }
  };
}

export const Warp = () => {
  const lenis = useLenis();
  const copy = useTeaserContent();
  const left = copy.preludeTitleLeft ?? "The best conversations";
  const right = copy.preludeTitleRight ?? "happen outside your circle.";
  const characterCount = Array.from(left + right).length;
  const sequenceDefaults = useMemo(
    () => createDefaultSequence(characterCount),
    [characterCount]
  );
  const [sequenceDraft, setSequenceDraft] = useState(sequenceDefaults);
  const initialMappers = useMemo(
    () => createSequenceMappers(sequenceDefaults),
    [sequenceDefaults]
  );
  const sequenceMappers = useMotionValue(initialMappers);
  const draftRef = useRef(sequenceDraft);
  const sequenceEdited = useRef(false);
  const [tuning, setTuning] = useState<WarpTuning>(DEFAULT_WARP_TUNING);
  const runway = useRef<HTMLElement>(null);
  const hero = useChapterScroll("hero");
  const heroGeometry = chapterGeometry(
    hero.timeline.travelVh,
    chapterExitHoldVh.hero
  );
  const entry = {
    dock: useMotionValue<number>(entryTokens.complete.dock),
    backdrop: useMotionValue<number>(entryTokens.complete.backdrop),
    layout: useMotionValue<number>(entryTokens.complete.layout),
    scale: useMotionValue<number>(entryTokens.complete.scale),
    glyph: useMotionValue<number>(entryTokens.complete.glyph)
  };
  // Renderer-ready load clock; it must progress even when the page never scrolls.
  const ready = useMotionValue(0);
  const opening = useMotionValue(0);
  const [headlineScope, animateIntro] = useAnimate<HTMLDivElement>();
  const introControl = useRef<AnimationPlaybackControls | null>(null);
  const jumpControl = useRef<AnimationPlaybackControls | null>(null);
  const introGeneration = useRef(0);
  const jumpGeneration = useRef(0);
  const playbackIntent = useRef({ opening: false, scroll: false });
  const [editorPlaying, setEditorPlaying] = useState<SequenceDomain | null>(
    null
  );
  const [editorReady, setEditorReady] = useState(false);
  const replayButton = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [percent, setPercent] = useState(0);
  const [phase, setPhase] = useState("Black");
  const [inspect, setInspect] = useState(false);
  const [current, setCurrent] = useState<ChapterId>("hero");
  const [heroComplete, setHeroComplete] = useState(false);
  const atCorona = percent >= HANDOFF * 100;
  const compactControls = atCorona && !inspect;
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    serverSnapshot
  );
  const preludeInView = useInView(runway);
  const coronaInView = useInView(hero.ref);
  const inView = preludeInView || coronaInView;
  // Physical scroll remains native: the slider maps prelude then original Hero.
  const { scrollYProgress } = useScroll({
    target: runway,
    offset: ["start start", "end end"]
  });
  const heroProgress = useTransform(
    hero.rawPosition,
    [0, scrollChapters.hero.steps - 1],
    [0, 1]
  );
  const heroMotionVh =
    hero.geometry.heightVh - (chapterExitHoldVh.hero ?? 0) - 100;
  const coronaProgress = useTransform(
    hero.rawPosition,
    [
      0,
      ((scrollChapters.hero.steps - 1) * heroAuroraZoomVh) / heroMotionVh
    ],
    [0, 1]
  );
  const overallProgress = useTransform(() => {
    const prelude = scrollYProgress.get();
    const corona = heroProgress.get();
    return prelude < 1 ? prelude * HANDOFF : HANDOFF + corona * 0.3;
  });
  const introFrame = useTransform(() =>
    sequenceMappers.get().opening(opening.get())
  );
  const studyFrame = useTransform(() =>
    sequenceMappers.get().frame(overallProgress.get())
  );
  // The renderer consumes legacy warp coordinates, not the slider's global value.
  const warpProgress = useTransform(studyFrame, (value) => value.warpProgress);
  const settlement = useTransform(studyFrame, (value) => value.settlement);
  // Motion updates the existing scene node, never React state or a second loop.
  const sceneBlur = useTransform(
    () =>
      `${MathUtils.lerp(
        tuning.blur,
        0,
        coronaRestoreBlend(settlement.get())
      )}px`
  );
  const coronaOpacity = useTransform(heroProgress, [0.7, 1], [1, 0]);
  const fieldOpening = useTransform(
    () => introFrame.get().fieldOpacity * ready.get()
  );
  const sceneOpacity = useTransform(
    () => fieldOpening.get() * coronaOpacity.get()
  );
  const headlineOpacity = useTransform(
    () => studyFrame.get().headlineOpacity * ready.get()
  );
  const leftX = useTransform(
    studyFrame,
    (value) => `${-value.headlineSplit * 19}vw`
  );
  const rightX = useTransform(
    studyFrame,
    (value) => `${value.headlineSplit * 19}vw`
  );
  const headlineScale = useTransform(
    studyFrame,
    (value) => value.headlineScale
  );
  const passageOpacity = useTransform(
    () => studyFrame.get().passageOpacity * ready.get()
  );
  const passageY = useTransform(
    studyFrame,
    (value) => `${(1 - value.passageReveal) * 110}%`
  );
  const passageSecondY = useTransform(
    studyFrame,
    (value) => `${(1 - value.passageSecondReveal) * 110}%`
  );
  const passageProgress = useTransform(
    studyFrame,
    (value) => value.passageLift
  );
  // Matching calc shapes let Motion interpolate both units. Mixing bare svh
  // with calc would snap straight to the offscreen exit for any progress > 0.
  const passageLift = useTransform(
    passageProgress,
    [0, 1],
    ["calc(100svh - 0%)", "calc(0svh - 100%)"]
  );
  const controlsOpacity = useTransform(
    () => introFrame.get().controlsOpacity * ready.get()
  );
  const hintOpacity = useTransform(
    () => controlsOpacity.get() * headlineOpacity.get()
  );
  const controlsVisibility = useTransform(controlsOpacity, (value) =>
    value <= 0 ? "hidden" : "visible"
  );
  useMotionValueEvent(hero.rawPosition, "change", (value) =>
    setHeroComplete(value >= scrollChapters.hero.steps - 1)
  );

  useMotionValueEvent(overallProgress, "change", (value) => {
    if (
      value >= HANDOFF &&
      !inspect &&
      document.activeElement?.hasAttribute("data-warp-transport")
    ) {
      replayButton.current?.focus({ preventScroll: true });
    }
    setPercent(Math.round(value * 100));
    setPhase(
      opening.get() >= 1
        ? sequenceMappers.get().frame(value).phase
        : sequenceMappers.get().opening(opening.get()).phase
    );
  });
  useMotionValueEvent(opening, "change", (value) => {
    setPhase(
      value >= 1
        ? sequenceMappers.get().frame(overallProgress.get()).phase
        : sequenceMappers.get().opening(value).phase
    );
  });
  const buildIntro = useCallback(
    (draft: SequenceDraft, seconds: number, play: boolean) => {
      const generation = ++introGeneration.current;
      introControl.current?.stop();
      const text = draft.clips.openingText;
      const count =
        headlineScope.current?.querySelectorAll("[data-warp-char]").length || 1;
      const originalSpan =
        OPENING_TIMING.characterDuration +
        OPENING_TIMING.characterStagger * Math.max(0, count - 1);
      const stretch = (text.end - text.start) / originalSpan;
      const time = MathUtils.clamp(seconds, 0, draft.openingDuration);
      playbackIntent.current.opening = play;
      const control = animateIntro(
        [
          [
            opening,
            [0, 1],
            { at: 0, duration: draft.openingDuration, ease: "linear" }
          ],
          [
            "[data-warp-char]",
            { opacity: [0, 1] },
            {
              at: text.start,
              duration: OPENING_TIMING.characterDuration * stretch,
              delay: stagger(OPENING_TIMING.characterStagger * stretch),
              ease: text.ease
            }
          ]
        ],
        {
          defaultTransition: { autoplay: false },
          onComplete: () => {
            if (generation !== introGeneration.current) return;
            playbackIntent.current.opening = false;
            setEditorPlaying(playbackIntent.current.scroll ? "scroll" : null);
          }
        }
      );
      introControl.current = control;
      control.time = time;
      opening.set(time / draft.openingDuration);
      if (play && !document.hidden) control.play();
      setEditorPlaying(
        playbackIntent.current.scroll ? "scroll" : play ? "opening" : null
      );
    },
    [animateIntro, headlineScope, opening]
  );

  const startIntro = useCallback(() => {
    buildIntro(draftRef.current, 0, true);
  }, [buildIntro]);

  // CMS copy can change the glyph count, but never overwrite an authored draft.
  useEffect(() => {
    if (sequenceEdited.current || draftRef.current === sequenceDefaults) return;
    const seconds = opening.get() * draftRef.current.openingDuration;
    draftRef.current = sequenceDefaults;
    setSequenceDraft(sequenceDefaults);
    sequenceMappers.set(initialMappers);
    // Rebuild the external Motion clock when CMS glyphs change, preserving its current time.
    if (ready.get())
      buildIntro(sequenceDefaults, seconds, playbackIntent.current.opening);
  }, [
    sequenceDefaults,
    initialMappers,
    sequenceMappers,
    opening,
    ready,
    buildIntro
  ]);
  const markReady = useCallback(() => {
    if (ready.get()) return;
    ready.set(1);
    setEditorReady(true);
    startIntro();
  }, [ready, startIntro]);

  useEffect(
    () => () => {
      introControl.current?.stop();
      jumpControl.current?.stop();
      ready.set(0);
    },
    [ready]
  );

  useEffect(() => {
    for (const [domain, control] of [
      ["opening", introControl.current],
      ["scroll", jumpControl.current]
    ] as const) {
      if (!control) continue;
      if (!visible && control.state === "running") control.pause();
      else if (
        visible &&
        control.state === "paused" &&
        playbackIntent.current[domain]
      )
        control.play();
    }
  }, [visible]);

  const stopJump = () => {
    jumpGeneration.current += 1;
    playbackIntent.current.scroll = false;
    jumpControl.current?.stop();
    jumpControl.current = null;
    setPlaying(false);
    setEditorPlaying(playbackIntent.current.opening ? "opening" : null);
  };

  // Inverse of overallProgress; use Hero's actual geometry, including its exit hold.
  const seek = (value: number) => {
    if (!runway.current || !hero.ref.current) return;
    const top = runway.current.getBoundingClientRect().top + window.scrollY;
    const travel = Math.max(
      0,
      runway.current.offsetHeight - window.innerHeight
    );
    const heroTop =
      hero.ref.current.getBoundingClientRect().top + window.scrollY;
    const heroTravel = Math.max(
      0,
      hero.ref.current.offsetHeight - window.innerHeight
    );
    const target =
      value <= HANDOFF
        ? top + travel * (value / HANDOFF)
        : heroTop +
          heroTravel * heroGeometry.motionEnd * ((value - HANDOFF) / 0.3);
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo({ top: target, behavior: "instant" });
  };

  const replay = () => {
    stopJump();
    setInspect(false);
    seek(0);
    startIntro();
  };

  const playJump = (skipOpening = false) => {
    if (playing && !skipOpening) {
      stopJump();
      return;
    }
    if (!ready.get()) return;
    const start = overallProgress.get() >= HANDOFF ? 0 : overallProgress.get();
    if (skipOpening) {
      buildIntro(draftRef.current, draftRef.current.openingDuration, false);
      seek(start);
    } else if (start === 0) {
      seek(0);
      startIntro();
    }
    setPlaying(true);
    playbackIntent.current.scroll = true;
    setEditorPlaying("scroll");
    const generation = ++jumpGeneration.current;
    const from = tourTime(start);
    jumpControl.current = animate(from, TOR.duration, {
      duration: TOR.duration - from,
      ease: "linear",
      onUpdate: (time) => seek(tourProgress(time)),
      onComplete: () => {
        if (generation !== jumpGeneration.current) return;
        playbackIntent.current.scroll = false;
        setPlaying(false);
        setEditorPlaying(playbackIntent.current.opening ? "opening" : null);
      }
    });
  };

  const pauseSequence = () => {
    playbackIntent.current.opening = false;
    introControl.current?.pause();
    stopJump();
    setEditorPlaying(null);
  };

  const seekSequence = (domain: SequenceDomain, value: number) => {
    if (!ready.get() || !Number.isFinite(value)) return;
    pauseSequence();
    const draft = draftRef.current;
    if (domain === "opening") {
      seek(0);
      const time = MathUtils.clamp(value, 0, draft.openingDuration);
      if (!introControl.current) buildIntro(draft, time, false);
      else {
        introControl.current.time = time;
        opening.set(time / draft.openingDuration);
      }
    } else {
      if (opening.get() < 1 || !introControl.current) {
        buildIntro(draft, draft.openingDuration, false);
      }
      seek(MathUtils.clamp(value / 100, 0, 1));
    }
  };

  const playSequence = (domain: SequenceDomain) => {
    if (!ready.get()) return;
    pauseSequence();
    if (domain === "scroll") playJump(true);
    else {
      const draft = draftRef.current;
      const time = opening.get() * draft.openingDuration;
      seek(0);
      buildIntro(draft, time >= draft.openingDuration ? 0 : time, true);
    }
  };

  const changeSequence = (next: SequenceDraft) => {
    const parsed = validateSequenceDraft(next);
    if (!parsed.success) return;
    pauseSequence();
    const previous = draftRef.current;
    const seconds = opening.get() * previous.openingDuration;
    const draft = parsed.data;
    const mappers = createSequenceMappers(draft);
    const previousText = previous.clips.openingText;
    const nextText = draft.clips.openingText;
    const rebuildOpening =
      previous.openingDuration !== draft.openingDuration ||
      previousText.start !== nextText.start ||
      previousText.end !== nextText.end ||
      previousText.ease.some((value, index) => value !== nextText.ease[index]);
    sequenceEdited.current = true;
    draftRef.current = draft;
    setSequenceDraft(draft);
    sequenceMappers.set(mappers);
    if (ready.get() && rebuildOpening) buildIntro(draft, seconds, false);
    setPhase(
      opening.get() >= 1
        ? mappers.frame(overallProgress.get()).phase
        : mappers.opening(opening.get()).phase
    );
  };

  useEffect(() => {
    const interrupt = (event?: Event) => {
      if (
        event?.target instanceof Element &&
        event.target.closest("[data-warp-controls]")
      )
        return;
      jumpGeneration.current += 1;
      playbackIntent.current.scroll = false;
      jumpControl.current?.stop();
      jumpControl.current = null;
      setPlaying(false);
      setEditorPlaying(playbackIntent.current.opening ? "opening" : null);
    };
    const touchInterrupt = (event: TouchEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-warp-controls]")
      )
        return;
      interrupt();
    };
    const keyInterrupt = (event: KeyboardEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-warp-controls]")
      )
        return;
      if (
        [
          "ArrowDown",
          "ArrowUp",
          "PageDown",
          "PageUp",
          "Home",
          "End",
          " "
        ].includes(event.key)
      )
        interrupt();
    };
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", touchInterrupt, { passive: true });
    window.addEventListener("keydown", keyInterrupt);
    return () => {
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", touchInterrupt);
      window.removeEventListener("keydown", keyInterrupt);
    };
  }, []);

  return (
    <main
      className={
        "teaser relative isolate flex h-min w-full flex-col items-start overflow-visible bg-black p-0 text-white [body:has(&)_nextjs-portal]:hidden"
      }
      data-warp-study=""
      data-sequence-clips="openingField warpApproach ringSettlement"
      data-phase={phase}
    >
      <ReactLenis
        root
        options={{ ...scrollSmoothing, wheelMultiplier: 0.45 }}
      />
      <Link
        href="#origin"
        className="fixed top-2 left-2 z-50 -translate-y-24 bg-white p-3 text-black focus:translate-y-0"
      >
        Skip to the story
      </Link>

      <section
        ref={runway}
        className="relative flex w-full flex-none flex-col items-center gap-0 overflow-visible p-0"
        style={{ height: `${analogueRunwayHeightVh()}svh` }}
        aria-label="Entry sequence"
      >
        <div
          className="sticky top-0 z-10 flex h-svh w-full flex-none flex-row items-center justify-center gap-[.28em] overflow-hidden px-4 font-sans text-[clamp(18px,3.5vw,38px)] font-normal tracking-[-.035em]"
          aria-label={[left, right].filter(Boolean).join(" ")}
          ref={headlineScope}
        >
          <motion.div
            className="relative z-1 flex h-full w-min flex-none flex-row items-center gap-2.5 overflow-visible p-0"
            style={{ x: leftX, scale: headlineScale }}
          >
            <div className={"relative h-auto w-auto flex-none whitespace-pre"}>
              <motion.h2
                style={{ opacity: headlineOpacity }}
                data-sequence-clips="openingText headlineSplit headlineScale headlineFade"
              >
                {Array.from(left).map((character, index) => (
                  <span
                    key={index}
                    className="inline-block whitespace-pre opacity-0"
                    data-warp-char=""
                  >
                    {character}
                  </span>
                ))}
              </motion.h2>
            </div>
          </motion.div>
          <motion.div
            className="relative z-1 flex h-full w-min flex-none flex-row items-center gap-2.5 overflow-visible p-0"
            style={{ x: rightX, scale: headlineScale }}
          >
            <div className={"relative h-auto w-auto flex-none whitespace-pre"}>
              <motion.h2
                style={{ opacity: headlineOpacity }}
                data-sequence-clips="openingText headlineSplit headlineScale headlineFade"
              >
                {Array.from(right).map((character, index) => (
                  <span
                    key={index}
                    className="inline-block whitespace-pre opacity-0"
                    data-warp-char=""
                  >
                    {character}
                  </span>
                ))}
              </motion.h2>
            </div>
          </motion.div>
        </div>
        <div
          className={
            "pointer-events-none fixed inset-0 -z-10 flex flex-none flex-col items-center gap-0 overflow-visible p-0"
          }
        >
          <div
            className={
              "relative flex h-svh w-full flex-none flex-col items-center gap-2.5 overflow-visible p-0"
            }
          >
            <div
              className={
                "relative flex h-full w-full flex-none flex-col items-center gap-0 overflow-hidden p-0"
              }
            >
              <motion.div
                className={
                  "relative flex h-svh min-h-svh w-full min-w-full flex-none flex-row items-center gap-2.5 overflow-visible bg-black p-0 blur-(--warp-blur)"
                }
                style={
                  {
                    opacity: sceneOpacity,
                    "--warp-blur": sceneBlur
                  } as MotionStyle
                }
                data-warp-scene={""}
              >
                <motion.div
                  className={"relative flex h-full w-full shrink-0 grow"}
                >
                  <WarpField
                    tuning={tuning}
                    progress={warpProgress}
                    settlement={settlement}
                    opening={fieldOpening}
                    coronaProgress={coronaProgress}
                    active={visible && inView}
                    onReady={markReady}
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
          <motion.p
            className={
              "absolute inset-x-4 top-0 flex flex-none flex-col items-center gap-0 overflow-hidden p-0 text-center font-sans text-[clamp(19px,2vw,26px)] leading-[1.3] tracking-[-.025em] text-white [text-shadow:0_2px_12px_#0008]"
            }

            style={{ opacity: passageOpacity, y: passageLift }}
            data-warp-passage=""
            data-sequence-clips="passageTravel passageFadeIn passageFadeOut"
          >
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                style={{ y: passageY }}
                data-sequence-clips="passageLine1 passageTravel passageFadeIn passageFadeOut"
                data-warp-passage-line=""
              >
                {copy.warpPassageLine1}
              </motion.span>
            </span>{" "}
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                style={{ y: passageSecondY }}
                data-sequence-clips="passageLine2 passageTravel passageFadeIn passageFadeOut"
                data-warp-passage-line=""
              >
                {copy.warpPassageLine2}
              </motion.span>
            </span>
          </motion.p>
        </div>
        <div
          className={
            "pointer-events-none absolute inset-0 flex w-full flex-none flex-col items-start gap-2.5 overflow-hidden p-0"
          }
        />
        <div
          className={
            "pointer-events-none absolute inset-0 flex w-full flex-none flex-col items-start gap-2.5 overflow-hidden p-0"
          }
        />
      </section>
      <div
        // className="-mt-[100svh]"
        data-warp-handoff=""
        className="-mt-[100svh] w-full"
      >
        <Hero
          sectionRef={hero.ref}
          sectionStyle={hero.sectionStyle}
          position={hero.position}
          entry={entry}
          onActive={setCurrent}
          hideWordmark
        />
        <Story
          suspended={current !== "origin" || !heroComplete || playing}
          onActive={setCurrent}
        />
      </div>
      <TeaserContinuation onActive={setCurrent} />
      {process.env.NODE_ENV === "development" && inView && (
        <WarpControls
          tuning={tuning}
          onChange={setTuning}
          progress={percent}
          playing={playing}
          onSeek={(value) => {
            stopJump();
            seek(value);
          }}
          onReplay={replay}
          onPlay={() => playJump()}
        />
      )}
      {process.env.NODE_ENV === "development" && (
        <SequenceEditor
          draft={sequenceDraft}
          defaults={sequenceDefaults}
          onChange={changeSequence}
          opening={opening}
          progress={overallProgress}
          ready={editorReady}
          playing={editorPlaying}
          onSeek={seekSequence}
          onPlay={playSequence}
          onPause={pauseSequence}
          onReplay={replay}
        />
      )}
    </main>
  );
};
