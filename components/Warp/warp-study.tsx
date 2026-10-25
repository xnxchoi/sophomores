"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { ReactLenis, useLenis } from "lenis/react";
import {
  animate,
  type AnimationPlaybackControls,
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
import { Hero } from "@/components/teaser/hero";
import { stories } from "@/lib/teaser/content";
import { useChapterScroll } from "@/hooks/use-chapter-scroll";
import { entryTokens } from "@/lib/teaser/entry-tokens";
import { scrollSmoothing } from "@/lib/motion-tokens";
import {
  chapterExitHoldVh,
  type ChapterId,
  scrollChapters
} from "@/lib/teaser/choreography";
import { chapterGeometry } from "@/lib/teaser/step-motion";
import {
  serverSnapshot,
  subscribeVisibility
} from "@/utils/browser/visibility";
import {
  getOpeningFrame,
  getStudyFrame,
  OPENING_TIMING,
  STUDY_HANDOFF,
  STUDY_TOUR
} from "./sequence";
import Link from "next/link";
import { cn } from "@/lib/utils";

const WarpField = dynamic(() => import("./warp-field"), { ssr: false });
const tourProgress = transform(
  [...STUDY_TOUR.seconds],
  [...STUDY_TOUR.progress]
);
const tourTime = transform([...STUDY_TOUR.progress], [...STUDY_TOUR.seconds]);

// Study transport is opt-in; the homepage keeps the uninterrupted entry.
export function WarpStudy({
  showControls = false
}: {
  showControls?: boolean;
}) {
  const lenis = useLenis();
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
  const [headlineScope, animateIntro] = useAnimate<HTMLHeadingElement>();
  const introControl = useRef<AnimationPlaybackControls | null>(null);
  const jumpControl = useRef<AnimationPlaybackControls | null>(null);
  const replayButton = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [percent, setPercent] = useState(0);
  const [phase, setPhase] = useState("Black");
  const [inspect, setInspect] = useState(false);
  const [current, setCurrent] = useState<ChapterId>("hero");
  const [heroComplete, setHeroComplete] = useState(false);
  const atCorona = percent >= STUDY_HANDOFF * 100;
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
  const coronaProgress = useTransform(
    hero.rawPosition,
    [0, scrollChapters.hero.steps - 1],
    [0, 1]
  );
  const overallProgress = useTransform(() => {
    const prelude = scrollYProgress.get();
    const corona = coronaProgress.get();
    return prelude < 1 ? prelude * STUDY_HANDOFF : STUDY_HANDOFF + corona * 0.3;
  });
  const introFrame = useTransform(opening, getOpeningFrame);
  const studyFrame = useTransform(overallProgress, getStudyFrame);
  // The renderer consumes legacy warp coordinates, not the slider's global value.
  const warpProgress = useTransform(studyFrame, (value) => value.warpProgress);
  const settlement = useTransform(studyFrame, (value) => value.settlement);
  const coronaOpacity = useTransform(coronaProgress, [0.7, 1], [1, 0]);
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
    (value) => 1 - value.headlineSplit * 0.23
  );
  const passageOpacity = useTransform(
    () => studyFrame.get().passageOpacity * ready.get()
  );
  const passageY = useTransform(
    studyFrame,
    (value) => `${(1 - value.passageReveal) * 110}%`
  );
  const passageLift = useTransform(
    studyFrame,
    (value) => -value.passageLift * 36
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
  const [left, right] = stories[3].title.split(/(?<=\.)\s+/);

  useMotionValueEvent(hero.rawPosition, "change", (value) =>
    setHeroComplete(value >= scrollChapters.hero.steps - 1)
  );

  useMotionValueEvent(overallProgress, "change", (value) => {
    if (
      value >= STUDY_HANDOFF &&
      !inspect &&
      document.activeElement?.hasAttribute("data-warp-transport")
    ) {
      replayButton.current?.focus({ preventScroll: true });
    }
    setPercent(Math.round(value * 100));
    setPhase(
      opening.get() >= 1
        ? getStudyFrame(value).phase
        : getOpeningFrame(opening.get()).phase
    );
  });
  useMotionValueEvent(opening, "change", (value) => {
    setPhase(
      value >= 1
        ? getStudyFrame(overallProgress.get()).phase
        : getOpeningFrame(value).phase
    );
  });
  const startIntro = useCallback(() => {
    introControl.current?.stop();
    opening.set(0);
    introControl.current = animateIntro([
      [
        opening,
        1,
        { at: 0, duration: OPENING_TIMING.duration, ease: "linear" }
      ],
      [
        "[data-warp-char]",
        { opacity: [0, 1] },
        {
          at: OPENING_TIMING.textStart,
          duration: OPENING_TIMING.characterDuration,
          delay: stagger(OPENING_TIMING.characterStagger),
          ease: "easeInOut"
        }
      ]
    ]);
    if (document.hidden) introControl.current.pause();
  }, [animateIntro, opening]);
  const markReady = useCallback(() => {
    if (ready.get()) return;
    ready.set(1);
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
    for (const control of [introControl.current, jumpControl.current]) {
      if (!control) continue;
      if (!visible && control.state === "running") control.pause();
      else if (visible && control.state === "paused") control.play();
    }
  }, [visible]);

  const stopJump = () => {
    jumpControl.current?.stop();
    jumpControl.current = null;
    setPlaying(false);
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
      value <= STUDY_HANDOFF
        ? top + travel * (value / STUDY_HANDOFF)
        : heroTop +
          heroTravel * heroGeometry.motionEnd * ((value - STUDY_HANDOFF) / 0.3);
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo({ top: target, behavior: "instant" });
  };

  const replay = () => {
    stopJump();
    setInspect(false);
    seek(0);
    startIntro();
  };

  const playJump = () => {
    if (playing) {
      stopJump();
      return;
    }
    if (!ready.get()) return;
    const start =
      overallProgress.get() >= STUDY_HANDOFF ? 0 : overallProgress.get();
    if (start === 0) {
      seek(0);
      startIntro();
    }
    setPlaying(true);
    const from = tourTime(start);
    jumpControl.current = animate(from, STUDY_TOUR.duration, {
      duration: STUDY_TOUR.duration - from,
      ease: "linear",
      onUpdate: (time) => seek(tourProgress(time)),
      onComplete: () => setPlaying(false)
    });
  };

  useEffect(() => {
    const interrupt = () => {
      jumpControl.current?.stop();
      jumpControl.current = null;
      setPlaying(false);
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
      className="teaser isolate bg-black text-white [body:has(&)_nextjs-portal]:hidden"
      data-warp-study=""
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
      {/* Persist through both the pinned approach and the original Hero. */}
      <motion.div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ opacity: sceneOpacity }}
        data-warp-scene=""
      >
        <WarpField
          progress={warpProgress}
          settlement={settlement}
          opening={fieldOpening}
          coronaProgress={coronaProgress}
          active={visible && inView}
          onReady={markReady}
        />
      </motion.div>
      {/* The outer runway provides travel; only its viewport is sticky. */}
      <section
        ref={runway}
        className="relative h-[500svh]"
        aria-label="Entry sequence"
      >
        <div className="sticky top-0 h-svh overflow-hidden">
          {/* One animation scope owns both independently moving headline halves. */}
          <motion.h1
            ref={headlineScope}
            data-warp-headline=""
            className="absolute inset-0 flex items-center justify-center gap-[.28em] px-4 font-sans text-[clamp(18px,3.5vw,38px)] font-normal tracking-[-.035em] whitespace-nowrap"
            style={{ opacity: headlineOpacity }}
            aria-label={stories[3].title}
          >
            <motion.span
              aria-hidden="true"
              style={{ x: leftX, scale: headlineScale }}
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
            </motion.span>
            <motion.span
              aria-hidden="true"
              style={{ x: rightX, scale: headlineScale }}
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
            </motion.span>
          </motion.h1>
          <motion.p
            className="pointer-events-none absolute inset-x-4 top-[31svh] -translate-y-1/2 text-center font-sans text-[clamp(19px,2vw,26px)] leading-[1.3] tracking-[-.025em] text-white [text-shadow:0_2px_12px_#0008]"
            style={{ opacity: passageOpacity, y: passageLift }}
            data-warp-passage=""
          >
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                style={{ y: passageY }}
                data-warp-passage-line=""
              >
                Lorem ipsum dolor sit amet,
              </motion.span>
            </span>{" "}
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                style={{ y: passageY }}
                data-warp-passage-line=""
              >
                consectetur adipiscing elit sed do.
              </motion.span>
            </span>
          </motion.p>
          <motion.div
            className="absolute inset-x-0 bottom-24 text-center text-[10px] tracking-[.18em] text-white/45 uppercase"
            style={{ opacity: hintOpacity }}
          >
            Scroll to approach
          </motion.div>
        </div>
      </section>
      {/* Hero zero coincides with the end of the runway, without an empty screen. */}
      <div className="-mt-[100svh]" data-warp-handoff="">
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
      {showControls && (
        <motion.aside
          className={cn(
            "fixed z-30 max-w-xl rounded-2xl border border-white/10 bg-black/75 px-4 py-3 font-sans backdrop-blur-xl",
            atCorona
              ? "bottom-[max(12px,env(safe-area-inset-bottom))] left-3 max-w-[calc(100vw-24px)]"
              : "inset-x-3 top-[max(12px,env(safe-area-inset-top))] mx-auto",
            compactControls ? "py-0" : "w-[calc(100vw-24px)]"
          )}
          style={{ opacity: controlsOpacity, visibility: controlsVisibility }}
          aria-label="Motion study controls"
          data-warp-controls=""
          data-warp-controls-location={atCorona ? "bottom-left" : "top"}
        >
          {!compactControls && (
            <div className="flex items-center justify-between gap-3 text-[10px] tracking-[.12em] text-white/45 uppercase">
              <span>Entry study · placeholder copy</span>
              <span data-warp-phase="">
                {atCorona
                  ? current === "origin"
                    ? "Story"
                    : `Corona · ${hero.step}`
                  : phase}
              </span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-3">
            <button
              ref={replayButton}
              type="button"
              onClick={replay}
              className="min-h-11 shrink-0 text-xs text-white/80 outline-offset-4 hover:text-white focus-visible:outline"
            >
              Replay
            </button>
            {compactControls ? (
              <button
                type="button"
                onClick={() => setInspect(true)}
                className="min-h-11 text-xs text-white/60 outline-offset-4 focus-visible:outline"
              >
                Controls
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={playJump}
                  className="min-h-11 min-w-20 shrink-0 text-xs text-white outline-offset-4 focus-visible:outline"
                  aria-pressed={playing}
                  data-warp-transport=""
                >
                  {playing ? "Stop" : "Play jump"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percent}
                  aria-label="Transition progress"
                  data-warp-transport=""
                  className="h-11 w-full min-w-0 cursor-ew-resize accent-white"
                  onChange={(event) => {
                    stopJump();
                    setInspect(true);
                    seek(Number(event.target.value) / 100);
                  }}
                />
                <output className="w-8 shrink-0 text-right text-[10px] text-white/50 tabular-nums">
                  {percent}%
                </output>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </main>
  );
}
