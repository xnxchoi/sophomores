import { useTranslations } from "next-intl";
import { Warp } from "@/components/Warp";
import { TeaserContentProvider, type HomePageContent } from "@/components/teaser/content-provider";

/** The home page's tree. Seller details live in the site footer, not on the page (owner, 21 Nov). */
export function HomeView({ content }: { content?: HomePageContent | null }) {
  const t = useTranslations("System");
  return (
    <>
      <noscript>
        <div className="bg-[#2c36cb] p-6 font-sans text-base leading-relaxed text-white">
          {t("enableJavaScript")}
        </div>
      </noscript>
      <TeaserContentProvider initialContent={content}>
        <Warp />
      </TeaserContentProvider>
    </>
  );
}
