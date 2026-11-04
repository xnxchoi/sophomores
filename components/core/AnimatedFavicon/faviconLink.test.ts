/** @vitest-environment happy-dom */

import { beforeEach, describe, expect, it } from "vitest";

import {
  captureFaviconLink,
  ensureFaviconLink,
  restoreFaviconLink,
  restoreStaticFaviconLinks,
  setAnimatedFaviconHref,
  suspendStaticFaviconLinks
} from "./faviconLink";

describe("animated favicon link helpers", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("appends a dedicated animated favicon link after static icons", () => {
    document.head.innerHTML = `
      <link rel="icon" href="/favicon.ico" sizes="32x32">
      <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    `;

    const link = ensureFaviconLink(document);
    const iconLinks = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
    );

    expect(link.dataset.animatedFavicon).toBe("true");
    expect(iconLinks.at(-1)).toBe(link);
  });

  it("suspends static favicon candidates while the animated icon is active", () => {
    document.head.innerHTML = `
      <meta name="theme-color" content="#000000">
      <link rel="icon" href="/favicon.ico" sizes="32x32">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">
      <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    `;

    const link = ensureFaviconLink(document);
    const snapshots = suspendStaticFaviconLinks(document, link);
    const activeIconLinks = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
    ).filter((iconLink) => !iconLink.rel.includes("apple-touch-icon"));

    expect(snapshots).toHaveLength(2);
    expect(activeIconLinks).toEqual([link]);
    expect(document.querySelector('link[rel="apple-touch-icon"]')).not.toBeNull();

    restoreStaticFaviconLinks(snapshots);

    expect(document.querySelector('link[href="/favicon.ico"]')).not.toBeNull();
    expect(document.querySelector('link[href="/favicon.svg"]')).not.toBeNull();
  });

  it("writes PNG frame data to the animated favicon link", () => {
    document.head.innerHTML = `
      <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    `;

    const link = ensureFaviconLink(document);

    setAnimatedFaviconHref(link, "data:image/png;base64,frame");

    expect(link.getAttribute("href")).toBe("data:image/png;base64,frame");
    expect(link.getAttribute("type")).toBe("image/png");
    expect(link.getAttribute("sizes")).toBe("32x32");
    expect(link.dataset.animatedFavicon).toBe("true");
    expect(document.head.lastElementChild).toBe(link);
  });

  it("removes the owned animated favicon link on cleanup", () => {
    document.head.innerHTML = `
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
    `;

    const link = ensureFaviconLink(document);
    const snapshot = captureFaviconLink(link);
    setAnimatedFaviconHref(link, "data:image/png;base64,frame");
    restoreFaviconLink(link, snapshot);

    expect(document.head.contains(link)).toBe(false);
    expect(document.querySelector('link[href="/favicon.svg"]')).not.toBeNull();
  });
});
