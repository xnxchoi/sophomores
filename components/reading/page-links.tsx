export function PageLinks({
  page,
  totalPages,
  onPage
}: {
  page: number;
  totalPages: number;
  onPage?: (page: number) => void;
}) {
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav aria-label="Pages" className="flex items-center gap-3 text-xs uppercase tracking-[0.18em]">
      <button type="button" disabled={previous === null} onClick={() => previous && onPage?.(previous)} className="rounded-md border border-white/25 px-3 py-2 disabled:opacity-40">
        Previous
      </button>
      <span>
        {page} / {totalPages}
      </span>
      <button type="button" disabled={next === null} onClick={() => next && onPage?.(next)} className="rounded-md border border-white/25 px-3 py-2 disabled:opacity-40">
        Next
      </button>
    </nav>
  );
}
