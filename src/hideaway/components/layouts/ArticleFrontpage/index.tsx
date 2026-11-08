import { Link } from "@/hideaway/components/core/Link/Link";
import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { PlaceHolderImage } from "@/hideaway/components/core/Media/Image/PlaceHolderImage";
import { FeaturedHero } from "@/hideaway/components/sections/FeaturedHero";
import { HeadlinersRail } from "@/hideaway/components/sections/HeadlinersRail";
import { cn } from "@/lib/utils";
import { PostOverview } from "@/types/collections/posts";
import { formatRelativeTime } from "@/hideaway/utilities/formatRelativeTime";
import { RP_BadgeTag } from "@/hideaway/components/UX/RP_BadgeTag";
import { getLocale } from "next-intl/server";

type ArticleHeroProps = {
  posts: PostOverview[];
  className?: string;
};

export const ArticleHero = async ({ posts, className }: ArticleHeroProps) => {
  const locale = await getLocale();
  if (!posts || posts.length === 0) return null;

  const lead = posts[0];
  const secondaryA = posts[1];
  const secondaryB = posts[2];
  const headliners = posts.slice(3, 8);
  const showRail = headliners.length > 0;

  return (
    <section
      className={cn("relative min-h-[85vh] w-full py-7 xl:py-8", className)}
    >
      <div className="mx-auto px-5 sm:px-6 xl:px-10">
        <div
          className={cn(
            "grid gap-px overflow-hidden rounded-3xl border border-border/20 bg-border/20",
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
          )}
        >
          <FeaturedHero
            article={lead}
            eager
            className={cn(
              "md:col-span-2",
              showRail ? "lg:col-span-4" : "lg:col-span-6"
            )}
          />

          {secondaryA && (
            <SecondaryArticleCard
              article={secondaryA}
              locale={locale}
              className={showRail ? "lg:col-span-2" : "lg:col-span-3"}
            />
          )}

          {secondaryB && (
            <SecondaryArticleCard
              article={secondaryB}
              locale={locale}
              className={showRail ? "lg:col-span-2" : "lg:col-span-3"}
            />
          )}

          {showRail && (
            <HeadlinersRail
              items={headliners}
              locale={locale}
              className="md:col-span-2 lg:col-span-2 lg:col-start-5 lg:row-span-2 lg:row-start-1"
            />
          )}
        </div>
      </div>
    </section>
  );
};

type SecondaryArticleCardProps = {
  article: PostOverview;
  locale: string;
  className?: string;
};

const SecondaryArticleCard = ({
  article,
  locale,
  className
}: SecondaryArticleCardProps) => {
  const category =
    typeof article.category === "object" && article.category?.title
      ? article.category.title
      : null;
  const authorName = article.author?.name?.trim();
  const relative = article.publishedAt
    ? formatRelativeTime(article.publishedAt, locale)
    : "";

  return (
    <article
      className={cn(
        "group relative grid grid-cols-[96px_1fr] gap-x-4 bg-card p-4 sm:grid-cols-[120px_1fr] sm:gap-x-5 sm:p-5",
        "transition-colors duration-150 ease-[cubic-bezier(.4,0,.2,1)]",
        className
      )}
    >
      <Link
        href={`/essays/${article.slug}`}
        className="absolute inset-0 z-10"
        aria-label={article.title}
      />

      <div className="relative aspect-square overflow-hidden rounded-md bg-muted/20">
        {article.image ? (
          <FrontImage
            resource={article.image}
            aspectRatio={1}
            loading="lazy"
            imgClassName="absolute inset-0 block h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.02]"
          />
        ) : (
          <PlaceHolderImage className="absolute inset-0 h-full w-full" />
        )}
      </div>

      <div className="flex flex-col gap-y-2 self-center">
        {category && (
          <RP_BadgeTag
            content={category}
            className="border-foreground/40 px-1.5 py-1 text-faded-foreground"
          />
        )}

        <span className="block text-base leading-snug font-medium tracking-tight text-balance [overflow-wrap:anywhere] text-foreground/90 transition-colors duration-150 group-hover:text-foreground xl:text-lg">
          {article.title}
        </span>

        {(authorName || relative) && (
          <div className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-[11px]">
            {authorName}
            {authorName && relative && (
              <span aria-hidden className="mx-2">
                ·
              </span>
            )}
            {relative && <time dateTime={article.publishedAt}>{relative}</time>}
          </div>
        )}
      </div>
    </article>
  );
};
