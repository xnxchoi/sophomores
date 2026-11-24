import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { NotFoundPage } from "@/components/layouts/Missing/not-found-screen";
import { holdThemeBoot } from "@/lib/content/theme";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("System");
  return {
    // The Hideaway's 404 title, as served (hideawayseoul.com, 24 Nov).
    title: "404...",
    description: t("notFoundDescription")
  };
}

// The 404 holds dark (as in The Hideaway). Its path is unknown to the boot script, so this script applies
// the hold before the page paints; the page's own hold (MissingLayout) takes over once it mounts.
export default function NotFound() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: holdThemeBoot("dark") }} />
      <NotFoundPage />
    </>
  );
}
