import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import type { PostCard } from "@/lib/content/slots";

/** The essay's archive neighbours (The Hideaway: Highlightr/prevNext.tsx). Previous is the newer one. */
export function PageLinks({ previous, next }: { previous: PostCard | null; next: PostCard | null }) {
  const t = useTranslations("Customer.components_reading_page_links");
  if (!previous && !next) return null;
  return (
    <nav aria-label={t("pages")} className="mx-auto grid max-w-3xl grid-cols-2 gap-4 px-6 pb-16">
      {previous ? (
        <Link href={previous.href} className="flex min-h-11 flex-col gap-1">
          <span className="port-meta font-sans text-xs tracking-[0.18em] text-[oklch(from_var(--port-shade)_l_c_h/0.55)] uppercase">{t("previous")}</span>
          <span className="text-base leading-snug font-medium tracking-tight">{previous.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link href={next.href} className="col-start-2 flex min-h-11 flex-col items-end gap-1 text-right">
          <span className="port-meta font-sans text-xs tracking-[0.18em] text-[oklch(from_var(--port-shade)_l_c_h/0.55)] uppercase">{t("next")}</span>
          <span className="text-base leading-snug font-medium tracking-tight">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
