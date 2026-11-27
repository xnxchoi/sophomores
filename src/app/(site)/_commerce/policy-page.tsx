import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { FXFrameOff } from "@/components/shell/Footer/footer-visibility";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import {
  type ApprovedPolicy,
  type PolicyKey
} from "@/lib/commerce/disclosures";
import { DocsContentsNav } from "../_long-form/contents-nav";
import { LongFormDocument, LongFormSections, documentOutline, editorDocument, sectionsContents } from "../_long-form/long-form";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

export function PolicyPage({
  policy,
  content = null,
  document: authored = null,
  readFailed = false
}: {
  policy: PolicyKey;
  content?: ApprovedPolicy | null;
  /** Owner-edited policy text from the business-info global; wins when present. */
  document?: SerializedEditorState | null;
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

  return (
    <div lang={locale} className="min-h-dvh bg-background text-foreground">
      {/* The policy pages keep the FXFrame band off (owner, 23 Nov: "oh the policy pages"). */}
      <FXFrameOff />
      {/* The Hideaway's legal layout and type as hideawayseoul.com/terms renders today (DocsShell): the header and text
          in a wide left column, a sticky right column of contents and related policies level with the header. Sizes,
          line heights, spacing and tones are measured from the live page at 390 and 1440; its column gap steps at 1280
          and 1440, and its 1280-1439 tier sets larger titles and smaller headings and text; ours follow both. 1440 is
          min-[90rem], so it sorts after xl. The side inset is the site's shared PageInset, as on the product page (owner,
          22 Nov: "checkout and terms should have as much margin on the sides as like the product page"). The face is ours. */}
      <PageInset as="main" className="min-h-[70svh] pt-[100px] pb-[60px] sm:pt-[150px]">
        <div className="grid min-w-0 grid-cols-1 gap-[30px] xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:gap-15 min-[90rem]:gap-20">
          <article aria-labelledby="policy-title" className="min-w-0 opacity-90 animate-in fade-in slide-in-from-bottom-2 fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)]">
            <header className="mb-[30px] xl:mb-[50px] min-[90rem]:mb-[60px]">
              <p className="text-[10px] leading-[1.333] tracking-[0.1em] text-foreground/45 uppercase xl:text-xs xl:leading-[1.43]">{t("eyebrow")}</p>
              <h1 id="policy-title" className="mt-2.5 scroll-mt-header text-[36px] leading-[1.05] font-light tracking-[-0.025em] text-balance xl:text-[48px] min-[90rem]:text-[40px]">{title}</h1>
              {!document && content ? (
                <p className="mt-5 text-xs leading-[1.43] text-foreground/45 xl:text-sm xl:leading-[1.75]">
                  {t("effectiveDate")}{" "}<time dateTime={content.effectiveDate}>{content.effectiveDate}</time>
                </p>
              ) : null}
            </header>
            {document && outline ? (
              <div id="policy-document" className="scroll-mt-header">
                <LongFormDocument
                  data={document}
                  ids={outline.ids}
                  tableLabel={t("table")}
                  className="text-[14px] sm:text-[14px] leading-[1.75] xl:leading-[1.8] min-[90rem]:leading-[1.667] [&>*+*]:mt-[18.67px] xl:[&>*+*]:mt-[16.8px] min-[90rem]:[&>*+*]:mt-[18.67px] [&_h2]:pt-[10px] xl:[&_h2]:pt-[18.2px] min-[90rem]:[&_h2]:pt-[26px] [&_h2:first-child]:pt-0 [&_h2]:text-[15.75px] sm:[&_h2]:text-[15.75px] xl:[&_h2]:text-[22.5px] min-[90rem]:[&_h2]:text-[30px] [&_h2]:leading-[1.333] xl:[&_h2]:leading-[1.111] min-[90rem]:[&_h2]:leading-[1.083] [&_h2]:font-medium [&_h2]:tracking-normal [&_h2+*]:mt-3 xl:[&_h2+*]:mt-5 min-[90rem]:[&_h2+*]:mt-[25px] [&_li]:text-[11.25px] [&_li]:leading-[1.75] xl:[&_li]:text-[12.5px] xl:[&_li]:leading-[1.8] min-[90rem]:[&_li]:text-[15px] min-[90rem]:[&_li]:leading-[1.667] [&_li+li]:mt-[7.5px] [&_ul]:pl-[17px] xl:[&_ul]:pl-5 min-[90rem]:[&_ul]:pl-6 [&_ol]:pl-[17px] xl:[&_ol]:pl-5 min-[90rem]:[&_ol]:pl-6"
                />
              </div>
            ) : content ? (
              <LongFormSections
                sections={content.sections}
                className="space-y-[29px] sm:space-y-[29px] xl:space-y-[35px] min-[90rem]:space-y-[45px]"
                headingClassName="text-[15.75px] sm:text-[15.75px] leading-[1.333] font-medium tracking-normal xl:text-[22.5px] xl:leading-[1.111] min-[90rem]:text-[30px] min-[90rem]:leading-[1.083]"
                proseClassName="mt-3 xl:mt-5 min-[90rem]:mt-[25px] text-[14px] sm:text-[14px] leading-[1.75] xl:leading-[1.8] min-[90rem]:leading-[1.667] [&>*+*]:mt-[18.67px] xl:[&>*+*]:mt-[16.8px] min-[90rem]:[&>*+*]:mt-[18.67px] [&_li]:text-[11.25px] [&_li]:leading-[1.75] xl:[&_li]:text-[12.5px] xl:[&_li]:leading-[1.8] min-[90rem]:[&_li]:text-[15px] min-[90rem]:[&_li]:leading-[1.667] [&_li+li]:mt-[7.5px] [&_ul]:pl-[17px] xl:[&_ul]:pl-5 min-[90rem]:[&_ul]:pl-6 [&_ol]:pl-[17px] xl:[&_ol]:pl-5 min-[90rem]:[&_ol]:pl-6"
              />
            ) : (
              <p className="max-w-prose border-l-2 border-border pl-6 text-base leading-relaxed text-muted-foreground">
                {readFailed ? t("unavailableFailed", { title }) : t("unavailable", { title })}
              </p>
            )}
          </article>
          {/* A long rail scrolls inside itself on wheel; Lenis would otherwise move the page instead. */}
          <aside data-lenis-prevent-wheel className="min-w-0 animate-in fade-in fill-mode-both [animation-timing-function:var(--ease-standard)] animation-duration-[var(--duration-spring)] xl:sticky xl:top-header xl:max-h-[calc(100svh_-_var(--spacing-header)_-_1rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain">
            <DocsContentsNav entries={contents} label={t("contents")} />
            <nav aria-label={t("relatedPolicies")} className="mt-[30px] border-t border-border/15 pt-5 pl-[12.5px]">
              <h2 className="text-[10px] leading-[1.333] tracking-[0.1em] text-foreground/55 uppercase xl:text-xs xl:leading-[1.43]">{t("relatedPolicies")}</h2>
              <ul className="mt-5">
                {related.map((key) => (
                  <li key={key}>
                    <Link href={`/${key}`} className="group/focus flex items-center py-1 text-[14px] leading-[1.714] text-foreground/70 transition-colors hover:text-foreground pointer-coarse:min-h-12"><FocusShape className="outline-offset-4">{t(key)}</FocusShape></Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </PageInset>
    </div>
  );
}
