"use client";
import { useTranslations } from "next-intl";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/payload-types";
import { authClient } from "@/lib/auth/client";
import { SubRouteHeader } from "@/components/settings/SubRouteHeader";
import { ActionField, ActionButton } from "@/components/settings/ActionField";
import { Button } from "@/components/core/Button";

interface SessionItem {
  id: string;
  userAgent?: string | null;
  createdAt: string | Date;
  ipAddress?: string | null;
}

interface AccountItem {
  id: string;
  providerId: string;
  accountId?: string;
  createdAt?: string | Date;
}

interface PasskeyItem {
  id: string;
  name?: string;
  createdAt?: string | Date;
}

interface SecuritySectionClientProps {
  user: User;
  initialSessions: SessionItem[];
  initialAccounts: AccountItem[];
}

export default function SecuritySectionClient({
  user,
  initialSessions,
  initialAccounts,
}: SecuritySectionClientProps) {
  const t = useTranslations('Customer.app_site_me_settings_security_page_client');
  const router = useRouter();
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Fetch Passkeys
  const fetchPasskeys = async () => {
    try {
      setLoadingPasskeys(true);
      const res = await authClient.passkey.listUserPasskeys();
      if (res?.data) {
        setPasskeys(res.data as PasskeyItem[]);
      }
    } catch {
      // Passkey plugin might return empty if no passkeys registered yet
      setPasskeys([]);
    } finally {
      setLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) await fetchPasskeys();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddPasskey = async () => {
    setAddingPasskey(true);
    setPasskeyNotice(null);
    try {
      const name = `Key ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      const res = await authClient.passkey.addPasskey({ name });
      if (res?.error) {
        setPasskeyNotice(res.error.message || t('failedToRegisterPasskey'));
      } else {
        setPasskeyNotice(t('passkeyAddedSuccessfully'));
        await fetchPasskeys();
      }
    } catch (err: unknown) {
      setPasskeyNotice(err instanceof Error ? err.message : t('errorRegisteringPasskey'));
    } finally {
      setAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      await authClient.passkey.deletePasskey({ id });
      await fetchPasskeys();
    } catch (err: unknown) {
      setPasskeyNotice(err instanceof Error ? err.message : t('failedToRemovePasskey'));
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    setSessionNotice(null);
    try {
      await authClient.revokeOtherSessions();
      setSessionNotice(t('otherDeviceSessionsHaveBeenRevoked'));
      router.refresh();
    } catch (err: unknown) {
      setSessionNotice(err instanceof Error ? err.message : t('failedToRevokeSessions'));
    } finally {
      setRevokingOthers(false);
    }
  };

  const googleLinked = initialAccounts.some((a) => a.providerId === "google");

  return (
    <div className="dark flex w-full flex-col gap-8 text-foreground">
      <SubRouteHeader title={t("security")} blurb={t("recordsIntroduction")} />

      <section aria-labelledby="security-passkeys-heading" className="rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="security-passkeys-heading" className="font-heading text-xl tracking-tight">{t("passkeys")}</h2>
          <span className="font-sans text-xs text-muted-foreground">{t("displayedRecordCount", { count: passkeys.length })}</span>
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t("hardwareBackedAuthenticationUsingTouchIDFaceIDOr")}</p>
        {passkeys.length > 0 ? (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-start justify-between gap-4 py-5">
                <div className="min-w-0 self-center">
                  <p className="select-text text-sm font-medium wrap-anywhere">{pk.name || t("passkey")}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground wrap-anywhere">
                    {pk.createdAt ? t("addedDate", { date: new Date(pk.createdAt).toLocaleDateString() }) : t("recordDateNotProvided")}
                  </p>
                </div>
                <Button type="button" onClick={() => handleDeletePasskey(pk.id)} aria-label={t("removePasskey", { name: pk.name || pk.id })}
                  className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border border-border px-4 text-sm transition-colors outline-offset-4 hover:bg-muted focus-visible:outline-2">
                  {t("removePasskeyAction")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
            {loadingPasskeys ? t("checkingPasskeys") : t("noPasskeyRecordsShown")}
          </p>
        )}
        {passkeyNotice ? <p className="mt-4 text-sm leading-relaxed wrap-anywhere">{passkeyNotice}</p> : null}
        <ActionField label={t("registerNewPasskey")} description={t("promptYourDeviceToGenerateANewCryptographicPasskey")}
          className="mt-6 flex-col items-stretch rounded-none border-x-0 border-b-0 border-border bg-transparent p-0 pt-6 before:hidden sm:flex-row sm:items-center">
          <ActionButton onClick={handleAddPasskey} loading={addingPasskey}
            className="min-h-12 w-full rounded-full border-border bg-background px-6 text-sm text-foreground hover:bg-muted focus-visible:outline-foreground sm:w-auto">
            {t("addPasskey")}
          </ActionButton>
        </ActionField>
      </section>

      <section aria-labelledby="security-sessions-heading" className="rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="security-sessions-heading" className="font-heading text-xl tracking-tight">{t("sessionRecords")}</h2>
          <span className="font-sans text-xs text-muted-foreground">{t("displayedRecordCount", { count: sessions.length })}</span>
        </div>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t("sessionRecordsDescription")}</p>
        {sessions.length > 0 ? (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {sessions.map((sess) => (
              <li key={sess.id} className="py-5">
                <p className="select-text text-sm font-medium wrap-anywhere">{sess.userAgent || t("currentDevice")}</p>
                <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">{t("recordedIpAddress")}</dt>
                    <dd className="mt-1.5 select-text font-sans tabular-nums wrap-anywhere">{sess.ipAddress || t("recordNotProvided")}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">{t("recordCreated")}</dt>
                    <dd className="mt-1.5 wrap-anywhere">{new Date(sess.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : <p className="mt-6 rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">{t("noSessionRecordsShown")}</p>}
        {sessionNotice ? <p className="mt-4 text-sm leading-relaxed wrap-anywhere">{sessionNotice}</p> : null}
        <ActionField label={t("signOutElsewhere")} description={t("requestOtherSessionSignOut")}
          className="mt-6 flex-col items-stretch rounded-none border-x-0 border-b-0 border-border bg-transparent p-0 pt-6 before:hidden sm:flex-row sm:items-center">
          <ActionButton onClick={handleRevokeOthers} loading={revokingOthers}
            className="min-h-12 w-full rounded-full border-border bg-background px-6 text-sm text-foreground hover:bg-muted focus-visible:outline-foreground sm:w-auto">
            {t("signOutOtherDevices")}
          </ActionButton>
        </ActionField>
      </section>

      <section aria-labelledby="security-account-records-heading" className="rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <h2 id="security-account-records-heading" className="font-heading text-xl tracking-tight">{t("signInAccountRecords")}</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">{t("signInAccountRecordsDescription")}</p>
        <dl className="mt-6 divide-y divide-border border-y border-border">
          <div className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-8">
            <dt className="text-sm text-muted-foreground">{t("recordedEmail")}</dt>
            <dd className="min-w-0 select-text text-sm font-medium wrap-anywhere">{user.email || t("recordNotProvided")}</dd>
          </div>
          <div className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-8">
            <dt className="text-sm text-muted-foreground">{t("googleAccount")}</dt>
            <dd className="min-w-0 text-sm wrap-anywhere">{googleLinked ? t("linkedGoogleRecordShown") : t("noLinkedGoogleRecordShown")}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
