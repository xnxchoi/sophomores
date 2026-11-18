export type PortTheme = "light" | "dark";

export const themeStorageKey = "sophomores-theme";

export function nextTheme(current: string | null): PortTheme {
  return current === "dark" ? "light" : "dark";
}

export const themeBoot = `(function () {
  try {
    var saved = localStorage.getItem("${themeStorageKey}");
    var theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
  } catch (error) {}
})();`;

// For a page themeBoot can't know by its path (the 404): rendered as an inline script at the top of
// the page, it applies the page's hold before the page paints. Nothing is saved. The theme it replaces
// stays in heldThemeAttribute, so the page can give it back when the visitor leaves.
export const heldThemeAttribute = "data-theme-held";

export function holdThemeBoot(theme: PortTheme) {
  return `(function () {
  var root = document.documentElement;
  if (!root.hasAttribute("${heldThemeAttribute}")) {
    root.setAttribute("${heldThemeAttribute}", root.getAttribute("data-theme") || "");
  }
  root.setAttribute("data-theme", ${JSON.stringify(theme)});
  root.classList.toggle("dark", ${JSON.stringify(theme === "dark")});
})();`;
}

export function applyTheme(theme: PortTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    /* storage can be blocked */
  }
}
