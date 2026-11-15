export type PortTheme = "light" | "dark";

export const themeStorageKey = "sophomores-theme";

// Pages that hold their own theme while open (owner, 2026-11-16; ADR 0002). A page theme wins over
// the global theme and is never saved; leaving the page releases it. The boot script reads this too,
// so a locked page paints in its own theme from the first frame.
export const pageThemes: Readonly<Record<string, PortTheme>> = { "/": "dark" };

export function pageThemeFor(pathname: string | null): PortTheme | null {
  return (pathname && pageThemes[pathname]) || null;
}

// The global theme: the visitor's pick, or their device setting until they pick.
export function deviceTheme(): PortTheme {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function readPick(): PortTheme | null {
  try {
    const saved = localStorage.getItem(themeStorageKey);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

export function savePick(theme: PortTheme | null) {
  try {
    if (theme) localStorage.setItem(themeStorageKey, theme);
    else localStorage.removeItem(themeStorageKey);
  } catch {
    /* storage can be blocked */
  }
}

// Same order as above, before first paint: a page theme, else the saved pick, else the device setting.
// A pick saved under the old Hideaway keys carries over to the one key once.
export const themeBoot = `(function () {
  var theme = null;
  try {
    var saved = localStorage.getItem("${themeStorageKey}");
    if (saved !== "light" && saved !== "dark") {
      var keys = ["__RP__THEME__", "__RP_THEME__"];
      for (var i = 0; i < keys.length; i++) {
        var old = localStorage.getItem(keys[i]);
        if (saved !== "light" && saved !== "dark" && (old === "light" || old === "dark")) saved = old;
        localStorage.removeItem(keys[i]);
      }
      if (saved === "light" || saved === "dark") localStorage.setItem("${themeStorageKey}", saved);
    }
    if (saved === "light" || saved === "dark") theme = saved;
  } catch (error) {}
  if (!theme) {
    try {
      theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch (error) {
      theme = "dark";
    }
  }
  var page = ${JSON.stringify(pageThemes)}[location.pathname];
  if (page === "light" || page === "dark") theme = page;
  var root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
})();`;
