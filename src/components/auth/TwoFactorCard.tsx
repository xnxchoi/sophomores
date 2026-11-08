"use client";

import { AUTH_PRIMARY_BUTTON_CLASS } from "@/components/auth/auth-styles";
import { AuthTextLink } from "@/components/auth/AuthTextLink";
import { HA_Button as Button } from "@/components/ui/button";
import { HA_Card as Card, HA_CardContent as CardContent, HA_CardDescription as CardDescription, HA_CardFooter as CardFooter, HA_CardHeader as CardHeader, HA_CardTitle as CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorToast } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth/client";
import { useIsHydrated } from "@/lib/auth/useIsHydrated";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TwoFactorCard({ mode }: { mode: "totp" | "otp" }) {
  const t = useTranslations("Auth.twoFactor");
  const isHydrated = useIsHydrated();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? "";

  const submitTotp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      errorToast(t("invalidLength"));
      return;
    }
    setPending(true);
    try {
      const res = await authClient.twoFactor.verifyTotp({ code });
      if (res.data?.token) {
        router.push("/me");
        return;
      }
      errorToast(t("invalidCode"));
    } catch {
      errorToast(t("invalidCode"));
    } finally {
      setPending(false);
    }
  };

  const sendOtp = async () => {
    setPending(true);
    try {
      await authClient.twoFactor.sendOtp();
      setOtpSent(true);
    } catch {
      errorToast(t("sendFailed"));
    } finally {
      setPending(false);
    }
  };

  const submitOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      errorToast(t("invalidLength"));
      return;
    }
    setPending(true);
    try {
      const res = await authClient.twoFactor.verifyOtp({ code });
      if (res.data) {
        router.push("/me");
        return;
      }
      errorToast(t("invalidCode"));
    } catch {
      errorToast(t("invalidCode"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div data-auth-ready={isHydrated ? "true" : "false"}>
      <Card className="bg-faded-background/50">
        <CardHeader className="gap-0 text-center">
          <CardTitle className="mb-2 font-sans text-4xl font-medium tracking-tight text-off-foreground">
            {t("title")}
          </CardTitle>
          <CardDescription className="font-sans text-xs text-muted-foreground md:text-sm">
            {mode === "totp" ? t("totpDescription") : t("otpDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "totp" ? (
            <form className="grid gap-6" onSubmit={submitTotp}>
              <Input
                id="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={t("codePlaceholder")}
                disabled={pending || !isHydrated}
                className="text-center tracking-[0.4em]"
              />
              <Button
                type="submit"
                disabled={pending || !isHydrated || code.length !== 6}
                className={AUTH_PRIMARY_BUTTON_CLASS}
              >
                {pending ? (
                  <CircleNotchIcon className="animate-spin" />
                ) : (
                  t("verify")
                )}
              </Button>
            </form>
          ) : !otpSent ? (
            <Button
              type="button"
              onClick={sendOtp}
              disabled={pending || !isHydrated}
              className={AUTH_PRIMARY_BUTTON_CLASS}
            >
              {pending ? (
                <CircleNotchIcon className="animate-spin" />
              ) : (
                t("sendEmail")
              )}
            </Button>
          ) : (
            <form className="grid gap-6" onSubmit={submitOtp}>
              {email ? (
                <p className="text-center text-sm text-muted-foreground">
                  {t("sentTo", { email })}
                </p>
              ) : null}
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={t("codePlaceholder")}
                disabled={pending}
                className="text-center tracking-[0.4em]"
              />
              <Button
                type="submit"
                disabled={pending || code.length !== 6}
                className={AUTH_PRIMARY_BUTTON_CLASS}
              >
                {pending ? (
                  <CircleNotchIcon className="animate-spin" />
                ) : (
                  t("verify")
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-faded-foreground">
          {mode === "totp" ? (
            <AuthTextLink href="/two-factor/otp">{t("useEmail")}</AuthTextLink>
          ) : (
            <AuthTextLink href="/two-factor">{t("useApp")}</AuthTextLink>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
