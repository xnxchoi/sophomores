import { connection } from "next/server";
import { Suspense } from "react";
import { loadSellerFacts } from "@/lib/site-info/load-seller-facts";
import { CommerceFacts } from "./commerce-facts";
import { CommerceInfo } from "./commerce-info";
import { FooterShell } from "./footer-shell";

/**
 * The one site footer (site layout, global not-found): legal links and the language switch on every page that shows it;
 * the seller facts print in full on commerce and policy pages only (CommerceFacts).
 */
export function Footer() {
  return (
    <FooterShell>
      <CommerceFacts>
        <Suspense fallback={null}>
          <BusinessInfo />
        </Suspense>
      </CommerceFacts>
    </FooterShell>
  );
}

/** Only approved data is streamed into the already-present footer. */
async function BusinessInfo() {
  await connection();
  return <CommerceInfo facts={await loadSellerFacts()} />;
}
