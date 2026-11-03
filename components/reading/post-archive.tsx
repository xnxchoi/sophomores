import type { PostCard } from "@/lib/content/slots";

/** List grid for posts. The Hideaway archive shell rendered an empty cell. */
export function PostArchive({ posts }: { posts: PostCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <article
          key={post.id}
          className="port-rule overflow-hidden rounded-lg border bg-faded-black"
        >
          <a href={post.href} className="block p-4">
            <h3 className="font-serif text-2xl font-light leading-snug tracking-tight">{post.title}</h3>
            {post.dek ? (
              <p className="mt-2 text-base leading-relaxed text-white/70">{post.dek}</p>
            ) : null}
          </a>
        </article>
      ))}
    </div>
  );
}
