"use client";

import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement
} from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import type { ChapterId } from "@/lib/teaser/choreography";
import { chapters } from "@/lib/teaser/content";
import { motionTokens } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

function MobileChapterControl({
  children
}: {
  children: ReactElement<{ className?: string }>;
}) {
  return cloneElement(children, {
    className: cn(
      "flex min-h-12 items-center justify-center gap-2 p-2 text-center font-sans text-teaser-nav uppercase",
      children.props.className
    )
  });
}

/**
 * Chapter navigation for the teaser page. Warp mounts it inside
 * AnimatePresence after its handoff and removes it at the footer chapter, so it
 * is absent from server HTML and leaves with the mirror of its entrance.
 * HOME calls `onHome`, which Warp points at the Hero rather than the page top,
 * so it never replays Warp.
 */
export function ChapterNav({
  current,
  onHome
}: {
  current: ChapterId;
  onHome: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const t = useTranslations("System");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLElement>(null);
  const skip = useRef<HTMLAnchorElement>(null);
  const isPresent = useIsPresent();
  const currentIndex = chapters.findIndex((chapter) => chapter.id === current);
  const nextChapter =
    currentIndex > 0 && currentIndex < chapters.length - 1
      ? chapters[currentIndex + 1]
      : null;

  // While exiting, release focus held inside the nav and close the menu, so
  // focus never sits on a fading, unreachable control.
  useEffect(() => {
    if (isPresent) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      (root.current?.contains(active) || skip.current?.contains(active))
    )
      active.blur();
    setMenuOpen(false);
  }, [isPresent]);

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
    if (menuOpen && isPresent)
      document
        .querySelector<HTMLAnchorElement>("#mobile-chapter-list a")
        ?.focus();
  }, [menuOpen, isPresent]);

  return (
    <>
      <motion.nav
        ref={root}
        aria-label={t("chapterNav")}
        inert={!isPresent}
        className="chapter-nav pointer-events-none fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 flex justify-center"
        initial={{ opacity: 0, y: motionTokens.distance.xl }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: motionTokens.distance.xl }}
        transition={{ duration: motionTokens.duration.normal }}
      >
        <div className="desktop-chapters pointer-events-auto hidden bg-teaser-glass backdrop-blur-lg md:flex">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              className="p-2 font-sans text-teaser-nav uppercase transition-colors duration-200 ease-[ease] hover:bg-white hover:text-black aria-[current]:bg-white aria-[current]:text-black pointer-coarse:inline-flex pointer-coarse:min-h-12 pointer-coarse:items-center"
              href={`#${chapter.id}`}
              aria-current={current === chapter.id ? "location" : undefined}
              onClick={chapter.id === "hero" ? onHome : undefined}
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
                        if (chapter.id === "hero") onHome(event);
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
                ? t("chapterClose")
                : current === "hero"
                  ? t("chapterMenu")
                  : chapters[currentIndex].label}
              <span aria-hidden="true">{menuOpen ? "−" : "="}</span>
            </button>
          </MobileChapterControl>
        </div>
      </motion.nav>
      {nextChapter && (
        <motion.a
          ref={skip}
          inert={!isPresent}
          className="skip-chapter fixed right-2 bottom-4 z-21 p-2 font-sans text-teaser-fine leading-[17px] uppercase md:right-4 md:bottom-3 md:text-teaser-nav pointer-coarse:inline-flex pointer-coarse:min-h-12 pointer-coarse:items-center"
          href={`#${nextChapter.id}`}
          aria-label={t("skipToChapter", { chapter: nextChapter.label })}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.duration.normal }}
        >
          {t("skipToNextChapter")}
        </motion.a>
      )}
    </>
  );
}
