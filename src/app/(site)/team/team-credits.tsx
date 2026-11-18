"use client";

import { Link } from "@/components/core/Link/Link";
import type { CreditSlot } from "@/lib/content/slots";
import * as m from "motion/react-m";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function TeamCredits({ people }: {
  people: ReadonlyArray<Pick<CreditSlot, "id" | "name" | "role" | "bio" | "profilePic">>;
}) {
  const t = useTranslations("Customer.app_site_team_page");

  return (
    <main className="mx-auto min-h-[70svh] max-w-7xl px-6 pt-32 pb-24 text-foreground sm:px-10 sm:pt-40 xl:px-16">
      <header className="grid gap-6 border-b border-border pb-10 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.65fr)] lg:items-end lg:gap-16">
        <h1 className="font-heading text-6xl leading-none tracking-tight sm:text-8xl xl:text-9xl">{t("title")}</h1>
        <p className="max-w-sm text-lg leading-relaxed text-muted-foreground sm:text-xl">{t("introduction")}</p>
      </header>

      <section aria-labelledby="team-credits" className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(10rem,0.45fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 id="team-credits" className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{t("credits")}</h2>
          {people.length > 0 && <p className="mt-4 max-w-48 text-sm leading-relaxed text-muted-foreground">{t("profileHint")}</p>}
        </div>
        {people.length > 0 ? (
          <ul className="min-w-0 divide-y divide-border border-y border-border">
            {people.map((person, index) => (
              <m.li key={person.id} initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}>
                {person.bio || person.profilePic ? (
                  <details className="group">
                    <summary className="grid min-h-24 cursor-pointer grid-cols-[1fr_auto] items-center gap-4 py-6 outline-offset-4 focus-visible:outline-2 sm:min-h-28 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.5fr)_auto]">
                      <span className="min-w-0 text-2xl leading-tight tracking-tight break-words sm:text-4xl">{person.name}<span className="sr-only">. {t("viewProfile")}</span></span>
                      <span className="col-start-1 row-start-2 text-sm text-muted-foreground sm:col-start-2 sm:row-start-1">{person.role}</span>
                      <span aria-hidden="true" className="col-start-2 row-span-2 row-start-1 flex size-12 items-center justify-center rounded-full border border-border text-xl transition-transform duration-300 group-open:rotate-45 sm:col-start-3 sm:row-span-1">+</span>
                    </summary>
                    <div className="grid min-w-0 gap-6 pb-8 sm:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] sm:gap-8">
                      {person.profilePic && <div className="relative aspect-[4/5] max-w-sm overflow-hidden rounded-xl bg-muted">
                        <Image src={person.profilePic.src} alt={person.profilePic.alt} fill sizes="(min-width: 1024px) 240px, (min-width: 640px) 35vw, 90vw" className="object-cover" />
                      </div>}
                      {person.bio && <p className="max-w-prose text-base leading-relaxed break-words whitespace-pre-line text-muted-foreground">{person.bio}</p>}
                    </div>
                  </details>
                ) : (
                  <div className="grid min-h-24 gap-2 py-6 sm:min-h-28 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.5fr)_3rem] sm:items-center sm:gap-4">
                    <p className="min-w-0 text-2xl leading-tight tracking-tight break-words sm:text-4xl">{person.name}</p>
                    <p className="text-sm text-muted-foreground">{person.role}</p>
                  </div>
                )}
              </m.li>
            ))}
          </ul>
        ) : (
          <m.div initial={{ y: 12 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="min-w-0 border-y border-border py-8 sm:py-10">
            <h3 className="max-w-lg font-heading text-2xl leading-snug tracking-tight sm:text-4xl">{t("emptyTitle")}</h3>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">{t("emptyDescription")}</p>
            <Link href="/help" className="mt-6 inline-flex min-h-12 items-center gap-6 text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-2">
              {t("help")}<span aria-hidden="true">-&gt;</span>
            </Link>
          </m.div>
        )}
      </section>

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
