import ShopPage from "../shop/page";

export const metadata = { title: "Shop — Sophomores", robots: { index: false, follow: false } };

/** Existing inline-account callbacks keep this URL; the CMS offer is the sole catalogue. */
export default function TicketsPage() {
  return <ShopPage />;
}
