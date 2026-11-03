"use client";

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
      <article ref={articleRef} tabIndex={0} className="text-base leading-relaxed">
        {parts.map((part, index) =>
          part.id ? (
            <mark key={part.id} className="bg-foreground/15">
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
          className="mt-4 border border-border px-3 py-2 text-base"
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
          Save highlight
        </button>
      ) : null}
    </div>
  );
}
