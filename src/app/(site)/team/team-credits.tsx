"use client";

import { Link } from "@/components/core/Link/Link";
import type { CreditSlot } from "@/lib/content/slots";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { CreditsList, CreditsRoll, type CreditGroup } from "./credits-roll";
import { ProfileViewer } from "./profile-viewer";

export type TeamPerson = Pick<CreditSlot, "id" | "name" | "role" | "bio" | "href" | "profilePic">;

/** Groups follow each public role's first appearance, so the roll, list and viewer share one order. */
function groupByRole(people: ReadonlyArray<TeamPerson>): CreditGroup[] {
  const groups = new Map<string, CreditGroup>();
  people.forEach((person) => {
    const group = groups.get(person.role) ?? { role: person.role, people: [] };
    group.people.push(person);
    groups.set(person.role, group);
  });
  return [...groups.values()];
}

export function TeamCredits({ people }: { people: ReadonlyArray<TeamPerson> }) {
  const t = useTranslations("Customer.app_site_team_page");
  const groups = useMemo(() => groupByRole(people), [people]);
  const ordered = useMemo(() => groups.flatMap((group) => group.people), [groups]);
  const [viewing, setViewing] = useState<string | null>(null);
  // Each opening starts a fresh carousel at the chosen person.
  const [opening, setOpening] = useState(0);
  const lastViewed = useRef<string | null>(null);
  const openProfile = (id: string) => {
    lastViewed.current = id;
    setOpening((count) => count + 1);
    setViewing(id);
  };
  // Return focus to whichever copy of the name is visible now: the layout can change while the
  // viewer is open (rotation, resizing). Fall back to the Credits heading.
  const returnFocus = () => {
    const names = document.querySelectorAll<HTMLElement>(`[data-credit-id="${CSS.escape(lastViewed.current ?? "")}"]`);
    return [...names].find((name) => name.checkVisibility()) ?? document.getElementById("team-credits");
  };

  return (
    <main className="mx-auto min-h-[70svh] max-w-7xl px-6 pt-32 pb-24 text-foreground sm:px-10 sm:pt-40 xl:px-16">
      <header className="grid gap-6 border-b border-border pb-10 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.65fr)] lg:items-end lg:gap-16">
        <h1 className="font-heading text-6xl leading-none tracking-tight sm:text-8xl xl:text-9xl">{t("title")}</h1>
        <p className="max-w-sm text-lg leading-relaxed text-muted-foreground sm:text-xl">{t("introduction")}</p>
      </header>

      {ordered.length > 0 ? (
        <section aria-labelledby="team-credits" className="py-10 sm:py-14">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 sm:mb-10">
            <h2 id="team-credits" tabIndex={-1} className="text-xs font-medium tracking-widest text-muted-foreground uppercase outline-none">{t("credits")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("profileHint")}</p>
          </div>
          <CreditsRoll groups={groups} viewing={viewing !== null} onSelect={openProfile} className="hidden pointer-fine:md:block" />
          <CreditsList groups={groups} onSelect={openProfile} className="pointer-fine:md:hidden" />
          <ProfileViewer
            people={ordered}
            viewing={viewing}
            opening={opening}
            onClose={() => setViewing(null)}
            finalFocus={returnFocus}
          />
        </section>
      ) : (
        <section aria-labelledby="team-credits" className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(10rem,0.45fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 id="team-credits" className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{t("credits")}</h2>
          </div>
          <m.div initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="min-w-0 border-y border-border py-8 sm:py-10">
            <h3 className="max-w-lg font-heading text-2xl leading-snug tracking-tight sm:text-4xl">{t("emptyTitle")}</h3>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">{t("emptyDescription")}</p>
            <Link href="/help" className="mt-6 inline-flex min-h-12 items-center gap-6 text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-2">
              {t("help")}<span aria-hidden="true">-&gt;</span>
            </Link>
          </m.div>
        </section>
      )}

      <nav aria-label={t("explore")} className="grid border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-border">
        <Link href="/" className="group flex min-h-24 items-center justify-between gap-8 border-b border-border py-6 outline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-2 sm:border-b-0 sm:pr-8">
          <span className="text-xl tracking-tight sm:text-2xl">{t("home")}</span><span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-1">&lt;-</span>
        </Link>
        <Link href="/shop" className="group flex min-h-24 items-center justify-between gap-8 py-6 outline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-2 sm:pl-8">
          <span className="text-xl tracking-tight sm:text-2xl">{t("shop")}</span><span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">-&gt;</span>
        </Link>
      </nav>
    </main>
  );
}
