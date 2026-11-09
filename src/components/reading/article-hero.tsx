import { Link } from "@/components/core/Link/Link";
import { RP_BadgeTag } from "@/components/UX/RP_BadgeTag";
import type { PostCard } from "@/lib/content/slots";
import { cn } from "@/lib/utils";
import Image from "next/image";

function MediaWell({ ratio, src }: { ratio: "video" | "square"; src: string }) {
  return (
    <div
      className={
        ratio === "video"
          ? "port-wash relative aspect-video w-full overflow-hidden rounded-lg bg-faded-bg bg-[radial-gradient(circle_at_30%_20%,oklch(from_var(--port-shade)_32%_c_h/0.85),transparent_55%),linear-gradient(165deg,oklch(from_var(--port-shade)_l_c_h/0.22)_0%,oklch(from_var(--port-shade)_l_c_h/0.08)_42%,oklch(from_var(--port-shade)_l_c_h/0)_100%)]"
          : "port-wash relative aspect-square overflow-hidden rounded-md bg-faded-bg bg-[radial-gradient(circle_at_30%_20%,oklch(from_var(--port-shade)_32%_c_h/0.85),transparent_55%),linear-gradient(165deg,oklch(from_var(--port-shade)_l_c_h/0.22)_0%,oklch(from_var(--port-shade)_l_c_h/0.08)_42%,oklch(from_var(--port-shade)_l_c_h/0)_100%)] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.02]"
      }
    >
      {src ? (
        <Image
          src={src}
          alt=""
          unoptimized
          fill
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover"
        />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[8%] bg-linear-to-t from-off-bg to-transparent"
      />
    </div>
  );
}

function Lead({ post, span }: { post: PostCard; span: "with-rail" | "solo" }) {
  return (
    <article
      className={cn(
        "group relative flex flex-col bg-off-bg",
        span === "with-rail"
          ? "md:col-span-2 lg:col-span-4"
          : "md:col-span-2 lg:col-span-6"
      )}
    >
      <Link
        href={post.href}
        className="absolute inset-0 z-10"
        aria-label={post.title}
      />
      <MediaWell ratio="video" src={post.heroUrl} />
      <div className="flex flex-col gap-3 p-5 xl:p-6">
        {post.tags[0] ? (
          <RP_BadgeTag
            content={post.tags[0]}
            className="border-foreground/40 px-1.5 py-1 text-faded-fg"
          />
        ) : null}
        <span className="font-serif text-4xl leading-[1.05] font-light tracking-tight text-balance">
          {post.title}
        </span>
        {post.dek ? (
          <span className="port-copy max-w-[60ch] text-base leading-snug text-[oklch(from_var(--port-shade)_l_c_h/0.72)]">
            {post.dek}
          </span>
        ) : null}
        <p className="port-meta mt-1 font-sans text-xs tracking-[0.18em] text-[oklch(from_var(--port-shade)_l_c_h/0.55)] uppercase">
          {post.authorName}
          {post.publishedAt ? ` · ${post.publishedAt}` : ""}
        </p>
      </div>
    </article>
  );
}

function Secondary({
  post,
  span
}: {
  post: PostCard;
  span: "with-rail" | "solo";
}) {
  return (
    <article
      className={cn(
        "group relative grid grid-cols-[96px_1fr] gap-x-4 bg-off-bg p-4 sm:grid-cols-[120px_1fr] sm:gap-x-5 sm:p-5",
        span === "with-rail" ? "lg:col-span-2" : "lg:col-span-3"
      )}
    >
      <Link
        href={post.href}
        className="absolute inset-0 z-10"
        aria-label={post.title}
      />
      <MediaWell ratio="square" src={post.heroUrl} />
      <div className="flex flex-col justify-center gap-2">
        {post.tags[0] ? (
          <RP_BadgeTag
            content={post.tags[0]}
            className="border-foreground/40 px-1.5 py-1 text-faded-fg"
          />
        ) : null}
        <span className="text-base leading-snug font-medium tracking-tight xl:text-lg">
          {post.title}
        </span>
        <p className="port-meta font-sans text-xs tracking-[0.18em] text-[oklch(from_var(--port-shade)_l_c_h/0.55)] uppercase">
          {post.authorName}
        </p>
      </div>
    </article>
  );
}

function Headliners({ posts }: { posts: PostCard[] }) {
  return (
    <aside
      aria-label="Headliners"
      className="flex flex-col bg-off-bg md:col-span-2 lg:col-span-2 lg:col-start-5 lg:row-span-2 lg:row-start-1"
    >
      <header className="port-row border-b border-[oklch(from_var(--port-shade)_l_c_h/0.12)] px-5 py-3">
        <span className="port-meta font-sans text-xs tracking-[0.18em] text-[oklch(from_var(--port-shade)_l_c_h/0.55)] uppercase">
          Headliners
        </span>
      </header>
      <ol className="flex flex-1 flex-col">
        {posts.map((post, index) => (
          <li
            key={post.id}
            className={
              index > 0
                ? "port-row relative flex flex-1 flex-col border-b border-[oklch(from_var(--port-shade)_l_c_h/0.12)] px-5 py-4"
                : "relative flex flex-1 flex-col px-5 py-4"
            }
          >
            <Link
              href={post.href}
              className="absolute inset-0 z-10"
              aria-label={post.title}
            />
            <div className="flex items-baseline gap-x-2.5">
              <span className="port-meta font-sans text-xs text-[oklch(from_var(--port-shade)_l_c_h/0.55)] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="block flex-1 text-base leading-snug font-medium tracking-tight xl:text-lg">
                {post.title}
              </span>
            </div>
            <p className="port-meta mt-1.5 pl-[calc(2.5ch+0.625rem)] font-sans text-xs tracking-[0.18em] text-[oklch(from_var(--port-shade)_l_c_h/0.55)] uppercase">
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
        <div className="port-seam grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-[oklch(from_var(--port-shade)_l_c_h/0.16)] bg-[oklch(from_var(--port-shade)_l_c_h/0.1)] md:grid-cols-2 lg:grid-cols-6">
          <Lead post={lead} span={span} />
          {secondaryA ? <Secondary post={secondaryA} span={span} /> : null}
          {secondaryB ? <Secondary post={secondaryB} span={span} /> : null}
          {headliners.length > 0 ? <Headliners posts={headliners} /> : null}
        </div>
      </div>
    </section>
  );
}
