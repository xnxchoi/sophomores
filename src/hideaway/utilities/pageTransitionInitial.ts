let firstPathname: string | null = null;
let leftFirstDocumentPath = false;

const isBrowser = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.document?.createElement === "function";

export const consumeHydrationSafeInitial = (pathname: string): boolean => {
  if (!isBrowser()) return true;
  if (firstPathname === null) {
    firstPathname = pathname;
  }
  if (pathname !== firstPathname) {
    leftFirstDocumentPath = true;
  }
  return !leftFirstDocumentPath;
};

export const __resetDocumentHydratedForTests = (): void => {
  firstPathname = null;
  leftFirstDocumentPath = false;
};
