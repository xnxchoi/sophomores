import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EssayPagination } from "@/components/reading/essay-pagination";
import { ArchiveRow, ArchiveTitle, PageRange } from "@/components/reading/archive-rows";
import { ReadingStage } from "@/components/reading/reading-stage";
import { loadReadingListing, loadReadingSurface } from "@/lib/content/load-reading";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("reading"), robots: { index: false, follow: false } };
}

/** Every published essay, twelve to a page, as The Hideaway lays it out (essays/in/[pageNumber]: CatTitle, rows, PageRange, Pagination). */
export default async function ReadingListingPage({ params }: { params: Promise<{ pageNumber: string }> }) {
  const { pageNumber } = await params;
  const page = Number(pageNumber);
  if (!Number.isInteger(page) || page < 1) notFound();
  const [listing, surface, t] = await Promise.all([
    loadReadingListing(page),
    loadReadingSurface(),
    getTranslations("Customer.components_reading_stage")
  ]);
  // Past the last page is a missing page; page 1 of an empty archive says so instead.
  if (page > Math.max(listing.totalPages, 1)) notFound();
  return (
    <ReadingStage surface={surface}>
      <div className="relative flex w-full flex-col items-center justify-center">
        <ArchiveTitle>{t("latest")}</ArchiveTitle>
        <div className="relative z-[1] flex w-full flex-col items-center justify-center py-[16px]">
          <div className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[calc(100vw-80px)] px-[20px] py-24">
            {listing.posts.length > 0
              ? listing.posts.map((post) => <ArchiveRow key={post.id} post={post} />)
              : <p className="text-base">{t("empty")}</p>}
          </div>
        </div>
      </div>
      <PageRange page={listing.page} limit={listing.limit} totalDocs={listing.totalDocs} totalPages={listing.totalPages} />
      <EssayPagination page={listing.page} totalPages={listing.totalPages} />
    </ReadingStage>
  );
}
