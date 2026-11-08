"use client";

import { AUTH_PRIMARY_BUTTON_CLASS } from "@/components/auth/auth-styles";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { HA_Button as Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { errorToast, successToast } from "@/components/ui/sonner";
import { getAuthErrorMessage } from "@/lib/auth/auth-error";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleNotchIcon as Loader2 } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

export function ResetPasswordForm({
  className,
  classNames
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
}) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const tokenChecked = useRef(false);

  const formSchema = z.object({
    newPassword: z.string().min(1, {
      message: t("resetPassword.newPasswordRequired")
    })
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: ""
    }
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (tokenChecked.current) return;
    tokenChecked.current = true;

    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    if (!token || token === "INVALID_TOKEN") {
      router.push(`/sign-in${window.location.search}`);
      errorToast(t("resetPassword.invalidToken"));
    }
  }, [router, t]);

  async function resetPassword({ newPassword }: z.infer<typeof formSchema>) {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get("token") as string;

      await authClient.resetPassword({
        newPassword,
        token,
        fetchOptions: { throw: true }
      });

      successToast(t("resetPassword.success"));
      router.push(`/sign-in${window.location.search}`);
    } catch (error) {
      errorToast(getAuthErrorMessage(error, t));
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(resetPassword)}
        className={cn("grid w-full gap-6", className, classNames?.base)}
      >
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("resetPassword.newPassword")}
              </FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  className={classNames?.input}
                  placeholder={t("resetPassword.newPasswordPlaceholder")}
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
          disabled={isSubmitting}
          className={cn(
            AUTH_PRIMARY_BUTTON_CLASS,
            classNames?.button,
            classNames?.primaryButton
          )}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            t("resetPassword.action")
          )}
        </Button>
      </form>
    </Form>
  );
}
