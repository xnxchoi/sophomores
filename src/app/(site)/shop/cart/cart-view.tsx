"use client";

import { ArrowClockwiseIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { PageFrame } from "@/components/commerce/page-frame";
import { CommerceAccountGate, CommerceProvider } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";
import type { CartProduct } from "@/lib/commerce/cart-products";
import { z } from "zod";
import { listGuestCart, writeThroughGuestCart, type MemberCartView, type WriteThroughResult } from "@/lib/commerce/browser-cart";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";

/**
 * /shop/cart (owner, 23 Nov): the cart is visible to everyone, and sign-in happens only at Checkout. Signed out, Checkout
 * swaps the page to the account step (its own title); once signed in, the page swaps back to the cart, which goes on.
 */
export function CartView({ products, signedIn, initialCapabilities, signInOffInReview, copy }: {
  products: readonly CartProduct[];
  signedIn: boolean;
  initialCapabilities: Readonly<MemberCapabilities>;
  signInOffInReview: boolean;
  copy: { title: string; signInTitle: string; backToCart: string };
}) {
  const [view, setView] = useState<"cart" | "sign-in">("cart");
  const [member, setMember] = useState(signedIn);
  if (view === "sign-in") return <PageFrame title={copy.signInTitle} displayTitle layout="wide">
    <button type="button" onClick={() => setView("cart")}
      className="group/focus -ml-1 mb-6 inline-flex min-h-11 items-center gap-2 px-1 text-xs uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-4 hover:decoration-current">
      <FocusShape className="inline-flex items-center gap-[inherit] outline-offset-4"><ArrowLeftIcon aria-hidden="true" className="size-4" />{copy.backToCart}</FocusShape>
    </button>
    <CommerceAccountGate signInOffInReview={signInOffInReview} initialCapabilities={initialCapabilities} returnTo="shop-cart">
      <SignedIn onReady={() => { setMember(true); setView("cart"); }} />
    </CommerceAccountGate>
  </PageFrame>;
  return <PageFrame title={copy.title} displayTitle layout={signInOffInReview ? "editorial" : "wide"}>
    <CommerceProvider>
      {member && <GuestCartWriteThrough />}
      <CommerceCart products={products} wide signedIn={member} onSignIn={member ? undefined : () => setView("sign-in")} />
    </CommerceProvider>
  </PageFrame>;
}

/** The gate mounts its children only once the account step reports a signed-in member, so mounting here means sign-in finished. */
function SignedIn({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}

const id = z.union([z.string().min(1), z.number()]);
const memberRead = z.object({ user: z.object({ id, cart: z.object({ docs: z.array(z.union([id, z.object({ id })])) }).optional() }).nullable() });
const cartRead = z.object({ id, items: z.array(z.object({ product: z.unknown().optional() })).nullish() });

/**
 * One write-through, as Auth's r3 contract asks: confirm who is signed in (the page's member, or nothing is written), read
 * that member's open cart fresh from the server (never the provider's possibly older copy), then call
 * writeThroughGuestCart pinned to them. A read that doesn't settle keeps the browser line for a later try.
 */
export async function confirmAndWriteThrough(expectedMemberID: string, options: { fetcher?: typeof fetch; storage?: Parameters<typeof listGuestCart>[0] } = {}): Promise<WriteThroughResult> {
  const [line] = listGuestCart(options.storage);
  if (!line) return { outcome: "nothing" };
  const fetcher = options.fetcher ?? fetch;
  const retry = { outcome: "retry", productID: line.productID } as const;
  const read = async <T,>(url: string, schema: z.ZodType<T>) => {
    try {
      const response = await fetcher(url, { credentials: "include", cache: "no-store" });
      if (!response.ok) return undefined;
      const body = schema.safeParse(await response.json());
      return body.success ? body.data : undefined;
    } catch { return undefined; }
  };
  const me = await read("/api/users/me?depth=0&select[id]=true&select[cart]=true", memberRead);
  if (!me) return retry;
  if (!me.user || String(me.user.id) !== expectedMemberID) return { outcome: "account-changed", productID: line.productID };
  // The users.cart join lists the member's newest open cart first, never a purchased one.
  const open = me.user.cart?.docs[0];
  let cart: MemberCartView = null;
  if (open != null) {
    const found = await read(`/api/carts/${encodeURIComponent(String(typeof open === "object" ? open.id : open))}?depth=0`, cartRead);
    if (!found) return retry;
    cart = found;
  }
  return writeThroughGuestCart(cart, { memberID: expectedMemberID, fetcher, storage: options.storage });
}

/**
 * After sign-in (email code here, or an Apple/Google return to /shop/cart): put the browser cart's line into the member's
 * cart once. If the signed-in account changed under the page, nothing was written: re-read the member and try again as
 * them (twice at most, then the Try again button).
 */
function GuestCartWriteThrough() {
  const t = useTranslations("Customer.components_commerce_cart");
  const { user, clearSession, onLogin } = useEcommerce();
  const memberID = user?.id == null ? undefined : String(user.id);
  const [result, setResult] = useState<WriteThroughResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ran = useRef(-1);
  const rechecks = useRef(0);
  const mounted = useRef(true);
  const latest = useRef(memberID);
  useEffect(() => { latest.current = memberID; }, [memberID]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const expected = latest.current;
    if (!expected || ran.current === attempt) return;
    ran.current = attempt;
    void confirmAndWriteThrough(expected).then(async (next) => {
      if (!mounted.current) return;
      if (next.outcome === "account-changed" && rechecks.current < 2) {
        rechecks.current += 1;
        clearSession(); await onLogin();
        if (mounted.current) setAttempt((value) => value + 1);
        return;
      }
      setResult(next);
      // Re-read the member and their cart so the page shows what was written.
      if (next.outcome === "written") { clearSession(); await onLogin(); }
    });
  }, [memberID, attempt, clearSession, onLogin]);
  if (!result || result.outcome === "nothing" || result.outcome === "already-in-cart" || result.outcome === "written") return null;
  const message = result.outcome === "retry" || result.outcome === "account-changed" ? t("writeRetry")
    : result.reason === "offer-unavailable" ? t("writeOfferUnavailable")
    : result.reason === "limit-reached" ? t("writeLimitReached")
    : result.reason === "payment-in-progress" ? t("writePaymentInProgress")
    : result.reason === "cart-locked" ? t("writeCartLocked")
    : t("writeRejected");
  return <div role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-5 text-sm">
    <p>{message}</p>
    {result.outcome === "refused" && result.reason === "payment-in-progress" && <Link href="/shop/payment"
      className="group/focus inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("checkPayment")}</FocusShape></Link>}
    {(result.outcome === "retry" || result.outcome === "account-changed") && <button type="button" onClick={() => { rechecks.current = 0; setResult(null); setAttempt((value) => value + 1); }}
      className="group/focus inline-flex min-h-11 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
      <FocusShape className="inline-flex items-center gap-[inherit] outline-offset-4"><ArrowClockwiseIcon aria-hidden="true" className="size-4" />{t("tryAgain")}</FocusShape>
    </button>}
  </div>;
}
