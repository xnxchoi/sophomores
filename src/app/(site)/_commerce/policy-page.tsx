import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
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
  return (
    <div lang={locale} className="min-h-dvh bg-[#f5f4f0] text-[#171717]">
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-16 sm:px-10 sm:pt-40">
        <Link
          href="/tickets"
          className="mb-10 inline-flex min-h-11 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
        >
          {t("backToTickets")}
        </Link>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {title}
        </h1>
        {document ? (
          <RichText
            data={document}
            className="mt-10 space-y-4 text-base leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-6 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:pt-4 [&_h3]:font-medium [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          />
        ) : content ? (
          <>
            <p className="mt-4 text-sm opacity-60">
              {t("effectiveDate")}{" "}
              <time dateTime={content.effectiveDate}>
                {content.effectiveDate}
              </time>
            </p>
            <div className="mt-10 space-y-10">
              {content.sections.map((section, index) => (
                <section key={index}>
                  <h2 className="text-lg font-medium">{section.heading}</h2>
                  <div className="mt-4 space-y-4 text-base leading-relaxed">
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex} className="whitespace-pre-line">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-8 text-base leading-relaxed opacity-70">
            {t("unavailable", { title })}
          </p>
        )}
      </main>
      {showSeller ? <SellerDisclosure seller={seller} /> : null}
    </div>
  );
}
