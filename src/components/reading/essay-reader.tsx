"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { Reader } from "@/components/reading/reader";
import type { HighlightRange, PostBody } from "@/lib/content/slots";

/** One essay with its bookmark and highlights. Both last until the page is left or reloaded. */
export function EssayReader({
  post,
  highlights,
  saved: initiallySaved
}: {
  post: PostBody;
  highlights: HighlightRange[];
  saved: boolean;
}) {
  const t = useTranslations("Customer.components_reading_stage");
  const [ranges, setRanges] = useState(() => highlights.filter((range) => range.postId === post.id));
  const [saved, setSaved] = useState(initiallySaved);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-4xl leading-[1.05] font-light tracking-tight text-balance">{post.title}</h1>
        {post.dek ? (
          <p className="port-copy max-w-[60ch] text-base leading-snug text-[oklch(from_var(--port-shade)_l_c_h/0.72)]">{post.dek}</p>
        ) : null}
        {post.authorName ? (
          <p className="port-meta font-sans text-xs tracking-[0.18em] text-[oklch(from_var(--port-shade)_l_c_h/0.55)] uppercase">{post.authorName}</p>
        ) : null}
      </header>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <BookmarkButton saved={saved} onToggle={() => setSaved((current) => !current)} />
        <p className="text-sm text-muted-foreground">{t("localReadingTools")}</p>
      </div>
      <Reader
        body={post.body}
        highlights={ranges}
        onHighlight={(range) => setRanges((current) => current.some(
          (item) => item.start === range.start && item.end === range.end
        ) ? current : [...current, { ...range, postId: post.id }])}
      />
    </article>
  );
}
