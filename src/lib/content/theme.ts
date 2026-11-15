export type PortTheme = "light" | "dark";

export const themeStorageKey = "sophomores-theme";

export function nextTheme(current: string | null): PortTheme {
  return current === "dark" ? "light" : "dark";
}

// Dark until the visitor picks a mode; the device setting doesn't count (ADR 0002).
// A pick saved under the old Hideaway keys carries over to the one key once.
export const themeBoot = `(function () {
  var theme = "dark";
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
  var root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
})();`;

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
