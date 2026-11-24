import { registerHooks } from "node:module";

// SSR behavior tests do not render CSS. Use Node 24's native load hook rather
// than adding a test framework or changing production component imports.
// Browser journeys remain responsible for styling and visual acceptance.
// The geist package's fonts are next/font loaders, which only run inside Next's compiler: SSR tests get empty fonts.
const EMPTY_FONT = new URL("./empty-font.cjs", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^geist\/font(\/|$)/.test(specifier)) return { url: EMPTY_FONT, format: "commonjs", shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".module.css")) {
      return { format: "commonjs", source: "module.exports = {};", shortCircuit: true };
    }
    return nextLoad(url, context);
  }
});
