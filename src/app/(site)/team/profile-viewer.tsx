"use client";

import { Carousel } from "@/components/arc/carousel/carousel";
import { Link } from "@/components/core/Link/Link";
import { useScrollLock } from "@/components/shell/site-scroll";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { TeamPerson } from "./team-credits";

/**
 * The Hideaway's full-screen profile carousel. Base UI supplies the modal, focus trap and
 * scroll lock; Arc's carousel supplies swipe, keys and slide announcements.
 */
export function ProfileViewer({ people, viewing, opening, onClose, finalFocus }: {
  people: ReadonlyArray<TeamPerson>;
  viewing: string | null;
  /** Changes on every opening, so the carousel always starts at the chosen person. */
  opening: number;
  onClose: () => void;
  finalFocus: () => HTMLElement | null;
}) {
  const t = useTranslations("Customer.app_site_team_page");
  // The page's smooth scroll holds still through the shared lock (S6: one Lenis writer).
  useScrollLock(viewing !== null);
  // Keep the last profile on screen while the viewer fades out.
  const [shown, setShown] = useState(viewing);
  if (viewing !== null && viewing !== shown) setShown(viewing);
  const start = Math.max(0, people.findIndex((person) => person.id === shown));

  return (
    <Dialog.Root open={viewing !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background/85 backdrop-blur-floating transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          data-lenis-prevent=""
          finalFocus={finalFocus}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain text-foreground outline-none transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:translate-y-3 data-ending-style:opacity-0 data-starting-style:translate-y-6 data-starting-style:opacity-0"
        >
          <div className="flex items-center gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-8">
            <Dialog.Close
              aria-label={t("closeProfiles")}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-background outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
            </Dialog.Close>
            <Dialog.Title className="text-sm text-muted-foreground">{t("profiles")}</Dialog.Title>
          </div>
          {/* Clicking the open space around the profiles closes the viewer, like a backdrop. */}
          <div className="flex flex-1 items-center py-8 sm:py-12" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            {shown !== null && <Carousel
              key={opening}
              label={t("profiles")}
              defaultIndex={start}
              slideSize="min(86cqw, 24rem)"
              slideLabel={(index, count) => t("profilePosition", { index: index + 1, count })}
            >
              {people.map((person) => <ProfileCard key={person.id} person={person} />)}
            </Carousel>}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const SITE = "https://site.invalid";
/**
 * Only a genuine site path or an absolute https address becomes a link; anything else is left out.
 * Backslashes and protocol-relative forms are rejected before parsing (URL parsing turns a slash and
 * backslash into another origin), and the normalised path that is emitted is checked again: dot
 * segments can collapse `/.//host` into a protocol-relative `//host`.
 */
export function linkable(href?: string) {
  if (!href) return null;
  if (/^https:\/\//i.test(href)) return URL.canParse(href) ? new URL(href).href : null;
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\") || !URL.canParse(href, SITE)) return null;
  const url = new URL(href, SITE);
  if (url.origin !== SITE) return null;
  const path = url.pathname + url.search + url.hash;
  return /^\/(?!\/)/.test(path) ? path : null;
}

function ProfileCard({ person }: { person: TeamPerson }) {
  const t = useTranslations("Customer.app_site_team_page");
  const href = linkable(person.href);
  return (
    <article className="grid gap-5 pb-2">
      {person.profilePic && <div className="relative aspect-[0.88] overflow-hidden rounded-xl bg-muted">
        <Image src={person.profilePic.src} alt={person.profilePic.alt} fill sizes="(min-width: 640px) 24rem, 86vw" draggable={false} className="object-cover" />
      </div>}
      <div>
        <h3 className="text-3xl leading-tight tracking-tight break-words sm:text-4xl">{person.name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{person.role}</p>
      </div>
      {person.bio && <p className="text-base leading-relaxed break-words whitespace-pre-line text-muted-foreground">{person.bio}</p>}
      {href && <Link href={href} className="inline-flex min-h-12 items-center gap-4 text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">
        {t("profileLink")}<span aria-hidden="true">-&gt;</span>
      </Link>}
    </article>
  );
}
