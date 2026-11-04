"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/shallow";
import { useDayNNightScene } from "../store";
import { DayNNightCursorTone } from "./DayNNightCursorTone";
import { DayNNightScore } from "./DayNNightScore";
import { DetailsContext } from "./DetailsContext";
import { DetailsDrawer } from "./DetailsDrawer";
import { FriendsTorrent } from "./FriendsTorrent";
import { LiminalHandoff } from "./LiminalHandoff";
import { LiminalRadioController } from "./LiminalRadioController";
import { QuickActions } from "./QuickActions";
import { useActWindowActive } from "./Reveal";
import { Scrubber } from "./Scrubber";
import { SunLoader } from "./SunLoader";
import { Timeline } from "./Timeline";
import { ViewToggle } from "../ViewToggle";
import { useViewContext } from "../ViewContext";
import { useRuntimeFriendsPhotos } from "../friendsPhotos";
import type { DayNNightRsvpState } from "../MainLanding";

// Act III ("dress" slot) index in SECTION_KEYS order. Mirrors the
// removed ACT_INDEX_DRESS that lived in Timeline.tsx before the
// dress JSX block was stripped.
const ACT_INDEX_DRESS = 2;

/**
 * Immersive view orchestrator.
 *
 * Layers (back → front), all nested inside Timeline's pinned wrap so the
 * site's smooth-scroll wrapper doesn't break their fixed-positioning:
 *
 *   1. SceneView   — pure CSS sky gradient + horizon glow + sun disk,
 *                    driven by a single per-frame rAF reading the shared
 *                    progress in store.ts.
 *   2. .grain      — atmospheric noise overlay (mix-blend overlay).
 *   3. Track       — 5 acts × 2 copies, horizontally translated by GSAP
 *                    ScrollTrigger for a seamless modulo loop.
 *   4. ScrollHint  — fades out on first scroll.
 *   5. Scrubber    — bottom timeline with section jump labels.
 *   6. SunLoader   — covers everything during load, hands off seamlessly.
 */
interface ImmersiveViewProps {
  rsvpState: DayNNightRsvpState;
  isSignedIn: boolean;
}

