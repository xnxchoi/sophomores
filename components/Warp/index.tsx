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
import { TeaserContinuation } from "@/components/teaser/continuation";
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
  getFrame,
  getOpeningFrame,
  HANDOFF,
  OPENING_TIMING,
  TOR
} from "./sequence";
import Link from "next/link";
import { DEFAULT_WARP_TUNING, type WarpTuning } from "./_shared/tuning";

const WarpField = dynamic(() => import("./warp-field"), { ssr: false });
const WarpControls = dynamic(() => import("./dev-controls"), { ssr: false });
const tourProgress = transform([...TOR.seconds], [...TOR.progress]);
const tourTime = transform([...TOR.progress], [...TOR.seconds]);

export const  Warp = () => {
  const lenis = useLenis();
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
  const coronaProgress = useTransform(
    hero.rawPosition,
    [0, scrollChapters.hero.steps - 1],
    [0, 1]
  );
  const overallProgress = useTransform(() => {
    const prelude = scrollYProgress.get();
    const corona = coronaProgress.get();
    return prelude < 1 ? prelude * HANDOFF : HANDOFF + corona * 0.3;
  });
  const introFrame = useTransform(opening, getOpeningFrame);
  const studyFrame = useTransform(overallProgress, getFrame);
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
  const passageProgress = useTransform(
    studyFrame,
    (value) => value.passageLift
  );
  // Viewport travel plus the block's own height gives exact offscreen endpoints.
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
  const [left, right] = stories[3].title.split(/(?<=\.)\s+/);

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
        ? getFrame(value).phase
        : getOpeningFrame(opening.get()).phase
    );
  });
  useMotionValueEvent(opening, "change", (value) => {
    setPhase(
      value >= 1
        ? getFrame(overallProgress.get()).phase
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

  const playJump = () => {
    if (playing) {
      stopJump();
      return;
    }
    if (!ready.get()) return;
    const start = overallProgress.get() >= HANDOFF ? 0 : overallProgress.get();
    if (start === 0) {
      seek(0);
      startIntro();
    }
    setPlaying(true);
    const from = tourTime(start);
    jumpControl.current = animate(from, TOR.duration, {
      duration: TOR.duration - from,
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
      className={
        "teaser relative isolate flex h-min w-full flex-col items-start overflow-visible bg-black p-0 text-white [body:has(&)_nextjs-portal]:hidden"
      }
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

      <section
        ref={runway}
        className="relative flex h-[500svh] w-full flex-none flex-col items-center gap-0 overflow-visible p-0"
        aria-label="Entry sequence"
      >
        <div
          className="sticky top-0 z-10 flex h-svh w-full flex-none flex-row items-center justify-center gap-[.28em] overflow-hidden px-4 font-sans text-[clamp(18px,3.5vw,38px)] font-normal tracking-[-.035em]"
          aria-label={stories[3].title}
          ref={headlineScope}
        >
          <motion.div
            className="relative z-1 flex h-full w-min flex-none flex-row items-center gap-2.5 overflow-visible p-0"
            style={{ x: leftX, scale: headlineScale }}
          >
            <div className={"relative h-auto w-auto flex-none whitespace-pre"}>
              <motion.h2 style={{ opacity: headlineOpacity }}>
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
              <motion.h2 style={{ opacity: headlineOpacity }}>
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
                  "relative flex h-svh min-h-svh w-full min-w-full flex-none flex-row items-center gap-2.5 overflow-visible bg-black p-0"
                }
                style={{ opacity: sceneOpacity }}
                data-warp-scene=""
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
        <WarpControls tuning={tuning} onChange={setTuning}
          progress={percent} playing={playing}
          onSeek={(value) => { stopJump(); seek(value); }}
          onReplay={replay} onPlay={playJump} />
      )}
    </main>
  );
};
