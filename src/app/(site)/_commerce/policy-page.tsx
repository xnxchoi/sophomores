import Link from "next/link";
import {
  policyTitles,
  type ApprovedPolicy,
  type SellerInformation,
  type PolicyKey
} from "@/lib/commerce/disclosures";
import { SellerDisclosure } from "./seller-disclosure";

export function PolicyPage({
  policy,
  content = null,
  seller = null
}: {
  policy: PolicyKey;
  content?: ApprovedPolicy | null;
  seller?: SellerInformation | null;
}) {
  return (
    <div lang="ko" className="min-h-dvh bg-[#f5f4f0] text-[#171717]">
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-16 sm:px-10 sm:pt-40">
        <Link
          href="/tickets"
          className="mb-10 inline-flex min-h-11 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
        >
          티켓 안내로 돌아가기
        </Link>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {policyTitles[policy]}
        </h1>
        {content ? (
          <>
            <p className="mt-4 text-sm opacity-60">
              시행일{" "}
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
            {policyTitles[policy]} 본문은 아직 공개되지 않았습니다.
          </p>
        )}
      </main>
      <SellerDisclosure seller={seller} />
    </div>
  );
}
