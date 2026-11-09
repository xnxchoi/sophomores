import { create } from "zustand";

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
  }
];

type MenuState = {
  open: boolean;
  preview: MenuPreview | null;
  toggle: () => void;
  close: () => void;
  setPreview: (preview: MenuPreview | null) => void;
};

export const useSiteMenu = create<MenuState>((set) => ({
  open: false,
  preview: null,
  toggle: () => set((state) => ({ open: !state.open, preview: state.open ? null : state.preview })),
  close: () => set({ open: false, preview: null }),
  setPreview: (preview) => set({ preview })
}));
