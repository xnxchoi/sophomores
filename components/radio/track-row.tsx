import type { Track } from "@/lib/content/slots";

export function TrackRow({ track }: { track: Track }) {
  return (
    <article className="flex items-baseline justify-between gap-6 rounded-lg border border-faded-white/12 bg-faded-black px-5 py-4">
      <div>
        <h2 className="font-serif text-2xl font-light tracking-tight">{track.title}</h2>
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-faded-l-gray">{track.artist}</p>
      </div>
      <p className="text-xs tabular-nums text-white/55">{track.duration}s</p>
    </article>
  );
}
