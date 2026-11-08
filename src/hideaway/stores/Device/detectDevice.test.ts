import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeviceStore } from "./DeviceStore";
import {
  DEFAULT_DEVICE,
  detectDevice,
  readClientDeviceEnv,
  type DeviceEnv
} from "./detectDevice";

const IPHONE_SAFARI: DeviceEnv = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
  maxTouchPoints: 5
};

const MAC_CHROME: DeviceEnv = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  platform: "MacIntel",
  maxTouchPoints: 0
};

const KAKAOTALK_IPHONE: DeviceEnv = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK",
  platform: "iPhone",
  maxTouchPoints: 5
};

const INSTAGRAM_IPHONE: DeviceEnv = {
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0.0",
  platform: "iPhone",
  maxTouchPoints: 5
};

const GOOGLEBOT: DeviceEnv = {
  userAgent:
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  platform: "",
  maxTouchPoints: 0
};

const SPOOFED_IPAD: DeviceEnv = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  platform: "MacIntel",
  maxTouchPoints: 5
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DEFAULT_DEVICE", () => {
  it("is a deterministic unknown desktop snapshot", () => {
    expect(DEFAULT_DEVICE).toEqual({
      fingerprint: null,
      device: { model: "Unknown", vendor: "Unknown", type: "Unknown" },
      browser: {
        type: "Unknown",
        name: "Unknown",
        inApp: false,
        isChrome: false,
        isSafari: false
      },
      os: { name: "Unknown", isAndroid: false, isIOS: false },
      isBot: false,
      isTouchDevice: false,
      isMobile: false
    });
  });
});

describe("detectDevice", () => {
  it("returns DEFAULT_DEVICE without reading window when no env is given", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(detectDevice()).toEqual(DEFAULT_DEVICE);
    expect(detectDevice(null)).toEqual(DEFAULT_DEVICE);
    expect(error).not.toHaveBeenCalled();
  });

  it("returns a copy so callers cannot mutate DEFAULT_DEVICE", () => {
    const snapshot = detectDevice();
    snapshot.browser.name = "mutated";
    snapshot.os.isIOS = true;
    expect(DEFAULT_DEVICE.browser.name).toBe("Unknown");
    expect(DEFAULT_DEVICE.os.isIOS).toBe(false);
    expect(detectDevice().browser.name).toBe("Unknown");
  });

  it("reads no client env without a document-bearing window", () => {
    expect(readClientDeviceEnv()).toBeNull();
  });

  it("detects iPhone Safari as mobile iOS", () => {
    const device = detectDevice(IPHONE_SAFARI);
    expect(device.os.isIOS).toBe(true);
    expect(device.isMobile).toBe(true);
    expect(device.isTouchDevice).toBe(true);
    expect(device.browser.inApp).toBe(false);
    expect(device.isBot).toBe(false);
  });

  it("detects desktop Chrome on macOS", () => {
    const device = detectDevice(MAC_CHROME);
    expect(device.browser.isChrome).toBe(true);
    expect(device.browser.isSafari).toBe(false);
    expect(device.os.isIOS).toBe(false);
    expect(device.os.isAndroid).toBe(false);
    expect(device.isMobile).toBe(false);
    expect(device.isTouchDevice).toBe(false);
    expect(device.browser.inApp).toBe(false);
  });

  it("detects Android Chrome as mobile Android", () => {
    const device = detectDevice({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5
    });
    expect(device.os.isAndroid).toBe(true);
    expect(device.isMobile).toBe(true);
    expect(device.isTouchDevice).toBe(true);
  });

  it("treats KakaoTalk UA as an in-app browser named KakaoTalk", () => {
    const device = detectDevice(KAKAOTALK_IPHONE);
    expect(device.browser.inApp).toBe(true);
    expect(device.browser.name).toBe("KakaoTalk");
    expect(device.os.isIOS).toBe(true);
  });

  it("treats Instagram UA as an in-app browser", () => {
    const device = detectDevice(INSTAGRAM_IPHONE);
    expect(device.browser.inApp).toBe(true);
  });

  it("flags Googlebot as a bot", () => {
    const device = detectDevice(GOOGLEBOT);
    expect(device.isBot).toBe(true);
  });

  it("treats MacIntel + multiple touch points as a spoofed iPad", () => {
    const device = detectDevice(SPOOFED_IPAD);
    expect(device.os.name).toBe("iOS");
    expect(device.os.isIOS).toBe(true);
    expect(device.isTouchDevice).toBe(true);
  });
});

describe("createDeviceStore hydration", () => {
  it("starts from DEFAULT_DEVICE when no snapshot is passed", () => {
    const store = createDeviceStore();
    expect(store.getState().browser.name).toBe("Unknown");
    expect(store.getState().isMobile).toBe(false);
    expect(store.getState().localStorage).toBe(false);
  });

  it("hydrates detection fields without wiping an existing fingerprint", () => {
    const store = createDeviceStore();
    store.getState().setFingerPrint("keep-me");
    store.getState().hydrateDevice(detectDevice(IPHONE_SAFARI));
    const state = store.getState();
    expect(state.fingerprint).toBe("keep-me");
    expect(state.os.isIOS).toBe(true);
    expect(state.isMobile).toBe(true);
    expect(state.localStorage).toBe(false);
  });

  it("preserves localStorage across hydrate", () => {
    const store = createDeviceStore();
    store.getState().setStorageAvailable(true);
    store.getState().hydrateDevice(detectDevice(IPHONE_SAFARI));
    expect(store.getState().localStorage).toBe(true);
    expect(store.getState().isMobile).toBe(true);
  });
});
