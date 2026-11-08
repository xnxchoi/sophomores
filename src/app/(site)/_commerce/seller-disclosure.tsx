import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  commerceDisclosure,
  type SellerInformation
} from "@/lib/commerce/disclosures";

/** One persistent, server-rendered disclosure surface for home and checkout. */
export function SellerDisclosure({
  seller = commerceDisclosure.seller,
  className
}: {
  seller?: SellerInformation | null;
  className?: string;
}) {
  return (
    <section
      lang="ko"
      aria-label="판매자 및 거래 안내"
      className={cn(
        "border-t border-current/20 px-6 py-8 text-current sm:px-10",
        className
      )}
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-sm font-medium">판매자 정보</h2>
        {seller ? (
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm leading-relaxed sm:grid-cols-2">
            <div>
              <dt className="text-xs opacity-60">상호명</dt>
              <dd className="mt-1 break-words">{seller.name}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">사업자등록번호</dt>
              <dd className="mt-1 break-words">{seller.registrationNumber}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">대표자명</dt>
              <dd className="mt-1 break-words">{seller.representative}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">사업장 주소</dt>
              <dd className="mt-1 break-words">{seller.address}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">전화번호</dt>
              <dd className="mt-1 break-words">{seller.phone}</dd>
            </div>
            {seller.mailOrderRegistrationNumber ? (
              <div>
                <dt className="text-xs opacity-60">통신판매업 신고번호</dt>
                <dd className="mt-1 break-words">
                  {seller.mailOrderRegistrationNumber}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-relaxed opacity-70">
            판매자 정보가 아직 공개되지 않았습니다.
          </p>
        )}
        <nav
          aria-label="거래 관련 정책"
          className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm"
        >
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
          >
            이용약관
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/refund"
            className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
          >
            취소·환불 안내
          </Link>
        </nav>
      </div>
    </section>
  );
}
