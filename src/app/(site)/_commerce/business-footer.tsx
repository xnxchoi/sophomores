import { connection } from "next/server";
import { getPayload } from "payload";
import { Suspense, type ReactNode } from "react";
import { loadBusinessInformation, type BusinessFacts } from "@/payload/globals/business-info";
import { BusinessFooterGate } from "./business-footer-gate";
import { SellerDisclosure, SellerNavigation } from "./seller-disclosure";

/** Navigation does not depend on the business-info read. */
export function BusinessFooterView({ children }: { children?: ReactNode }) {
  return (
    <footer className="border-t border-border bg-background pt-8 pb-12 text-foreground sm:pt-10 sm:pb-16">
      <div aria-hidden="true" className="flex items-center justify-center gap-3">
        <span className="h-px w-10 bg-muted-foreground/25" />
        <span className="size-1.5 rotate-45 border border-muted-foreground/50" />
        <span className="h-px w-10 bg-muted-foreground/25" />
      </div>
      <div className="mx-auto mt-6 max-w-4xl px-6 sm:px-10">
        <SellerNavigation centered />
      </div>
      {children}
    </footer>
  );
}

export function BusinessFooterFacts({ facts }: { facts: BusinessFacts | null }) {
  if (!facts) return null;
  return (
    <SellerDisclosure
      colophon
      showNavigation={false}
      seller={{
        name: facts.tradeName,
        representative: facts.representative,
        address: facts.businessAddress,
        registrationNumber: facts.businessRegistrationNumber,
        mailOrderRegistrationNumber: facts.mailOrderRegistration,
        phone: facts.customerServicePhone,
        email: facts.customerServiceEmail
      }}
    />
  );
}

export function BusinessFooter() {
  return (
    <BusinessFooterGate>
      <BusinessFooterView>
        <Suspense fallback={null}>
          <PublishedBusinessFacts />
        </Suspense>
      </BusinessFooterView>
    </BusinessFooterGate>
  );
}

/** Only approved data is streamed into the already-present footer. */
async function PublishedBusinessFacts() {
  await connection();
  let facts: BusinessFacts | null = null;
  try {
    // Lazy so the presentational view stays importable without Payload configuration.
    const { default: config } = await import("@payload-config");
    facts = (await loadBusinessInformation(await getPayload({ config }))).facts;
  }
  catch { console.error("Business information is unavailable."); }
  return <BusinessFooterFacts facts={facts} />;
}
