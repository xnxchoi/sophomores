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
import { ChevronUp } from "lucide-react";
import { ControlbarCentre, useControlbarCentre } from "@/components/shell/controlbar/slot";
import type { ChapterId } from "@/lib/teaser/choreography";
import { chapters } from "@/lib/teaser/content";
import { motionTokens } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

// The chapters' numerals in the touch-phone strip (the McAlpine reference, owner 2026-11-19). Helper gate:
// no numeral package is installed and Intl has no Roman numbering; past ten, plain figures.
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;
const numeral = (index: number) => NUMERALS[index] ?? String(index + 1);

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
 *
 * On touch phones the site's bottom Controlbar offers its centre slot
 * (shell/controlbar/slot.tsx): the phone menu then lives there as a chapter
 * pill whose card lists the chapters (owner's option 3, 2026-11-19), and the
 * floating phone menu and Skip are left out, so there is one chapter control.
 * Without the strip (desktop, fine pointers) nothing changes.
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
  const inStrip = useControlbarCentre() !== null;
  const stripRoot = useRef<HTMLDivElement>(null);
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
      (root.current?.contains(active) ||
        skip.current?.contains(active) ||
        stripRoot.current?.contains(active))
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

  // In the strip, a tap outside the pill and its card closes the card.
  useEffect(() => {
    if (!inStrip || !menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!stripRoot.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [inStrip, menuOpen]);

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
        {!inStrip && (
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
        )}
      </motion.nav>
      {inStrip && (
        <ControlbarCentre>
          <div ref={stripRoot} inert={!isPresent} className="relative grid">
            <AnimatePresence>
              {menuOpen && (
                <motion.ul
                  id="mobile-chapter-list"
                  key="chapter-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: motionTokens.duration.fast }}
                  className="absolute bottom-[calc(100%+12px)] left-1/2 flex max-h-[60dvh] w-[min(320px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-1 overflow-y-auto rounded-[28px] border border-border/30 bg-off-bg/95 p-3 backdrop-blur-xl"
                >
                  {chapters.map((chapter, index) => (
                    <li key={chapter.id} className="flex">
                      <a
                        href={`#${chapter.id}`}
                        aria-current={current === chapter.id ? "location" : undefined}
                        onClick={(event) => {
                          if (chapter.id === "hero") onHome(event);
                          setMenuOpen(false);
                          menuButton.current?.focus();
                        }}
                        className="flex min-h-12 w-full items-center justify-center rounded-full px-5 font-sans text-[23px] leading-none font-light text-foreground/85 transition-colors active:bg-foreground/[0.06] aria-[current]:bg-foreground aria-[current]:text-background"
                      >
                        <span>
                          {chapter.label}
                          <sup aria-hidden="true" className="ml-1 text-[11px] tracking-wide">
                            {numeral(index)}
                          </sup>
                        </span>
                      </a>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            <button
              ref={menuButton}
              type="button"
              aria-controls={menuOpen ? "mobile-chapter-list" : undefined}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={cn(
                "inline-flex h-12 min-w-0 items-center gap-3 rounded-full border border-border/30 pr-4 pl-1.5 transition-colors",
                menuOpen ? "bg-foreground/[0.09] text-foreground" : "bg-foreground/[0.04] text-foreground/85 active:bg-foreground/[0.08]"
              )}
            >
              <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] font-sans text-xs tracking-wide">
                {numeral(Math.max(0, currentIndex))}
              </span>
              <span className="sr-only">{t("chapterNav")}</span>
              <span className="min-w-0 flex-1 truncate text-center font-sans text-sm font-normal">
                {chapters[Math.max(0, currentIndex)]?.label}
              </span>
              <ChevronUp aria-hidden="true" className={cn("size-4 shrink-0 transition-transform", menuOpen && "rotate-180")} strokeWidth={1.5} />
            </button>
          </div>
        </ControlbarCentre>
      )}
      {nextChapter && !inStrip && (
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
