"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import {
  animate, motion, useInView, useMotionValue, useMotionValueEvent,
  useScroll, useTransform, transform, type AnimationPlaybackControls
} from "motion/react";
import { Story } from "@/components/teaser/story";
import { Hero } from "@/components/teaser/hero";
import { stories } from "@/lib/teaser/content";
import { useChapterScroll } from "@/hooks/use-chapter-scroll";
import { entryTokens } from "@/lib/teaser/entry-tokens";
import { scrollSmoothing } from "@/lib/motion-tokens";
import { scrollChapters, type ChapterId } from "@/lib/teaser/choreography";
import { subscribeVisibility, serverSnapshot } from "@/utils/browser/visibility";
import { getOpeningFrame, getStudyFrame, getWarpFrame, STUDY_TOUR } from "./sequence";
import { cn } from "@/lib/utils";

const WarpField = dynamic(() => import("./warp-field"), { ssr: false });
const tourProgress = transform([...STUDY_TOUR.seconds], [...STUDY_TOUR.progress]);
const tourTime = transform([...STUDY_TOUR.progress], [...STUDY_TOUR.seconds]);

export function WarpStudy() {
  const lenis = useLenis();
  const runway = useRef<HTMLElement>(null);
  const hero = useChapterScroll("hero");
  const entry = {
    dock: useMotionValue<number>(entryTokens.complete.dock),
    backdrop: useMotionValue<number>(entryTokens.complete.backdrop),
    layout: useMotionValue<number>(entryTokens.complete.layout),
    scale: useMotionValue<number>(entryTokens.complete.scale),
    glyph: useMotionValue<number>(entryTokens.complete.glyph),
  };
  const opening = useMotionValue(0);
  const openingControl = useRef<AnimationPlaybackControls | null>(null);
  const jumpControl = useRef<AnimationPlaybackControls | null>(null);
  const initialized = useRef(false);
  const replayButton = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [percent, setPercent] = useState(0);
  const [phase, setPhase] = useState("Stillness");
  const [inspect, setInspect] = useState(false);
  const [current, setCurrent] = useState<ChapterId>("hero");
  const [heroComplete, setHeroComplete] = useState(false);
  const atCorona = percent >= 99;
  const compactControls = atCorona && !inspect;
  const visible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, serverSnapshot);
  const preludeInView = useInView(runway);
  const coronaInView = useInView(hero.ref);
  const inView = preludeInView || coronaInView;
  const { scrollYProgress } = useScroll({ target: runway, offset: ["start start", "end end"] });
  const introFrame = useTransform(opening, getOpeningFrame);
  const studyFrame = useTransform(scrollYProgress, getStudyFrame);
  const warpProgress = useTransform(studyFrame, value => value.warpProgress);
  const settlement = useTransform(studyFrame, value => value.settlement);
  const frame = useTransform(warpProgress, getWarpFrame);
  const coronaProgress = useTransform(hero.rawPosition, [0, scrollChapters.hero.steps - 1], [0, 1]);
  const coronaOpacity = useTransform(coronaProgress, [0.7, 1], [1, 0]);
  const fieldOpening = useTransform(introFrame, value => value.fieldOpacity);
  const firstLineOpacity = useTransform(introFrame, value => value.lineOpacity);
  const firstLineClip = useTransform(introFrame, value => `inset(0 ${(1 - value.lineReveal) * 100}% 0 0)`);
  const sceneOpacity = useTransform(() => introFrame.get().fieldOpacity * coronaOpacity.get());
  const headlineOpacity = useTransform(() => introFrame.get().headlineOpacity * frame.get().headlineOpacity);
  const leftX = useTransform(frame, value => `${-value.headlineSplit * 19}vw`);
  const rightX = useTransform(frame, value => `${value.headlineSplit * 19}vw`);
  const headlineScale = useTransform(frame, value => 1 - value.headlineSplit * .23);
  const controlsOpacity = useTransform(introFrame, value => value.controlsOpacity);
  const controlsVisibility = useTransform(introFrame, value => value.controlsOpacity <= 0 ? "hidden" : "visible");
  const [left, right] = stories[3].title.split(/(?<=\.)\s+/);

  useMotionValueEvent(hero.rawPosition, "change", value => setHeroComplete(value >= scrollChapters.hero.steps - 1));

  useMotionValueEvent(scrollYProgress, "change", value => {
    if (Math.round(value * 100) >= 99 && !inspect && document.activeElement?.hasAttribute("data-warp-transport")) {
      replayButton.current?.focus({ preventScroll: true });
    }
    setPercent(Math.round(value * 100));
    setPhase(opening.get() >= 1 ? getStudyFrame(value).phase : getOpeningFrame(opening.get()).phase);
    // Restored scroll / fast input must never leave reading content in darkness.
    if (value > .04 && opening.get() < 1) {
      openingControl.current?.stop();
      opening.set(1);
    }
  });
  useMotionValueEvent(opening, "change", value => {
    setPhase(value >= 1 ? getStudyFrame(scrollYProgress.get()).phase : getOpeningFrame(value).phase);
  });

  const startOpening = useCallback(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (window.scrollY > 20 || window.location.hash) opening.set(1);
    else openingControl.current = animate(opening, 1, { duration: 5, ease: "linear" });
  }, [opening]);

  useEffect(() => () => {
    initialized.current = false;
    openingControl.current?.stop();
    jumpControl.current?.stop();
  }, []);

  useEffect(() => {
    const controls = [openingControl.current, jumpControl.current];
    for (const control of controls) {
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

  const seek = (value: number) => {
    if (!runway.current) return;
    const top = runway.current.getBoundingClientRect().top + window.scrollY;
    const travel = runway.current.offsetHeight - window.innerHeight;
    const target = top + Math.max(0, travel) * value;
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo({ top: target, behavior: "instant" });
  };

  const replay = () => {
    stopJump();
    setInspect(false);
    openingControl.current?.stop();
    seek(0);
    opening.set(0);
    openingControl.current = animate(opening, 1, { duration: 5, ease: "linear" });
  };

  const playJump = () => {
    if (playing) { stopJump(); return; }
    if (scrollYProgress.get() >= .99) seek(0);
    openingControl.current?.stop();
    opening.set(1);
    setPlaying(true);
    const from = tourTime(scrollYProgress.get() >= .99 ? 0 : scrollYProgress.get());
    jumpControl.current = animate(from, STUDY_TOUR.duration, {
      duration: STUDY_TOUR.duration - from,
      ease: "linear", onUpdate: time => seek(tourProgress(time)), onComplete: () => setPlaying(false)
    });
  };

  useEffect(() => {
    const interrupt = () => { jumpControl.current?.stop(); jumpControl.current = null; setPlaying(false); };
    const touchInterrupt = (event: TouchEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-warp-controls]")) return;
      interrupt();
    };
    const keyInterrupt = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-warp-controls]")) return;
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) interrupt();
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
    <main className="teaser isolate bg-black text-white [body:has(&)_nextjs-portal]:hidden" data-warp-study="" data-phase={phase}>
      <ReactLenis root options={{ ...scrollSmoothing, wheelMultiplier: .45 }} />
      <a href="#origin" className="fixed top-2 left-2 z-50 -translate-y-24 bg-white p-3 text-black focus:translate-y-0">
        Skip to the story
      </a>
      <motion.div className="pointer-events-none fixed inset-0 -z-10" style={{ opacity: sceneOpacity }} data-warp-scene="">
        <WarpField progress={warpProgress} settlement={settlement} opening={fieldOpening} coronaProgress={coronaProgress}
          active={visible && inView} onReady={startOpening} />
      </motion.div>
      <section ref={runway} className="relative h-[500svh]" aria-label="Entry sequence">
        <div className="sticky top-0 h-svh overflow-hidden">
          <motion.p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 font-sans text-[clamp(17px,3.5vw,38px)] tracking-[-.035em]"
            style={{ opacity: firstLineOpacity }} data-warp-opening-copy="">
            <motion.span className="inline-block whitespace-nowrap" style={{ clipPath: firstLineClip }}>
              Opening line — copy to come.
            </motion.span>
          </motion.p>
          <motion.h1 className="absolute inset-0 flex items-center justify-center gap-[.28em] whitespace-nowrap px-4 font-sans text-[clamp(18px,3.5vw,38px)] font-normal tracking-[-.035em]"
            style={{ opacity: headlineOpacity }} aria-label={stories[3].title}>
            <motion.span aria-hidden="true" style={{ x: leftX, scale: headlineScale }}>{left}</motion.span>
            <motion.span aria-hidden="true" style={{ x: rightX, scale: headlineScale }}>{right}</motion.span>
          </motion.h1>
          <motion.div className="absolute inset-x-0 bottom-24 text-center text-[10px] tracking-[.18em] text-white/45 uppercase"
            style={{ opacity: headlineOpacity }}>
            Scroll to approach
          </motion.div>
        </div>
      </section>
      <div className="-mt-[100svh]" data-warp-handoff="">
        <Hero sectionRef={hero.ref} sectionStyle={hero.sectionStyle} position={hero.position}
          entry={entry} onActive={setCurrent} hideWordmark />
        <Story suspended={current !== "origin" || !heroComplete || playing} onActive={setCurrent} />
      </div>
      <motion.aside className={cn("fixed z-30 max-w-xl rounded-2xl border border-white/10 bg-black/75 px-4 py-3 font-sans backdrop-blur-xl",
        atCorona ? "bottom-[max(12px,env(safe-area-inset-bottom))] left-3 max-w-[calc(100vw-24px)]" : "inset-x-3 top-[max(12px,env(safe-area-inset-top))] mx-auto",
        compactControls ? "py-0" : "w-[calc(100vw-24px)]")}
        style={{ opacity: controlsOpacity, visibility: controlsVisibility }} aria-label="Motion study controls" data-warp-controls=""
        data-warp-controls-location={atCorona ? "bottom-left" : "top"}>
        {!compactControls && <div className="flex items-center justify-between gap-3 text-[10px] tracking-[.12em] text-white/45 uppercase">
          <span>Entry study · placeholder copy</span><span data-warp-phase="">{atCorona ? current === "origin" ? "Story" : `Corona · ${hero.step}` : phase}</span>
        </div>}
        <div className="mt-1 flex items-center gap-3">
          <button ref={replayButton} type="button" onClick={replay} className="min-h-11 shrink-0 text-xs text-white/80 outline-offset-4 hover:text-white focus-visible:outline">
            Replay
          </button>
          {compactControls ? <button type="button" onClick={() => setInspect(true)} className="min-h-11 text-xs text-white/60 outline-offset-4 focus-visible:outline">Controls</button> : <>
          <button type="button" onClick={playJump} className="min-h-11 min-w-20 shrink-0 text-xs text-white outline-offset-4 focus-visible:outline" aria-pressed={playing} data-warp-transport="">
            {playing ? "Stop" : "Play jump"}
          </button>
          <input type="range" min="0" max="100" value={percent} aria-label="Transition progress" data-warp-transport=""
            className="h-11 w-full min-w-0 cursor-ew-resize accent-white"
            onChange={event => { stopJump(); opening.set(1); seek(Number(event.target.value) / 100); }} />
          <output className="w-8 shrink-0 text-right text-[10px] text-white/50 tabular-nums">{percent}%</output>
          </>}
        </div>
      </motion.aside>
    </main>
  );
}
