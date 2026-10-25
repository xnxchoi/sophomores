import { registerHooks } from "node:module";

// SSR behavior tests do not render CSS. Use Node 24's native load hook rather
// than adding a test framework or changing production component imports.
// Browser journeys remain responsible for styling and visual acceptance.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".module.css")) {
      return { format: "commonjs", source: "module.exports = {};", shortCircuit: true };
    }
    return nextLoad(url, context);
  }
});
