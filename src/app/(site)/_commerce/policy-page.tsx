import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import {
  type ApprovedPolicy,
  type SellerInformation,
  type PolicyKey
} from "@/lib/commerce/disclosures";
import { ContentsNav } from "../_long-form/contents-nav";
import { EditorialPage } from "../_long-form/editorial-page";
import { LongFormDocument, LongFormSections, documentOutline, editorDocument, sectionsContents } from "../_long-form/long-form";
import { SellerDisclosure } from "./seller-disclosure";

export function PolicyPage({
  policy,
  content = null,
  seller = null,
  document: authored = null,
  showSeller = true,
  readFailed = false
}: {
  policy: PolicyKey;
  content?: ApprovedPolicy | null;
  seller?: SellerInformation | null;
  /** Owner-edited policy text from the business-info global; wins when present. */
  document?: SerializedEditorState | null;
  /** The site footer carries the seller facts once the global is complete. */
  showSeller?: boolean;
  /** A source could not be read: with nothing to show, say so rather than implying the text is unpublished. */
  readFailed?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("Customer.policy");
  const title = t(policy);
  const related = (["terms", "privacy", "refund"] as const).filter((key) => key !== policy);
  // Owner text is used only in the editor's document shape; anything else falls back to the approved sections.
  const document = editorDocument(authored);
  const sections = document ? [] : content?.sections ?? [];
  const outline = document ? documentOutline(document) : null;
  // A document without headings keeps its single published anchor.
  const contents = outline
    ? (outline.entries.length > 0 ? outline.entries : [{ id: "policy-document", label: title, depth: 2 as const }])
    : sectionsContents(sections);

  const relatedLinks = related.map((key) => (
    <Link key={key} href={`/${key}`} className="flex min-h-12 items-center py-3 text-sm text-muted-foreground underline decoration-current/30 underline-offset-4 outline-offset-4 transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-2">{t(key)}</Link>
  ));

  return (
    <div lang={locale} className="min-h-dvh bg-background text-foreground">
      <EditorialPage
        title={title}
        titleId="policy-title"
        lead={<Link
          href="/shop"
          className="inline-flex min-h-12 items-center text-sm text-muted-foreground underline decoration-current/40 underline-offset-4 outline-offset-4 transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-2"
        >
          {t("backToTickets")}
        </Link>}
        standfirst={!document && content ? <p className="text-sm">
          {t("effectiveDate")}{" "}<time dateTime={content.effectiveDate}>{content.effectiveDate}</time>
        </p> : undefined}
        rail={<>
          <ContentsNav entries={contents} label={t("contents")} />
          <nav aria-label={t("relatedPolicies")} className="hidden border-t border-border pt-6 lg:mt-8 lg:block">
            <h2 className="mb-3 text-xs tracking-widest text-muted-foreground uppercase">{t("relatedPolicies")}</h2>
            {relatedLinks}
          </nav>
        </>}
      >
        <article aria-labelledby="policy-title" className="min-w-0">
          {document && outline ? (
            <div id="policy-document" className="scroll-mt-header">
              <LongFormDocument data={document} ids={outline.ids} tableLabel={t("table")} />
            </div>
          ) : content ? (
            <LongFormSections sections={content.sections} />
          ) : (
            <p className="max-w-prose border-l-2 border-border pl-6 text-base leading-relaxed text-muted-foreground">
              {readFailed ? t("unavailableFailed", { title }) : t("unavailable", { title })}
            </p>
          )}
          <nav aria-label={t("relatedPolicies")} className="mt-12 border-t border-border pt-6 lg:hidden">
            <h2 className="mb-3 text-sm">{t("relatedPolicies")}</h2>
            {relatedLinks}
          </nav>
        </article>
      </EditorialPage>
      {showSeller ? <SellerDisclosure seller={seller} /> : null}
    </div>
  );
}
