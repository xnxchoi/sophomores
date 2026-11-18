import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";
import {
  type ApprovedPolicy,
  type SellerInformation,
  type PolicyKey
} from "@/lib/commerce/disclosures";
import { SellerDisclosure } from "./seller-disclosure";

export function PolicyPage({
  policy,
  content = null,
  seller = null,
  document = null,
  showSeller = true
}: {
  policy: PolicyKey;
  content?: ApprovedPolicy | null;
  seller?: SellerInformation | null;
  /** Owner-edited policy text from the business-info global; wins when present. */
  document?: SerializedEditorState | null;
  /** The site footer carries the seller facts once the global is complete. */
  showSeller?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("Customer.policy");
  const title = t(policy);
  const related = (["terms", "privacy", "refund"] as const).filter((key) => key !== policy);
  const sections = document ? [] : content?.sections ?? [];
  return (
    <div lang={locale} className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-7xl px-6 pt-32 pb-24 sm:px-10 sm:pt-40 xl:px-16">
        <Link
          href="/shop"
          className="mb-10 inline-flex min-h-12 items-center text-sm text-muted-foreground underline decoration-current/40 underline-offset-4 outline-offset-4 transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-2"
        >
          {t("backToTickets")}
        </Link>
        <header className="mb-10 border-b border-border pb-10 sm:mb-14 sm:pb-14">
          <h1 id="policy-title" className="max-w-4xl scroll-mt-28 font-heading text-4xl leading-[1.08] tracking-tight text-balance sm:text-6xl xl:text-7xl">
            {title}
          </h1>
          {!document && content && <p className="mt-6 text-sm text-muted-foreground">
            {t("effectiveDate")}{" "}<time dateTime={content.effectiveDate}>{content.effectiveDate}</time>
          </p>}
        </header>
        <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,1.8fr)_minmax(14rem,0.8fr)] xl:gap-20">
          <aside className="min-w-0 xl:sticky xl:top-28 xl:col-start-2 xl:row-start-1 xl:self-start">
            {(document || sections.length > 0) && <>
              <details className="group border-y border-border xl:hidden">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-sm font-medium outline-offset-4 focus-visible:outline-2">
                  {t("contents")}
                  <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <nav aria-label={t("contents")} className="pb-4">
                  {document ? <a href="#policy-document" className="flex min-h-12 items-center py-2 text-sm underline decoration-current/30 underline-offset-4 outline-offset-4 focus-visible:outline-2">{title}</a> : sections.map((section, index) => <a key={index} href={`#policy-section-${index}`} className="flex min-h-12 items-start gap-3 py-3 text-sm leading-6 text-muted-foreground underline-offset-4 outline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2">
                    <span aria-hidden="true" className="shrink-0 font-mono text-xs leading-6">{String(index + 1).padStart(2, "0")}</span>
                    <span>{section.heading}</span>
                  </a>)}
                </nav>
              </details>
              <nav aria-label={t("contents")} className="hidden xl:block">
                <h2 className="mb-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">{t("contents")}</h2>
                {document ? <a href="#policy-document" className="flex min-h-12 items-center border-l border-border py-3 pl-5 text-sm underline decoration-current/30 underline-offset-4 outline-offset-4 focus-visible:outline-2">{title}</a> : sections.map((section, index) => <a key={index} href={`#policy-section-${index}`} className="flex min-h-12 items-start gap-3 border-l border-border py-3 pl-5 text-sm leading-6 text-muted-foreground underline-offset-4 outline-offset-4 transition-colors hover:border-foreground hover:text-foreground hover:underline focus-visible:outline-2">
                  <span aria-hidden="true" className="shrink-0 font-mono text-xs leading-6">{String(index + 1).padStart(2, "0")}</span>
                  <span>{section.heading}</span>
                </a>)}
              </nav>
            </>}
            <nav aria-label={t("relatedPolicies")} className="hidden border-t border-border pt-6 xl:mt-8 xl:block">
              <h2 className="mb-3 text-xs font-medium tracking-widest text-muted-foreground uppercase">{t("relatedPolicies")}</h2>
              {related.map((key) => <Link key={key} href={`/${key}`} className="flex min-h-12 items-center py-3 text-sm text-muted-foreground underline decoration-current/30 underline-offset-4 outline-offset-4 transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-2">{t(key)}</Link>)}
            </nav>
          </aside>
          <article aria-labelledby="policy-title" className="min-w-0 max-w-[70ch] break-words xl:col-start-1 xl:row-start-1">
            {document ? (
              <div id="policy-document" className="scroll-mt-28"><RichText
                data={document}
                className="space-y-6 text-base leading-[1.8] sm:text-lg [&_a]:underline [&_a]:decoration-current/40 [&_a]:underline-offset-4 [&_h2]:scroll-mt-28 [&_h2]:pt-8 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:leading-snug [&_h3]:scroll-mt-28 [&_h3]:pt-6 [&_h3]:text-xl [&_h3]:font-medium [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
              /></div>
            ) : content ? (
              <div className="space-y-12 sm:space-y-16">
                  {content.sections.map((section, index) => (
                    <section key={index} id={`policy-section-${index}`} aria-labelledby={`policy-heading-${index}`} className="scroll-mt-28">
                      <h2 id={`policy-heading-${index}`} className="font-heading text-2xl leading-snug tracking-tight sm:text-3xl">{section.heading}</h2>
                      <div className="mt-5 space-y-5 text-base leading-[1.8] sm:text-lg">
                        {section.paragraphs.map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex} className="whitespace-pre-line">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            ) : (
              <p className="max-w-prose border-l-2 border-border pl-6 text-base leading-relaxed text-muted-foreground">
                {t("unavailable", { title })}
              </p>
            )}
            <nav aria-label={t("relatedPolicies")} className="mt-12 border-t border-border pt-6 xl:hidden">
              <h2 className="mb-3 text-sm font-medium">{t("relatedPolicies")}</h2>
              {related.map((key) => <Link key={key} href={`/${key}`} className="flex min-h-12 items-center py-3 text-sm text-muted-foreground underline decoration-current/30 underline-offset-4 outline-offset-4 transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-2">{t(key)}</Link>)}
            </nav>
          </article>
        </div>
      </main>
      {showSeller ? <SellerDisclosure seller={seller} /> : null}
    </div>
  );
}
