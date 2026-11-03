import type { PostCard } from "@/lib/content/slots";

export function PostCardView({ post }: { post: PostCard }) {
  return (
    <article className="border border-border px-6 py-8">
      <a href={post.href} className="block">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">
          {post.authorName}
        </p>
        <h2 className="mt-3 text-3xl font-light tracking-tight">{post.title}</h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-foreground/70">
          {post.dek}
        </p>
        {post.tags.length > 0 ? (
          <p className="mt-4 text-xs text-foreground/60">{post.tags.join(" · ")}</p>
        ) : null}
      </a>
    </article>
  );
}
