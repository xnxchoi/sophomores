import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { Warp } from "@/components/Warp";
import { TeaserContentProvider } from "@/components/teaser/content-provider";
import { SellerDisclosure } from "./_commerce/seller-disclosure";

async function PublishedSellerDisclosure() {
  await connection();
  let disclosure = null;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { console.error("Published commerce information is unavailable."); }
  return <SellerDisclosure seller={disclosure?.seller} className="bg-teaser-blue text-white" />;
}

export default function Home() {
  const t = useTranslations("System");
  return (
    <>
      <noscript>
        <div className="bg-[#2c36cb] p-6 font-mono text-base leading-relaxed text-white">
          {t("enableJavaScript")}
        </div>
      </noscript>
      <TeaserContentProvider>
        <Warp />
      </TeaserContentProvider>
      <Suspense fallback={<SellerDisclosure seller={null} className="bg-teaser-blue text-white" />}>
        <PublishedSellerDisclosure />
      </Suspense>
    </>
  );
}
