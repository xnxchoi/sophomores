/*
 * The owner's palette (src/styles/sophomores-palette.css) as sRGB hex, for code that can't read a CSS variable: WebGL
 * uniforms, canvas fills, three.js colours and vendored scene props. Each entry names its palette variable; a test
 * checks every hex against the one the palette file records on that variable's line. Names follow DESIGN.md (Colors).
 * In CSS and classNames use the palette utilities or var(--color-*) instead.
 */
export const PALETTE = {
  titanium: { paletteVar: "--white", hex: "#E4E6EA" },
  carbonDeep: { paletteVar: "--carbon-deep", hex: "#050507" },
  carbon: { paletteVar: "--black", hex: "#141518" },
  carbonLighter2: { paletteVar: "--black-lighter-2", hex: "#3B3C3F" },
  gunmetal: { paletteVar: "--dark-grey", hex: "#20242B" },
  gunmetalLighter2: { paletteVar: "--dark-grey-lighter-2", hex: "#494D55" },
  pewter: { paletteVar: "--light-grey", hex: "#747882" },
  singerStone: { paletteVar: "--stone", hex: "#CED4D8" },
  celadon: { paletteVar: "--celadon", hex: "#DCE3DE" },
  mauveBone: { paletteVar: "--bone", hex: "#E8DCE0" },
  mediciCypress: { paletteVar: "--medici-cypress", hex: "#1A362B" },
  mediciCypressTuned: { paletteVar: "--deep-green", hex: "#17362E" },
  mediciCypressDarker1: { paletteVar: "--deep-green-darker-1", hex: "#02221B" },
  imperialPlum: { paletteVar: "--purple", hex: "#86094E" },
  imperialPlumDarker1: { paletteVar: "--purple-darker-1", hex: "#650038" },
  imperialPlumDarker2: { paletteVar: "--purple-darker-2", hex: "#430024" },
  saffronAmber: { paletteVar: "--yellow", hex: "#FB9342" },
  saffronAmberLighter1: { paletteVar: "--yellow-lighter-1", hex: "#C8D752" },
  mutedOlive: { paletteVar: "--olive", hex: "#A9B600" },
  signalOrange: { paletteVar: "--orange", hex: "#D76F00" },
  signalOrangeLighter: { paletteVar: "--orange-lighter", hex: "#FF850A" },
  deepCinnabar: { paletteVar: "--red", hex: "#BA2027" },
  arterialRed: { paletteVar: "--dark-red", hex: "#9E131C" },
  gulfCerulean: { paletteVar: "--gulf-cerulean", hex: "#2E7DA6" },
  gulfCeruleanLighter: { paletteVar: "--gulf-cerulean-lighter", hex: "#11B8FF" },
  ultramarine: { paletteVar: "--blue", hex: "#005477" },
} as const;

export type PaletteName = keyof typeof PALETTE;

/** A palette colour as sRGB channels from 0 to 1, for shader uniforms and vendored scene props that take numbers. */
export const paletteRGB = (name: PaletteName): [number, number, number] =>
  [1, 3, 5].map((at) => parseInt(PALETTE[name].hex.slice(at, at + 2), 16) / 255) as [number, number, number];
