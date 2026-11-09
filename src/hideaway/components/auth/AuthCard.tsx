"use client";

import { AuthTextLink } from "@/hideaway/components/auth/AuthTextLink";
import { ForgotPasswordForm } from "@/hideaway/components/auth/ForgotPasswordForm";
import { PasskeyButton } from "@/hideaway/components/auth/PasskeyButton";
import { ProviderButton } from "@/hideaway/components/auth/ProviderButton";
import { ResetPasswordForm } from "@/hideaway/components/auth/ResetPasswordForm";
import { SignInForm } from "@/hideaway/components/auth/SignInForm";
import { SignUpForm } from "@/hideaway/components/auth/SignUpForm";
import { HA_Card as Card, HA_CardContent as CardContent, HA_CardDescription as CardDescription, HA_CardFooter as CardFooter, HA_CardHeader as CardHeader, HA_CardTitle as CardTitle } from "@/components/ui/card";
import { isPasskeyEnabled } from "@/lib/auth/passkey-enabled";
import { AUTH_PROVIDERS } from "@/lib/auth/providers";
import { useIsHydrated } from "@/lib/auth/useIsHydrated";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

export type AuthView =
  | "SIGN_IN"
  | "SIGN_UP"
  | "FORGOT_PASSWORD"
  | "RESET_PASSWORD";

export type AuthSocialLayout = "auto" | "horizontal" | "grid" | "vertical";

export interface AuthCardProps {
  className?: string;
  classNames?: {
    header?: string;
    title?: string;
    description?: string;
    content?: string;
    continueWith?: string;
    footer?: string;
    footerLink?: string;
    form?: {
      icon?: string;
      button?: string;
      secondaryButton?: string;
    };
  };
  callbackURL?: string;
  cardHeader?: ReactNode;
  redirectTo?: string;
  socialLayout?: AuthSocialLayout;
  view?: AuthView;
  showAccountSwitch?: boolean;
}

