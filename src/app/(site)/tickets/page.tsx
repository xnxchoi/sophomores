import messages from "../../../../messages/en.json";
import ShopPage from "../shop/page";

export const metadata = { title: messages.PageMetadata.shop, robots: { index: false, follow: false } };

/** Existing inline-account callbacks keep this URL; the CMS offer is the sole catalogue. */
export default function TicketsPage() {
  return <ShopPage />;
}
