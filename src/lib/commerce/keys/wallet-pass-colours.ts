/*
 * Our Wallet passes' colours. Owner, 26 Nov (via Cordy), picked pairing B: "Medici Cypress Darker -1 #02221B
 * background + Saffron Amber #FB9342 ink (labels and values)". Both come from src/styles/sophomores-palette.css
 * (--deep-green-darker-1 and --yellow) as the browser paints them in sRGB; the palette file isn't imported (its theme
 * blocks are a held change), so the values are pinned here and a test checks them against the palette. The logo art is
 * the BrandMark in the same --yellow (scripts/wallet-pass-art.tsx).
 */
export const WALLET_PASS_COLOURS = {
  background: { paletteVar: "--deep-green-darker-1", hex: "#02221B" },
  ink: { paletteVar: "--yellow", hex: "#FB9342" },
} as const;

/** Apple's pass.json colour format, "rgb(r, g, b)". */
export const appleRGB = (hex: string) => `rgb(${[1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16)).join(", ")})`;
