import { registerHooks } from "node:module";

// Import this first in a test that statically imports the site layout. The layout reaches the notification
// inbox, whose server action Next turns into an action reference; native Node imports the real action,
// which loads the Payload config and its credentials. This maps it to the shared boundary for this test
// process, as the dynamic-import tests do (tests/shell/reading-chrome and others). Each test file runs in
// its own process, so the mapping ends with the file.
const inboxURL = new URL("../../src/components/notifications/notification-inbox.tsx", import.meta.url).href;
const boundaryURL = new URL("./notification-action-boundary.ts", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === inboxURL && specifier === "@/payload/collections/notifications/actions")
      return { url: boundaryURL, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});
