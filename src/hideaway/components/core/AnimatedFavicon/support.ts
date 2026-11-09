import {
  FAVICON_FRAME_RATE_VARIANTS,
  type FaviconFrameRateConfig
} from "./faviconConfig";

type FaviconAnimationRuntime = {
  FileReader?: typeof FileReader;
  OffscreenCanvas?: typeof OffscreenCanvas;
  Worker?: typeof Worker;
  cancelAnimationFrame?: typeof cancelAnimationFrame;
  createImageBitmap?: typeof createImageBitmap;
  document?: Document;
  requestAnimationFrame?: typeof requestAnimationFrame;
};

export type FaviconAnimationSupport = {
  canAnimate: boolean;
  reason?: "missing-runtime";
};

type FrameRateMeasurementOptions = {
  sampleCount?: number;
  timeoutMs?: number;
};

const DEFAULT_SAMPLE_COUNT = 8;
const DEFAULT_TIMEOUT_MS = 300;

export const getFaviconAnimationSupport = (
  runtime: FaviconAnimationRuntime
): FaviconAnimationSupport => {
  if (
    typeof runtime.Worker !== "function" ||
    typeof runtime.OffscreenCanvas !== "function" ||
    typeof runtime.createImageBitmap !== "function" ||
    typeof runtime.FileReader !== "function" ||
    typeof runtime.requestAnimationFrame !== "function" ||
    typeof runtime.cancelAnimationFrame !== "function"
  ) {
    return { canAnimate: false, reason: "missing-runtime" };
  }

  return { canAnimate: true };
};

export const canAnimateFavicon = (runtime: FaviconAnimationRuntime): boolean =>
  getFaviconAnimationSupport(runtime).canAnimate;

const getMedian = (values: number[]) => {
  const sortedValues = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
  }

  return sortedValues[midpoint];
};

export const selectFaviconFrameRateVariant = (
  measuredFps: number | null | undefined
): FaviconFrameRateConfig => {
  if (!measuredFps || !Number.isFinite(measuredFps) || measuredFps < 20) {
    return FAVICON_FRAME_RATE_VARIANTS.low15;
  }

  if (measuredFps < 40) {
    return FAVICON_FRAME_RATE_VARIANTS.balanced30;
  }

  return FAVICON_FRAME_RATE_VARIANTS.fluid40;
};

const calculateFrameRate = (timestamps: number[]) => {
  const intervals = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index])
    .filter((interval) => interval > 0);

  if (intervals.length === 0) {
    return null;
  }

  return 1000 / getMedian(intervals);
};

export const measureFaviconFrameRate = (
  runtime: FaviconAnimationRuntime,
  options: FrameRateMeasurementOptions = {}
): Promise<FaviconFrameRateConfig> =>
  new Promise((resolve) => {
    const requestFrame = runtime.requestAnimationFrame;
    const cancelFrame = runtime.cancelAnimationFrame;
    const documentRef = runtime.document;

    if (
      typeof requestFrame !== "function" ||
      typeof cancelFrame !== "function" ||
      documentRef?.visibilityState === "hidden"
    ) {
      resolve(FAVICON_FRAME_RATE_VARIANTS.low15);
      return;
    }

    const sampleCount = Math.max(options.sampleCount ?? DEFAULT_SAMPLE_COUNT, 2);
    const timestamps: number[] = [];
    let isResolved = false;
    let frameId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (isResolved) {
        return;
      }

      isResolved = true;

      if (frameId !== null) {
        cancelFrame(frameId);
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      resolve(selectFaviconFrameRateVariant(calculateFrameRate(timestamps)));
    };

    const sample = (timestamp: number) => {
      if (isResolved) {
        return;
      }

      timestamps.push(timestamp);

      if (timestamps.length >= sampleCount) {
        finish();
        return;
      }

      frameId = requestFrame(sample);
    };

    timeoutId = setTimeout(finish, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    frameId = requestFrame(sample);
  });

export default canAnimateFavicon;
