import { p as v } from "./NmUm-x2B.js";
let e = null,
  t = null;
const p = () => {
  const { lenis: o } = v(),
    l = () => {
      (e && (clearTimeout(e), (e = null)),
        t && (t(), (t = null)),
        document.documentElement.style.removeProperty("overflow"),
        o.value?.start());
    };
  return {
    lock: (u, c = 200) => {
      (o.value?.stop(),
        document.documentElement.style.setProperty("overflow", "clip"),
        e && clearTimeout(e),
        (e = setTimeout(() => {
          ((e = null), l());
        }, u)),
        t && t());
      let r = !1;
      const a = setTimeout(() => {
          r = !0;
        }, c),
        n = (i) => {
          if (!r) return;
          const m = (o.value?.targetScroll ?? 0) + i.deltaY;
          (l(), o.value?.scrollTo(m));
        },
        s = () => l();
      (addEventListener("wheel", n, { passive: !0 }),
        addEventListener("touchstart", s, { passive: !0 }),
        (t = () => {
          (clearTimeout(a),
            removeEventListener("wheel", n),
            removeEventListener("touchstart", s));
        }));
    },
    unlock: l
  };
};
export { p as u };
