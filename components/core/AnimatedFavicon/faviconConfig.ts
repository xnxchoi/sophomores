export type FaviconFrameRateVariant = "low15" | "balanced30" | "fluid40";

export type FaviconFrameRateConfig = {
  glintDuration: number;
  interval: number;
  surfaceAreaScale: number;
  targetFps: number;
  variant: FaviconFrameRateVariant;
};

export type FaviconWorkerInitMessage = {
  baseImage: string;
  glintDuration: number;
  interval: number;
  surfaceAreaScale: number;
  targetFps: number;
  type: "init";
  variant: FaviconFrameRateVariant;
};

const FAVICON_GLINT_BASE_CONFIG = {
  baseImage: "/favicon-32x32.png",
  glintDuration: 3600,
  interval: 5400,
  surfaceAreaScale: 10
} as const;

export const FAVICON_FRAME_RATE_VARIANTS = {
  low15: {
    glintDuration: FAVICON_GLINT_BASE_CONFIG.glintDuration,
    interval: FAVICON_GLINT_BASE_CONFIG.interval,
    surfaceAreaScale: FAVICON_GLINT_BASE_CONFIG.surfaceAreaScale,
    targetFps: 15,
    variant: "low15"
  },
  balanced30: {
    glintDuration: FAVICON_GLINT_BASE_CONFIG.glintDuration,
    interval: FAVICON_GLINT_BASE_CONFIG.interval,
    surfaceAreaScale: FAVICON_GLINT_BASE_CONFIG.surfaceAreaScale,
    targetFps: 30,
    variant: "balanced30"
  },
  fluid40: {
    glintDuration: FAVICON_GLINT_BASE_CONFIG.glintDuration,
    interval: FAVICON_GLINT_BASE_CONFIG.interval,
    surfaceAreaScale: FAVICON_GLINT_BASE_CONFIG.surfaceAreaScale,
    targetFps: 40,
    variant: "fluid40"
  }
} as const satisfies Record<FaviconFrameRateVariant, FaviconFrameRateConfig>;

export const createFaviconWorkerInitMessage = (
  config: FaviconFrameRateConfig
): FaviconWorkerInitMessage => ({
  baseImage: FAVICON_GLINT_BASE_CONFIG.baseImage,
  glintDuration: config.glintDuration,
  interval: config.interval,
  surfaceAreaScale: config.surfaceAreaScale,
  targetFps: config.targetFps,
  type: "init",
  variant: config.variant
});
