import { getTranslations } from "next-intl/server";
import { SubmitButton } from "../_shared/submit-button";
export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  const t = await getTranslations("PreviewAuth");
  return (
    <>
      <h1 className="m-0 text-4xl leading-tight font-medium tracking-[-0.04em] text-balance">{t("signOut")}</h1>
      <p className="mt-3 mb-0 text-sm leading-6 text-pretty text-preview-secondary">{t("thisWillEndThePreviewSessionInThisBrowser")}</p>
      <form method="post" action="/api/session/logout">
        <SubmitButton className="mt-8">{t("signOutLabel")}</SubmitButton>
      </form>
      {/* Native navigation is intentional: the login document cannot load client JS. */}
      <p className="mt-4 mb-0 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          className="inline-flex min-h-11 items-center text-sm text-preview-foreground underline decoration-preview-border underline-offset-4 transition-[text-decoration-color] duration-200 ease-out hover:decoration-current focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-preview-accent"
          href="/"
        >
          {t("backToPreview")}
        </a>
      </p>
    </>
  );
}
