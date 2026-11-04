"use client";
import { getMenuLinksForRuntime, type NavLink } from "src/constants/navigation";
import { useRPStore } from "src/providers/RP_Pro";
import {
  getMenuPagePreviewKey,
  getPageTypeFromUrl
} from "src/utilities/Helpers";
import { Header } from "src/payload-types";
import { useEffect, useMemo } from "react";

export const InitiateHeader = ({ header }: { header: Header }) => {
  const { radio } = header;
  const setGlobalSettings = useRPStore((store) => store.setGlobalSettings);
  const setNavigationItems = useRPStore(
    (store) => store.setNavigationPageItemData
  );
  const setNavigationPreviewMediaByKey = useRPStore(
    (store) => store.setNavigationPreviewMediaByKey
  );
  const links: NavLink[] = useMemo(
    () => getMenuLinksForRuntime(),
    []
  );
  useEffect(() => {
    setNavigationItems(
      links.map((l, index) => ({
        link: l,
        url: l.url,
        label: l.label
      }))
    );
    const k: Record<string, { desktop: string | null; mobile: string | null }> =
      {};
    links.forEach((l) => {
      const type = getPageTypeFromUrl(l.url);
      const split = l.url.split("/");
      const slug = split[split.length - 1]!;

      const key = getMenuPagePreviewKey(type, slug);
      k[key] = {
        desktop: null,
        mobile: null
      };
    });
    setNavigationPreviewMediaByKey(k);
  }, [links, setNavigationItems, setNavigationPreviewMediaByKey]);
  // useEffect(() => {
  //   if (header.navItems) {
  //     console.log('header.navItems', header.navItems)
  //     setGlobalSettings({ navigation: { navItems: header.navItems } })
  //     setNavigationItems(header.navItems)
  //     let k = {}
  //     header.navItems.forEach((l, index) => {
  //       if (!l.link || !l.link.type) return
  //       let ketu = ''
  //       if (l.link.type === 'custom') {
  //         if (!l.link.url) {
  //           console.error('link is external, but has no url', l)
  //           return
  //         }
  //         ketu = getMenuPagePreviewKey('pages', l.link.url.split('/')[1])
  //       } else {
  //         if (!l.link.reference || !l.link.reference.relationTo || !l.link.reference.value) {
  //           console.error('link is internal, but has invalid reference', l)
  //           return
  //         }
  //         ketu = getMenuPagePreviewKey(
  //           l.link.reference.relationTo,
  //           typeof l.link.reference.value === 'object'
  //             ? l.link.reference.value.slug
  //             : l.link.reference.value,
  //         )
  //       }
  //       k[ketu] = l.previewMedia
  //     })
  //     setNavigationPreviewMediaByKey(k)
  //   }
  // }, [])
  return <></>;
};
