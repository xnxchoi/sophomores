"use client";
import { useTranslations } from "next-intl";


import { useSiteMenu } from "@/lib/content/menu";
import { animate, useMotionTemplate, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, type MouseEvent } from "react";

const EASE = [0.165, 0.84, 0.44, 1] as const;

/** Hideaway menu pill. MENU slides out and BACK plus the cross slides in. */
export function MenuButton() {
  const t = useTranslations('Customer.components_shell_menu_button');
  const open = useSiteMenu((state) => state.open);
  const toggle = useSiteMenu((state) => state.toggle);
  const menuTextRef = useRef<HTMLSpanElement>(null);
  const closeTextRef = useRef<HTMLSpanElement>(null);
  const openY = useMotionValue("0%");
  const closeY = useMotionValue("105%");
  const navState = useMotionValue(open);
  const iconSource = useTransform<number, number>(() => (navState.get() ? 0 : 50));
  const iconY = useSpring(iconSource, { visualDuration: 0.6, stiffness: 440, damping: 50 });
  const icon = useMotionTemplate`${iconY}%`;
  const width = useMotionValue(64);

  useEffect(() => {
    navState.set(open);
  }, [navState, open]);

  useMotionValueEvent(navState, "change", (latest) => {
    if (!menuTextRef.current || !closeTextRef.current) return;
    animate(openY, latest ? "-105%" : "0%", { duration: 0.6, ease: EASE });
    animate(closeY, latest ? "0%" : "105%", { duration: 0.6, ease: EASE });
    const pad = 10 * 2;
    const text = latest ? closeTextRef.current.offsetWidth : menuTextRef.current.offsetWidth;
    animate(width, pad + text, { duration: 0.6, ease: EASE });
  });

  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      toggle();
    },
    [toggle]
  );

  return (
    <m.button
      type="button"
      id="primary__nav"
      aria-label={open ? t('closeTheMenu') : t('openTheMenu')}
      data-state={open}
      onClick={onClick}
      className="rp_btn relative flex h-6 items-center justify-center border border-transparent rounded-full bg-[var(--button-background)] text-[oklch(from_var(--faded-fg)_l_c_h_/_0.9)] text-xs font-normal leading-[140%] tracking-[-0.01em] text-center no-underline overflow-hidden backdrop-blur-[24px] outline-none transition-[border-color] duration-200 hover:border-[oklch(from_var(--faded-fg)_l_c_h_/_0.8)] w-[64px]"
      style={{ width, paddingLeft: 10, paddingRight: 10 }}
    >
      <m.span ref={menuTextRef} className="menu__button-text absolute block h-full text-xs font-[350] leading-[21px] tracking-[-0.01em] text-center" style={{ y: openY }}>
        {t('menu')}</m.span>
      <m.span ref={closeTextRef} className="menu__button-close absolute block h-full text-xs font-[350] leading-[21px] tracking-[-0.01em] text-center" style={{ y: closeY }}>
        <span>{t('back')}</span>
        <m.span className="menu__button-icon-container inline-flex ml-1" style={{ y: icon }}>
          <svg viewBox="0 0 12 12" fill="none" className="menu__button-icon w-3" aria-hidden="true">
            <path d="M2.625 2.625L9.375 9.375" stroke="currentColor" />
            <path d="M2.625 9.375L9.375 2.625" stroke="currentColor" />
          </svg>
        </m.span>
      </m.span>
    </m.button>
  );
}
