import { Link } from "@/components/core/Link/Link";
import type { PostCard } from "@/lib/content/slots";

export function PostCardView({ post }: { post: PostCard }) {
  return (
    <article className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] border px-6 py-8">
      <Link href={post.href} className="block">
        <p className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)] text-xs uppercase tracking-[0.2em]">
          {post.authorName}
        </p>
        <h2 className="mt-3 font-serif text-4xl font-light tracking-tight">{post.title}</h2>
        <p className="port-copy text-[oklch(from_var(--port-shade)_l_c_h_/_0.72)] mt-3 max-w-xl text-base leading-relaxed">
          {post.dek}
        </p>
        {post.tags.length > 0 ? (
          <p className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)] mt-4 text-xs">{post.tags.join(" · ")}</p>
        ) : null}
      </Link>
    </article>
  );
}
