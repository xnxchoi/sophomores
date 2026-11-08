/** Opt-in site study; not part of the approved reusable flame configuration. */
export type FooterMaterial = 'light' | 'substance' | 'aurora';

export function validateFooterMaterial(value: FooterMaterial): void {
  if (value !== 'light' && value !== 'substance' && value !== 'aurora') {
    throw new TypeError('footerMaterial must be light, substance or aurora.');
  }
}

/** Self-emission from the existing reaction field; two advected patches, no reflective surface. */
export const FOOTER_SUBSTANCE_GLSL = `
  float materialTravel = phase / 6.283185307179586 * 8.0;
  float materialPatch = flameNoise(x * 2.1 + 7.3, lift * .60 - materialTravel);
  float materialBacklight = flameNoise(x * 1.3 + 23.1, lift * .42 - materialTravel + 3.7);
  float materialFuel = smoothstep(.24, .70, materialPatch);
  float materialFront = flameFront(reaction, softness * (.85 + .55 * materialBacklight));
  float materialGlow = flameFront(reaction, softness * 2.6);
  float materialEmission = materialFront * (.24 + .95 * materialBacklight) * materialFuel;
  float materialDiffusion = materialGlow * .22 * smoothstep(.18, .72, materialBacklight)
    * (.25 + .75 * materialFuel);
  float materialInterior = smoothstep(softness * .7, softness * 3.5, reaction)
    * .055 * materialFuel * materialBacklight;
  float materialRootFade = 1.0 - smoothstep(.02, .72 + .16 * materialPatch, lift);
  float materialRoot = materialRootFade * (.16 + .38 * smoothstep(-.18, .20, reaction))
    * (.55 + .45 * materialBacklight);
  float materialLight = (materialEmission + materialDiffusion) * 1.9 + materialInterior + materialRoot;
`;
