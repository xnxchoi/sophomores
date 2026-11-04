import { Link } from "@/components/core/Link/Link";
import { signInRedirectPath } from "@/lib/routes/auth";
import RichText from "../RichText";
import type { GateResult } from "./gatePost";

export type PaywallTeaser = {
  root: {
    type?: string;
    children: unknown[];
    direction?: string | null;
    format?: string;
    indent?: number;
    version?: number;
  };
};

export type PaywallProps = {
  gate?: GateResult;
  /** Numeric authority required by the post; used to derive tier copy when no
   *  GateResult is provided (e.g. when rendered inside Narrateur's body slot). */
  requiredAuthority?: number;
  /** True when the viewer is signed out (gate.reason === "auth-required"). */
  needsAuth?: boolean;
  teaser?: PaywallTeaser | null;
  currentPath?: string;
};

type PaywallTier =
  | "resident"
  | "patron"
  | "author"
  | "editor"
  | "cofounder"
  | "admin";

const tierFromAuthority = (authority: number | undefined): PaywallTier => {
  const a = typeof authority === "number" ? authority : 2;
  if (a >= 1000) return "admin";
  if (a >= 6) return "cofounder";
  if (a >= 5) return "editor";
  if (a >= 4) return "author";
  if (a >= 3) return "patron";
  return "resident";
};

const tierCopy: Record<
  PaywallTier,
  { label: string; cta: string; pitch: string }
> = {
  resident: {
    label: "Residents",
    cta: "Become a Resident",
    pitch:
      "The rest of this essay is for Residents. Highlight, annotate, and follow the writers you love. ₩9,000 / mo · ₩90,000 / yr."
  },
  patron: {
    label: "Patrons",
    cta: "Become a Patron",
    pitch:
      "This essay is reserved for Patrons. Includes everything a Resident gets, plus drops, events, and the quarterly print. ₩29,000 / mo."
  },
  author: {
    label: "Authors",
    cta: "Become a Resident",
    pitch: "Author access is granted to active Residents with editor approval."
  },
  editor: {
    label: "Editors",
    cta: "Contact us",
    pitch: "Editor access is staff-only."
  },
  cofounder: {
    label: "Cofounders",
    cta: "By invitation",
    pitch: "Cofounder access is invite-only."
  },
  admin: {
    label: "Admins",
    cta: "Contact us",
    pitch: "Admin access is staff-only."
  }
};

export function Paywall({
  gate,
  requiredAuthority,
  needsAuth: needsAuthProp,
  teaser,
  currentPath
}: PaywallProps) {
  const requiredKey =
    gate?.requiredRole &&
    gate.requiredRole !== "guest" &&
    gate.requiredRole !== "user"
      ? gate.requiredRole
      : tierFromAuthority(requiredAuthority);
  const copy = tierCopy[requiredKey as keyof typeof tierCopy];
  const needsAuth =
    typeof needsAuthProp === "boolean"
      ? needsAuthProp
      : gate?.reason === "auth-required";
  const loginHref = signInRedirectPath(currentPath ?? "/me");

  return (
    <>
      {/* Teaser body — rendered exactly like the regular RichText would be,
          but with a fade-to-background mask softening the cut. */}
      {!!teaser &&
      !!teaser.root &&
      Array.isArray(teaser.root.children) &&
      teaser.root.children.length > 0 ? (
        <>
          <RichText
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data={teaser as any}
            enableGutter={false}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -bottom-1 h-32 bg-gradient-to-b from-transparent to-faded-white dark:to-faded-black"
          />
        </>
      ) : null}

      {/* Gate — sits inside the .rp-content column flow, so editorial
          typography + container width come from Narrateur. NOTE: not <aside>:
          .rp-content has `[&>aside]:col-3` which would punt this to the side
          rail. We want the gate in the main column. */}
      <section
        role="region"
        aria-label="Continue reading"
        className="relative mt-16 flex w-full flex-col items-center justify-center border-t border-muted-faded-foreground/30 pt-12"
      >
        <p className="mb-4 font-sans text-[10px] tracking-[0.2em] text-muted-faded-foreground/70 uppercase">
          ◌ {copy.label} only · the rest is reserved
        </p>

        <h2 className="mb-5 text-2xl leading-tight font-light tracking-tight xl:text-3xl">
          {needsAuth
            ? "Sign in to keep reading"
            : `Continue reading as a ${copy.label.replace(/s$/, "")}`}
        </h2>

        <p className="mb-10 max-w-prose font-sans text-[12px] leading-relaxed text-muted-faded-foreground">
          {copy.pitch}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {needsAuth ? (
            <Link
              href={loginHref}
              prefetch={false}
              className="inline-flex h-11 items-center border border-muted-faded-foreground/50 px-5 font-sans text-[11px] tracking-widest uppercase transition-colors hover:border-foreground hover:text-foreground"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href="/plans"
            prefetch={false}
            className="inline-flex h-11 items-center border border-foreground bg-foreground px-5 font-sans text-[11px] tracking-widest text-background uppercase transition-colors hover:bg-foreground/90"
          >
            {needsAuth ? "View plans" : copy.cta}
          </Link>
          <Link
            href="/plans"
            prefetch={false}
            className="ml-1 font-sans text-[11px] tracking-widest text-muted-faded-foreground/70 uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            What&#39;s included
          </Link>
        </div>

        <p className="mt-12 max-w-prose font-sans text-[10px] tracking-[0.2em] text-muted-faded-foreground/40 uppercase">
          The Hideaway · Seoul
        </p>
      </section>
    </>
  );
}