export function AuthCard({
  classNames,
  callbackURL,
  cardHeader,
  redirectTo,
  socialLayout: socialLayoutProp = "auto",
  view = "SIGN_IN",
  showAccountSwitch
}: AuthCardProps) {
  const t = useTranslations("Auth");
  const isHydrated = useIsHydrated();
  const passkey = isPasskeyEnabled();
  const showSocial = view === "SIGN_IN" || view === "SIGN_UP";
  const showPasskey = passkey && view === "SIGN_IN";
  const accountSwitch =
    showAccountSwitch ??
    (view === "SIGN_IN" ||
      view === "SIGN_UP" ||
      view === "FORGOT_PASSWORD" ||
      view === "RESET_PASSWORD");
  const search = isHydrated ? window.location.search : "";

  let socialLayout = socialLayoutProp;
  if (socialLayout === "auto") {
    socialLayout = "vertical";
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handlePageHide = () => setIsSubmitting(false);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      setIsSubmitting(false);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  const title =
    view === "SIGN_IN"
      ? t("signIn.title")
      : view === "SIGN_UP"
        ? t("signUp.title")
        : view === "FORGOT_PASSWORD"
          ? t("forgotPassword.title")
          : t("resetPassword.title");

  const description =
    view === "SIGN_IN"
      ? t("signIn.description")
      : view === "SIGN_UP"
        ? t("signUp.description")
        : view === "FORGOT_PASSWORD"
          ? t("forgotPassword.description")
          : t("resetPassword.description");

  return (
    <div
      className={cn("flex flex-col gap-6")}
      data-auth-ready={isHydrated ? "true" : "false"}
    >
      <Card className="bg-faded-background/50">
        <CardHeader className={cn("gap-0 text-center", classNames?.header)}>
          {cardHeader ? (
            cardHeader
          ) : (
            <>
              <CardTitle
                className={cn(
                  "mb-2 font-sans text-4xl font-medium tracking-tight text-off-foreground",
                  classNames?.title
                )}
              >
                {title}
              </CardTitle>
              {description && (
                <CardDescription
                  className={cn(
                    "font-sans text-xs text-muted-foreground md:text-sm",
                    classNames?.description
                  )}
                >
                  {description}
                </CardDescription>
              )}
            </>
          )}
        </CardHeader>

        <CardContent className={cn("grid gap-6", classNames?.content)}>
          <div className="flex flex-col gap-6">
            {view === "SIGN_IN" && (
              <SignInForm
                classNames={classNames?.form}
                isSubmitting={isSubmitting}
                redirectTo={redirectTo}
                setIsSubmitting={setIsSubmitting}
              />
            )}
            {view === "SIGN_UP" && (
              <SignUpForm
                classNames={classNames?.form}
                callbackURL={callbackURL}
                isSubmitting={isSubmitting}
                redirectTo={redirectTo}
                setIsSubmitting={setIsSubmitting}
              />
            )}
            {view === "FORGOT_PASSWORD" && (
              <ForgotPasswordForm
                classNames={classNames?.form}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
              />
            )}
            {view === "RESET_PASSWORD" && (
              <ResetPasswordForm classNames={classNames?.form} />
            )}
          </div>

          {showSocial && (
            <>
              <div
                className={cn(
                  "relative flex h-px w-full items-center justify-center",
                  classNames?.continueWith
                )}
              >
                <div className="h-px flex-1 bg-linear-to-r from-transparent to-foreground/40" />
                <div className="px-3 text-center text-[11px] tracking-wide text-muted-foreground">
                  {t("providers.orContinueWith")}
                </div>
                <div className="h-px flex-1 bg-linear-to-r from-foreground/40 to-transparent" />
              </div>

              <div className="grid gap-3">
                <div
                  className={cn(
                    "flex w-full items-center justify-between gap-3",
                    socialLayout === "horizontal" && "flex-wrap",
                    socialLayout === "vertical" && "flex-col",
                    socialLayout === "grid" && "grid grid-cols-2"
                  )}
                >
                  {AUTH_PROVIDERS.map((provider) => (
                    <ProviderButton
                      key={provider.id}
                      classNames={classNames}
                      callbackURL={callbackURL}
                      isSubmitting={isSubmitting}
                      provider={provider}
                      redirectTo={redirectTo}
                      setIsSubmitting={setIsSubmitting}
                      socialLayout={socialLayout}
                    />
                  ))}
                </div>

                {showPasskey && (
                  <PasskeyButton
                    classNames={classNames}
                    isSubmitting={isSubmitting}
                    redirectTo={redirectTo}
                    setIsSubmitting={setIsSubmitting}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>

        {accountSwitch && (
          <CardFooter
            className={cn(
              "justify-center gap-1.5 text-sm text-muted-faded-foreground",
              classNames?.footer
            )}
          >
            {view === "SIGN_IN" ? (
              t("footer.dontHaveAccount")
            ) : view === "SIGN_UP" ? (
              t("footer.alreadyHaveAccount")
            ) : (
              <ArrowLeftIcon className="size-3" aria-hidden />
            )}

            {view === "SIGN_IN" ? (
              <AuthTextLink href={`/sign-up${search}`}>
                {t("signUp.title")}
              </AuthTextLink>
            ) : view === "SIGN_UP" ? (
              <AuthTextLink href={`/sign-in${search}`}>
                {t("signIn.title")}
              </AuthTextLink>
            ) : (
              <AuthTextLink href={`/sign-in${search}`}>
                {t("footer.goBack")}
              </AuthTextLink>
            )}
          </CardFooter>
        )}
      </Card>
      <p className="text-center text-sm text-balance text-muted-faded-foreground">
        {t("footer.termsLead")}{" "}
        <AuthTextLink href="/terms">{t("footer.terms")}</AuthTextLink>{" "}
        {t("footer.termsAnd")}{" "}
        <AuthTextLink href="/privacy">{t("footer.privacy")}</AuthTextLink>.
      </p>
    </div>
  );
}

export const AuthView = AuthCard;
