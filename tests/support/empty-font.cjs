// The geist package's fonts are next/font loaders, which only run inside Next's compiler. SSR tests import this instead
// (tests/support/css-modules.mjs resolves `geist/font/*` here): a font with no class and no variable.
const font = { className: "", variable: "", style: { fontFamily: "" } };
module.exports = { GeistMono: font, GeistSans: font, default: font };
