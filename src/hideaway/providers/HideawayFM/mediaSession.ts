/**
 * Thin wrapper around the browser Media Session API. The OS-level "now
 * playing" surface (macOS Control Center, iOS lock screen, Android
 * notification, hardware keys) reads from `navigator.mediaSession`. This
 * module centralises metadata assignment and action-handler wiring so the
 * provider never touches the raw API directly.
 *
 * The HideawayFM surface is radio-style: only play/pause is exposed at the
 * OS level regardless of the viewer's role. Seek, skip, and previous are
 * *explicitly* nulled because Firefox and some Android shells surface every
 * action the page has ever registered — setting them to `null` is the only
 * way to hide them from the OS control surface.
 *
 * Every function guards `typeof navigator` so the module is safe to import
 * from code that may run in the Next.js RSC tree or a Node test runner.
 */

import type { RP_Track } from "./types";

const ARTWORK_SIZES = [96, 256, 512] as const;

const DISALLOWED_ACTIONS = [
  "seekbackward",
  "seekforward",
  "seekto",
  "previoustrack",
  "nexttrack",
  "stop"
] as const satisfies readonly MediaSessionAction[];

const ALL_ACTIONS = [
  "play",
  "pause",
  ...DISALLOWED_ACTIONS
] as const satisfies readonly MediaSessionAction[];

export const hasMediaSession = (): boolean =>
  typeof navigator !== "undefined" && "mediaSession" in navigator;

const sniffMimeType = (url: string): string => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  const ext = match?.[1]?.toLowerCase();
  switch (ext) {
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "avif":
      return "image/avif";
    case "svg":
      return "image/svg+xml";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
};

const buildArtwork = (cover: RP_Track["cover"]): MediaImage[] => {
  if (!cover) return [];
  const type = sniffMimeType(cover);
  return ARTWORK_SIZES.map((size) => ({
    src: `${cover}?w=${size}`,
    sizes: `${size}x${size}`,
    type
  }));
};

export function setNowPlayingMetadata(track: RP_Track): void {
  if (!hasMediaSession()) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || "The Hideaway",
    album: track.album || "",
    artwork: buildArtwork(track.cover)
  });
}

export interface MediaSessionHandlers {
  play: () => void;
  pause: () => void;
}

export function wireActionHandlers(handlers: MediaSessionHandlers): void {
  if (!hasMediaSession()) return;

  navigator.mediaSession.setActionHandler("play", handlers.play);
  navigator.mediaSession.setActionHandler("pause", handlers.pause);

  for (const action of DISALLOWED_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      // Some browsers throw `NotSupportedError` for unknown actions (e.g.
      // older WebKit on `seekto`). Silently ignore — the action was never
      // going to surface anyway.
    }
  }
}

export function clearActionHandlers(): void {
  if (!hasMediaSession()) return;

  for (const action of ALL_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      // See wireActionHandlers — silently ignore unsupported actions.
    }
  }

  navigator.mediaSession.metadata = null;
}
