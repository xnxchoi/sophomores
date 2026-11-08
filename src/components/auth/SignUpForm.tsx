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
import { Input } from "@/components/ui/input";
import { errorToast, successToast } from "@/components/ui/sonner";
import { getAuthErrorMessage } from "@/lib/auth/auth-error";
import { authClient } from "@/lib/auth/client";
import { getSearchParam } from "@/lib/auth/search-param";
import { useIsHydrated } from "@/lib/auth/useIsHydrated";
import { useOnSuccessTransition } from "@/lib/auth/useOnSuccessTransition";
import { normalizeLocalReturnTo } from "@/lib/routes/auth";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import type { BetterFetchOption } from "better-auth/react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import "@/styles/__inputs.scss";

export function SignUpForm({
  className,
  classNames,
  callbackURL,
  isSubmitting,
  redirectTo,
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
  callbackURL?: string;
  isSubmitting?: boolean;
  redirectTo?: string;
  setIsSubmitting?: (value: boolean) => void;
}) {
  const t = useTranslations("Auth");
  const isHydrated = useIsHydrated();
  const router = useRouter();

  const getRedirectTo = useCallback(
    () =>
      normalizeLocalReturnTo(
        redirectTo || getSearchParam("redirectTo"),
        "/me"
      ),
    [redirectTo]
  );

  const getCallbackURL = useCallback(
    () => callbackURL || getRedirectTo(),
    [callbackURL, getRedirectTo]
  );

  const { onSuccess, isPending: transitionPending } = useOnSuccessTransition({
    redirectTo
  });

  const formSchema = z.object({
    email: z.string().email({
      message: `${t("fields.email")} ${t("fields.isInvalid")}`
    }),
    password: z.string().min(1, {
      message: t("fields.passwordRequired")
    }),
    name: z.string().min(1, {
      message: `${t("fields.name")} ${t("fields.isRequired")}`
    }),
    username: z.string().min(1, {
      message: `${t("fields.username")} ${t("fields.isRequired")}`
    }),
    location: z.string().optional(),
    bio: z.string().optional(),
    link: z.string().optional()
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      username: "",
      location: "",
      bio: "",
      link: ""
    }
  });

  isSubmitting =
    isSubmitting || form.formState.isSubmitting || transitionPending;

  useEffect(() => {
    setIsSubmitting?.(form.formState.isSubmitting || transitionPending);
  }, [form.formState.isSubmitting, transitionPending, setIsSubmitting]);

  async function signUp({
    email,
    password,
    name,
    username,
    location,
    bio,
    link
  }: z.infer<typeof formSchema>) {
    try {
      const fetchOptions: BetterFetchOption = { throw: true };

      const data = await authClient.signUp.email({
        email,
        password,
        name,
        username,
        location,
        bio,
        link,
        callbackURL: getCallbackURL(),
        fetchOptions
      });

      if ("token" in data && data.token) {
        await onSuccess();
      } else {
        router.push(`/sign-in${window.location.search}`);
        successToast(t("signUp.emailSent"));
      }
    } catch (error) {
      errorToast(getAuthErrorMessage(error, t));
      form.resetField("password");
    }
  }

  return (
    <Form {...form}>
      <form
        method="POST"
        onSubmit={form.handleSubmit(signUp)}
        noValidate
        className={cn("grid w-full gap-6", className, classNames?.base)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("fields.name")}
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  className={classNames?.input}
                  placeholder={t("fields.namePlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage className={classNames?.error} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("fields.username")}
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  className={classNames?.input}
                  placeholder={t("fields.usernamePlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage className={classNames?.error} />
            </FormItem>
          )}
        />

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
                  autoComplete="email"
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("fields.password")}
              </FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  className={classNames?.input}
                  placeholder={t("fields.passwordPlaceholder")}
                  disabled={isSubmitting}
                  enableToggle
                  {...field}
                />
              </FormControl>
              <FormMessage className={classNames?.error} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("fields.location")}
              </FormLabel>
              <FormControl>
                <Input
                  className={classNames?.input}
                  type="text"
                  placeholder={t("fields.locationPlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage className={classNames?.error} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("fields.bio")}
              </FormLabel>
              <FormControl>
                <Input
                  className={classNames?.input}
                  type="text"
                  placeholder={t("fields.bioPlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage className={classNames?.error} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={classNames?.label}>
                {t("fields.link")}
              </FormLabel>
              <FormControl>
                <Input
                  className={classNames?.input}
                  type="text"
                  placeholder={t("fields.linkPlaceholder")}
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
            t("signUp.action")
          )}
        </Button>
      </form>
    </Form>
  );
}
