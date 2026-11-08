export type TextRange = {
  id: string;
  start: number;
  end: number;
};

export type TextPart = {
  text: string;
  id?: string;
};

/** Quote offsets inside a body. Returns null when the quote is not present. */
export function rangeForQuote(body: string, quote: string): { start: number; end: number } | null {
  const trimmed = quote.trim();
  if (!trimmed) return null;
  const start = body.indexOf(trimmed);
  if (start < 0) return null;
  return { start, end: start + trimmed.length };
}

/** Splits a body around ranges. Overlaps keep the earlier range. */
export function sliceBody(body: string, ranges: TextRange[]): TextPart[] {
  const sorted = ranges
    .filter((range) => range.end > range.start && range.start < body.length && range.end > 0)
    .map((range) => ({
      id: range.id,
      start: Math.max(0, range.start),
      end: Math.min(body.length, range.end)
    }))
    .sort((left, right) => left.start - right.start);

  const parts: TextPart[] = [];
  let cursor = 0;
  for (const range of sorted) {
    const start = Math.max(range.start, cursor);
    const end = range.end;
    if (start > cursor) parts.push({ text: body.slice(cursor, start) });
    if (end > start) parts.push({ text: body.slice(start, end), id: range.id });
    cursor = Math.max(cursor, end);
  }
  if (cursor < body.length) parts.push({ text: body.slice(cursor) });
  return parts;
}
