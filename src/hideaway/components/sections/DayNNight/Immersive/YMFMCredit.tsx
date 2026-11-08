"use client";

import { Button } from "@/hideaway/components/core/Button";
import { Link } from "@/hideaway/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LABEL_MONO, TITLE_SECTION } from "./Act";
import { AudioBars } from "./AudioBars";

export const YMFM_PLAY_EVENT = "day-n-night:ymfm-play";
export const YMFM_STATE_EVENT = "day-n-night:ymfm-state";

type YmFmStateEvent = CustomEvent<{ playing: boolean }>;

export function YMFMCredit({
  className,
  embeddedInAct = false
}: {
  className?: string;
  embeddedInAct?: boolean;
}) {
  const t = useTranslations("Event.DayNNight.act.night.dj");
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as YmFmStateEvent).detail;
      setPlaying(Boolean(detail?.playing));
    };
    window.addEventListener(YMFM_STATE_EVENT, onState);
    return () => window.removeEventListener(YMFM_STATE_EVENT, onState);
  }, []);

  const handlePlay = () => {
    window.dispatchEvent(new CustomEvent(YMFM_PLAY_EVENT));
    setOpen(true);
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      <div
        className="grid h-full w-full grid-cols-12 grid-rows-[auto_1fr_auto] max-lg:grid-cols-1"
        style={{
          paddingTop: embeddedInAct
            ? undefined
            : "var(--dn-act-pt, clamp(72px, 8vh, 120px))",
          paddingBottom: embeddedInAct
            ? undefined
            : "var(--dn-act-pb, clamp(72px, 8vh, 120px))",
          paddingLeft: embeddedInAct
            ? undefined
            : "var(--dn-act-px, clamp(24px, 4vw, 80px))",
          paddingRight: embeddedInAct
            ? undefined
            : "var(--dn-act-px, clamp(24px, 4vw, 80px))",
          columnGap: "var(--dn-act-gap-x, clamp(40px, 5vw, 80px))",
          rowGap: "var(--dn-act-gap-y, clamp(36px, 5vh, 64px))"
        }}
      >
        <div className="col-start-1 col-end-8 row-start-2 row-end-3 grid max-w-[44ch] content-end gap-6 self-end max-lg:col-span-full xl:gap-8">
          <p
            className={
              "font-sans text-[11px] tracking-[0.32em] text-(--dn-fg-mute) uppercase"
            }
          >
            {t("eyebrow")}
          </p>
          <h3 className={`${TITLE_SECTION} max-w-[8ch]`}>{t("name")}</h3>
          <div className="grid gap-2">
            <span
              aria-hidden
              className="block h-px w-12 bg-(--dn-fg) opacity-60"
            />
            <span className={LABEL_MONO}>{t("role")}</span>
          </div>
          <p className="m-0 max-w-[42ch] font-serif text-[clamp(1.2rem,1.35vw,1.5rem)] leading-[1.45] tracking-[-0.005em] text-[var(--dn-fg-mute)] italic">
            {t("blurb")}
          </p>
          <Link
            href="https://instagram.com/yangminwoo__"
            target="_blank"
            rel="noreferrer noopener"
            className="pointer-events-auto inline-flex w-fit items-baseline gap-3 border-0 border-b border-[var(--dn-fg)] py-2 pb-2 font-sans text-[12px] tracking-[0.28em] text-[var(--dn-fg)] uppercase no-underline transition-[gap,padding] duration-300 ease-out hover:gap-5 hover:pr-2 md:text-[13px]"
          >
            <span>{t("handle")}</span>
            <span aria-hidden className="text-[1.2em] leading-none">
              →
            </span>
          </Link>
        </div>

        <div className="col-start-8 col-end-13 row-start-3 row-end-4 grid max-w-[30rem] gap-4 self-end justify-self-end max-lg:col-span-full max-lg:w-full max-lg:justify-self-start">
          <div className="pointer-events-auto relative overflow-hidden rounded-lg border border-[oklch(88%_0.025_80/0.78)] bg-[linear-gradient(135deg,oklch(97%_0.014_88/0.98),oklch(94%_0.026_68/0.96))] px-5 py-4 text-[oklch(17%_0.018_260)] shadow-[0_24px_70px_-22px_rgba(0,0,0,0.82),0_1px_0_rgba(255,255,255,0.48)_inset] before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,oklch(45%_0.075_255),oklch(56%_0.09_48))] before:content-[''] after:pointer-events-none after:absolute after:inset-0 after:bg-[url('/assets/papier.png')] after:bg-[length:220px_220px] after:opacity-[0.045] after:mix-blend-multiply after:content-[''] md:px-6">
            <div className="relative z-[1] flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 font-sans text-[10px] leading-[1.4] tracking-[0.28em] text-[oklch(28%_0.02_280/0.72)] uppercase">
                {t("listenTitle")}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handlePlay}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[oklch(18%_0.012_280/0.22)] px-4 font-sans text-[10px] tracking-[0.2em] uppercase transition-[background-color,color,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[oklch(18%_0.012_280/0.7)] hover:bg-[oklch(18%_0.012_280)] hover:text-[oklch(96%_0.005_80)]"
                  aria-pressed={playing}
                  data-active={playing ? "true" : "false"}
                >
                  <AudioBars active={playing} />
                  <span>{playing ? t("playingLabel") : t("listenLabel")}</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  aria-expanded={open}
                  aria-label={t("infoLabel")}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[oklch(18%_0.012_280/0.18)] font-sans text-[11px] text-[oklch(18%_0.012_280/0.65)] transition-[border-color,color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[oklch(18%_0.012_280/0.55)] hover:text-[oklch(18%_0.012_280)]"
                >
                  i
                </Button>
              </div>
            </div>
          </div>

          {open ? (
            <div className="pointer-events-auto grid gap-4 border-t border-[var(--dn-line)] pt-4">
              <dl className="grid gap-2">
                <TrackMeta label={t("trackLabel")} value={t("trackTitle")} />
                <TrackMeta label={t("albumLabel")} value={t("album")} />
                <TrackMeta label={t("artistLabel")} value={t("artist")} />
              </dl>
              <p className="m-0 max-w-[42ch] font-serif text-[1.05rem] leading-[1.45] tracking-[0.005em] text-[var(--dn-fg-mute)]">
                {t("trackNote")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TrackMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <dt className="font-sans text-[9px] leading-[1.55] tracking-[0.24em] text-[var(--dn-fg-faint)] uppercase">
        {label}
      </dt>
      <dd className="m-0 font-sans text-sm leading-[1.45] font-medium tracking-tight text-[var(--dn-fg)]">
        {value}
      </dd>
    </div>
  );
}
