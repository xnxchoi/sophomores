"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { sliceBody, type TextPart } from "@/lib/content/highlight";
import type { HighlightRange } from "@/lib/content/slots";
import { Button } from "@/components/core/ArcFocus/ArcFocus";

export function Reader({
  body,
  highlights,
  onHighlight
}: {
  body: string;
  highlights: HighlightRange[];
  onHighlight: (range: HighlightRange) => void;
}) {
  const t = useTranslations('Customer.components_reading_reader');
  const articleRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<{ quote: string; start: number; end: number } | null>(
    null
  );
  const [lastHighlightId, setLastHighlightId] = useState<string | null>(null);
  const parts = hideOuterBlankLines(sliceBody(body, highlights), body);
  const alreadyHighlighted = draft !== null && highlights.some(
    (range) => range.start === draft.start && range.end === draft.end
  );

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const onSelection = () => {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || range.collapsed || !article.contains(range.startContainer) || !article.contains(range.endContainer)) {
        setDraft(null);
        return;
      }
      const selected = range.toString();
      const quote = selected.trim();
      const prefix = range.cloneRange();
      prefix.selectNodeContents(article);
      prefix.setEnd(range.startContainer, range.startOffset);
      const start = prefix.toString().length + (selected.length - selected.trimStart().length);
      const end = start + quote.length;
      setDraft(quote && body.slice(start, end) === quote ? { quote, start, end } : null);
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [body]);

  return (
    <div className="relative">
      <article ref={articleRef} tabIndex={0} className="font-serif text-xl leading-relaxed font-light whitespace-pre-line">
        {parts.map((part, index) =>
          part.id ? (
            <mark key={part.id} className="port-mark bg-[oklch(from_var(--port-shade)_l_c_h_/_0.15)] text-inherit">
              {part.text}
            </mark>
          ) : (
            <span key={`plain-${index}`} hidden={part.hidden}>{part.text}</span>
          )
        )}
      </article>
      <div className="mt-4 flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="secondary"
          aria-disabled={!draft || alreadyHighlighted}
          onMouseDown={(event) => {
            if (draft) event.preventDefault();
          }}
          onClick={(event) => {
            if (!draft || alreadyHighlighted) return;
            const id = `local-${draft.start}-${draft.end}`;
            onHighlight({
              id,
              postId: "",
              ...draft,
              note: "",
              authorLabel: ""
            });
            event.currentTarget.focus({ preventScroll: true });
            setDraft(null);
            setLastHighlightId(id);
            window.getSelection()?.removeAllRanges();
          }}
        >
          {t("highlightSelection")}
        </Button>
        <p role="status" aria-atomic="true" className="min-h-10 w-full text-sm leading-5 text-muted-foreground">
          {lastHighlightId && <span key={lastHighlightId}>{t("highlightApplied")}</span>}
        </p>
      </div>
    </div>
  );
}

/**
 * The body is shown with its own line breaks, so blank lines before or after the text would show as empty space.
 * They stay in the DOM as hidden text instead of being trimmed: stored citation offsets and the selection offsets
 * above are counted over the untrimmed body, and Range.toString() still counts hidden text.
 */
function hideOuterBlankLines(parts: TextPart[], body: string): (TextPart & { hidden?: boolean })[] {
  const visibleStart = body.length - body.trimStart().length;
  const visibleEnd = body.trimEnd().length;
  let offset = 0;
  return parts.flatMap((part) => {
    const start = offset;
    offset += part.text.length;
    if (part.id) return [part];
    const from = Math.min(Math.max(visibleStart - start, 0), part.text.length);
    const to = Math.max(Math.min(visibleEnd - start, part.text.length), from);
    return [
      { text: part.text.slice(0, from), hidden: true },
      { text: part.text.slice(from, to) },
      { text: part.text.slice(to), hidden: true }
    ].filter((piece) => piece.text.length > 0);
  });
}
