"use client";
import { useTranslations } from "next-intl";


import { useEffect, useState } from "react";
import {
  Fingerprint,
  Laptop,
  Plus,
  ShieldCheck,
  Trash2,
  Smartphone,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/payload-types";
import { authClient } from "@/lib/auth/client";
import { SubRouteHeader } from "@/components/settings/SubRouteHeader";
import {
  Panel,
  PanelBento,
  PanelGrid,
  PanelHeader,
  PanelControls,
} from "@/components/settings/Panel";
import { ActionField, ActionButton } from "@/components/settings/ActionField";
import { cn } from "@/lib/utils";

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
    <div className="flex w-full flex-col gap-8">
      <SubRouteHeader
        title={t('security')}
        blurb={t('passkeysMultiSessionManagementAndAttendeeCredentialControls')}
      />

      <PanelBento>
        {/* Passkeys Panel */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('passkeys')}
              blurb={t('hardwareBackedAuthenticationUsingTouchIDFaceIDOr')}
              meta={
                <span className="font-mono text-xs text-neutral-400">
                  {passkeys.length} {passkeys.length === 1 ? t('key') : t('keys')}
                </span>
              }
            />
            <PanelControls>
              {passkeys.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {passkeys.map((pk) => (
                    <div
                      key={pk.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                          <Fingerprint size={16} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {pk.name || t('passkey')}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {t('addedDate', { date: pk.createdAt ? new Date(pk.createdAt).toLocaleDateString() : t('recently') })}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePasskey(pk.id)}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label={t('removePasskey', { name: pk.name || pk.id })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-xs text-neutral-400">
                  {loadingPasskeys ? t('checkingPasskeys') : t('noPasskeysRegisteredYetAddOneForBiometric1')}
                </div>
              )}

              {passkeyNotice ? (
                <p className="text-xs text-neutral-300 font-mono">{passkeyNotice}</p>
              ) : null}

              <ActionField
                label={t('registerNewPasskey')}
                description={t('promptYourDeviceToGenerateANewCryptographicPasskey')}
              >
                <ActionButton
                  onClick={handleAddPasskey}
                  loading={addingPasskey}
                  icon={<Plus size={13} />}
                >
                  {t('addPasskey')}</ActionButton>
              </ActionField>
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Active Sessions Panel */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('activeSessions')}
              blurb={t('devicesCurrentlySignedInWithYourSophomoresRegistration')}
              meta={
                <span className="font-mono text-xs text-neutral-400">
                  {t('activeSessionCount', { count: sessions.length })}</span>
              }
            />
            <PanelControls>
              <div className="flex flex-col gap-2">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                        {sess.userAgent?.includes("Mobile") ? (
                          <Smartphone size={16} />
                        ) : (
                          <Laptop size={16} />
                        )}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-white truncate max-w-[200px]">
                          {sess.userAgent || t('currentDevice')}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {sess.ipAddress || t('active')} · {new Date(sess.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono uppercase text-white/90">
                      {t('active')}</span>
                  </div>
                ))}
              </div>

              {sessionNotice ? (
                <p className="text-xs text-neutral-300 font-mono">{sessionNotice}</p>
              ) : null}

              <ActionField
                label={t('signOutElsewhere')}
                description={t('immediatelyRevokeAuthenticationTokensForAllOtherSessions')}
              >
                <ActionButton
                  onClick={handleRevokeOthers}
                  loading={revokingOthers}
                >
                  {t('signOutOtherDevices')}</ActionButton>
              </ActionField>
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Connected Authentication Providers */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('authenticationMethods')}
              blurb={t('linkedIdentityProvidersAndCredentialMechanismsForYourAccount')}
            />
            <PanelControls>
              <div className="flex flex-col gap-2">
                {/* Email OTP */}
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                      <Globe size={16} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{t('emailOTPMagicLink')}</span>
                      <span className="text-xs text-neutral-400">{t('verificationCodesViaEmail', { email: user.email })}</span>
                    </div>
                  </div>
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-neutral-300">
                    {t('active')}</span>
                </div>

                {/* Google OAuth */}
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                      <ShieldCheck size={16} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">{t('googleAccount')}</span>
                      <span className="text-xs text-neutral-400">{t('singleSignOnViaGoogleIdentity')}</span>
                    </div>
                  </div>
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-neutral-300">
                    {googleLinked ? t('linked') : t('available')}
                  </span>
                </div>
              </div>
            </PanelControls>
          </PanelGrid>
        </Panel>
      </PanelBento>
    </div>
  );
}
