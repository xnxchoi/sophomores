"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { PageFrame } from "@/components/commerce/page-frame";
import { CommerceAccountGate, CommerceProvider } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
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
      <CommerceCart offer={offer} wide signedIn={member} onSignIn={member ? undefined : () => setView("sign-in")} />
    </CommerceProvider>
  </PageFrame>;
}

/** The gate mounts its children only once the account step reports a signed-in member, so mounting here means sign-in finished. */
function SignedIn({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}
