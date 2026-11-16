"use client";

import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement
} from "react";
import { ReactLenis, useLenis } from "lenis/react";
import {
  AnimatePresence,
  animate,
  motion,
  transform,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type AnimationPlaybackControls
} from "motion/react";
import {
  chapterExitHoldVh,
  createTimeline,
  heroAuroraZoomVh,
  type ChapterId,
  type PinnedChapter,
  scrollChapters
} from "@/lib/teaser/choreography";
import {
  chapterGeometry,
  stepMotionTokens
} from "@/lib/teaser/step-motion";
import { motionTokens, scrollSmoothing } from "@/lib/motion-tokens";
import { chapters } from "@/lib/teaser/content";
import {
  Conversation,
  Hero,
  Invitation,
  People,
  Story
} from "./narrative";
import SceneLoader from "./scene-loader";
import { useHydrated } from "./use-device-flags";
import { useEntry } from "../../hooks/use-entry";
import { useHomeNavigation } from "../../hooks/use-home-navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InvitationDialog } from "./invitation-dialog";

function MobileChapterControl({
  children
}: {
  children: ReactElement<{ className?: string }>;
}) {
  return cloneElement(children, {
    className: cn(
      "flex min-h-10 items-center justify-center gap-2 p-2 text-center font-sans text-teaser-nav uppercase",
      children.props.className
    )
  });
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

export default function TeaserExperience() {
  const lenis = useLenis();
  const navigateHome = useHomeNavigation();
  const [current, setCurrent] = useState<ChapterId>("hero");
  const ready = useHydrated();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const hero = useChapterScroll("hero");
  const entry = useEntry();
  const heroProgress = useTransform(
    hero.rawPosition,
    [0, scrollChapters.hero.steps - 1],
    [0, 1]
  );
  const heroMotionVh =
    hero.geometry.heightVh - (chapterExitHoldVh.hero ?? 0) - 100;
  const sceneProgress = useTransform(
    hero.rawPosition,
    [
      0,
      ((scrollChapters.hero.steps - 1) * heroAuroraZoomVh) / heroMotionVh
    ],
    [0, 1]
  );
  const sceneOpacity = useTransform(heroProgress, [0.7, 1], [1, 0]);
  const navY = useTransform(entry.dock, [0, 1], [motionTokens.distance.xl, 0]);
  const navVisibility = useTransform(entry.dock, (value) =>
    value > 0 ? "visible" : "hidden"
  );
  const currentIndex = chapters.findIndex((chapter) => chapter.id === current);
  const isFooter = current === "contacts";

  useEffect(() => {
    if (dialog.current?.open) lenis?.stop();
  }, [lenis]);

  useEffect(() => {
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", closeMenu);
    return () => window.removeEventListener("keydown", closeMenu);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen)
      document
        .querySelector<HTMLAnchorElement>("#mobile-chapter-list a")
        ?.focus();
  }, [menuOpen]);

  const openInvitation = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.current?.showModal();
    setDialogOpen(true);
    lenis?.stop();
  };

  return (
    <div
      className={cn(
        "teaser relative isolate bg-black font-sans text-white",
        ready ? "is-ready" : ""
      )}
    >
      {ready && <ReactLenis root options={scrollSmoothing} />}
      <Link
        className="skip-content fixed top-2 left-3 z-100 -translate-y-[200%] bg-white p-3 text-black focus:translate-y-0"
        href="#contacts"
      >
        Skip to the invitation
      </Link>
      <motion.div
        className={cn(
          "scene-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden"
        )}
        style={{
          opacity: sceneOpacity
        }}
        aria-hidden="true"
      >
        <motion.div
          className="scene-entry absolute inset-0"
          style={{ opacity: entry.backdrop }}
        >
          <SceneLoader
            progress={sceneProgress}
            active={ready && current === "hero"}
            entryScale={entry.scale}
          />
        </motion.div>
      </motion.div>
      <main className="relative z-1">
        <Hero
          sectionRef={hero.ref}
          sectionStyle={hero.sectionStyle}
          position={hero.position}
          entry={entry}
          onActive={setCurrent}
        />
        <Story suspended={dialogOpen || menuOpen} onActive={setCurrent} />
        <Conversation onActive={setCurrent} />
        <People onActive={setCurrent} />
        <Invitation
          onOpen={openInvitation}
          onActive={setCurrent}
          renderBackdrop={(active) => (
            <SceneLoader
              progress={sceneProgress}
              active={ready && active}
              footer
            />
          )}
        />
      </main>
      <motion.nav
        aria-label="Chapters"
        className={cn(
          "chapter-nav pointer-events-none fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 flex justify-center",
          isFooter ? "at-footer invisible opacity-0" : ""
        )}
        style={{
          opacity: entry.dock,
          y: navY,
          visibility: navVisibility
        }}
      >
        <div className="desktop-chapters pointer-events-auto hidden bg-teaser-glass backdrop-blur-lg md:flex">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              className="p-2 font-sans text-teaser-nav uppercase transition-colors duration-200 ease-[ease] hover:bg-white hover:text-black aria-[current]:bg-white aria-[current]:text-black"
              href={`#${chapter.id}`}
              aria-current={current === chapter.id ? "location" : undefined}
              onClick={chapter.id === "hero" ? navigateHome : undefined}
            >
              {chapter.label}
            </Link>
          ))}
        </div>
        <div className="mobile-chapters pointer-events-auto flex w-40 flex-col bg-teaser-glass backdrop-blur-lg md:hidden">
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                id="mobile-chapter-list"
                key="chapter-menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: motionTokens.duration.fast }}
              >
                {chapters.map((chapter) => (
                  <MobileChapterControl key={chapter.id}>
                    <a
                      className="aria-[current]:bg-[#fff2]"
                      href={`#${chapter.id}`}
                      aria-current={
                        current === chapter.id ? "location" : undefined
                      }
                      onClick={(event) => {
                        if (chapter.id === "hero") navigateHome(event);
                        setMenuOpen(false);
                        menuButton.current?.focus();
                      }}
                    >
                      {chapter.label}
                    </a>
                  </MobileChapterControl>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <MobileChapterControl>
            <button
              ref={menuButton}
              className="bg-white text-black"
              aria-controls={menuOpen ? "mobile-chapter-list" : undefined}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen
                ? "Close"
                : current === "hero"
                  ? "Menu"
                  : chapters[currentIndex].label}
              <span aria-hidden="true">{menuOpen ? "−" : "="}</span>
            </button>
          </MobileChapterControl>
        </div>
      </motion.nav>
      {currentIndex > 0 && currentIndex < 4 && (
        <a
          className="skip-chapter fixed right-2 bottom-4 z-21 p-2 font-sans text-teaser-fine leading-[17px] uppercase md:right-4 md:bottom-3 md:text-teaser-nav"
          href={`#${chapters[currentIndex + 1].id}`}
        >
          Skip →
        </a>
      )}
      <InvitationDialog dialogRef={dialog} onClose={() => {
        setDialogOpen(false);
        lenis?.start();
        opener.current?.focus();
      }} />
    </div>
  );
}
