import { reachableHref } from "./essays";

export type MenuPreview = {
  src: string;
  alt: string;
};

export type MenuLink = {
  href: string;
  label: string;
  preview?: MenuPreview;
};

const allMenuLinks: MenuLink[] = [
  {
    href: "/essays",
    label: "reading",
    preview: { src: "/assets/credits/fixture-author.svg", alt: "reading" }
  },
  {
    href: "/",
    label: "index",
    preview: { src: "/assets/starliner-backdrop.svg", alt: "index" }
  },
  {
    href: "/music",
    label: "music",
    preview: { src: "/assets/starliner-backdrop.svg", alt: "music" }
  },
  {
    href: "/shop",
    label: "shop"
  },
  {
    href: "/me",
    label: "account"
  },
  {
    href: "/team",
    label: "team"
  },
  {
    href: "/help",
    label: "help"
  }
];

/** The menu's links, without any the site has switched off (src/lib/content/essays.ts). */
export const menuLinks: MenuLink[] = allMenuLinks.filter((link) => reachableHref(link.href) !== undefined);
