"use client";

import { AuthTextLink } from "@/components/auth/AuthTextLink";
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
import { Input } from "@/components/ui/input";
import { errorToast } from "@/components/ui/sonner";
import { getAuthErrorMessage } from "@/lib/auth/auth-error";
import { authClient } from "@/lib/auth/client";
import { useIsHydrated } from "@/lib/auth/useIsHydrated";
import { useOnSuccessTransition } from "@/lib/auth/useOnSuccessTransition";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleNotchIcon as Loader2 } from "@phosphor-icons/react";
import type { BetterFetchOption } from "@better-fetch/fetch";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import "@/styles/__inputs.scss";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({
  classNames,
  isSubmitting,
  redirectTo,
  setIsSubmitting
}: {
  classNames?: { input?: string; label?: string; error?: string };
  isSubmitting?: boolean;
  redirectTo?: string;
  setIsSubmitting?: (isSubmitting: boolean) => void;
}) {
  const t = useTranslations("Auth");
  const isHydrated = useIsHydrated();
  const router = useRouter();
  const { onSuccess, isPending: transitionPending } = useOnSuccessTransition({
    redirectTo
  });

  const formSchema = z.object({
    email: z.string().min(1, {
      message: `${t("fields.username")} ${t("fields.isRequired")}`
    }),
    password: z.string().min(1, {
      message: t("fields.passwordRequired")
    }),
    rememberMe: z.boolean().optional()
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true
    }
  });

  isSubmitting =
    isSubmitting || form.formState.isSubmitting || transitionPending;

  useEffect(() => {
    setIsSubmitting?.(form.formState.isSubmitting || transitionPending);
  }, [form.formState.isSubmitting, transitionPending, setIsSubmitting]);

  async function signIn({
    email,
    password,
    rememberMe
  }: z.infer<typeof formSchema>) {
    try {
      let response: Record<string, unknown> = {};
      const fetchOptions: BetterFetchOption = { throw: true };

      if (!EMAIL_RE.test(email)) {
        response = await authClient.signIn.username({
          username: email,
          password,
          rememberMe,
          fetchOptions
        });
      } else {
        response = await authClient.signIn.email({
          email,
          password,
          rememberMe,
          fetchOptions
        });
      }

      if (response.twoFactorRedirect) {
        router.push(`/two-factor${window.location.search}`);
      } else {
        await onSuccess();
      }
    } catch (error) {
      form.resetField("password");
      errorToast(getAuthErrorMessage(error, t));
    }
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-5 text-xs"
        onSubmit={form.handleSubmit(signIn)}
        noValidate
      >
        <div className="my-3 text-xs">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className={"form-field active relative col-span-full"}>
                <FormControl>
                  <Input
                    className={cn("w-input", classNames?.input)}
                    type="text"
                    placeholder={t("signIn.usernamePlaceholder")}
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <div data-form={"baseline"} />
                <FormLabel className={cn("input-label", classNames?.label)}>
                  {t("fields.username")}
                </FormLabel>
                <FormMessage className={classNames?.error} />
              </FormItem>
            )}
          />
        </div>
        <div className="my-3">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className={"form-field active relative col-span-full"}>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    className={cn("w-input", classNames?.input)}
                    placeholder={t("fields.passwordPlaceholder")}
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <div data-form={"baseline"} />
                <FormLabel className={cn("input-label", classNames?.label)}>
                  {t("fields.password")}
                </FormLabel>
                <FormMessage className={classNames?.error} />
              </FormItem>
            )}
          />
          <div className="mt-3 flex items-center justify-end text-xs">
            <AuthTextLink
              href={`/forgot-password${isHydrated ? window.location.search : ""}`}
            >
              {t("signIn.forgotPasswordLink")}
            </AuthTextLink>
          </div>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || !isHydrated}
          className={`${AUTH_PRIMARY_BUTTON_CLASS} uppercase`}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            t("signIn.action")
          )}
        </Button>
      </form>
    </Form>
  );
}
