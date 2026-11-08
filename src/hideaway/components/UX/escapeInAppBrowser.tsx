"use client";

import { useDeviceInfo } from "@/hideaway/providers/RP_Pro";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HA_DialogRoot as DialogRoot, HA_DialogContent as DialogContent, HA_DialogDescription as DialogDescription, HA_DialogHeader as DialogHeader, HA_DialogTitle as DialogTitle } from "@/components/ui/dialog";
import { Check, Copy } from "lucide-react";
import { useLenis } from "lenis/react";
import { toast } from "sonner";

import { usePathname } from "next/navigation";

export function EscapeInAppBrowser() {
  const browser = useDeviceInfo((r) => r.browser);
  const pathname = usePathname();
  if (!browser.inApp) return null;
  return (
    <InAppBrowserEscapeDialog browserName={browser.name} pathname={pathname} />
  );
}

function InAppBrowserEscapeDialog({
  browserName,
  pathname
}: {
  browserName: string;
  pathname: string;
}) {
  const t = useTranslations("Event.InAppBrowserEscape");
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const lenis = useLenis();
  const fallbackUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}${pathname}`;
  const [targetURL, setTargetURL] = useState<string>(() =>
    typeof window === "undefined" ? fallbackUrl : window.location.href
  );
  const isKakaoTalk = browserName === "KakaoTalk";

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTargetURL(window.location.href);
  }, [fallbackUrl, pathname]);

  useEffect(() => {
    lenis?.[open ? "stop" : "start"]();
  }, [lenis, open]);

  const browserLabel =
    browserName && browserName !== "Unknown"
      ? browserName
      : t("labels.currentAppFallback");
  const copy = {
    eyebrow: isKakaoTalk ? t("kakao.eyebrow") : t("eyebrow"),
    title: isKakaoTalk ? t("kakao.title") : t("title"),
    description: isKakaoTalk
      ? t("kakao.description")
      : t("description", {
          app: browserLabel
        }),
    copy: isKakaoTalk ? t("kakao.actions.copy") : t("actions.copy"),
    copied: isKakaoTalk ? t("kakao.actions.copied") : t("actions.copied")
  };

  const flashCopied = useCallback(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(targetURL);
      flashCopied();
      toast(t("toast.title"), {
        description: t("toast.description")
      });
    } catch {
      // Restrictive in-app browsers can block clipboard access.
    }
  }, [flashCopied, t, targetURL]);

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[min(92svh,760px)] max-w-[calc(100%-1rem)] overflow-x-hidden overflow-y-auto border border-white/12 bg-[#08090b] p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] outline-white/10! sm:max-w-[42rem]">
        <div className="relative overflow-hidden rounded-[inherit]">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(72,159,250,0.28),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(255,255,255,0.12),transparent_26%),linear-gradient(145deg,rgba(255,255,255,0.075),transparent_42%)]"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-[3px] bg-[#489FFA]"
          />
          <div className="relative grid gap-5 p-5 sm:grid-cols-[0.72fr_1fr] sm:gap-7 sm:p-7">
            <DialogHeader className="gap-4 text-left">
              <div className="grid gap-4">
                <span className="font-sans text-[10px] tracking-[0.34em] text-[#489FFA] uppercase">
                  {copy.eyebrow}
                </span>
                <DialogTitle className="max-w-[10ch] font-serif text-[clamp(2.7rem,12vw,4.4rem)] leading-[0.86] tracking-[-0.035em] text-white">
                  {copy.title}
                </DialogTitle>
                <span className="inline-flex w-fit items-center border border-white/12 bg-white/[0.045] px-3 py-1.5 font-sans text-[10px] tracking-[0.18em] text-white/68 uppercase">
                  {browserLabel}
                </span>
              </div>
              <DialogDescription className="max-w-[31rem] text-sm leading-6 text-white/72 sm:col-span-2 sm:text-[15px]">
                {copy.description}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 self-start sm:pt-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex min-h-14 items-center justify-between border border-white/10 bg-[linear-gradient(135deg,rgba(72,159,250,0.16),rgba(255,255,255,0.055))] px-5 py-4 text-left transition-[transform,border-color,background-color] duration-200 hover:-translate-y-px hover:border-white/24"
              >
                <span className="grid gap-1">
                  <span className="font-serif text-xl leading-none text-white">
                    {copied ? copy.copied : copy.copy}
                  </span>
                </span>
                {copied ? (
                  <Check className="size-4 text-white/78" />
                ) : (
                  <Copy className="size-4 text-white/70" />
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
