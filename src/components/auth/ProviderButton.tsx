"use client";

import { AUTH_PROVIDER_BUTTON_CLASS } from "@/components/auth/auth-styles";
import { HA_Button as Button } from "@/components/ui/button";
import { errorToast } from "@/components/ui/sonner";
import { getAuthErrorMessage } from "@/lib/auth/auth-error";
import { authClient } from "@/lib/auth/client";
import type { AuthProvider } from "@/lib/auth/providers";
import { getSearchParam } from "@/lib/auth/search-param";
import { normalizeLocalReturnTo } from "@/lib/routes/auth";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

export type AuthSocialLayout = "auto" | "horizontal" | "grid" | "vertical";

interface ProviderButtonProps {
  className?: string;
  classNames?: { form?: { icon?: string } };
  callbackURL?: string;
  isSubmitting: boolean;
  provider: AuthProvider;
  redirectTo?: string;
  socialLayout: AuthSocialLayout;
  setIsSubmitting: (isSubmitting: boolean) => void;
}

export function ProviderButton({
  classNames,
  callbackURL: callbackURLProp,
  isSubmitting,
  provider,
  redirectTo: redirectToProp,
  socialLayout,
  setIsSubmitting
}: ProviderButtonProps) {
  const t = useTranslations("Auth");
  const [isProviderSubmitting, setIsProviderSubmitting] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);

  const clearResetTimer = () => {
    if (resetTimerRef.current === undefined) return;
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = undefined;
  };

  const scheduleReset = () => {
    clearResetTimer();
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = undefined;
      setIsSubmitting(false);
      setIsProviderSubmitting(false);
    }, 10000);
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      attemptRef.current += 1;
      if (resetTimerRef.current !== undefined) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const getRedirectTo = useCallback(
    () =>
      normalizeLocalReturnTo(
        redirectToProp || getSearchParam("redirectTo"),
        "/me"
      ),
    [redirectToProp]
  );

  const getCallbackURL = useCallback(
    () => callbackURLProp || getRedirectTo(),
    [callbackURLProp, getRedirectTo]
  );

  const doSignInSocial = async () => {
    const attempt = ++attemptRef.current;
    clearResetTimer();
    setIsSubmitting(true);
    setIsProviderSubmitting(true);

    try {
      await authClient.signIn.social({
        provider: provider.id,
        callbackURL: getCallbackURL(),
        fetchOptions: { throw: true }
      });

      if (!mountedRef.current || attempt !== attemptRef.current) return;

      scheduleReset();
    } catch (error) {
      if (!mountedRef.current || attempt !== attemptRef.current) return;

      clearResetTimer();
      errorToast(getAuthErrorMessage(error, t));

      setIsSubmitting(false);
      setIsProviderSubmitting(false);
    }
  };

  const signInWith = t("providers.signInWith").trim();
  const providerLabel = signInWith
    ? `${signInWith} ${provider.name}`
    : provider.name;

  return (
    <Button
      variant="outline"
      className={AUTH_PROVIDER_BUTTON_CLASS}
      disabled={isSubmitting || isProviderSubmitting}
      aria-busy={isProviderSubmitting}
      aria-label={providerLabel}
      onClick={doSignInSocial}
      data-themed={"background-color,color"}
    >
      {isProviderSubmitting && <CircleNotchIcon className="animate-spin" />}
      {!isProviderSubmitting && provider.icon && (
        <provider.icon className={classNames?.form?.icon} />
      )}
      {!isProviderSubmitting && socialLayout === "grid" && provider.name}
      {!isProviderSubmitting && socialLayout === "vertical" && providerLabel}
    </Button>
  );
}
