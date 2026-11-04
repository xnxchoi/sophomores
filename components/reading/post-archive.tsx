import type { PostCard } from "@/lib/content/slots";

/** Full-width content cards. Columns follow the reading grid, not a prose column. */
export function PostArchive({ posts }: { posts: PostCard[] }) {
  return (
    <section className="w-full py-7">
      <div className="mx-auto px-5 sm:px-6 xl:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <article key={post.id} className="port-rule overflow-hidden rounded-lg border bg-off-bg">
              <a href={post.href} className="block">
                <div className="port-wash aspect-video" />
                <div className="flex flex-col gap-2 p-3.5 xl:p-4">
                  <h3 className="text-base leading-snug font-medium tracking-tight xl:text-lg">{post.title}</h3>
                  {post.dek ? <p className="port-copy text-base leading-relaxed">{post.dek}</p> : null}
                  <p className="port-meta font-sans text-xs uppercase tracking-[0.18em]">{post.authorName}</p>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
