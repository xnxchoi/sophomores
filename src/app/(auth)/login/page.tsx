import { getTranslations } from "next-intl/server";
import { Field } from "../_shared/field";
import { SubmitButton } from "../_shared/submit-button";
export const dynamic = "force-dynamic";

interface LoginPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations("PreviewAuth");
  const invalid = (await searchParams).error === "credentials";
  return (
    <>
      <div id="login-feedback" className="flex h-20 items-end pb-2" aria-hidden={invalid ? undefined : true}>
        {invalid && (
          <p className="m-0 border-l-2 border-preview-error pl-3 text-sm leading-6 text-preview-foreground" role="alert">
            {t("theUsernameOrPasswordIsIncorrectPleaseTryAgain")}
          </p>
        )}
      </div>
      <form method="post" action="/api/session" className="flex flex-col gap-6">
        <Field
          label={t("user")}
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={128}
          required
        />
        <Field
          label={t("passcode")}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-preview-secondary">
          <input
            className="size-4 shrink-0 cursor-pointer accent-preview-accent transition-[border-color,box-shadow,background-color,outline-color] duration-200 ease-out focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-preview-accent"
            type="checkbox"
            name="remember"
            value="yes"
            defaultChecked
          />
          {t("remember")}
        </label>
        <SubmitButton className="mt-2">{t("preview")}</SubmitButton>
      </form>
    </>
  );
}
