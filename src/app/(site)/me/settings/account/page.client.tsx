"use client";
import { useTranslations } from "next-intl";


import { useState } from "react";
import { LogOut, Phone, Ticket, Shield } from "lucide-react";
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
import { LockedField } from "@/components/settings/LockedField";
import { ActionField, ActionButton } from "@/components/settings/ActionField";

interface AccountSectionClientProps {
  user: User;
}

export default function AccountSectionClient({ user }: AccountSectionClientProps) {
  const t = useTranslations('Customer.app_site_me_settings_account_page_client');
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

  const tier = user.ticketTier ?? "none";
  const membershipStatus = user.membershipStatus ?? "applicant";

  return (
    <div className="flex w-full flex-col gap-8">
      <SubRouteHeader
        title={t('account')}
        blurb={t('attendeeIdentifierVerifiedPhoneAndTicketRegistrationDetails')}
      />

      <PanelBento>
        {/* Handle / Identifier */}
        <Panel>
          <PanelGrid>
            <PanelHeader eyebrow={t('handle')} />
            <PanelControls>
              <LockedField
                label={t('attendeeHandle')}
                description={t('identifierAssociatedWithYourRegistrationAndEventCommunications')}
                value={user.name ? `@${user.name}` : `@${user.email.split("@")[0]}`}
                reason={t('handleRenamingWillBeAvailableCloserToTheEvent')}
              />
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Sign-in Email */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('signInEmail')}
              meta={
                user.verified ? (
                  <span className="text-white/80 font-mono text-xs">{t('verified')}</span>
                ) : (
                  <span className="text-neutral-400 font-mono text-xs">{t('primary')}</span>
                )
              }
            />
            <PanelControls>
              <LockedField
                label={t('email')}
                value={user.email}
                reason={t('signInEmailIsBoundToYourRegistration')}
              />
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Verified Phone */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('verifiedPhone')}
              meta={
                user.phone ? (
                  <span className="text-white/80 font-mono text-xs">{t('mmsVerified')}</span>
                ) : (
                  <span className="text-neutral-400 font-mono text-xs">{t('pendingVerification')}</span>
                )
              }
            />
            <PanelControls>
              <LockedField
                label={t('phoneNumber')}
                description={t('usedForEventSMSMMSAnnouncementsAndSecureVerification')}
                value={user.phone || t('notLinked')}
                reason={user.phone ? t('phoneVerifiedViaMMSChallenge') : t('canBeLinkedViaTheRegistrationFlow')}
              />
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Registration & Ticket Status */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('ticketRegistration')}
              meta={
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono uppercase text-white">
                  {tier}
                </span>
              }
            />
            <PanelControls>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                    <Ticket size={18} />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      {t('registrationTier')}</span>
                    <span className="text-xs text-neutral-400">
                      {t('status')}<span className="capitalize text-neutral-200">{membershipStatus}</span>
                      {((Array.isArray(user.role) ? user.role.includes("staff") : (user.role as unknown) === "staff") || membershipStatus === "staff") ? (
                        <span className="ml-2 inline-flex items-center rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white">
                          {t('staff')}</span>
                      ) : null}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono uppercase text-neutral-400">
                  {tier}
                </span>
              </div>

              <ActionField
                label={t('signOut')}
                description={t('signOutOfThisSessionOnThisDevice')}
              >
                <ActionButton
                  onClick={handleSignOut}
                  loading={signingOut}
                  icon={<LogOut size={13} />}
                >
                  {t('signOut')}</ActionButton>
              </ActionField>
            </PanelControls>
          </PanelGrid>
        </Panel>
      </PanelBento>
    </div>
  );
}
