import type { AmbientAudioAnchorBlock, Track } from "@/payload-types";
import type { JSX } from "react";

export interface AnchorTrackRef {
  trackId: string;
  title?: string;
  artist?: string;
  cover?: string | null;
  duration?: number;
  url?: string;
}

interface AnchorMarkerProps {
  kind: "start" | "end";
  groupId: string;
  source: AmbientAudioAnchorBlock["source"] | null | undefined;
}

function resolveCoverUrl(track: Track): string | null {
  const album = track.album;
  if (!album || typeof album !== "object") return null;
  const cover = album.cover;
  if (!cover || typeof cover !== "object") return null;
  return cover.url ?? cover.sizes?.thumb?.url ?? null;
}

function toAnchorTrackRef(track: Track): AnchorTrackRef {
  const staticUrl = track.filename
    ? `/track_media/${encodeURIComponent(track.filename)}`
    : (track.url ?? undefined);
  return {
    trackId: String(track.id),
    title: track.title ?? undefined,
    artist: track.artist ?? undefined,
    cover: resolveCoverUrl(track),
    duration: track.duration ?? undefined,
    url: staticUrl
  };
}

/**
 * Invisible in-flow marker used by `AmbientAudioProvider` to locate anchors
 * via DOM query. Rendered by the Lexical JSX converter for both start and
 * end anchors. Currently only emits for the `internal` provider with a
 * populated Track (the runtime is audio-file-only today); other providers
 * and placeholder regions render nothing on the public frontend.
 */
export function AnchorMarkers({
  kind,
  groupId,
  source
}: AnchorMarkerProps): JSX.Element | null {
  if (!source || source.provider !== "internal") return null;
  const track = source.track;
  if (!track || typeof track !== "object") return null;
  const ref = toAnchorTrackRef(track);
  if (!ref.trackId) return null;

  return (
    <span
      data-ambient-anchor={kind}
      data-ambient-group={groupId}
      data-ambient-track-id={ref.trackId}
      data-ambient-track={JSON.stringify(ref)}
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "1px",
        height: "1em",
        margin: 0,
        padding: 0,
        opacity: 0,
        pointerEvents: "none",
        verticalAlign: "baseline"
      }}
    >
      {"​"}
    </span>
  );
}
