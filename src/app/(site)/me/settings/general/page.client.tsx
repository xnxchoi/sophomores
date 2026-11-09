"use client";
import { useTranslations } from "next-intl";


import { useState } from "react";
import { Globe, Moon, Check } from "lucide-react";
import type { User } from "@/payload-types";
import { setUserLocale } from "@/lib/i18n/locale";
import { SubRouteHeader } from "@/components/settings/SubRouteHeader";
import {
  Panel,
  PanelBento,
  PanelGrid,
  PanelHeader,
  PanelControls,
} from "@/components/settings/Panel";
import { cn } from "@/lib/utils";

interface GeneralSectionClientProps {
  user: User;
}

export default function GeneralSectionClient({ user }: GeneralSectionClientProps) {
  const t = useTranslations('Customer.app_site_me_settings_general_page_client');
  const [locale, setLocale] = useState<"en" | "ko">(
    user.localePreference === "ko" ? "ko" : "en"
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSelectLocale = async (target: "en" | "ko") => {
    setLocale(target);
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      await setUserLocale(target);
    } catch {
      // In preview/offline contexts, cookie already updated
    }
    setSavedNotice(target === 'ko' ? t('languageSetKorean') : t('languageSetToEnglish'));
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <SubRouteHeader
        title={t('general')}
        blurb={t('languageAndInterfaceDisplayPreferencesForSophomores')}
      />

      <PanelBento>
        {/* Language Selection */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('language')}
              blurb={t('chooseYourPreferredLanguageForEventSchedulesUpdatesAnd')}
              meta={
                <span className="font-mono text-xs uppercase text-neutral-400">
                  {locale}
                </span>
              }
            />
            <PanelControls>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectLocale("en")}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
                    locale === "en"
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{t('english')}</span>
                      <span className="text-xs text-neutral-400">{t('defaultInterfaceAndCommunication')}</span>
                    </div>
                  </div>
                  {locale === "en" ? <Check size={16} className="text-white" /> : null}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectLocale("ko")}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
                    locale === "ko"
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/5 bg-white/[0.02] text-neutral-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">한국어</span>
                      <span className="text-xs text-neutral-400">{t('koreanEventInformation')}</span>
                    </div>
                  </div>
                  {locale === "ko" ? <Check size={16} className="text-white" /> : null}
                </button>
              </div>

              {savedNotice ? (
                <p className="mt-2 text-xs font-mono text-neutral-300">{savedNotice}</p>
              ) : null}
            </PanelControls>
          </PanelGrid>
        </Panel>

        {/* Theme / Interface */}
        <Panel>
          <PanelGrid>
            <PanelHeader
              eyebrow={t('themeAtmosphere')}
              blurb={t('sophomoresUsesAnImmersiveCinematicDarkCanvasWithReactive')}
            />
            <PanelControls>
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
                    <Moon size={18} />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">{t('cinematicDark')}</span>
                    <span className="text-xs text-neutral-400">{t('deepNeutralPaletteOptimizedForHighDynamicRangeDisplays')}</span>
                  </div>
                </div>
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-mono uppercase text-white/90">
                  {t('fixed')}</span>
              </div>
            </PanelControls>
          </PanelGrid>
        </Panel>
      </PanelBento>
    </div>
  );
}
