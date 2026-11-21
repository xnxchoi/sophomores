import type { ReactNode } from "react";
import Image from "next/image";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { RP_BadgeTag } from "@/components/UX/RP_BadgeTag";
import type { PostCard } from "@/lib/content/slots";

/**
 * The essay listing as The Hideaway lays it out (components/layouts/Tagged/Item.tsx: CatTitle and
 * ArticleArchiveItem; components/UX/PageRange). Grid, type sizes and order are The Hideaway's; colours use
 * the reading pages' shade tokens (colour hold), and the image well has no loading spinner (no such token here).
 */
export function ArchiveTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="relative mx-auto mt-[32px] mb-[16px] w-[calc(100%-80px)] max-w-[calc(100%-80px)] border-b border-[oklch(from_var(--port-shade)_l_c_h_/_0.4)] py-[20px] font-sans text-[62px] leading-[1.2] -tracking-[.045em] capitalize">
      <span>{children}</span>
    </h1>
  );
}

export function ArchiveRow({ post }: { post: PostCard }) {
  const locale = useLocale();
  return (
    <div className="relative mb-[40px] grid grid-cols-[1fr_1fr] grid-rows-4 gap-x-[20px] border-b border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] pb-[40px] after:absolute after:bottom-0 after:col-[6/-1] after:h-px after:w-full after:bg-[oklch(from_var(--port-shade)_l_c_h_/_0.4)] after:content-[''] lg:mb-25 lg:grid-cols-[repeat(12,1fr)] lg:grid-rows-[repeat(4,auto)_1fr_auto] lg:items-start lg:border-b-0 lg:pb-0">
      <Link className="absolute inset-0 z-3 h-full w-full" href={post.href} aria-label={post.title} />
      <div className="relative col-[1] row-[1/6] aspect-[3/2] min-h-px min-w-px overflow-hidden rounded-[10px] bg-[var(--faded-bg)] lg:col-[3/6] lg:row-[1/7]">
        {post.heroUrl ? <Image src={post.heroUrl} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" /> : null}
      </div>
      {post.category ? (
        <div className="order-2 col-[2] row-[2] text-[10px] uppercase lg:col-[1/3] lg:mb-[16px]">
          <RP_BadgeTag content={post.category} />
        </div>
      ) : null}
      {post.publishedAt ? (
        <time dateTime={post.publishedAt} className="col-[2] row-[5] mt-[6px] opacity-90 lg:col-[1/3] lg:row-[4]">
          {DateTime.fromISO(post.publishedAt).setLocale(locale).toLocaleString(DateTime.DATE_HUGE)}
        </time>
      ) : null}
      <p className="col-[2] row-[3] m-0 mt-0 mb-[21.6px] text-[16px] leading-[1.1] font-bold -tracking-[.01em] md:text-[25.6px] lg:col-[6/-2] lg:row-[1/6] lg:text-[36.8px]">
        {post.title}
      </p>
      {post.dek ? (
        <div className="hidden md:col-[6/-2] md:row-[6] md:mb-[20px] md:flex md:flex-col md:justify-end md:p-[10px]">
          <div className="h-full font-serif text-[20px] leading-[1.2] text-pretty">{post.dek}</div>
        </div>
      ) : null}
      {post.authorName ? (
        <div className="order-2 col-[2] row-[4] inline-block font-sans text-[11.2px] uppercase opacity-90 lg:col-[1/3] lg:row-[3]">
          {post.authorName}
        </div>
      ) : null}
    </div>
  );
}

/** Previous and next pages around "first–last of total" (The Hideaway: PageRange, with its range counted). */
export function PageRange({
  page,
  limit,
  totalDocs,
  totalPages
}: {
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
}) {
  const t = useTranslations("Customer.components_reading_page_links");
  if (totalDocs === 0) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalDocs);
  return (
    <div className="mx-auto mb-8 flex w-[calc(100%-80px)]">
      <span className="flex w-1/3 shrink grow justify-start">
        {page > 1 ? <Link className="-m-6 inline-flex p-6" href={`/essays/in/${page - 1}`}>{t("previous")}</Link> : null}
      </span>
      <span className="flex w-1/3 shrink grow justify-center">{t("range", { start, end, total: totalDocs })}</span>
      <span className="flex w-1/3 shrink grow justify-end">
        {page < totalPages ? <Link className="-m-6 inline-flex p-6" href={`/essays/in/${page + 1}`}>{t("next")}</Link> : null}
      </span>
    </div>
  );
}
