"use client";
import {
  TaggedCollection,
  TaggedCollectionSlug
} from "@/payload/collections/Tags";
import { EOCollectionSlug } from "@/payload/plugins";
import { IndexedCollections } from "@/payload/search/beforeSync";
import { usePathname } from "next/navigation";

import { getMenuPagePreviewKey } from "@/utilities/Helpers";
import type { CollectionSlug } from "payload";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef
} from "react";
import { useStore } from "zustand/index";
import { createStore } from "zustand/vanilla";

/**
 *
 * Type to extract Collections that have explicitly visible pages(archives, pagination,single pages, etc.)
 * Should be updated as site structure changes.
 * @todo confirm the collections are exhaustive & security vulnerabilities don't exist
 *
 */

export type FrontEndCollections =
  | TaggedCollectionSlug
  | IndexedCollections
  | "users"
  | EOCollectionSlug;
/**
 *  Type containing all possible **valid** page type information.
 *  null value has been omitted; subject to future modifications.
 *  Intended to be similar to the return value of usePathname().slice('/')[1], but without the complexities of considering rewrites, etc.
 *
 * Collection slugs + Additional Types
 *
 *
 * **Account**
 *
 * Pages with auth-related scope. Every page of this type is accessible to a single authentication state, i.e. loggedin? can't access checkin page : can't access my account settings page.
 *
 *
 * **404**
 *
 * 404 page.
 *
 *
 * **Private**
 *
 * User-specific scope for authenticated users. Locked if not authenticated.
 *
 *
 * **Archives**
 * A monorepo of all content format (delta/playlist/album/track/posts/profile).
 *
 *
 *
 */
export type PageType =
  | "auth"
  | FrontEndCollections
  | "account"
  | "404"
  | "home"
  | "search"
  | "me";

/**
 * Convert the routing store's semantic page type into a public URL prefix.
 * Page types describe behavior/layout; they are not necessarily URL segments.
 */
export const pageTypeToPublicPrefix = (pageType: PageType): string => {
  switch (pageType) {
    case "posts":
      return "essays";
    case "categories":
      return "archived";
    case "tags":
      return "tagged";
    case "pages":
      return "";
    case "home":
      return "home";
    default:
      return pageType;
  }
};

