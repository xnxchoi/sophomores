import { resolveFlameConfig } from "@/components/gl/flame-backdrop/config";
import { resolveFooterComposition, resolveFooterConfig } from "@/components/gl/flame-backdrop/footer-config";

/*
 * The flame colours from before Palette r3 (26 Nov), when the shader fixtures were recorded. The fixtures guard the
 * shader's structure and Float32 values through refactors, so they are fed the colours they were made with; the app
 * itself now takes its flame colours from the owner's palette (config.ts, footer-config.ts).
 */
const background = { backgroundColor: "#030504" };
const ring = { baseColor: "#155BFF", tipColor: "#5CBFFF", alternateBaseColor: "#155BFF", alternateTipColor: "#5CBFFF" };
const footer = { baseColor: "#155BFF", tipColor: "#5CBFFF", alternateBaseColor: "#086FBA", alternateTipColor: "#48BFA6" };

export const historicalFlameConfig = () => resolveFlameConfig({ visual: background, fire: ring });
export const historicalFooterConfig = () => resolveFooterConfig({ visual: background, fire: footer });
export const historicalReferenceConfig = (width: number, height: number) =>
  resolveFooterConfig({ visual: background, fire: footer, composition: resolveFooterComposition(width, height), ignition: { enabled: false } });
