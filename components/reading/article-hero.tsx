import type { PostCard } from "@/lib/content/slots";


function MediaWell({ ratio }: { ratio: "video" | "square" }) {
  return (
    <div
      className={
        ratio === "video"
          ? "port-wash relative aspect-video overflow-hidden rounded-lg bg-faded-black"
          : "port-wash relative aspect-square overflow-hidden rounded-md bg-faded-black"
      }
    >
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(28%_0.01_59),transparent_55%)]" />
    </div>
  );
}

function Lead({ post }: { post: PostCard }) {
  return (
    <article className="group relative flex flex-col bg-off-black md:col-span-2 lg:col-span-4">
      <a href={post.href} className="absolute inset-0 z-10" aria-label={post.title} />
      <MediaWell ratio="video" />
      <div className="flex flex-col gap-3 p-5 xl:p-6">
        {post.tags[0] ? (
          <span className="w-fit rounded-md border border-faded-white/40 px-1.5 py-1 font-sans text-xs uppercase tracking-[0.18em] text-faded-l-gray">{post.tags[0]}</span>
        ) : null}
        <span className="font-serif text-4xl leading-[1.05] font-light tracking-tight text-balance">
          {post.title}
        </span>
        {post.dek ? <span className="max-w-[60ch] text-base leading-snug text-white/70">{post.dek}</span> : null}
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-faded-l-gray">
          {post.authorName}
          {post.publishedAt ? ` · ${post.publishedAt}` : ""}
        </p>
      </div>
    </article>
  );
}

function Secondary({ post }: { post: PostCard }) {
  return (
    <article className="group relative grid grid-cols-[96px_1fr] gap-4 bg-off-black p-4 sm:grid-cols-[120px_1fr] sm:p-5">
      <a href={post.href} className="absolute inset-0 z-10" aria-label={post.title} />
      <MediaWell ratio="square" />
      <div className="flex flex-col justify-center gap-2">
        <span className="text-base leading-snug font-medium tracking-tight">{post.title}</span>
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-faded-l-gray">{post.authorName}</p>
      </div>
    </article>
  );
}

/** Hideaway article grid. The lead title is the 37.5px size, not a 60px slab. */
export function ArticleHero({ posts }: { posts: PostCard[] }) {
  if (posts.length === 0) return null;
  const [lead, secondaryA, secondaryB, ...rest] = posts;
  const headliners = rest.slice(0, 5);

  return (
    <section className="relative w-full py-7">
      <div className="mx-auto px-6 xl:px-10">
        <div className="port-rule grid grid-cols-1 gap-px overflow-hidden rounded-3xl border bg-faded-white/10 md:grid-cols-2 lg:grid-cols-6">
          <Lead post={lead} />
          {secondaryA ? <Secondary post={secondaryA} /> : null}
          {secondaryB ? <Secondary post={secondaryB} /> : null}
          {headliners.length > 0 ? (
            <ul className="flex flex-col bg-off-black md:col-span-2 lg:col-span-2">
              {headliners.map((post) => (
                <li key={post.id} className="border-b border-faded-white/12 px-4 py-3">
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
