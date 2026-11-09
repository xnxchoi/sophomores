"use client";

import { AUTH_PROVIDER_BUTTON_CLASS } from "@/hideaway/components/auth/auth-styles";
import { HA_Button as Button } from "@/components/ui/button";
import { errorToast } from "@/hideaway/components/ui/sonner";
import { getAuthErrorMessage } from "@/lib/auth/auth-error";
import { authClient } from "@/lib/auth/client";
import { useOnSuccessTransition } from "@/lib/auth/useOnSuccessTransition";
import { cn } from "@/lib/utils";
import { FingerprintIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface PasskeyButtonProps {
  classNames?: { form?: { button?: string; secondaryButton?: string } };
  isSubmitting?: boolean;
  redirectTo?: string;
  setIsSubmitting?: (isSubmitting: boolean) => void;
}

export function PasskeyButton({
  classNames,
  isSubmitting,
  redirectTo,
  setIsSubmitting
}: PasskeyButtonProps) {
  const t = useTranslations("Auth");
  const { onSuccess } = useOnSuccessTransition({ redirectTo });

  const signInPassKey = async () => {
    setIsSubmitting?.(true);

    try {
      const response = await authClient.signIn.passkey({
        fetchOptions: { throw: true }
      });

      if (response?.error) {
        errorToast(getAuthErrorMessage(response.error, t));
        setIsSubmitting?.(false);
      } else {
        await onSuccess();
      }
    } catch (error) {
      errorToast(getAuthErrorMessage(error, t));
      setIsSubmitting?.(false);
    }
  };

  return (
    <Button
      className={cn(
        AUTH_PROVIDER_BUTTON_CLASS,
        classNames?.form?.button,
        classNames?.form?.secondaryButton
      )}
      disabled={isSubmitting}
      formNoValidate
      name="passkey"
      value="true"
      data-themed={"background-color,color"}
      variant="outline"
      onClick={signInPassKey}
    >
      <FingerprintIcon />
      {t("providers.signInWith")} {t("providers.passkey")}
    </Button>
  );
}
