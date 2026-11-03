import type { PostCard } from "@/lib/content/slots";

export function PostCardView({ post }: { post: PostCard }) {
  return (
    <article className="port-rule border px-6 py-8">
      <a href={post.href} className="block">
        <p className="port-meta text-xs uppercase tracking-[0.2em]">
          {post.authorName}
        </p>
        <h2 className="mt-3 font-serif text-4xl font-light tracking-tight">{post.title}</h2>
        <p className="port-copy mt-3 max-w-xl text-base leading-relaxed">
          {post.dek}
        </p>
        {post.tags.length > 0 ? (
          <p className="port-meta mt-4 text-xs">{post.tags.join(" · ")}</p>
        ) : null}
      </a>
    </article>
  );
}
