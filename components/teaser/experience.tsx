"use client";

import { useEffect, useRef, useState } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { AnimatePresence, motion, useTransform } from "motion/react";
import type { ChapterId } from "@/lib/teaser/choreography";
import {
  motionTokens,
  scrollSmoothing,
  shouldAnimate
} from "@/lib/motion-tokens";
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
import { useChapterScroll } from "./use-chapter-scroll";
import {
  useHydrated,
  useLowEnd,
  useLiveReducedMotion
} from "./use-device-flags";
import { useEntry } from "./use-entry";

export default function TeaserExperience() {
  const lenis = useLenis();
  const [current, setCurrent] = useState<ChapterId>("hero");
  const ready = useHydrated();
  const reduced = useLiveReducedMotion();
  const lowEnd = useLowEnd();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const still =
    ready &&
    (!shouldAnimate({ prefersReduced: !!reduced, essential: true }) || paused);
  const hero = useChapterScroll("hero", still);
  const entry = useEntry(still);
  const sceneOpacity = useTransform(hero.rawPosition, [1.4, 2], [1, 0]);
  const sceneProgress = useTransform(hero.rawPosition, [0, 2], [0, 1]);
  const navY = useTransform(entry.dock, [0, 1], [motionTokens.distance.xl, 0]);
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
      className={`teaser ${ready ? "is-ready" : ""} ${still ? "is-still" : ""}`}
    >
      {ready && !still && <ReactLenis root options={scrollSmoothing} />}
      <a className="skip-content" href="#contacts">
        Skip to the invitation
      </a>
      <motion.div
        className={`scene-backdrop ${isFooter ? "scene-footer" : ""}`}
        style={{ opacity: isFooter ? 0.65 : still ? 1 : sceneOpacity }}
        aria-hidden="true"
      >
        <motion.div
          className="scene-entry"
          style={{ opacity: still ? 1 : entry.backdrop }}
        >
          <SceneLoader
            progress={sceneProgress}
            reducedMotion={still || (ready && !shouldAnimate({ lowEnd }))}
            active={ready && (current === "hero" || isFooter)}
            footer={isFooter}
            entryScale={entry.scale}
          />
        </motion.div>
      </motion.div>
      <main>
        <Hero
          sectionRef={hero.ref}
          sectionStyle={hero.sectionStyle}
          position={hero.position}
          entry={entry}
          still={still}
          onActive={setCurrent}
        />
        <Story
          still={still}
          suspended={dialogOpen || menuOpen}
          onActive={setCurrent}
        />
        <Orbit still={still} onActive={setCurrent} />
        <Conversation still={still} onActive={setCurrent} />
        <People still={still} onActive={setCurrent} />
        <Invitation
          onOpen={openInvitation}
          onActive={setCurrent}
          still={still}
        />
      </main>
      <motion.nav
        aria-label="Chapters"
        className={`chapter-nav ${isFooter ? "at-footer" : ""}`}
        style={{ opacity: still ? 1 : entry.dock, y: still ? 0 : navY }}
      >
        <div className="desktop-chapters">
          {chapters.map((chapter) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              aria-current={current === chapter.id ? "location" : undefined}
            >
              {chapter.label}
            </a>
          ))}
        </div>
        <div className="mobile-chapters">
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
                  <a
                    key={chapter.id}
                    href={`#${chapter.id}`}
                    aria-current={
                      current === chapter.id ? "location" : undefined
                    }
                    onClick={() => {
                      setMenuOpen(false);
                      menuButton.current?.focus();
                    }}
                  >
                    {chapter.label}
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            ref={menuButton}
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
        </div>
      </motion.nav>
      {currentIndex > 0 && currentIndex < 4 && (
        <a className="skip-chapter" href={`#${chapters[currentIndex + 1].id}`}>
          Skip →
        </a>
      )}
      <motion.button
        className="motion-toggle"
        style={{ opacity: still ? 1 : entry.notification }}
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? "Motion on" : "Pause motion"}
      </motion.button>
      <dialog
        className="invitation-dialog"
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
        <div className="dialog-content">
          <div className="message-meta">
            <span>From: sophomores</span>
            <button
              onClick={() => dialog.current?.close()}
              autoFocus
              aria-label="Close invitation"
            >
              Close ×
            </button>
          </div>
          <h2 id="invitation-dialog-heading">
            This Is Only
            <br />
            The Beginning.
          </h2>
          <p>Ticket sales open {teaser.launchHint.toLowerCase()}.</p>
          <p className="dialog-note">
            {launchLabel(teaser.launchAt, new Date(0))}. Ticket sales are not
            open yet.
          </p>
          <p className="dialog-note">
            Preview only. No email is collected and no reservation is made.
          </p>
          <button
            className="dialog-return"
            onClick={() => dialog.current?.close()}
          >
            Back to the story →
          </button>
        </div>
      </dialog>
    </div>
  );
}
