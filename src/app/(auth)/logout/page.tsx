import { getTranslations } from "next-intl/server";
export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  const t = await getTranslations("PreviewAuth");
  return (
    <>
      <h1 className="mb-2 text-4xl font-medium tracking-[-1.5px]">{t("signOut")}</h1>
      <p className="my-4 text-preview-secondary">{t("thisWillEndThePreviewSessionInThisBrowser")}</p>
      <form method="post" action="/api/session/logout">
        <button
          className="mt-7 w-full cursor-pointer rounded-md border-0 bg-preview-accent p-3.25 font-semibold text-preview-on-accent focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent"
          type="submit"
        >
          {t("signOutLabel")}
        </button>
      </form>
      {/* Native navigation is intentional: the login document cannot load client JS. */}
      <p className="my-4">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="text-preview-accent underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent" href="/">
          {t("backToPreview")}
        </a>
      </p>
    </>
  );
}
