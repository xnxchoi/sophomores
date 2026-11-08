import { describe, expect, it, vi } from "vitest";

import {
  FAVICON_FRAME_RATE_VARIANTS,
  createFaviconWorkerInitMessage
} from "./faviconConfig";
import {
  canAnimateFavicon,
  measureFaviconFrameRate,
  selectFaviconFrameRateVariant
} from "./support";

const supportedRuntime = {
  FileReader: vi.fn() as unknown as typeof FileReader,
  OffscreenCanvas: vi.fn() as unknown as typeof OffscreenCanvas,
  Worker: vi.fn() as unknown as typeof Worker,
  cancelAnimationFrame: vi.fn() as unknown as typeof cancelAnimationFrame,
  createImageBitmap: vi.fn() as unknown as typeof createImageBitmap,
  matchMedia: vi.fn(() => ({ matches: false }) as MediaQueryList),
  requestAnimationFrame: vi.fn() as unknown as typeof requestAnimationFrame
};

const createFrameRuntime = (timestamps: number[]) => {
  let index = 0;

  return {
    ...supportedRuntime,
    document: {
      visibilityState: "visible"
    } as Document,
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      const timestamp = timestamps[index] ?? timestamps.at(-1) ?? 0;
      index += 1;
      queueMicrotask(() => callback(timestamp));

      return index;
    }) as unknown as typeof requestAnimationFrame
  };
};

describe("animated favicon support gate", () => {
  it("allows animation when worker-side rendering capabilities are present", () => {
    expect(canAnimateFavicon(supportedRuntime)).toBe(true);
  });

  it("allows animation when reduced motion is requested", () => {
    expect(
      canAnimateFavicon({
        ...supportedRuntime,
        matchMedia: vi.fn(() => ({ matches: true }) as MediaQueryList)
      })
    ).toBe(true);
  });

  it("disables animation when requestAnimationFrame is unavailable", () => {
    const { requestAnimationFrame: _requestAnimationFrame, ...runtime } =
      supportedRuntime;

    expect(canAnimateFavicon(runtime)).toBe(false);
  });

  it("disables animation when OffscreenCanvas is unavailable", () => {
    const { OffscreenCanvas: _OffscreenCanvas, ...runtime } = supportedRuntime;

    expect(canAnimateFavicon(runtime)).toBe(false);
  });
});

describe("animated favicon frame-rate variants", () => {
  it("falls back to the 15fps variant when measurement is unavailable", () => {
    expect(selectFaviconFrameRateVariant(null)).toBe(
      FAVICON_FRAME_RATE_VARIANTS.low15
    );
  });

  it("classifies measured runtimes into 15fps, 30fps, and 40fps tiers", () => {
    expect(selectFaviconFrameRateVariant(15).variant).toBe("low15");
    expect(selectFaviconFrameRateVariant(30).variant).toBe("balanced30");
    expect(selectFaviconFrameRateVariant(60).variant).toBe("fluid40");
  });

  it("measures requestAnimationFrame cadence before selecting a tier", async () => {
    await expect(
      measureFaviconFrameRate(createFrameRuntime([0, 66.7, 133.4, 200.1]), {
        sampleCount: 4
      })
    ).resolves.toBe(FAVICON_FRAME_RATE_VARIANTS.low15);

    await expect(
      measureFaviconFrameRate(createFrameRuntime([0, 33.3, 66.6, 99.9]), {
        sampleCount: 4
      })
    ).resolves.toBe(FAVICON_FRAME_RATE_VARIANTS.balanced30);

    await expect(
      measureFaviconFrameRate(createFrameRuntime([0, 16.7, 33.4, 50.1]), {
        sampleCount: 4
      })
    ).resolves.toBe(FAVICON_FRAME_RATE_VARIANTS.fluid40);
  });
});

describe("animated favicon worker config", () => {
  it("includes the animation scale, duration, cadence, and selected FPS in the init message", () => {
    expect(
      createFaviconWorkerInitMessage(FAVICON_FRAME_RATE_VARIANTS.fluid40)
    ).toMatchObject({
      baseImage: "/favicon-32x32.png",
      glintDuration: 3600,
      interval: 5400,
      surfaceAreaScale: 10,
      targetFps: 40,
      type: "init",
      variant: "fluid40"
    });
  });
});
