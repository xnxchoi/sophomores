import { registerHooks } from "node:module";

// The site frame's header bar reaches the notification inbox, whose server actions load the Payload config.
// Importing this module first stubs those actions for the rest of the test process, as the mode-switch test
// does for its own render. Only the inbox's own import of its actions is redirected.
const inboxURL = new URL(
  "../../src/components/notifications/notification-inbox.tsx",
  import.meta.url
).href;
const boundaryURL = new URL(
  "../fixtures/notification-action-boundary.ts",
  import.meta.url
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL === inboxURL &&
      specifier === "@/payload/collections/notifications/actions"
    )
      return { url: boundaryURL, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});
