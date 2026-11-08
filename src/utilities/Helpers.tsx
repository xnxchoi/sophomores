"use client";

import Script from "next/script";
import { RefObject } from "react";
// Cauterization: Header and PayloadLinkProps are the Payload header global.
// PageType below is a string until that global is ported.
type PageType = string;

export const lerp = (start: number, end: number, amount = 0.1) => {
  return start + (end - start) * amount;
};

export const waitForWebfonts = (fonts: string[], callback: () => void) => {
  let loadedFonts = 0;

  fonts.forEach((font: string) => {
    const span = document.createElement("span");
    span.innerHTML = "giItT1WQy@!-/#";
    span.style.position = "absolute";
    span.style.left = "-10000px";
    span.style.top = "-10000px";
    span.style.fontSize = "300px";
    span.style.fontFamily = "sans-serif";
    span.style.fontVariant = "normal";
    span.style.fontStyle = "normal";
    span.style.fontWeight = "normal";
    span.style.letterSpacing = "0";
    document.body.appendChild(span);

    const initialWidth = span.offsetWidth;
    span.style.fontFamily = font;

    const checkFont = () => {
      if (span.offsetWidth !== initialWidth) {
        loadedFonts++;
        // @ts-ignore
        span.parentNode.removeChild(span);
        if (loadedFonts === fonts.length) {
          clearInterval(interval);
          callback();
        }
      }
    };

    const interval = setInterval(checkFont, 50);
  });
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return { unit: "Bytes", size: 0 };

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return {
    size: parseFloat((bytes / k ** i).toFixed(dm)),
    unit: sizes[i]
  };
};

export const bytesToMb = (bytes: number) => {
  const { size, unit } = formatBytes(bytes);
  return unit === "KB" ? size / 1024 : size;
};
export const kbToBytes = (kb: number) => {
  return kb * 1024;
};
export const buildIdFromText = (text: string) => {
  return text
    .trim()
    .replace(/[^\w\s+]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
};

export const getImageUrl = (
  image: { asset: { url: string } },
  options: {
    quality: number;
    invert: boolean;
    width: number | string | null;
    height: number | null;
    fit: string | null;
    fm: string | null;
    sat: any;
    rect: any;
  }
) => {
  const {
    width,
    height,
    fit,
    quality = 80,
    invert,
    fm = "webp",
    sat = null,
    rect = null
  } = options;

  if (!image?.asset?.url) {
    console.warn("No image.asset.url in image object supplied.", image);
    return null;
  }

  const { url } = image.asset;
  const params: string[] = [];

  if (width) params.push(`w=${`${width}`}`);
  if (height) params.push(`h=${height}`);
  if (quality) params.push(`q=${quality}`);
  if (invert) params.push(`invert=${invert}`);
  if (fm) params.push(`fm=${fm}`);
  if (sat) params.push(`sat=${sat}`);
  if (rect) params.push(`rect=${rect}`);
  if (fit) params.push(`fit=${fit}`);

  return `${url}?${params.join("&")}`;
};
export const getPageTypeFromUrl = (l: string): PageType => {
  const c = "pages";
  if (l.startsWith(`/essays`)) {
    return "posts";
  }
  if (l.startsWith("/@") || l.startsWith("/users")) {
    return "users";
  }

  return c as PageType;
};
export const getPagePathBySlug = (l: string) =>
  l === "home" || l === "/" ? "/home" : `/${l}`;
export const getArticlePathBySlug = (slug: string) => `/essays/${slug}`;

export const getMenuPagePreviewKey = (type: PageType, slug: string) =>
  `${type}_${slug}`;
export default {
  formatBytes,
  lerp,
  waitForWebfonts,
  bytesToMb,
  getMenuPagePreviewKey,
  getPagePathBySlug,

  getArticlePathBySlug
};
