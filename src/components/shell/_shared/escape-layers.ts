/**
 * Escape and focus for the site shell: the header, its panels and the site menu. One decision for every
 * listener, so they all follow the same table (header v6 spec, escape-focus-table.md in the packet).
 *
 * Feature-private and shared by `shell/header-actions.tsx` (header panels) and `UX/Menu/index.tsx` (the
 * menu), which already depends on the shell for its scroll hold. Pure: no React.
 *
 * Checked first: Base UI / Radix dismissable layers would own this if the panels and menu were library
 * layers, but they are hand-rolled Motion surfaces, so there is no layer stack to join. The guide is a
 * Base UI Dialog and keeps its own dismissal; the shell only yields to it.
 */

/** Where the key was pressed. */
export type EscapeOrigin = "header" | "panel" | "menu" | "body" | "page";
/** Which shell layer one Escape closes. */
export type EscapeLayer = "panel" | "menu";
/** Where focus goes after it closes. */
export type EscapeFocus = "panel-button" | "menu-button" | "stay";

/** Marks: the header root, an open header panel, the menu body. */
export const shellMarks = {
  header: "#rp-header",
  panel: "[data-header-panel]",
  menu: "[data-site-menu]"
} as const;

/** Foreground layers the shell yields to: the guide's Base UI Dialog, or any modal dialog. */
const foregroundLayer = "[role=dialog][data-open], [aria-modal=true]";

export function escapeOrigin(target: EventTarget | null, doc: Document): EscapeOrigin {
  if (!target || target === doc.body || target === doc.documentElement) return "body";
  if (!(target instanceof doc.defaultView!.Element)) return "page";
  if (target.closest(shellMarks.panel)) return "panel";
  if (target.closest(shellMarks.header)) return "header";
  if (target.closest(shellMarks.menu)) return "menu";
  return "page";
}

/** A foreground layer open outside the header and the menu (the guide, or another modal dialog). */
export function foregroundOpen(doc: Document): boolean {
  return Array.from(doc.querySelectorAll(foregroundLayer)).some(
    (layer) => !layer.closest(shellMarks.header) && !layer.closest(shellMarks.menu)
  );
}

/** An open header panel that isn't animating out (exiting panels are inert). */
export function panelOpen(doc: Document): boolean {
  return Array.from(doc.querySelectorAll(shellMarks.panel)).some((panel) => !panel.hasAttribute("inert"));
}

export type EscapeInput = {
  key: string;
  composing: boolean;
  repeat: boolean;
  claimed: boolean;
  origin: EscapeOrigin;
  foreground: boolean;
  panel: boolean;
  menu: boolean;
};

/** The table: which shell layer one Escape closes, or null when the shell leaves the key alone. */
export function escapeLayer(input: EscapeInput): EscapeLayer | null {
  if (input.key !== "Escape" || input.composing || input.repeat || input.claimed) return null;
  // Rule B / guide row: a foreground layer takes the key.
  if (input.foreground) return null;
  // Rule C: only the shell's scope counts.
  if (input.origin === "page") return null;
  // Rule A: with both open, the panel is the newer, higher layer.
  if (input.panel) return "panel";
  if (input.menu && input.origin !== "panel") return "menu";
  return null;
}

/** Where focus goes once `layer` closes. */
export function escapeFocus(layer: EscapeLayer, origin: EscapeOrigin): EscapeFocus {
  if (layer === "panel") return "panel-button";
  return origin === "header" ? "stay" : "menu-button";
}

/**
 * Read the live input for a key event. `guide` is the site guide's own open state (the tour store), so
 * the shell yields to it whether or not its surface carries dialog marks (the base tour is a tooltip).
 */
export function readEscape(event: KeyboardEvent, doc: Document, menu: boolean, guide = false): EscapeInput {
  return {
    key: event.key,
    composing: event.isComposing,
    repeat: event.repeat,
    claimed: event.defaultPrevented,
    origin: escapeOrigin(event.target, doc),
    foreground: guide || foregroundOpen(doc),
    panel: panelOpen(doc),
    menu
  };
}
