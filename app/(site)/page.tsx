import { Warp } from "@/components/Warp";
import { TeaserContentProvider } from "@/components/teaser/content-provider";
import { SellerDisclosure } from "./_commerce/seller-disclosure";

export default function Home() {
  return (
    <>
      <noscript>
        <div className="bg-[#2c36cb] p-6 font-mono text-base leading-relaxed text-white">
          Please enable JavaScript to view this experience.
        </div>
      </noscript>
      <TeaserContentProvider>
        <Warp />
      </TeaserContentProvider>
      <SellerDisclosure className="bg-teaser-blue text-white" />
    </>
  );
}
