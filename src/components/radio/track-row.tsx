import type { Track } from "@/lib/content/slots";

export function TrackRow({ track }: { track: Track }) {
  return (
    <article className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] flex items-baseline justify-between gap-6 rounded-lg border bg-faded-bg px-5 py-4">
      <div>
        <h2 className="font-serif text-2xl font-light tracking-tight">{track.title}</h2>
        <p className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)] font-sans text-xs uppercase tracking-[0.18em]">{track.artist}</p>
      </div>
      <p className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)] text-xs tabular-nums">{track.duration}s</p>
    </article>
  );
}
