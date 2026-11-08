import { wait } from "@/hideaway/utilities/wait";
import { useCallback, useRef } from "react";

function isImageNode(node: Node): node is HTMLImageElement {
  return "IMG" === node.nodeName;
}

export const useAssetsRP = () => {
  const simpleImagesPreload = (l: {
    urls: string[];
    onComplete?: () => void;
    onProgress?: (progress: number) => void;
  }) => {
    let { urls: c, onComplete: d, onProgress: h } = l,
      p = 0,
      m = c.length;
    const onLoadCallback = () => {
      (p++, h && h(p / m), p === m && d && d());
    };
    c.forEach(function (l) {
      {
        let d = new Image();
        d.onload = onLoadCallback;
        d.src = l;
      }
    });
  };
  const l = useRef<HTMLDivElement>(null);
  const cleanup = () => {
    l.current && l.current.remove();
  };
  const getSrcArrayToLoad = useCallback(async () => {
    cleanup();
    let c = document.querySelectorAll(
        'img[data-preloader="true"]'
      ) as NodeListOf<HTMLImageElement>,
      d = document.querySelectorAll(
        'picture[data-preloader="true"]'
      ) as NodeListOf<HTMLPictureElement>,
      p: Array<string> = [],
      h: Array<HTMLImageElement | HTMLPictureElement> = [],
      m = [];
    for (let l = 0; l < c.length; l++) h.push(c[l]);
    for (let l = 0; l < d.length; l++) h.push(d[l]);
    if (
      ((l.current = document.createElement("div")),
      l.current.classList.add("loadableImageContainer"),
      document.body.appendChild(l.current),
      l.current)
    ) {
      for (let c = 0; c < h.length; c++) {
        var g;
        let d = h[c],
          p = "PICTURE" === d.nodeName,
          xx =
            null === d
              ? void 0
              : null === (g = d.parentElement) || void 0 === g
                ? void 0
                : g.nodeName,
          _ = xx !== "PICTURE";
        if (p || _) {
          let c = d.cloneNode(!0);
          (m.push(c), l.current.appendChild(c));
        }
      }
      await wait(300);
      for (let l = 0; l < m.length; l++) {
        let c = m[l],
          d = "";
        if (isImageNode(c)) d = c.currentSrc;
        else {
          let l = (c as HTMLElement).querySelectorAll("img")[0];
          d = l.currentSrc;
        }
        d && !p.includes(d) && p.push(d);
      }
      return p;
    }
  }, []);
  const loadAssets = useCallback(
    async (l?: () => void) => {
      let d = await getSrcArrayToLoad();
      if (d && d.length > 0)
        simpleImagesPreload({
          urls: d,
          onComplete: () => {
            (l && l(), cleanup());
          }
        });
    },
    [getSrcArrayToLoad]
  );
  return {
    loadAssets,
    getSrcArrayToLoad
  };
};
