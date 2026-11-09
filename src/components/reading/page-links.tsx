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
      <button type="button" disabled={previous === null} onClick={() => previous && onPage?.(previous)} className="port-control border border-[oklch(from_var(--port-shade)_l_c_h_/_0.4)] bg-[oklch(from_var(--port-shade)_l_c_h_/_0.08)] text-[oklch(from_var(--port-shade)_l_c_h_/_0.9)] hover:border-[oklch(from_var(--port-shade)_l_c_h_/_0.7)] hover:bg-[oklch(from_var(--port-shade)_l_c_h_/_0.14)] disabled:opacity-40 rounded-md px-3 py-2">
        Previous
      </button>
      <span>
        {page} / {totalPages}
      </span>
      <button type="button" disabled={next === null} onClick={() => next && onPage?.(next)} className="port-control border border-[oklch(from_var(--port-shade)_l_c_h_/_0.4)] bg-[oklch(from_var(--port-shade)_l_c_h_/_0.08)] text-[oklch(from_var(--port-shade)_l_c_h_/_0.9)] hover:border-[oklch(from_var(--port-shade)_l_c_h_/_0.7)] hover:bg-[oklch(from_var(--port-shade)_l_c_h_/_0.14)] disabled:opacity-40 rounded-md px-3 py-2">
        Next
      </button>
    </nav>
  );
}