export function ImmersiveView({ rsvpState, isSignedIn }: ImmersiveViewProps) {
  const t = useTranslations("Event.DayNNight");
  const mainT = useTranslations("Event.DayNNight.main");
  const { view, setView } = useViewContext();
  const phase = useDayNNightScene(useShallow((r) => r.phase));
  // Sequenced entry reveal: 0 = background only, 1 = content, 2 = chrome.
  // Stages advance on fixed delays after phase transitions to "playing" so
  // the first impression is: sky → Act I copy → HUD chrome.
  const [revealStage, setRevealStage] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    if (phase !== "playing") {
      setRevealStage(0);
      return;
    }
    const t1 = window.setTimeout(() => setRevealStage(1), 200);
    const t2 = window.setTimeout(() => setRevealStage(2), 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [phase]);
  const [hintHidden, setHintHidden] = useState(false);
  // Single source of truth for the right-side Details drawer. The
  // top-right QuickActions trigger and the in-act OpeningCard both
  // consume this via DetailsContext.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const friendsPhotos = useRuntimeFriendsPhotos();
  const setProgress = useDayNNightScene((r) => r.setProgress);
  const setPhase = useDayNNightScene((r) => r.setPhase);
  const resetLiminalHandoff = useDayNNightScene((r) => r.resetLiminalHandoff);

  // ── Dress sentinel — mobile window gate ──────────────────────────────
  // Desktop uses the GSAP-measured act window below. Mobile does not run
  // that horizontal layout, so this in-flow sentinel supplies the same
  // "we are in the liminal stretch" boolean for mobile.
  const dressSentinelRef = useRef<HTMLDivElement>(null);
  const [mobileLiminalActive, setMobileLiminalActive] = useState(false);
  const mobileLiminalStateRef = useRef({
    active: false,
    progress: 0
  });
  useEffect(() => {
    const node = dressSentinelRef.current;
    if (!node) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const active = rect.top < vh * 0.5 && rect.bottom > vh * 0.02;
      const progress = active
        ? Math.max(
            0,
            Math.min(1, (vh * 0.5 - rect.top) / (rect.height + vh * 0.48))
          )
        : 0;
      const prev = mobileLiminalStateRef.current;
      if (prev.active === active && Math.abs(prev.progress - progress) < 0.01) {
        return;
      }
      mobileLiminalStateRef.current = { active, progress };
      setMobileLiminalActive(active);
    };

    const requestUpdate = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  // ── Act III dress-window gate ───────────────────────────────────────
  // `useActWindowActive` is two-way (not sticky like useActRevealActive)
  // — flips back to false when the user scrolls past the dress act.
  const dressWindow = useActWindowActive(ACT_INDEX_DRESS, {
    preroll: -0.075
  });
  const torrentVisible = dressWindow.active || mobileLiminalActive;
  // Hide the scroll hint on first scroll.
  useEffect(() => {
    if (phase !== "playing") return;
    const onScroll = () => setHintHidden(true);
    window.addEventListener("scroll", onScroll, { once: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [phase]);

  // Reset progress to 0 on mount so a re-entry replays the loader handoff.
  // Reset the Liminal handoff flag too — the cassette stays "playing" once
  // pressed, but only within a single mount of the immersive view.
  useEffect(() => {
    return () => {
      setProgress(0);
      setPhase("loading");
      resetLiminalHandoff();
    };
  }, [setPhase, setProgress, resetLiminalHandoff]);

  return (
    <DetailsContext value={{ open: detailsOpen, setOpen: setDetailsOpen }}>
      <div className="relative min-h-svh w-full p-0 [--reveal-x:50%] [--reveal-y:50%]">
        {/* Timeline owns the pinned scroll context; SceneView (sky + sun + moon)
          and the grain overlay live inside it so they share the pin.
          contentRevealed gates Act I's RevealStage so it only fires
          once the entry sequence has reached the content beat (200ms). */}
        <Timeline
          contentRevealed={revealStage >= 1}
          dressSentinelRef={dressSentinelRef}
          rsvpState={rsvpState}
          isSignedIn={isSignedIn}
        />
        <div
          data-hidden={hintHidden || phase !== "playing" || revealStage < 2}
          aria-hidden
          className="ease pointer-events-none fixed bottom-1/4 left-1/2 z-[45] hidden -translate-x-1/2 items-center gap-[10px] font-sans text-[10px] tracking-[0.28em] text-[var(--dn-fg-mute)] uppercase transition-opacity duration-500 data-[hidden=true]:opacity-0 lg:inline-flex"
        >
          <span
            data-dn-scroll-hint-line
            className="inline-block h-px w-7 bg-current"
          />
          <span>{t("scrollHint")}</span>
        </div>
        <Scrubber visible={revealStage >= 2} suppressed={torrentVisible} />
        {/* Bottom action island — mounts at stage 2 so the m.div spring
          entrance fires exactly when chrome should appear. */}
        {revealStage >= 2 && (
          <>
            <ViewToggle value={view} onChange={setView} />
            <QuickActions
              audioEnabled={audioEnabled}
              onAudioToggle={() => setAudioEnabled((enabled) => !enabled)}
              rsvpState={rsvpState}
              isSignedIn={isSignedIn}
            />
          </>
        )}
        {/* Local audio score — owns daytime.ogg only. Fades out across
          the photo-torrent window; once the cassette handoff fires,
          this goes silent and HideawayFM picks up the night. See
          DayNNightScore.tsx. */}
        {phase === "playing" && <DayNNightScore enabled={audioEnabled} />}
        {phase === "playing" && <DayNNightCursorTone />}
        {/* Local YM.FM controller for Track_1. It can auto-enter after
          the liminal handoff or start immediately from the YM.FM
          caption button, always fading in/out from silence. */}
        <LiminalRadioController enabled={audioEnabled} />
        {/* Liminal → Nighttime handoff captions. Fires liminalHandoffFired
          at progress ≥ 0.55, which LiminalRadioController uses to start
          HideawayFM after its delay window. HTML-only — no 3D. */}
        <LiminalHandoff suppress={torrentVisible} />
        {/* Act III friends window: previous-event photo torrent.
          Both gated on the act's scroll window via useActWindowActive,
          mounted here at the ImmersiveView root (NOT inside Timeline's
          pinned track) so fixed positioning works while Act III is on screen.
          The YM.FM feature now owns the next visual act rather than
          interrupting the friends window. */}
        <FriendsTorrent
          photos={friendsPhotos}
          title={mainT("friends.eyebrow")}
          caption={mainT("friends.caption")}
          active={torrentVisible}
          className="fixed z-[40]"
        />
        {/* Single Details drawer instance — driven by DetailsContext so
          QuickActions and OpeningCard share one drawer. */}
        <DetailsDrawer
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          isSignedIn={isSignedIn}
        />
        {/* SeamBridge overlay removed 2026-05-21. The bookend fade at
          the loop's wrap is now handled solely by Timeline's
          `bookendFade` (driven by `useStickyZone`) so the two
          "Day n Night" titles never overlap, but no separate chrome
          element transitions across the seam. The wrap reads as a
          quiet beat between night and the next dawn. */}
        {phase !== "playing" ? (
          <SunLoader
            onEnter={(withAudio) => setAudioEnabled(withAudio)}
            onSummary={() => setDetailsOpen(true)}
          />
        ) : null}
      </div>
    </DetailsContext>
  );
}
