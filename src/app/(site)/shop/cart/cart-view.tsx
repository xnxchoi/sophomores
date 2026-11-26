"use client";
import { Button } from "@/components/core/Button";

import { ArrowClockwiseIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { useEcommerce } from "@payloadcms/plugin-ecommerce/client/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { PageFrame } from "@/components/commerce/page-frame";
import { CommerceAccountGate, CommerceProvider } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";
import type { CartProduct } from "@/lib/commerce/cart-products";
import { readGuestCartIntentKey, subscribeGuestCart, writeThroughGuestCart, type WriteThroughResult } from "@/lib/commerce/browser-cart";
import type { MemberCapabilities } from "@/lib/member-auth/contracts";

/**
 * /shop/cart is visible to everyone. Signed-out shoppers can sign in to save their selection;
 * the account step returns them to the cart, not payment.
 */
export function CartView(props: CartProps) {
  return <CartContents {...props} frame={({ title, step, children }) =>
    <PageFrame title={title} displayTitle layout={step === "sign-in" ? "wide" : props.signInOffInReview ? "editorial" : "wide"}>{children}</PageFrame>} />;
}

export type CartProps = {
  products: readonly CartProduct[];
  signedIn: boolean;
  initialCapabilities: Readonly<MemberCapabilities>;
  signInOffInReview: boolean;
  copy: { title: string; signInTitle: string; backToCart: string };
};

/**
 * The cart's steps without a page around them: the cart, or the account step Checkout asks for when signed out, and the
 * guest cart's write-through once signed in. `frame` lays each step out: the cart page's PageFrame, or the shop's cart
 * panel (shop/cart-panel.tsx), which shows the same steps in stripe.press's cart column.
 */
export function CartContents({ products, signedIn, initialCapabilities, signInOffInReview, copy, frame }: CartProps & {
  frame: (props: { title: string; step: "cart" | "sign-in"; children: ReactNode }) => ReactNode;
}) {
  const [view, setView] = useState<"cart" | "sign-in">("cart");
  const [member, setMember] = useState(signedIn);
  const [transferring, setTransferring] = useState<string>();
  // Called, not rendered as <frame>: a caller's inline frame would otherwise be a new component type on every render
  // and remount the steps (and their provider) each time.
  if (view === "sign-in") return frame({ title: copy.signInTitle, step: "sign-in", children: <>
    <Button variant="bare" type="button" onClick={() => setView("cart")}
      className="group/focus -ml-1 mb-6 inline-flex min-h-11 items-center gap-2 px-1 text-xs uppercase tracking-[0.04em] underline decoration-current/40 underline-offset-4 hover:decoration-current">
      <FocusShape className="inline-flex items-center gap-[inherit] outline-offset-4"><ArrowLeftIcon aria-hidden="true" className="size-4" />{copy.backToCart}</FocusShape>
    </Button>
    <CommerceAccountGate signInOffInReview={signInOffInReview} initialCapabilities={initialCapabilities} returnTo="shop-cart">
      <SignedIn onReady={() => { setMember(true); setView("cart"); }} />
    </CommerceAccountGate>
  </> });
  return frame({ title: copy.title, step: "cart", children: <>
    <CommerceProvider>
      {member && <GuestCartWriteThrough running={transferring !== undefined} onRunning={setTransferring} />}
      <CommerceCart products={products} wide signedIn={member} localPendingFor={transferring} onSignIn={member ? undefined : () => setView("sign-in")} />
    </CommerceProvider>
  </> });
}

/** The gate mounts its children only once the account step reports a signed-in member, so mounting here means sign-in finished. */
function SignedIn({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}

/**
 * Transfer browser selections after sign-in. Stop on an account change instead of
 * automatically copying any remaining selections into a different account.
 * Auth-editions HOLD, 27 Nov: Try again follows the lines still on this browser, the member the transfer began with and
 * whether a transfer is running, so a line edited or added while its write was acknowledged ("written" or "nothing"
 * with lines left) can be retried by the same member. It never retries into a different account; the pin itself is
 * stored with the lines (browser-cart.ts), so a reload or a later visit can't move them to another member either.
 */
function GuestCartWriteThrough({ running, onRunning }: { running: boolean; onRunning: (memberID?: string) => void }) {
  const t = useTranslations("Customer.components_commerce_cart");
  const { user, clearSession, onLogin } = useEcommerce();
  const memberID = user?.id == null ? undefined : String(user.id);
  const [result, setResult] = useState<WriteThroughResult | null>(null);
  // The member the transfer began with, for render; transferMember is the effect's own copy of the same pin.
  const [pinned, setPinned] = useState<string | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const retainedKey = useSyncExternalStore(subscribeGuestCart, () => readGuestCartIntentKey(memberID), () => "[]");
  const retained: [string, string, string][] = JSON.parse(retainedKey);
  // Compare a refusal to the intent we tried, not to storage after the response came back.
  const [attemptedKey, setAttemptedKey] = useState("[]");
  const ran = useRef(-1);
  const transferMember = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  const latest = useRef(memberID);
  useEffect(() => { latest.current = memberID; }, [memberID]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const expected = latest.current;
    if (!expected || ran.current === attempt) return;
    if (transferMember.current && transferMember.current !== expected) return;
    transferMember.current = expected;
    ran.current = attempt;
    const attempted = readGuestCartIntentKey(expected);
    if (attempted === "[]") return;
    onRunning(expected);
    void writeThroughGuestCart({ memberID: expected }).then(async (next) => {
      if (!mounted.current) return;
      onRunning();
      if (latest.current !== expected) return;
      setPinned(expected);
      setAttemptedKey(attempted);
      setResult(next);
      if (next.outcome === "account-changed" || next.outcome === "written" || ("changed" in next && next.changed)) {
        clearSession(); await onLogin();
      }
    });
  }, [memberID, attempt, clearSession, onLogin, onRunning]);
  // Nothing left on this browser: nothing to report or retry.
  if (!result || !memberID || memberID !== pinned || retained.length === 0) return null;
  const attempted: [string, string, string][] = JSON.parse(attemptedKey);
  if (attempted[0]?.[2] !== retained[0]?.[2]) return null;
  const accountChanged = result.outcome === "account-changed";
  const retryable = result.outcome === "retry" ||
    (result.outcome === "refused" && (result.reason === "membership-in-cart" || result.reason === "guest-ticket-alone" ||
      result.reason === "payment-in-progress" || result.reason === "cart-locked" || result.reason === "product-limit-reached"));
  const anotherIntent = retained.some(([productID, intent]) =>
    !("productID" in result) || productID !== result.productID ||
    !attempted.some(([attemptedProductID, attemptedIntent]) => attemptedProductID === productID && attemptedIntent === intent));
  const canRetry = !accountChanged && !running && (retryable || anotherIntent);
  const settled = result.outcome === "nothing" || result.outcome === "written";
  if (settled && !accountChanged && !canRetry) return null;
  const message = accountChanged ? t("writeAccountChanged")
    // Settled with lines left: the cart's "Only on this browser" note already says so; offer only Try again.
    : settled ? null
    : result.outcome === "retry" ? t("writeRetry")
    : result.reason === "offer-unavailable" ? t("writeOfferUnavailable")
    : result.reason === "limit-reached" ? t("writeLimitReached")
    : result.reason === "membership-in-cart" ? t("writeMembershipInCart")
    : result.reason === "guest-ticket-alone" ? t("writeGuestTicketAlone")
    : result.reason === "product-limit-reached" ? t("writeProductLimitReached")
    : result.reason === "payment-in-progress" ? t("writePaymentInProgress")
    : result.reason === "cart-locked" ? t("writeCartLocked")
    : t("writeRejected");
  return <div role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-5 text-sm">
    {message && <p>{message}</p>}
    {!accountChanged && result.outcome === "refused" && result.reason === "payment-in-progress" && <Link href="/shop/payment"
      className="group/focus inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("checkPayment")}</FocusShape></Link>}
    {canRetry && <Button variant="bare" type="button" onClick={() => { setResult(null); setAttempt((value) => value + 1); }}
      className="group/focus inline-flex min-h-11 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
      <FocusShape className="inline-flex items-center gap-[inherit] outline-offset-4"><ArrowClockwiseIcon aria-hidden="true" className="size-4" />{t("tryAgain")}</FocusShape>
    </Button>}
  </div>;
}
