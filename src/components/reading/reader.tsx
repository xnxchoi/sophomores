"use client";
import { useTranslations } from "next-intl";


import { useEffect, useRef, useState } from "react";
import { rangeForQuote, sliceBody } from "@/lib/content/highlight";
import type { HighlightRange } from "@/lib/content/slots";

export function Reader({
  body,
  highlights,
  onSave
}: {
  body: string;
  highlights: HighlightRange[];
  onSave?: (range: HighlightRange) => void;
}) {
  const t = useTranslations('Customer.components_reading_reader');
  const articleRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<{ quote: string; start: number; end: number } | null>(
    null
  );
  const parts = sliceBody(body, highlights);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const onSelection = () => {
      const selection = window.getSelection();
      const quote = selection?.toString() ?? "";
      if (!selection || !article.contains(selection.anchorNode)) {
        setDraft(null);
        return;
      }
      const found = rangeForQuote(body, quote);
      setDraft(found && quote.trim() ? { quote: quote.trim(), ...found } : null);
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [body]);

  return (
    <div className="relative">
      <article ref={articleRef} tabIndex={0} className="font-serif text-xl leading-relaxed font-light">
        {parts.map((part, index) =>
          part.id ? (
            <mark key={part.id} className="port-mark bg-[oklch(from_var(--port-shade)_l_c_h_/_0.15)] text-inherit">
              {part.text}
            </mark>
          ) : (
            <span key={`plain-${index}`}>{part.text}</span>
          )
        )}
      </article>
      {draft ? (
        <button
          type="button"
          className="port-control border border-[oklch(from_var(--port-shade)_l_c_h_/_0.4)] bg-[oklch(from_var(--port-shade)_l_c_h_/_0.08)] text-[oklch(from_var(--port-shade)_l_c_h_/_0.9)] hover:border-[oklch(from_var(--port-shade)_l_c_h_/_0.7)] hover:bg-[oklch(from_var(--port-shade)_l_c_h_/_0.14)] disabled:opacity-40 mt-4 rounded-md px-3 py-2 text-xs uppercase tracking-[0.18em]"
          onClick={() => {
            onSave?.({
              id: `local-${draft.start}-${draft.end}`,
              postId: "",
              quote: draft.quote,
              start: draft.start,
              end: draft.end,
              note: "",
              authorLabel: ""
            });
            setDraft(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          {t('saveHighlight')}</button>
      ) : null}
    </div>
  );
}
