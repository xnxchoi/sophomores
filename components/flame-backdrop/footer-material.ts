/** Opt-in site study; not part of the approved reusable flame configuration. */
export type FooterMaterial = 'light' | 'substance';

export function validateFooterMaterial(value: FooterMaterial): void {
  if (value !== 'light' && value !== 'substance') {
    throw new TypeError('footerMaterial must be light or substance.');
  }
}

/** Existing field plus two broad advected patches; no new geometry, textures, or animation clock. */
export const FOOTER_SUBSTANCE_GLSL = `
  float materialStep = .035;
  float materialAcross = flameReaction(x + materialStep, lift, phase);
  float materialAbove = flameReaction(x, lift + materialStep, phase);
  vec2 materialSlope = vec2(materialAcross - reaction, materialAbove - reaction) / materialStep;
  vec3 materialNormal = normalize(vec3(-materialSlope * .7, .55));
  float materialFacing = clamp(dot(materialNormal, normalize(vec3(-.65, .5, .7))), 0.0, 1.0);
  float materialTravel = phase / 6.283185307179586 * 8.0;
  float materialPatch = flameNoise(x * 2.1 + 7.3, lift * .60 - materialTravel);
  float materialBacklight = flameNoise(x * 1.3 + 23.1, lift * .42 - materialTravel + 3.7);
  float materialSupport = smoothstep(-softness * .9, softness * .75, reaction);
  float materialDensity = .10 + 1.9 * smoothstep(.22, .78, materialPatch);
  float materialTransmission = exp(-materialDensity * (1.0 + .5 * (1.0 - materialNormal.z)));
  float materialInterior = materialSupport * 1.15 * materialTransmission * (.40 + .80 * smoothstep(.18, .78, materialBacklight));
  float materialGlintGate = smoothstep(.50, .88, materialFacing)
    * smoothstep(.52, .76, materialBacklight) * smoothstep(.32, .65, materialPatch);
  float materialRidge = flameFront(reaction, softness * .38);
  float materialHighlight = materialRidge * materialGlintGate * .55;
  float materialLight = materialInterior + materialHighlight;
`;
