import { Link } from "@/components/core/Link/Link";
import type { PostCard } from "@/lib/content/slots";

/** Full-width content cards. Columns follow the reading grid, not a prose column. */
export function PostArchive({ posts }: { posts: PostCard[] }) {
  return (
    <section className="w-full py-7">
      <div className="mx-auto px-5 sm:px-6 xl:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <article key={post.id} className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] overflow-hidden rounded-lg border bg-off-bg">
              <Link href={post.href} className="block">
                <div className="port-wash bg-[var(--faded-bg)] bg-[radial-gradient(circle_at_30%_20%,oklch(from_var(--port-shade)_32%_c_h_/_0.85),transparent_55%),linear-gradient(165deg,oklch(from_var(--port-shade)_l_c_h_/_0.22)_0%,oklch(from_var(--port-shade)_l_c_h_/_0.08)_42%,oklch(from_var(--port-shade)_l_c_h_/_0)_100%)] aspect-video" />
                <div className="flex flex-col gap-2 p-3.5 xl:p-4">
                  <h3 className="text-base leading-snug font-medium tracking-tight xl:text-lg">{post.title}</h3>
                  {post.dek ? <p className="port-copy text-[oklch(from_var(--port-shade)_l_c_h_/_0.72)] text-base leading-relaxed">{post.dek}</p> : null}
                  <p className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)] font-sans text-xs uppercase tracking-[0.18em]">{post.authorName}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
