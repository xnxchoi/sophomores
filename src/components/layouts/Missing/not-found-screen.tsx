import { useTranslations } from "next-intl";
import { LinkUnderlined } from "@/components/core/Link/Link";
import { Missing } from "./Missing";
import { MissingLayout } from "./lays.client";

/** Hideaway's 404 page. The layout already mounts the providers. */
export function NotFoundPage() {
  const t = useTranslations("System");
  return (
    <>
      <h1 className="sr-only">{t("notFoundDescription")}</h1>
      <div className="title-wrapper fixed h-full w-full">
        <MissingLayout />
      </div>
      <Missing />
      <div className="fixed z-1 flex h-full w-full items-center justify-center px-6">
        <nav aria-label={t("notFoundNavigation")} className="relative bottom-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <LinkUnderlined className="inline-flex min-h-12 items-center bg-transparent hover:text-red-500" href="/">
            {t("returnHome")}
          </LinkUnderlined>
          <LinkUnderlined className="inline-flex min-h-12 items-center bg-transparent hover:text-red-500" href="/shop">
            {t("notFoundShop")}
          </LinkUnderlined>
        </nav>
      </div>
    </>
  );
}
