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
