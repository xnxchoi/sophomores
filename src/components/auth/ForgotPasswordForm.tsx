"use client";

import { AUTH_PRIMARY_BUTTON_CLASS } from "@/components/auth/auth-styles";
import { HA_Button as Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { errorToast, successToast } from "@/components/ui/sonner";
import { getAuthErrorMessage } from "@/lib/auth/auth-error";
import { authClient } from "@/lib/auth/client";
import { useIsHydrated } from "@/lib/auth/useIsHydrated";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleNotchIcon as Loader2 } from "@phosphor-icons/react";
import type { BetterFetchOption } from "better-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export function ForgotPasswordForm({
  className,
  classNames,
  isSubmitting,
  setIsSubmitting
}: {
  className?: string;
  classNames?: {
    base?: string;
    input?: string;
    label?: string;
    error?: string;
    button?: string;
    primaryButton?: string;
  };
  isSubmitting?: boolean;
  setIsSubmitting?: (value: boolean) => void;
}) {
  const t = useTranslations("Auth");
  const isHydrated = useIsHydrated();
  const router = useRouter();

  const formSchema = z.object({
    email: z
      .string()
      .min(1, {
        message: `${t("fields.email")} ${t("fields.isRequired")}`
      })
      .email({
        message: `${t("fields.email")} ${t("fields.isInvalid")}`
      })
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ""
    }
  });

  isSubmitting = isSubmitting || form.formState.isSubmitting;

  useEffect(() => {
    setIsSubmitting?.(form.formState.isSubmitting);
  }, [form.formState.isSubmitting, setIsSubmitting]);

  async function forgotPassword({ email }: z.infer<typeof formSchema>) {
    try {
      const fetchOptions: BetterFetchOption = { throw: true };

      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
        fetchOptions
      });

      successToast(t("forgotPassword.emailSent"));
      router.push(`/sign-in${window.location.search}`);
    } catch (error) {
      errorToast(getAuthErrorMessage(error, t));
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(forgotPassword)}
        noValidate
        className={cn("grid w-full gap-6", className, classNames?.base)}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("fields.email")}
              </FormLabel>
              <FormControl>
                <Input
                  className={classNames?.input}
                  type="email"
                  placeholder={t("fields.emailPlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage className={classNames?.error} />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isSubmitting || !isHydrated}
          className={cn(
            AUTH_PRIMARY_BUTTON_CLASS,
            classNames?.button,
            classNames?.primaryButton
          )}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            t("forgotPassword.action")
          )}
        </Button>
      </form>
    </Form>
  );
}
