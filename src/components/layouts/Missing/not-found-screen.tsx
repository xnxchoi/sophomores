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
          <LinkUnderlined className="inline-flex min-h-12 items-center bg-transparent hover:text-deep-cinnabar" href="/">
            {t("returnHome")}
          </LinkUnderlined>
        </nav>
      </div>
      {/* Everything above is fixed, so the page had no height of its own and the pinned footer (FooterGate) showed at
          once, across the top of the screen (live check, 25 Nov). One screen of page keeps it under the page until a
          scroll reveals it, as everywhere else. */}
      <div aria-hidden="true" className="h-dvh" />
    </>
  );
}
