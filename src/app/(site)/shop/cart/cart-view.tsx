"use client";

import { ArrowClockwiseIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { useCart, useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/core/Link/Link";
import { PageFrame } from "@/components/commerce/page-frame";
import { CommerceAccountGate, CommerceProvider } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import { writeThroughGuestCart, type WriteThroughResult } from "@/lib/commerce/browser-cart";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";

/**
 * /shop/cart (owner, 23 Nov): the cart is visible to everyone, and sign-in happens only at Checkout. Signed out, Checkout
 * swaps the page to the account step (its own title); once signed in, the page swaps back to the cart, which goes on.
 */
export function CartView({ offer, signedIn, initialCapabilities, signInOffInReview, copy }: {
  offer: CommerceOffer | null;
  signedIn: boolean;
  initialCapabilities: Readonly<MemberCapabilities>;
  signInOffInReview: boolean;
  copy: { title: string; signInTitle: string; backToCart: string };
}) {
  const [view, setView] = useState<"cart" | "sign-in">("cart");
  const [member, setMember] = useState(signedIn);
  if (view === "sign-in") return <PageFrame title={copy.signInTitle} displayTitle layout="wide">
    <button type="button" onClick={() => setView("cart")}
      className="-ml-1 mb-6 inline-flex min-h-12 items-center gap-2 px-1 text-sm text-muted-foreground outline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2">
      <ArrowLeftIcon aria-hidden="true" className="size-4" />{copy.backToCart}
    </button>
    <CommerceAccountGate signInOffInReview={signInOffInReview} initialCapabilities={initialCapabilities}>
      <SignedIn onReady={() => { setMember(true); setView("cart"); }} />
    </CommerceAccountGate>
  </PageFrame>;
  return <PageFrame title={copy.title} displayTitle layout={signInOffInReview ? "editorial" : "wide"}>
    <CommerceProvider>
      {member && <GuestCartWriteThrough />}
      <CommerceCart offer={offer} wide signedIn={member} onSignIn={member ? undefined : () => setView("sign-in")} />
    </CommerceProvider>
  </PageFrame>;
}

/** The gate mounts its children only once the account step reports a signed-in member, so mounting here means sign-in finished. */
function SignedIn({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}

/**
 * After sign-in (email code here, or an Apple/Google return to /shop/cart): put the browser cart's line into the member's
 * cart once, through Auth's writeThroughGuestCart, after the provider has read the member and their saved cart.
 * The member state comes from the server (the same read as the header), so the identity is already confirmed.
 */
function GuestCartWriteThrough() {
  const t = useTranslations("Customer.components_commerce_cart");
  const { cart } = useCart();
  const { user, clearSession, onLogin } = useEcommerce();
  const [result, setResult] = useState<WriteThroughResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ran = useRef(-1);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const savedCarts = (user as { cart?: { docs?: unknown[] } } | null | undefined)?.cart?.docs?.length ?? 0;
  const ready = !!user && (savedCarts === 0 || !!cart);
  useEffect(() => {
    if (!ready || ran.current === attempt) return;
    ran.current = attempt;
    void writeThroughGuestCart(cart ?? null).then(async (next) => {
      if (!mounted.current) return;
      setResult(next);
      // Re-read the member and their cart so the page shows what was written.
      if (next.outcome === "written") { clearSession(); await onLogin(); }
    });
  }, [ready, attempt, cart, clearSession, onLogin]);
  if (!result || result.outcome === "nothing" || result.outcome === "already-in-cart" || result.outcome === "written") return null;
  const message = result.outcome === "retry" ? t("writeRetry")
    : result.reason === "offer-unavailable" ? t("writeOfferUnavailable")
    : result.reason === "limit-reached" ? t("writeLimitReached")
    : result.reason === "payment-in-progress" ? t("writePaymentInProgress")
    : result.reason === "cart-locked" ? t("writeCartLocked")
    : t("writeRejected");
  return <div role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-5 text-sm">
    <p>{message}</p>
    {result.outcome === "refused" && result.reason === "payment-in-progress" && <Link href="/shop/payment"
      className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("checkPayment")}</Link>}
    {result.outcome === "retry" && <button type="button" onClick={() => { setResult(null); setAttempt((value) => value + 1); }}
      className="inline-flex min-h-11 items-center gap-1.5 text-muted-foreground outline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2">
      <ArrowClockwiseIcon aria-hidden="true" className="size-4" />{t("tryAgain")}
    </button>}
  </div>;
}
