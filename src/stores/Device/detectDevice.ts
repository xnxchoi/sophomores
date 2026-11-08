import InAppSpy from "inapp-spy";
import { UAParser } from "ua-parser-js";
import type {
  BrowserName,
  BrowserType,
  DeviceType,
  DeviceVendor
} from "ua-parser-js/enums";

type IVendor = typeof DeviceVendor;
type Vendorr = IVendor[keyof IVendor];
type IAppName = NonNullable<ReturnType<typeof InAppSpy>["appName"]>;
type UBName = NonNullable<(typeof BrowserName)[keyof typeof BrowserName]>;
type BType = NonNullable<(typeof BrowserType)[keyof typeof BrowserType]>;
type DType = NonNullable<(typeof DeviceType)[keyof typeof DeviceType]>;
type FallbackName = "Unknown";

export type HA_DEVICE = {
  fingerprint: string | null;
  device: {
    model: string;
    type: DType | FallbackName;
    vendor: string | Vendorr | FallbackName;
  };
  browser: {
    name: IAppName | UBName | string | FallbackName;
    type: BType | FallbackName;
  } & {
    inApp: boolean;
    isChrome: boolean;
    isSafari: boolean;
  };
  os: {
    name: string | FallbackName;
    isIOS: boolean;
    isAndroid: boolean;
  };
  isBot: boolean;
  isTouchDevice: boolean;
  isMobile: boolean;
};

export const DEFAULT_DEVICE: HA_DEVICE = {
  fingerprint: null,
  device: {
    model: "Unknown",
    vendor: "Unknown",
    type: "Unknown"
  },
  browser: {
    type: "Unknown",
    name: "Unknown",
    inApp: false,
    isChrome: false,
    isSafari: false
  },
  os: {
    name: "Unknown",
    isAndroid: false,
    isIOS: false
  },
  isBot: false,
  isTouchDevice: false,
  isMobile: false
};

export const cloneDevice = (device: HA_DEVICE): HA_DEVICE => ({
  fingerprint: device.fingerprint,
  device: { ...device.device },
  browser: { ...device.browser },
  os: { ...device.os },
  isBot: device.isBot,
  isTouchDevice: device.isTouchDevice,
  isMobile: device.isMobile
});

export type DeviceEnv = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
};

type InAppTestTargets =
  | "instagram"
  | "pinterest"
  | "facebook"
  | "whatsApp"
  | "twitter"
  | "kakaotalk"
  | "weChat"
  | "naver"
  | "threads"
  | "messenger"
  | "line"
  | "tikTok";

const SUPPORTED_BOTS = [
  "facebookexternalhit",
  "skypeuripreview",
  "baiduspider",
  "linkedinbot",
  "ia_archiver",
  "duckduckbot",
  "twitterbot",
  "googlebot",
  "yandexbot",
  "bingbot",
  "facebot",
  "tumblr",
  "slurp",
  "google (+https://developers.google.com/+/web/snippet/)",
  "https://developers.google.com/+/web/snippet/"
] as const;

export const readClientDeviceEnv = (): DeviceEnv | null => {
  if (
    typeof window === "undefined" ||
    typeof window.document === "undefined" ||
    typeof window.document.createElement === "undefined"
  ) {
    return null;
  }
  const userAgent = window.navigator.userAgent;
  if (!userAgent) return null;
  return {
    userAgent,
    platform: window.navigator.platform,
    maxTouchPoints: window.navigator.maxTouchPoints
  };
};

export const detectDevice = (env?: DeviceEnv | null): HA_DEVICE => {
  if (!env?.userAgent) return cloneDevice(DEFAULT_DEVICE);

  const uap = new UAParser(env.userAgent);
  const platform = env.platform ?? "";
  const maxTouchPoints = env.maxTouchPoints ?? 0;
  const isSpoofedIpad =
    /iPad/.test(platform) || (platform === "MacIntel" && maxTouchPoints > 1);

  const browser = uap.getBrowser();
  const os = uap.getOS();
  const device = uap.getDevice();
  const { isInApp, appName } = InAppSpy({ ua: env.userAgent });
  const isKakaoTalkUA = /kakaotalk/i.test(env.userAgent);
  const apps: Record<InAppTestTargets, boolean> = {
    instagram: appName === "Instagram",
    pinterest: /pinterest/i.test(env.userAgent),
    facebook: appName === "Facebook",
    whatsApp: /whatsapp/i.test(env.userAgent),
    twitter:
      browser.name === "Twitter" ||
      appName === "Twitter" ||
      /twitter/i.test(env.userAgent),
    kakaotalk: browser.name === "KakaoTalk" || isKakaoTalkUA,
    weChat: browser.name === "WeChat" || appName === "WeChat",
    naver: browser.name === "Naver",
    threads: appName === "Threads",
    messenger: appName === "Facebook Messenger",
    line: appName === "Line" || browser.name === "Line",
    tikTok: appName === "TikTok" || browser.name === "TikTok"
  };

  const inApp: boolean =
    isInApp ||
    browser.type === "inapp" ||
    Object.values(apps).some((v) => v) ||
    false;
  const isIOS = os.name === "iOS" || isSpoofedIpad;

  return {
    fingerprint: null,
    device: {
      model: device.model || "Unknown",
      vendor: device.vendor || "Unknown",
      type: device.type || "Unknown"
    },
    browser: {
      type: inApp ? "inapp" : browser.type || "Unknown",
      name: isKakaoTalkUA ? "KakaoTalk" : browser.name || appName || "Unknown",
      inApp,
      isChrome: browser.name === "Chrome",
      isSafari: browser.name === "Safari"
    },
    os: {
      name: isIOS ? "iOS" : (os.name ?? "Unknown"),
      isAndroid: os.name === "Android",
      isIOS
    },
    isTouchDevice: maxTouchPoints > 0,
    isMobile: device.type === "mobile",
    isBot: SUPPORTED_BOTS.some((bot) =>
      env.userAgent.toLowerCase().includes(bot.toLowerCase())
    )
  };
};
