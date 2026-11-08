export const THEME_TRANSITION_SECONDS = 0.2;
export const THEME_ANIMATING_CLASS = "theme-animating";

export type ThemeName = "dark" | "light";

export type ThemeRoot = {
  setAttribute: (name: string, value: string) => void;
  classList: {
    add: (name: string) => void;
    remove: (name: string) => void;
    toggle: (name: string, force?: boolean) => void;
  };
};

export const applyDocumentTheme = (
  root: ThemeRoot,
  theme: ThemeName,
  options: { armTransitions: boolean }
): void => {
  if (options.armTransitions) {
    root.classList.add(THEME_ANIMATING_CLASS);
  }
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
};

export const clearThemedTransitions = (root: ThemeRoot): void => {
  root.classList.remove(THEME_ANIMATING_CLASS);
};
