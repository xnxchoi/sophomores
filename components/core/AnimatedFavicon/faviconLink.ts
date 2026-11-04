export type FaviconLinkSnapshot = {
  isOwnedAnimatedLink: boolean;
  href: string | null;
  rel: string | null;
  sizes: string | null;
  type: string | null;
};

export type StaticFaviconLinkSnapshot = {
  link: HTMLLinkElement;
  nextSibling: ChildNode | null;
  parent: HTMLElement;
};

const ANIMATED_FAVICON_DATA_ATTRIBUTE = "animatedFavicon";
const ANIMATED_FAVICON_SELECTOR = 'link[data-animated-favicon="true"]';

const isAnimatedFaviconLink = (link: HTMLLinkElement) =>
  link.dataset[ANIMATED_FAVICON_DATA_ATTRIBUTE] === "true";

const appendAsLastIcon = (link: HTMLLinkElement) => {
  if (link.parentElement) {
    link.parentElement.removeChild(link);
  }

  link.ownerDocument.head.appendChild(link);
};

const isAppleTouchIcon = (link: HTMLLinkElement) =>
  link.rel.split(/\s+/).includes("apple-touch-icon");

const getStaticFaviconLinks = (
  documentRef: Document,
  animatedLink: HTMLLinkElement
) =>
  Array.from(
    documentRef.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  ).filter(
    (link) =>
      link !== animatedLink &&
      !isAnimatedFaviconLink(link) &&
      !isAppleTouchIcon(link)
  );

export const ensureFaviconLink = (documentRef: Document): HTMLLinkElement => {
  const existingLink = documentRef.querySelector<HTMLLinkElement>(
    ANIMATED_FAVICON_SELECTOR
  );

  if (existingLink) {
    appendAsLastIcon(existingLink);
    return existingLink;
  }

  const link = documentRef.createElement("link");
  link.dataset[ANIMATED_FAVICON_DATA_ATTRIBUTE] = "true";
  link.rel = "icon";
  link.type = "image/png";
  link.setAttribute("sizes", "32x32");
  documentRef.head.appendChild(link);

  return link;
};

export const captureFaviconLink = (
  link: HTMLLinkElement
): FaviconLinkSnapshot => ({
  isOwnedAnimatedLink: isAnimatedFaviconLink(link),
  href: link.getAttribute("href"),
  rel: link.getAttribute("rel"),
  sizes: link.getAttribute("sizes"),
  type: link.getAttribute("type")
});

export const setAnimatedFaviconHref = (
  link: HTMLLinkElement,
  href: string
) => {
  link.rel = "icon";
  link.type = "image/png";
  link.setAttribute("sizes", "32x32");
  link.href = href;
  link.dataset[ANIMATED_FAVICON_DATA_ATTRIBUTE] = "true";
  appendAsLastIcon(link);
};

export const suspendStaticFaviconLinks = (
  documentRef: Document,
  animatedLink: HTMLLinkElement
): StaticFaviconLinkSnapshot[] => {
  const snapshots = getStaticFaviconLinks(documentRef, animatedLink).map(
    (link) => ({
      link,
      nextSibling: link.nextSibling,
      parent: link.parentElement ?? documentRef.head
    })
  );

  for (const snapshot of snapshots) {
    snapshot.link.remove();
  }

  appendAsLastIcon(animatedLink);

  return snapshots;
};

export const restoreStaticFaviconLinks = (
  snapshots: StaticFaviconLinkSnapshot[]
) => {
  for (const snapshot of snapshots) {
    if (snapshot.link.isConnected) {
      continue;
    }

    if (
      snapshot.nextSibling &&
      snapshot.nextSibling.parentNode === snapshot.parent
    ) {
      snapshot.parent.insertBefore(snapshot.link, snapshot.nextSibling);
      continue;
    }

    snapshot.parent.appendChild(snapshot.link);
  }
};

export const restoreFaviconLink = (
  link: HTMLLinkElement,
  snapshot: FaviconLinkSnapshot
) => {
  if (snapshot.isOwnedAnimatedLink) {
    link.remove();
    return;
  }

  const restoreAttribute = (
    attribute: keyof FaviconLinkSnapshot,
    value: string | null
  ) => {
    if (value === null) {
      link.removeAttribute(attribute);
      return;
    }

    link.setAttribute(attribute, value);
  };

  restoreAttribute("href", snapshot.href);
  restoreAttribute("rel", snapshot.rel);
  restoreAttribute("sizes", snapshot.sizes);
  restoreAttribute("type", snapshot.type);
  delete link.dataset[ANIMATED_FAVICON_DATA_ATTRIBUTE];
};