export const pageTypeToPublicPath = (
  pageType: PageType,
  slug: string
): string => {
  const prefix = pageTypeToPublicPrefix(pageType);
  const encodedSlug = slug
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/${[prefix, encodedSlug].filter(Boolean).join("/")}`;
};

export interface PageTypeSlugMap {
  auth: ["/auth"];
  account: ["/account"];
  home: ["/", "/home"];
  search: ["/search"];
  categories: ["/archived"];
  tags: ["/tagged"];
  profile: ["/users/:id", "/users/:id/profile", "/@:userHandle"];
  albums: ["/rp.fm/albums"];
  playlists: ["/rp.fm/playlists"];
  posts: ["/essays"];
  surf: ["/surf"];
  series: ["/series"];
  users: ["/users", "/@:userHandle"];
  me: ["/me"];
}

// const pageTypeMap: Record<PageType, string[]> = {
//   auth: ["/auth"],
//   account: ["/account"],
//   home: ["/", "/home"],
//   search: ["/search"],
//   categories: ["/archived"],
//   tags: ["/tagged"],
//   profile: ["/users/:id", "/users/:id/profile", "/@:userHandle"],
//   albums: ["/rp.fm/albums"],
//   playlists: ["/rp.fm/playlists"],
//   posts: ["/essays"],
//   delta: ["/delta"],
//   //   series: ["/series"],
//   pages: ["/:slug"],
//   404: ["/404"],
//   users: ["/users", "/@:userHandle"],
//   me: ["/me"]
// };
const pathPageTypeMap = {
  "/auth": "auth",
  "/account": "account",
  "/home": "home",
  "/search": "search",
  "/archived": "categories",
  "/tagged": "tags",
  "/@:userHandle": "profiles",
  "/@:userHandle/:slug": "users",
  "/users/:id": "profiles",
  "/users/:id/profile": "profiles",
  "/rp.fm/albums": "albums",
  "/rp.fm/playlists": "playlists",
  "/essays": "posts",
  "/surf": "surf",
  "/series": "series",
  "/users": "users",

  "/me": "me"
};
export const authRegex =
  /^\/auth((?:\/[\p{L}\p{N}]+(?:[-._]+[\p{L}\p{N}]+)*){0,3})$/gu;
export const accountRegex =
  /^\/account((?:\/[\p{L}\p{N}]+(?:[-._]+[\p{L}\p{N}]+)*){0,3})$/gu;
export const userRegex =
  /^\/((users((?:\/[\p{L}\p{N}]+(?:[-._]+[\p{L}\p{N}]+)*){0,3}))|(@[\p{L}\p{N}]+))$/gu;
export const categoryRegex = /^\/archived(\/.+)?$/gu;
export const tagRegex = /^\/tagged(\/.+)?$/gu;
export const pathNameToPageType = (pn: string) => {
  if (authRegex.test(pn)) return "auth";
  if (accountRegex.test(pn)) return "account";
  if (userRegex.test(pn)) return "users";
  if (categoryRegex.test(pn)) return "categories";
  if (tagRegex.test(pn)) return "tags";
  if (pn === "/") return "home";
  if (pn === "/home") return "home";
  if (pn === "/search") return "search";
  if (pn.startsWith("/me")) return "me";
  if (pn.startsWith("/essays")) return "posts";
  if (pn.startsWith("/delta")) return "delta";
  if (pn.startsWith("/rp.fm/albums")) return "albums";
  if (pn.startsWith("/rp.fm/playlists")) return "playlists";
  if (pn.startsWith("/series")) return "series";
  if (pn.startsWith("/users")) return "users";
  if (pn === "/404") return "404";
  return "pages";
};
const regexForDomainName = /^(?:https?:\/\/[^\/]+)?\/([^\/?#]+)/;
export const equalPageType = (pathName1: string, pathName2: string) => {
  const p1 = pathName1.match(regexForDomainName);
  const p2 = pathName2.match(regexForDomainName);
  const g1 = p1 ? p1[1] : null;
  //different fallback values to ensure comparison fails even if both are undefined
  const g2 = p2 ? p2[1] : false;
  const isSame = Boolean(g1 && g2) && Boolean(g1 === g2);
  return isSame;
};
/**
 *
 * archive: Sort of like the "Front Page" for a certain type of content.
 *
 * An independent type because these cannot be programmatically generated; while the page data may be dynamically fetched, the layout-and some stuff here and there- require manual handling.
 *
 * For example, each category will have a pseudo-unique layout with different color schemes and descriptions (and maybe even layout).
 *
 * single: just a single page content
 * paginated: a pagination of uniformly formatted content
 * dynamic: the page layout will shift dynamically without navigation
 *
 *
 *
 * Dynamic paths with numbers - i.e. /posts/archived/[pageNumber] - are to be typed as paginated
 *
 *
 */
export type LayoutType =
  | "archive"
  | "single"
  | "paginated"
  | "page"
  | "dynamic";
export type RP_Voyage = {
  url: string;
  pathName: string;
  slug: string[];
  showScrollIndicator: boolean | null;
  pageType: PageType;
  layoutType: LayoutType;
  is404: boolean;
  isHome: boolean;

  pageKey: string | -1;
};

export type PageSlug = string[];
export type PageURL = {
  pageType: PageType;
  slug: PageSlug;
};

export type RP_Voyaget = {
  reset: () => void;
  setSlug: (l: string[]) => void;
  setPageType: (l: PageType) => void;
  setPage: (l: {
    pageType: PageType;
    slug: string[];
    layoutType?: LayoutType;
  }) => void;
  setIs404: (l: boolean) => void;
  setIsHome: (l: boolean) => void;

  setUrl: (l: string) => void;
  setPageKey: (l: string | -1) => void;
  setPathName: (l: string) => void;
  setShowScrollIndicator: (l: boolean | null) => void;
};
export type RP_Voyages = RP_Voyage & RP_Voyaget;

const initialState: RP_Voyage = {
  pageKey: -1,
  pageType: "pages",
  layoutType: "page",
  slug: [],

  is404: false,
  isHome: false,
  url: "/",
  pathName: "/",
  showScrollIndicator: null
};

const setHome = (pathName: string) => pathName === "/" || pathName === "/home";
const setPageK = (slug: string[], type: PageType = "pages") =>
  slug.length > 0 ? getMenuPagePreviewKey(type, slug[0]!) : "default";
export const createVoyageur = (initState: RP_Voyage = initialState) => {
  return createStore<RP_Voyages>()((set) => ({
    ...initState,
    setIs404: (l: boolean) => set((state) => ({ is404: l })),

    setPageType: (l: PageType) => set((state) => ({ pageType: l })),
    setSlug: (l: string[]) => set((state) => ({ slug: l })),
    setIsHome: (l: boolean) => set((state) => ({ isHome: l })),
    setPageKey: (l: string | -1) => set((state) => ({ pageKey: l })),
    setUrl: (l: string) => set((state) => ({ url: l })),
    setPathName: (l: string) => set((state) => ({ pathName: l })),
    setPage: (l: {
      pageType: PageType;
      slug: string[];
      layoutType?: LayoutType;
    }) =>
      set((state) => ({
        ...state,
        pageType: l.pageType,
        slug: l.slug,
        pageKey: setPageK(l.slug),
        layoutType: l.layoutType || "page"
      })),
    setShowScrollIndicator: (l: boolean | null) =>
      set((state) => ({ showScrollIndicator: l })),
    reset: () =>
      set(
        (state) => ({
          ...state,
          showScrollIndicator: null,
          is404: false,

          isHome: false,
          pageKey: -1,
          slug: []
        }),
        true
      )
  }));
};
export type VoyageAPI = ReturnType<typeof createVoyageur>;
const voyagePaths = {
  posts: {},

  account: {},
  auth: {},
  archived: {},
  me: {},
  register: {},
  "rp.fm": {},
  series: {},
  surf: {},
  tagged: {},
  users: {}
} as const;

export const archiveRegex = new RegExp(
  `^\/(posts|surf|albums|playlists|categories|tags)?\/archives(\/d+)?$`
);
export const isArchive = (pn: string) =>
  archiveRegex.test(pn) ? "archive" : "single";
export const VoyageContext = createContext<VoyageAPI | undefined>(undefined);
export const VoyageurProvider = (l: { children: ReactNode }) => {
  const { children } = l;
  const vy = useRef<VoyageAPI>(undefined!);
  const pathName = usePathname() || "/";

  const pageAndPathToLayoutType = useCallback(
    ({ pn, pageType }: { pn: string; pageType: PageType }) => {
      switch (pageType) {
        case "pages":
        case "account":
          return "page";
        case "posts":
        case "surf":
        case "albums":
        case "playlists":
        case "categories":

        case "tags":
          return isArchive(pn);
        default:
          return "page";
      }
    },
    []
  );
  const frontSlugs = Object.keys(voyagePaths);
  if (!vy.current) {
    const pathnames = pathName.split("/").slice(1);
    const pathToType =
      (pathnames.length > 0 &&
        frontSlugs.some((s) => s === pathnames[0]) &&
        (pathnames[0] as PageType)) ||
      "pages";
    vy.current = createVoyageur({
      ...initialState,
      pathName: pathName,
      isHome: setHome(pathName),
      pageType: pathToType,
      layoutType: pageAndPathToLayoutType({
        pn: pathName,
        pageType: pathToType
      })
    });
  }

  return (
    <VoyageContext.Provider value={vy.current}>
      {children}
    </VoyageContext.Provider>
  );
};
export const useVoyageur = <T,>(selector: (store: RP_Voyages) => T): T => {
  const context = useContext(VoyageContext);
  if (context === undefined) {
    throw new Error("useVoyageur must be used within a VoyageurProvider");
  }

  return useStore(context, selector);
};
const VB = ({ children }: { children: ReactNode }) => {
  const setPathName = useVoyageur((l) => l.setPathName);
  const pathName = useVoyageur((l) => l.pathName);
  const setIsHome = useVoyageur((l) => l.setIsHome);
  const pathname = usePathname();
  useEffect(() => {
    setPathName(pathname);
  }, []);
  useEffect(() => {
    setPathName(pathname);
  }, [pathname]);
  useEffect(() => {
    setIsHome(pathName === "/" || pathName.startsWith("/home"));
  }, [pathName]);
  return <>{children}</>;
};
export const Voyageur = ({ children }: { children: ReactNode }) => {
  return (
    <VoyageurProvider>
      <VB>{children}</VB>
    </VoyageurProvider>
  );
};
