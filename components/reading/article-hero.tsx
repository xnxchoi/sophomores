import type { PostCard } from "@/lib/content/slots";
import { cn } from "@/lib/utils";

function MediaWell({ ratio }: { ratio: "video" | "square" }) {
  return (
    <div
      className={
        ratio === "video"
          ? "port-wash relative aspect-video w-full overflow-hidden rounded-lg"
          : "port-wash relative aspect-square overflow-hidden rounded-md"
      }
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[8%] bg-linear-to-t from-off-black to-transparent" />
    </div>
  );
}

function Lead({ post, span }: { post: PostCard; span: "with-rail" | "solo" }) {
  return (
    <article
      className={cn(
        "group relative flex flex-col bg-off-black",
        span === "with-rail" ? "md:col-span-2 lg:col-span-4" : "md:col-span-2 lg:col-span-6"
      )}
    >
      <a href={post.href} className="absolute inset-0 z-10" aria-label={post.title} />
      <MediaWell ratio="video" />
      <div className="flex flex-col gap-3 p-5 xl:p-6">
        {post.tags[0] ? (
          <span className="port-chip w-fit rounded-md px-1.5 py-1 font-sans text-xs uppercase tracking-[0.18em]">{post.tags[0]}</span>
        ) : null}
        <span className="font-serif text-4xl leading-[1.05] font-light tracking-tight text-balance">
          {post.title}
        </span>
        {post.dek ? <span className="port-copy max-w-[60ch] text-base leading-snug">{post.dek}</span> : null}
        <p className="port-meta mt-1 font-sans text-xs uppercase tracking-[0.18em]">
          {post.authorName}
          {post.publishedAt ? ` · ${post.publishedAt}` : ""}
        </p>
      </div>
    </article>
  );
}

function Secondary({ post, span }: { post: PostCard; span: "with-rail" | "solo" }) {
  return (
    <article
      className={cn(
        "group relative grid grid-cols-[96px_1fr] gap-x-4 bg-off-black p-4 sm:grid-cols-[120px_1fr] sm:gap-x-5 sm:p-5",
        span === "with-rail" ? "lg:col-span-2" : "lg:col-span-3"
      )}
    >
      <a href={post.href} className="absolute inset-0 z-10" aria-label={post.title} />
      <MediaWell ratio="square" />
      <div className="flex flex-col justify-center gap-2">
        {post.tags[0] ? (
          <span className="port-chip w-fit rounded-md px-1.5 py-1 font-sans text-xs uppercase tracking-[0.18em]">{post.tags[0]}</span>
        ) : null}
        <span className="text-base leading-snug font-medium tracking-tight xl:text-lg">{post.title}</span>
        <p className="port-meta font-sans text-xs uppercase tracking-[0.18em]">{post.authorName}</p>
      </div>
    </article>
  );
}

function Headliners({ posts }: { posts: PostCard[] }) {
  return (
    <aside
      aria-label="Headliners"
      className="flex flex-col bg-off-black md:col-span-2 lg:col-span-2 lg:col-start-5 lg:row-span-2 lg:row-start-1"
    >
      <header className="port-row px-5 py-3">
        <span className="port-meta font-sans text-xs uppercase tracking-[0.18em]">Headliners</span>
      </header>
      <ol className="flex flex-1 flex-col">
        {posts.map((post, index) => (
          <li key={post.id} className={index > 0 ? "port-row relative flex flex-1 flex-col px-5 py-4" : "relative flex flex-1 flex-col px-5 py-4"}>
            <a href={post.href} className="absolute inset-0 z-10" aria-label={post.title} />
            <div className="flex items-baseline gap-x-2.5">
              <span className="port-meta font-sans text-xs tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <span className="block flex-1 text-base leading-snug font-medium tracking-tight xl:text-lg">{post.title}</span>
            </div>
            <p className="port-meta mt-1.5 pl-[calc(2.5ch+0.625rem)] font-sans text-xs uppercase tracking-[0.18em]">
              {post.authorName}
            </p>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/** Hideaway article grid: lead, two secondaries under it, rail down the right. */
export function ArticleHero({ posts }: { posts: PostCard[] }) {
  if (posts.length === 0) return null;
  const [lead, secondaryA, secondaryB, ...rest] = posts;
  const headliners = rest.slice(0, 5);
  const span = headliners.length > 0 ? "with-rail" : "solo";

  return (
    <section className="relative w-full py-7 xl:py-8">
      <div className="mx-auto px-5 sm:px-6 xl:px-10">
        <div className="port-seam grid grid-cols-1 gap-px overflow-hidden rounded-3xl border md:grid-cols-2 lg:grid-cols-6">
          <Lead post={lead} span={span} />
          {secondaryA ? <Secondary post={secondaryA} span={span} /> : null}
          {secondaryB ? <Secondary post={secondaryB} span={span} /> : null}
          {headliners.length > 0 ? <Headliners posts={headliners} /> : null}
        </div>
      </div>
    </section>
  );
}
