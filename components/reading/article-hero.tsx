import type { PostCard } from "@/lib/content/slots";

function HeroFace({
  post,
  lead = false
}: {
  post: PostCard;
  lead?: boolean;
}) {
  return (
    <article className="group relative flex flex-col bg-card">
      <a href={post.href} className="absolute inset-0 z-10" aria-label={post.title} />
      <div
        className={
          lead
            ? "relative aspect-video overflow-hidden rounded-lg bg-muted/20"
            : "relative aspect-square overflow-hidden rounded-md bg-muted/20"
        }
      />
      <div className={lead ? "flex flex-col gap-3 p-5" : "flex flex-col gap-2 p-4"}>
        {post.tags[0] ? (
          <span className="w-fit rounded-md border border-foreground/40 px-1.5 py-1 text-base">
            {post.tags[0]}
          </span>
        ) : null}
        <span
          className={
            lead
              ? "font-serif text-6xl leading-[1.05] font-light tracking-tight"
              : "text-base font-medium leading-snug tracking-tight"
          }
        >
          {post.title}
        </span>
        {lead && post.dek ? (
          <span className="max-w-[60ch] text-base leading-snug text-foreground/70">
            {post.dek}
          </span>
        ) : null}
        <p className="text-base uppercase tracking-[0.2em] text-foreground/60">
          {post.authorName}
          {post.publishedAt ? ` · ${post.publishedAt}` : ""}
        </p>
      </div>
    </article>
  );
}

/** Hideaway article grid. Metadata that was 10px there is 1rem here. */
export function ArticleHero({ posts }: { posts: PostCard[] }) {
  if (posts.length === 0) return null;
  const [lead, secondaryA, secondaryB, ...rest] = posts;
  const headliners = rest.slice(0, 5);

  return (
    <section className="relative w-full py-7">
      <div className="mx-auto px-6">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border/20 bg-border/20 md:grid-cols-2">
          <HeroFace post={lead} lead />
          {secondaryA ? <HeroFace post={secondaryA} /> : null}
          {secondaryB ? <HeroFace post={secondaryB} /> : null}
          {headliners.length > 0 ? (
            <ul className="flex flex-col bg-card">
              {headliners.map((post) => (
                <li key={post.id} className="border-b border-border/20 px-4 py-3">
                  <a href={post.href} className="text-base font-medium">
                    {post.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
