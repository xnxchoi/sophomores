import { LinearFilter } from 'three';

/**
 * Single tuning location for flame clarity and visibility. Values are the current
 * appearance, not a new preset. Ranges below are practical starting guidance, not
 * new validation/clamps. Change one group at a time and compare at matched time.
 *
 * LIVE = changes generated/runtime rendering after reload. MASK BUILD = changes
 * procedural exports/editor defaults only; regenerate the PNG before shipping.
 * LEGACY = inactive in the current footer; never enable it implicitly.
 * Noise, color, ignition choreography and silhouette geometry are not blur knobs.
 */
export const FLAME_APPEARANCE = Object.freeze({
  front: Object.freeze({
    /** LIVE, reaction units. Lower narrows/sharpens luminous fronts; too low becomes thin lines. Useful .02–.10; accepted config bounds .005–.20. */
    softness: .045,
    /** LIVE, reaction units. Maximum pixel-size anti-alias widening. Useful 0–.05; larger smooths small renders, not the mask. */
    pixelSoftnessCap: .030,
    /** LIVE, unitless. Pixel-size widening strength before its cap. Useful 0–.60; higher reduces aliasing but softens fine detail. */
    pixelSoftnessScale: .30,
    /** LIVE, reaction units at full pointer weight. Useful 0–.03; hover broadens fronts. Current image-backed footer has zero pointer weight. */
    pointerSoftness: .012,
  }),
  originalMaterial: Object.freeze({
    /** LIVE, softness multiplier. OG front width before local backlight. Useful .4–1.2; lower sharpens OG edges. */
    frontWidthBase: .85,
    /** LIVE, added softness multiplier. Useful 0–1; higher makes bright patches broader. */
    frontWidthBacklight: .55,
    /** LIVE, radiance multiplier. Useful 0–.6; brighter front even in dark local backlight. */
    emissionFloor: .24,
    /** LIVE, radiance multiplier. Useful 0–1.5; increases local light contrast, not geometric sharpness. */
    emissionBacklight: .95,
    /** LIVE, softness multiplier. Useful 1–4; larger spreads the OG diffuse glow farther from fronts. */
    diffusionWidth: 2.6,
    /** LIVE, radiance multiplier. Useful 0–.4; lower reduces fog, zero removes this diffuse contribution. */
    diffusionGain: .22,
    /** LIVE, normalized local-backlight gate start. Useful 0–.5; keep below diffusionBacklightHigh. */
    diffusionBacklightLow: .18,
    /** LIVE, normalized local-backlight gate end. Useful .4–1; keep above diffusionBacklightLow. */
    diffusionBacklightHigh: .72,
    /** LIVE, diffuse fuel baseline. Useful 0–.5; higher keeps more glow between fuel-rich patches. */
    diffusionFuelFloor: .25,
    /** LIVE, fuel-dependent diffuse gain. Useful 0–1; larger concentrates glow in fuel-rich areas. */
    diffusionFuel: .75,
    /** LIVE, softness multiplier. OG interior fade starts here. Useful .3–1.5; keep below interiorEnd. */
    interiorStart: .7,
    /** LIVE, softness multiplier. OG interior fade reaches full strength here. Useful 1.5–5; keep above interiorStart. */
    interiorEnd: 3.5,
    /** LIVE, radiance multiplier. Useful 0–.15; adds faint OG interior fill instead of edge-only contours. */
    interiorGain: .055,
    /** LIVE, normalized noise gate start. Useful .1–.4; lower admits more material coverage. Keep below fuelHigh. */
    fuelLow: .24,
    /** LIVE, normalized noise gate end. Useful .5–.9; higher gives more gradual fuel coverage. Keep above fuelLow. */
    fuelHigh: .70,
  }),
  bodyMaterial: Object.freeze({
    /** LIVE, reaction units. Useful .05–.25; lower fills the NG body earlier/more continuously. */
    bodyThreshold: .1,
    /** LIVE, local-body radiance baseline. Useful .2–.8; higher keeps dark patches visible. */
    bodyFloor: .6,
    /** LIVE, local-backlight gain. Useful 0–1; increases NG patch illumination/contrast. */
    bodyBacklight: .74,
    /** LIVE, independent interior gain. Useful .5–1; higher favors a filled body over contours. These gains need not sum to one; output is clamped. */
    bodyWeight: .9,
    /** LIVE, softness multiplier. Useful .7–2; lower makes the NG edge narrower/sharper. */
    edgeWidth: 1.25,
    /** LIVE, independent edge gain. Useful 0–.3; higher emphasizes defined contours. */
    edgeWeight: .18,
    /** LIVE, softness multiplier. Useful 1.5–4; larger spreads the faint NG halo. */
    haloWidth: 2.6,
    /** LIVE, independent halo gain. Useful 0–.1; lower reduces the surrounding haze. */
    haloWeight: .02,
  }),
  materialMix: Object.freeze({
    /** LIVE, normalized OG share, 0–1. Preserve original + next = 1; more OG retains the original luminous surface. */
    original: .75,
    /** LIVE, normalized NG share, 0–1. More NG fills interiors; this is material identity, not a blur slider. */
    next: .25,
  }),
  exposure: Object.freeze({
    /** LIVE, overall linear-light gain. Useful .4–1.2; current accepted config bounds 0–3. Affects visibility, not sharpness. */
    brightness: .65,
    /** LIVE, flame-only radiance gain. Useful .5–1.5; affects brightness, not front width. */
    intensity: 1,
    /** LIVE, final material radiance scale. Useful .1–.4; raising it brightens all material contributions together. */
    baseGain: .22,
    /** LIVE, extra radiance at full pointer weight. Useful 0–.1; current image-backed footer has zero pointer weight. */
    pointerGain: .06,
    /** LIVE, lower stem-strand gain. Useful 0–.2; high values can introduce a hard burner-like base. */
    stemStrength: .10,
    breathing: Object.freeze({
      /** LIVE active-time seconds per brightness cycle. Useful 12–40; this is exposure variation, not blur or ignition duration. */
      periodSeconds: 24,
      /** LIVE, dimmest emission multiplier. Useful .5–1.5; keep at or below maximumGain. */
      minimumGain: 1,
      /** LIVE, brightest emission multiplier. Useful 1–2.5; keep at or above minimumGain. */
      maximumGain: 1.9,
    }),
  }),
  rendering: Object.freeze({
    /** LIVE, device-pixel-ratio floor/ceiling. Useful [1,1] to [1,2]; pixel cost grows quadratically. Higher improves sampling, not procedural softness. */
    dpr: Object.freeze([1, 1.5] as const),
    /** LIVE, MSAA boolean. false/true; false preserves the current full-screen shader path. Not a Gaussian blur control. */
    antialias: false,
    /** LIVE, transparent canvas boolean. Keep true so the mask can reveal the page beneath. */
    alpha: true,
    /** LIVE, compositing contract boolean. Keep false with the current shader/output pipeline. */
    premultipliedAlpha: false,
    /** LIVE, R3F flat boolean. Keep true: shader performs its own color conversion rather than extra tone mapping. */
    flat: true,
    /** LIVE, material tone-mapping boolean. Keep false with the explicit shader sRGB conversion. */
    toneMapped: false,
    /** LIVE, Three filter enum. LinearFilter is smooth; NearestFilter would produce hard mask sampling. Does not remove baked feathering. */
    maskMinFilter: LinearFilter,
    /** LIVE, Three filter enum. LinearFilter/NearestFilter; keep LinearFilter for the current translucent alpha mask. */
    maskMagFilter: LinearFilter,
    /** LIVE, mipmap boolean. Keep false with the current non-mipmapped mask filtering. */
    generateMipmaps: false,
  }),
  mask: Object.freeze({
    /** LIVE source URL. Alpha defines the silhouette; RGB is ignored. Selecting another source can change apparent sharpness. */
    url: '/masks/flame-envelope.png',
    /** MASK BUILD, raster pixels. Useful 1440–4096 with matching aspect; changing this does not regenerate the shipped PNG. */
    exportWidth: 2880,
    /** MASK BUILD, raster pixels. Useful 900–2560 with matching aspect; preserve export aspect when comparing. */
    exportHeight: 1800,
    /** MASK BUILD, normalized viewBox percent [x,y]. Useful near [50,62]; shifts the opacity field, not the outline. */
    origin: Object.freeze([50, 62] as const),
    /** MASK BUILD, nested opacity contours. Useful 64–256; higher reduces gradient banding at added export complexity. */
    layers: 128,
    /** MASK BUILD, percent of viewport height. Useful 0–2; lower sharpens the outer alpha silhouette, not internal flame detail. */
    smoothing: 1.39,
    /** MASK BUILD/editor limit, percent of viewport height. Current practical range 0–2; not a runtime blur cap. */
    maxSmoothing: 2,
    /** MASK BUILD, contour-opacity exponent. Useful 1–4; higher reduces opacity toward the outskirts. */
    falloff: 1.2,
    /** MASK BUILD/editor lower exponent bound; current supported range 1–4. */
    minFalloff: 1,
    /** MASK BUILD/editor upper exponent bound; current supported range 1–4. */
    maxFalloff: 4,
    /** MASK BUILD, normalized inner-opacity lift. Useful 0–.4; raises the center without changing outer-edge opacity or RGB. */
    centerLift: .18,
    /** MASK BUILD/editor upper lift bound, normalized 0–.4. */
    maxCenterLift: .4,
  }),
  presentation: Object.freeze({
    /** LIVE, vertical geometry multiplier. Useful 1–1.8; changes apparent proportions/detail spacing, not actual shader blur. */
    verticalStretch: 1.45,
  }),
  legacy: Object.freeze({
    /** INACTIVE footer token, normalized 0–1. No current production consumer; changing it does not change live opacity. */
    footerOpacity: .85,
    /** INACTIVE rejected visibility experiment, multiplier. Former .15 sharply narrowed fronts; do not silently apply. */
    visibilitySoftnessScale: .15,
    /** INACTIVE rejected visibility experiment, gain. Former 4x brightness; do not silently apply. */
    visibilityBrightnessGain: 4,
    /** BEFORE-only mask smoothing, percent. Historical editor range 0–8; not the saved PNG's smoothing value. */
    beforeFeather: 6.5,
    /** BEFORE-only mask exponent. Historical editor range 1–4; not the saved PNG's falloff value. */
    beforeFalloff: 2.2,
    /** Non-substance fire body fill, normalized 0–.15. The current image-backed substance footer does not emit this raw body variable. */
    rawBodyOpacity: .15,
  }),
});
