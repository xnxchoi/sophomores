export type MenuPreview = {
  src: string;
  alt: string;
};

export type MenuLink = {
  href: string;
  label: string;
  preview?: MenuPreview;
};

export const menuLinks: MenuLink[] = [
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

