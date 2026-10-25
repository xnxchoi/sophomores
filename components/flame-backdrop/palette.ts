/** Palette order matches the shader's uPaletteWeights uniform. RGB is mixed in linear light. */
export type FlamePalette = "pale-brass" | "gilded-flame" | "copper-ember";
export type PaletteWeights = readonly [number, number, number];
export type PaletteInput = FlamePalette | PaletteWeights;

const NAMES: readonly FlamePalette[] = Object.freeze([
  "pale-brass",
  "gilded-flame",
  "copper-ember"
]);
const ENDPOINTS: readonly PaletteWeights[] = Object.freeze([
  Object.freeze([1, 0, 0] as const),
  Object.freeze([0, 1, 0] as const),
  Object.freeze([0, 0, 1] as const)
]);

export function paletteIndex(palette: FlamePalette): number {
  const index = NAMES.indexOf(palette);
  if (index < 0)
    throw new RangeError(`Unknown flame palette: ${String(palette)}`);
  return index;
}

export function paletteWeights(palette: FlamePalette): PaletteWeights {
  return ENDPOINTS[paletteIndex(palette)];
}

/** Nonnegative weights are normalized; max-scaling avoids overflow for large finite inputs. */
export function resolvePaletteWeights(input: PaletteInput): PaletteWeights {
  if (typeof input === "string") return paletteWeights(input);
  if (
    !Array.isArray(input) ||
    input.length !== 3 ||
    !Array.from(input).every((value) => Number.isFinite(value) && value >= 0)
  ) {
    throw new RangeError(
      "Palette weights must contain three finite, nonnegative numbers."
    );
  }
  const maximum = Math.max(...input);
  if (maximum === 0)
    throw new RangeError(
      "Palette weights must have at least one positive value."
    );
  const scaled = input.map((value) => value / maximum);
  const sum = scaled.reduce((total, value) => total + value, 0);
  return Object.freeze(
    scaled.map((value) => value / sum)
  ) as unknown as PaletteWeights;
}

export interface ScrollPaletteStop {
  readonly progress: number;
  readonly palette: FlamePalette;
}
/** Example mapping only; nothing observes scrolling unless the host chooses to. */
export const DEFAULT_SCROLL_PALETTE_STOPS: readonly ScrollPaletteStop[] =
  Object.freeze([
    Object.freeze({ progress: 0, palette: "gilded-flame" as const }),
    Object.freeze({ progress: 0.4, palette: "pale-brass" as const }),
    Object.freeze({ progress: 0.75, palette: "copper-ember" as const })
  ]);

export function resolveScrollStops(
  stops: readonly ScrollPaletteStop[] = DEFAULT_SCROLL_PALETTE_STOPS
): readonly ScrollPaletteStop[] {
  if (!Array.isArray(stops) || !stops.length || stops[0]?.progress !== 0) {
    throw new RangeError("Scroll palette stops must start at progress 0.");
  }
  return Object.freeze(
    Array.from(stops).map((stop, index) => {
      if (
        !stop ||
        !Number.isFinite(stop.progress) ||
        stop.progress < 0 ||
        stop.progress > 1 ||
        (index > 0 && stop.progress <= stops[index - 1].progress)
      ) {
        throw new RangeError(
          "Scroll stop progress must be strictly increasing within [0, 1]."
        );
      }
      paletteIndex(stop.palette);
      return Object.freeze({ progress: stop.progress, palette: stop.palette });
    })
  );
}

/** A driver helper, not a scroll subscription; section observers may simply pass a palette instead. */
export function paletteAtProgress(
  progress: number,
  stops: readonly ScrollPaletteStop[] = DEFAULT_SCROLL_PALETTE_STOPS
): FlamePalette {
  if (!Number.isFinite(progress))
    throw new RangeError("Scroll progress must be finite.");
  const valid = resolveScrollStops(stops);
  return [...valid]
    .reverse()
    .find((stop) => stop.progress <= Math.max(0, Math.min(1, progress)))!
    .palette;
}

export function scrollProgress(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number
): number {
  if (![scrollTop, scrollHeight, viewportHeight].every(Number.isFinite))
    throw new RangeError("Scroll dimensions must be finite.");
  const travel = scrollHeight - viewportHeight;
  return travel > 0 ? Math.max(0, Math.min(1, scrollTop / travel)) : 0;
}

export interface PaletteCycleOptions {
  readonly palettes?: readonly FlamePalette[];
  readonly holdSeconds?: number;
  readonly transitionSeconds?: number;
}

/** Optional external-clock driver. Pass its output with transitionSeconds={0} to avoid double easing. */
export function cyclePaletteWeights(
  elapsedSeconds: number,
  options: PaletteCycleOptions = {}
): PaletteWeights {
  if (!Number.isFinite(elapsedSeconds))
    throw new RangeError("Cycle time must be finite.");
  const {
    palettes = ["gilded-flame", "copper-ember", "pale-brass"],
    holdSeconds = 8,
    transitionSeconds = 8
  } = options;
  if (!Array.isArray(palettes) || !palettes.length)
    throw new RangeError("A cycle needs at least one palette.");
  if (
    !Number.isFinite(holdSeconds) ||
    holdSeconds < 0 ||
    !Number.isFinite(transitionSeconds) ||
    transitionSeconds <= 0
  ) {
    throw new RangeError(
      "Cycle holdSeconds must be nonnegative and transitionSeconds positive."
    );
  }
  const endpoints = Array.from(palettes).map(paletteWeights);
  const segment = holdSeconds + transitionSeconds;
  const duration = segment * endpoints.length;
  if (!Number.isFinite(duration))
    throw new RangeError("Cycle duration must be finite.");
  const clock = ((elapsedSeconds % duration) + duration) % duration;
  const index = Math.floor(clock / segment);
  const t = Math.max(
    0,
    Math.min(1, ((clock % segment) - holdSeconds) / transitionSeconds)
  );
  const eased = t * t * (3 - 2 * t);
  return Object.freeze(
    endpoints[index].map(
      (value, channel) =>
        value * (1 - eased) +
        endpoints[(index + 1) % endpoints.length][channel] * eased
    )
  ) as unknown as PaletteWeights;
}
