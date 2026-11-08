/**
 * Survival Kit — single source of truth for Day n Night venue data.
 * Transcribed from DAY_N_NIGHT_FILL_IN.md.
 *
 * § 8 decision: phone numbers, KakaoTalk IDs, and emails are committed
 * as plain TS values — no .env shim needed.
 */

// ── Venue ──────────────────────────────────────────────────────────────

/** Venue lat/lng — Sowol-ro 20-gil 64, 3F, Haebangchon/Yongsan. */
export const VENUE_COORDS = {
  lat: 37.543933,
  lng: 126.984232
} as const;

// ── Map deep-links ──────────────────────────────────────────────────────

/**
 * Provider-specific place links for the venue.
 * Web URLs work universally across desktop and mobile regardless of
 * whether the native app is installed.
 */
export const MAP_LINKS = {
  kakao: "https://kko.to/0WZOd709uh_",
  naver: "https://naver.me/GFB9v8Ug",
  google: "https://maps.app.goo.gl/yvEE24K8PyiffftV8"
} as const;

// ── Bank (Cluster B) ───────────────────────────────────────────────────

export const BANK = {
  nameKo: "토스뱅크",
  accountNo: "1002-5436-0906",
  accountNoDigits: "100254360906",
  holder: "리스토어드프로젝트",
  amountKrw: 65000,
  /** Toss deep link — opens the Toss app prefilled for transfer. */
  tossDeepLink:
    "supertoss://send?bank=토스뱅크&accountNo=100254360906&amount=65000&origin=qr"
} as const;

// ── Hosts (Cluster C) ──────────────────────────────────────────────────

export interface HostConfig {
  nameKey: string;
  nameKo: string;
  phone: string;
  kakaoTalk: string;
  email: string;
}

export const HOSTS: HostConfig[] = [
  {
    nameKey: "host.sean",
    nameKo: "최성윤",
    phone: "+82 10 4637 9289",
    kakaoTalk: "SungyoonChoi",
    email: "seanschoi@lostinseoul.com"
  },
  {
    nameKey: "host.ingyu",
    nameKo: "최인규",
    // PLACEHOLDER — fill from DAY_N_NIGHT_FILL_IN.md when In Gyu's details arrive
    phone: "",
    kakaoTalk: "",
    email: ""
  }
];
