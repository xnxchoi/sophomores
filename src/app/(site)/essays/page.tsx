import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReadingStage } from "@/components/reading/reading-stage";
import { loadReadingSurface } from "@/lib/content/load-reading";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("reading"), robots: { index: false, follow: false } };
}

/** Published posts fill the slots. Fixtures fill them when the collection is empty. */
export default async function ReadingPage() {
  const surface = await loadReadingSurface();
  return <ReadingStage surface={surface} />;
}
