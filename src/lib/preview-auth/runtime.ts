import { createAuthHandlers } from "./auth";
import { loadConfig, type PreviewAuthConfig } from "./session";

let config: PreviewAuthConfig | undefined;
let handlers: ReturnType<typeof createAuthHandlers> | undefined;

/** Explicit public mode is for the public site; unset configuration fails closed. */
export function authMode(): "protected" | "public" {
  const value = process.env.PREVIEW_AUTH_MODE;
  if (value === undefined || value === "protected") return "protected";
  if (value === "public") return "public";
  throw new Error("Invalid preview authentication mode");
}

/** Read secrets lazily at runtime, never while Next builds the application. */
export function getPreviewConfig(): PreviewAuthConfig {
  config ??= loadConfig();
  return config;
}

/** One limiter and hash gate per application process, not per request. */
export function getPreviewHandlers(): ReturnType<typeof createAuthHandlers> {
  handlers ??= createAuthHandlers(getPreviewConfig());
  return handlers;
}
