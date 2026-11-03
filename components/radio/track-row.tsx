import type { Track } from "@/lib/content/slots";

export function TrackRow({ track }: { track: Track }) {
  return (
    <article className="flex items-baseline justify-between gap-6 border border-border px-6 py-4">
      <div>
        <h2 className="text-base font-medium tracking-tight">{track.title}</h2>
        <p className="text-sm text-foreground/70">{track.artist}</p>
      </div>
      <p className="text-xs tabular-nums text-foreground/60">{track.duration}s</p>
    </article>
  );
}
