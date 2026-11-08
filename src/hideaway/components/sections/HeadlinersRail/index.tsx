import { Link } from "@/hideaway/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { PostOverview } from "@/types/collections/posts";
import { formatRelativeTime } from "@/hideaway/utilities/formatRelativeTime";

type HeadlinersRailProps = {
  items: PostOverview[];
  locale: string;
  className?: string;
};

const formatRank = (n: number) => String(n + 1).padStart(2, "0");

export const HeadlinersRail = ({
  items,
  locale,
  className
}: HeadlinersRailProps) => {
  if (!items.length) return null;

  return (
    <aside
      className={cn("flex flex-col bg-card", className)}
      aria-label="Headliners"
    >
      <header className="border-b border-border/30 px-5 py-3">
        <span className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">
          Headliners
        </span>
      </header>

      <ol className="flex flex-1 flex-col">
        {items.map((item, i) => {
          const authorName = item.author?.name?.trim();
          const relative = item.publishedAt
            ? formatRelativeTime(item.publishedAt, locale)
            : "";

          return (
            <li
              key={item.id}
              className={cn(
                "group relative flex flex-1 flex-col px-5 py-4",
                "transition-colors duration-150 ease-[cubic-bezier(.4,0,.2,1)]",
                i > 0 && "border-t border-border/30"
              )}
            >
              <Link
                href={`/essays/${item.slug}`}
                className="absolute inset-0 z-10"
                aria-label={item.title}
              />

              <div className="flex items-baseline gap-x-2.5">
                <span className="font-sans text-[10px] text-muted-foreground/40 tabular-nums">
                  {formatRank(i)}
                </span>
                <span className="block flex-1 text-base leading-snug font-medium tracking-tight text-balance [overflow-wrap:anywhere] text-foreground/70 transition-colors duration-150 group-hover:text-foreground xl:text-lg">
                  {item.title}
                </span>
              </div>

              {(authorName || relative) && (
                <div className="mt-1.5 pl-[calc(2.5ch+0.625rem)] font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-[11px]">
                  {authorName}
                  {authorName && relative && (
                    <span aria-hidden className="mx-2">
                      ·
                    </span>
                  )}
                  {relative && (
                    <time dateTime={item.publishedAt}>{relative}</time>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
};
