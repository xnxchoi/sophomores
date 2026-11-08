import { Link } from "@/hideaway/components/core/Link/Link";
import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { PlaceHolderImage } from "@/hideaway/components/core/Media/Image/PlaceHolderImage";
import { cn } from "@/lib/utils";
import { PostOverview } from "@/types/collections/posts";
import { RP_BadgeTag } from "@/hideaway/components/UX/RP_BadgeTag";
import { RelativeTime } from "@/hideaway/components/sections/FeaturedHero/RelativeTime";
import { getLocale } from "next-intl/server";

type FeaturedHeroProps = {
  article: PostOverview;
  /** Lead-position flag. Triggers `loading="eager"` + `fetchPriority="high"`. */
  eager?: boolean;
  className?: string;
};

export const FeaturedHero = async ({
  article,
  eager = false,
  className
}: FeaturedHeroProps) => {
  const locale = await getLocale();
  const category =
    typeof article.category === "object" && article.category?.title
      ? article.category.title
      : null;
  const subtitle = article.subtitle?.trim();
  const authorName = article.author?.name?.trim();

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col bg-card",
        "transition-colors duration-150 ease-in-out",
        className
      )}
    >
      <Link
        href={`/essays/${article.slug}`}
        className="absolute inset-0 z-10"
        aria-label={article.title}
      />

      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted/20">
        {article.image ? (
          <FrontImage
            resource={article.image}
            aspectRatio={16 / 9}
            loading={eager ? "eager" : "lazy"}
            priority={eager}
            imgClassName="absolute inset-0 block h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.02]"
          />
        ) : (
          <PlaceHolderImage className="absolute inset-0 h-full w-full" />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[8%] bg-linear-to-t from-card to-transparent"
        />
      </div>

      <div className="flex flex-col gap-y-3 p-5 xl:gap-y-4 xl:p-6">
        {category && (
          <RP_BadgeTag
            content={category}
            className="border-foreground text-faded-foreground"
          />
        )}

        <span className="block font-serif text-6xl leading-[1.05] font-light tracking-tight text-balance [overflow-wrap:anywhere] sm:text-4xl md:text-5xl xl:text-6xl">
          {article.title}
        </span>

        {subtitle && (
          <span className="block max-w-[60ch] font-sans text-base leading-snug text-pretty [overflow-wrap:anywhere] text-foreground/70 sm:text-lg lg:text-xl">
            {subtitle}
          </span>
        )}

        <div className="mt-1 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-[11px]">
          {authorName ? `By ${authorName}` : "Hideaway"}
          {article.publishedAt && (
            <>
              <span aria-hidden className="mx-2">
                ·
              </span>
              <RelativeTime isoTime={article.publishedAt} locale={locale} />
            </>
          )}
        </div>
      </div>
    </article>
  );
};
