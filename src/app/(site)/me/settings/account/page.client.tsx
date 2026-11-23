"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/payload-types";
import { authClient } from "@/lib/auth/client";
import { SubRouteHeader } from "@/components/settings/SubRouteHeader";
import { ActionButton } from "@/components/settings/ActionField";

interface AccountSectionClientProps {
  user: User;
}

export default function AccountSectionClient({ user }: AccountSectionClientProps) {
  const t = useTranslations('Customer.app_site_me_settings_account_page_client');
  const accountHome = useTranslations("Customer.app_site_me_page");
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  const tier = user.ticketTier ?? t("notProvided");
  const membershipStatus = user.membershipStatus ?? t("notProvided");

  return (
    <div className="dark flex w-full flex-col gap-8 text-foreground">
      <SubRouteHeader title={t("account")} blurb={t("readOnlyIntroduction")} />

      <section aria-labelledby="account-details-heading" className="rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <h2 id="account-details-heading" className="font-heading text-xl tracking-tight">{t("accountDetails")}</h2>
        <dl className="mt-5 divide-y divide-border">
          <div className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-8">
            <dt className="text-sm text-muted-foreground">{t("displayName")}</dt>
            <dd className="min-w-0 select-text text-base font-medium wrap-anywhere">{user.name?.trim() ? user.name : t("notProvided")}</dd>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-8">
            <dt className="text-sm text-muted-foreground">{t("signInEmail")}</dt>
            <dd className="min-w-0 select-text text-base font-medium wrap-anywhere">{user.email || t("notProvided")}</dd>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-8">
            <dt className="text-sm text-muted-foreground">{t("phoneNumber")}</dt>
            <dd className="min-w-0 select-text text-base font-medium wrap-anywhere">{user.phone || t("notProvided")}</dd>
          </div>
        </dl>
        <Link href="/help" className="group/focus mt-4 inline-flex min-h-12 items-center text-sm underline underline-offset-4 hover:text-muted-foreground">
          <FocusShape className="outline-offset-4">{accountHome("help.link")}</FocusShape>
        </Link>
      </section>

      <section aria-labelledby="account-registration-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-8">
        <h2 id="account-registration-heading" className="font-heading text-xl tracking-tight">{t("ticketRegistration")}</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t("registrationRecordDescription")}</p>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm text-muted-foreground">{t("registrationTier")}</dt>
            <dd className="mt-3 font-sans text-sm uppercase wrap-anywhere">{tier}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-muted-foreground">{t("status")}</dt>
            <dd className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="capitalize wrap-anywhere">{membershipStatus}</span>
              {((Array.isArray(user.role) ? user.role.includes("staff") : (user.role as unknown) === "staff") || membershipStatus === "staff") ? (
                <span className="inline-flex rounded-full border border-border px-2.5 py-1 font-sans text-[11px] uppercase tracking-wider">{t("staff")}</span>
              ) : null}
            </dd>
          </div>
        </dl>
        <Link href="/me/orders" className="group/focus mt-6 inline-flex min-h-12 items-center text-sm underline underline-offset-4 hover:text-muted-foreground">
          <FocusShape className="outline-offset-4">{accountHome("orders.title")}</FocusShape>
        </Link>
      </section>

      <section aria-labelledby="account-signout-heading" className="flex flex-col gap-5 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="account-signout-heading" className="font-heading text-xl tracking-tight">{t("signOut")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("signOutOfThisSessionOnThisDevice")}</p>
        </div>
        <ActionButton onClick={handleSignOut} loading={signingOut} icon={<LogOut aria-hidden="true" size={14} />}
          className="min-h-12 w-full rounded-full border-border bg-background px-6 text-sm text-foreground hover:bg-muted focus-visible:outline-foreground sm:w-auto sm:min-w-40">
          {t("signOut")}
        </ActionButton>
      </section>
    </div>
  );
}
