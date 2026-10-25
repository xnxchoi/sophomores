"use client";

import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement
} from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { AnimatePresence, motion, useTransform } from "motion/react";
import { type ChapterId, scrollChapters } from "@/lib/teaser/choreography";
import { BrandMark } from "@/lib/brand";
import { motionTokens, scrollSmoothing } from "@/lib/motion-tokens";
import { chapters, teaser } from "@/lib/teaser/content";
import { launchLabel } from "@/lib/teaser/motion";
import {
  Conversation,
  Hero,
  Invitation,
  Orbit,
  People,
  Story
} from "./narrative";
import SceneLoader from "./scene-loader";
import { useChapterScroll } from "../../hooks/use-chapter-scroll";
import { useHydrated } from "./use-device-flags";
import { useEntry } from "../../hooks/use-entry";
import { useHomeNavigation } from "../../hooks/use-home-navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  const sceneProgress = useTransform(
    hero.rawPosition,
    [0, scrollChapters.hero.steps - 1],
    [0, 1]
  );
  const sceneOpacity = useTransform(sceneProgress, [0.7, 1], [1, 0]);
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
        <Orbit onActive={setCurrent} />
        <Conversation onActive={setCurrent} />
        <People onActive={setCurrent} />
        <Invitation onOpen={openInvitation} onActive={setCurrent}
          renderBackdrop={(active) => <SceneLoader progress={sceneProgress} active={ready && active} footer />} />
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
      <dialog
        className="invitation-dialog max-h-[calc(100svh-48px)] w-[min(480px,calc(100vw-32px))] rounded-teaser-card border-0 bg-teaser-blue p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md"
        aria-labelledby="invitation-dialog-heading"
        data-lenis-prevent
        ref={dialog}
        onClose={() => {
          setDialogOpen(false);
          lenis?.start();
          opener.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-content flex flex-col gap-7 p-7">
          <div className="message-meta flex items-center justify-between gap-4 font-sans text-teaser-caption leading-[1.1] text-teaser-soft uppercase">
            <span>
              From: <BrandMark>sophomores</BrandMark>
            </span>
            <button
              className="bg-transparent p-2 text-white"
              onClick={() => dialog.current?.close()}
              autoFocus
              aria-label="Close invitation"
            >
              Close ×
            </button>
          </div>
          <h2
            id="invitation-dialog-heading"
            className="font-teaser-serif text-teaser-heading leading-[1.2]"
          ></h2>
          <p className="font-sans text-teaser-body leading-[1.3] uppercase">
            Ticket sales open {teaser.launchHint.toLowerCase()}.
          </p>
          <p className="dialog-note font-sans text-teaser-label leading-[1.5] text-teaser-soft uppercase">
            {launchLabel(teaser.launchAt, new Date(0))}. Ticket sales are not
            open yet.
          </p>
          <p className="dialog-note font-sans text-teaser-label leading-[1.5] text-teaser-soft uppercase">
            Preview only. No email is collected and no reservation is made.
          </p>
          <button
            className="dialog-return self-start bg-transparent p-2 pl-0 text-white uppercase"
            onClick={() => dialog.current?.close()}
          >
            Back to the story →
          </button>
        </div>
      </dialog>
    </div>
  );
}
