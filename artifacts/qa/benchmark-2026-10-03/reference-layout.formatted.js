import {
  d as B,
  L as E,
  M as ae,
  r as Y,
  N as T,
  o as ne,
  O as re,
  P as se,
  l as le,
  Q as ie,
  A as U,
  R as V,
  S as oe,
  U as D,
  W as ue,
  j as g,
  X as Z,
  Y as ce,
  Z as fe,
  $ as ve,
  a0 as de,
  a1 as he,
  a2 as pe,
  i as j,
  p as J,
  s as K,
  v as ee,
  u as _,
  c as b,
  a as d,
  b as C,
  a3 as F,
  _ as M,
  f as R,
  T as I,
  w as L,
  h as N,
  a4 as z,
  F as P,
  z as H,
  g as $,
  G as W,
  t as O,
  a5 as G,
  n as Q,
  y as _e,
  a6 as me
} from "./NmUm-x2B.js";
import { u as ge } from "./DuULU8RX.js";
const be = (...t) => t.find((n) => n !== void 0);
function ke(t) {
  const n = t.componentName || "NuxtLink";
  function l(e) {
    return typeof e == "string" && e.startsWith("#");
  }
  function k(e, o, h) {
    const s = h ?? t.trailingSlash;
    if (!e || (s !== "append" && s !== "remove")) return e;
    if (typeof e == "string") return q(e, s);
    const r = "path" in e && e.path !== void 0 ? e.path : o(e).path;
    return { ...e, name: void 0, path: q(r, s) };
  }
  function y(e) {
    const o = E(),
      h = fe(),
      s = g(() => !!e.target && e.target !== "_self"),
      r = g(() => {
        const v = e.to || e.href || "";
        return typeof v == "string" && Z(v, { acceptRelative: !0 });
      }),
      u = V("RouterLink"),
      c = typeof u != "string" ? u.useLink : void 0,
      f = g(() => {
        if (e.external) return !0;
        const v = e.to || e.href || "";
        return typeof v == "object" ? !1 : v === "" || r.value;
      }),
      a = g(() => {
        const v = e.to || e.href || "";
        return f.value ? v : k(v, o.resolve, e.trailingSlash);
      }),
      m = f.value ? void 0 : c?.({ ...e, to: a }),
      S = g(() => {
        const v = e.trailingSlash ?? t.trailingSlash;
        if (!a.value || r.value || l(a.value)) return a.value;
        if (f.value) {
          const w =
              typeof a.value == "object" && "path" in a.value
                ? D(a.value)
                : a.value,
            A = typeof w == "object" ? o.resolve(w).href : w;
          return q(A, v);
        }
        return typeof a.value == "object"
          ? (o.resolve(a.value)?.href ?? null)
          : q(ce(h.app.baseURL, a.value), v);
      });
    return {
      to: a,
      hasTarget: s,
      isAbsoluteUrl: r,
      isExternal: f,
      href: S,
      isActive: m?.isActive ?? g(() => a.value === o.currentRoute.value.path),
      isExactActive:
        m?.isExactActive ?? g(() => a.value === o.currentRoute.value.path),
      route: m?.route ?? g(() => o.resolve(a.value)),
      async navigate(v) {
        await ve(S.value, { replace: e.replace, external: f.value || s.value });
      }
    };
  }
  return B({
    name: n,
    props: {
      to: { type: [String, Object], default: void 0, required: !1 },
      href: { type: [String, Object], default: void 0, required: !1 },
      target: { type: String, default: void 0, required: !1 },
      rel: { type: String, default: void 0, required: !1 },
      noRel: { type: Boolean, default: void 0, required: !1 },
      prefetch: { type: Boolean, default: void 0, required: !1 },
      prefetchOn: { type: [String, Object], default: void 0, required: !1 },
      noPrefetch: { type: Boolean, default: void 0, required: !1 },
      activeClass: { type: String, default: void 0, required: !1 },
      exactActiveClass: { type: String, default: void 0, required: !1 },
      prefetchedClass: { type: String, default: void 0, required: !1 },
      replace: { type: Boolean, default: void 0, required: !1 },
      ariaCurrentValue: { type: String, default: void 0, required: !1 },
      external: { type: Boolean, default: void 0, required: !1 },
      custom: { type: Boolean, default: void 0, required: !1 },
      trailingSlash: { type: String, default: void 0, required: !1 }
    },
    useLink: y,
    setup(e, { slots: o }) {
      const h = E(),
        {
          to: s,
          href: r,
          navigate: u,
          isExternal: c,
          hasTarget: f,
          isAbsoluteUrl: a
        } = y(e),
        m = ae(!1),
        S = Y(null),
        v = (p) => {
          S.value = e.custom ? p?.$el?.nextElementSibling : p?.$el;
        };
      function w(p) {
        return (
          !m.value &&
          (typeof e.prefetchOn == "string"
            ? e.prefetchOn === p
            : (e.prefetchOn?.[p] ?? t.prefetchOn?.[p])) &&
          (e.prefetch ?? t.prefetch) !== !1 &&
          e.noPrefetch !== !0 &&
          e.target !== "_blank" &&
          !Ce()
        );
      }
      async function A(p = T()) {
        if (m.value) return;
        m.value = !0;
        const x =
            typeof s.value == "string"
              ? s.value
              : c.value
                ? D(s.value)
                : h.resolve(s.value).fullPath,
          i = c.value ? new URL(x, window.location.href).href : x;
        await Promise.all([
          p.hooks.callHook("link:prefetch", i).catch(() => {}),
          !c.value && !f.value && ue(s.value, h).catch(() => {})
        ]);
      }
      if (w("visibility")) {
        const p = T();
        let x,
          i = null;
        (ne(() => {
          const te = Se();
          re(() => {
            x = se(() => {
              S?.value?.tagName &&
                (i = te.observe(S.value, async () => {
                  (i?.(), (i = null), await A(p));
                }));
            });
          });
        }),
          le(() => {
            (x && ie(x), i?.(), (i = null));
          }));
      }
      return () => {
        if (!c.value && !f.value && !l(s.value)) {
          const i = {
            ref: v,
            to: s.value,
            activeClass: e.activeClass || t.activeClass,
            exactActiveClass: e.exactActiveClass || t.exactActiveClass,
            replace: e.replace,
            ariaCurrentValue: e.ariaCurrentValue,
            custom: e.custom
          };
          return (
            e.custom ||
              (w("interaction") &&
                ((i.onPointerenter = A.bind(null, void 0)),
                (i.onFocus = A.bind(null, void 0))),
              m.value && (i.class = e.prefetchedClass || t.prefetchedClass),
              (i.rel = e.rel || void 0)),
            U(V("RouterLink"), i, o.default)
          );
        }
        const p = e.target || null,
          x =
            be(
              e.noRel ? "" : e.rel,
              t.externalRelAttribute,
              a.value || f.value ? "noopener noreferrer" : ""
            ) || null;
        return e.custom
          ? o.default
            ? o.default({
                href: r.value,
                navigate: u,
                prefetch: A,
                get route() {
                  if (!r.value) return;
                  const i = new URL(r.value, window.location.href);
                  return {
                    path: i.pathname,
                    fullPath: i.pathname,
                    get query() {
                      return oe(i.search);
                    },
                    hash: i.hash,
                    params: {},
                    name: void 0,
                    matched: [],
                    redirectedFrom: void 0,
                    meta: {},
                    href: r.value
                  };
                },
                rel: x,
                target: p,
                isExternal: c.value || f.value,
                isActive: !1,
                isExactActive: !1
              })
            : null
          : U(
              "a",
              {
                ref: S,
                href: r.value || null,
                rel: x,
                target: p,
                onClick: (i) => {
                  if (!(c.value || f.value))
                    return (
                      i.preventDefault(),
                      e.replace ? h.replace(r.value) : h.push(r.value)
                    );
                }
              },
              o.default?.()
            );
      };
    }
  });
}
const ye = ke(pe);
function q(t, n) {
  const l = n === "append" ? de : he;
  return Z(t) && !t.startsWith("http") ? t : l(t, !0);
}
function Se() {
  const t = T();
  if (t._observer) return t._observer;
  let n = null;
  const l = new Map(),
    k = (e, o) => (
      (n ||= new IntersectionObserver((h) => {
        for (const s of h) {
          const r = l.get(s.target);
          (s.isIntersecting || s.intersectionRatio > 0) && r && r();
        }
      })),
      l.set(e, o),
      n.observe(e),
      () => {
        (l.delete(e),
          n?.unobserve(e),
          l.size === 0 && (n?.disconnect(), (n = null)));
      }
    );
  return (t._observer = { observe: k });
}
const xe = /2g/;
function Ce() {
  const t = navigator.connection;
  return !!(t && (t.saveData || xe.test(t.effectiveType)));
}
const Re = { class: "skip-block" },
  we = B({
    __name: "SkipBlock",
    setup(t) {
      const n = j(),
        { scrollTo: l } = J(),
        k = g(
          () => n.showSkip && !["people", "contacts"].includes(n.activeSection)
        ),
        y = () => {
          const e = F[F.indexOf(n.activeSection) + 1];
          e &&
            ((n.navigating = !0),
            l("#" + e, { duration: 1.2 }),
            setTimeout(() => (n.navigating = !1), 1400));
        };
      return (e, o) =>
        K(
          (d(),
          b(
            "div",
            Re,
            [C("span", { class: "skip-block__link", onClick: y }, " skip ")],
            512
          )),
          [[ee, _(k)]]
        );
    }
  }),
  X = Object.assign(M(we, [["__scopeId", "data-v-fb2f5d28"]]), {
    __name: "OtherSkipBlock"
  }),
  Ae = { class: "menu-icon" },
  Le = { key: 0, class: "menu-icon__border third" },
  Be = { key: 0, class: "menu-icon__border fourth" },
  qe = B({
    __name: "MenuIcon",
    props: { open: { type: Boolean, required: !0 } },
    setup(t) {
      return (n, l) => (
        d(),
        b("div", Ae, [
          l[0] ||
            (l[0] = C("div", { class: "menu-icon__border first" }, null, -1)),
          l[1] ||
            (l[1] = C("div", { class: "menu-icon__border second" }, null, -1)),
          R(
            I,
            { name: "menu-icon-first" },
            {
              default: L(() => [t.open ? (d(), b("div", Le)) : N("", !0)]),
              _: 1
            }
          ),
          R(
            I,
            { name: "menu-icon-second" },
            {
              default: L(() => [t.open ? (d(), b("div", Be)) : N("", !0)]),
              _: 1
            }
          )
        ])
      );
    }
  }),
  Oe = Object.assign(M(qe, [["__scopeId", "data-v-a5243615"]]), {
    __name: "OtherMenuIcon"
  }),
  Te = { key: 0, class: "app-menu" },
  Ie = { class: "app-menu__items" },
  Ne = { key: 1, class: "app-menu" },
  Pe = { class: "app-menu-mobile" },
  $e = { class: "app-menu-mobile__items" },
  je = B({
    __name: "AppMenu",
    setup(t) {
      const n = j(),
        { scrollTo: l } = J(),
        { unlock: k } = ge(),
        y = (u) => u.hash === "#" + n.activeSection,
        e = (u) => {
          (k(),
            (n.teleporting = !0),
            l(u.hash, { immediate: !0, force: !0 }),
            setTimeout(() => (n.teleporting = !1), 150));
        },
        o = g(() =>
          z.filter((u) => n.activeSection !== "hero" || u.hash !== "#hero")
        ),
        h = g(() => o.value.find(y)),
        s = g(() => o.value.filter((u) => !y(u))),
        r = Y(!1);
      return (u, c) => {
        const f = ye;
        return _(n).mobile
          ? (d(),
            b("div", Ne, [
              C("div", Pe, [
                _(h)
                  ? (d(),
                    b(
                      "div",
                      {
                        key: 0,
                        class: "app-menu-mobile__item active",
                        onClick: c[0] || (c[0] = (a) => (r.value = !_(r)))
                      },
                      O(_(h).label),
                      1
                    ))
                  : (d(),
                    b(
                      "div",
                      {
                        key: 1,
                        class: Q(["app-menu-mobile__item", { active: _(r) }]),
                        onClick: c[1] || (c[1] = (a) => (r.value = !_(r)))
                      },
                      [
                        c[2] || (c[2] = C("span", null, "menu ", -1)),
                        R(Oe, { open: _(r) }, null, 8, ["open"])
                      ],
                      2
                    )),
                K(
                  C(
                    "div",
                    $e,
                    [
                      (d(!0),
                      b(
                        P,
                        null,
                        H(
                          _(s),
                          (a, m) => (
                            d(),
                            $(
                              f,
                              {
                                key: m,
                                to: { path: "/", hash: a.hash },
                                class: "app-menu-mobile__item",
                                onClick: G(
                                  (S) => {
                                    (e(a), (r.value = !_(r)));
                                  },
                                  ["prevent"]
                                )
                              },
                              { default: L(() => [W(O(a.label), 1)]), _: 2 },
                              1032,
                              ["to", "onClick"]
                            )
                          )
                        ),
                        128
                      ))
                    ],
                    512
                  ),
                  [[ee, _(r)]]
                )
              ]),
              R(X)
            ]))
          : (d(),
            b("div", Te, [
              C("div", Ie, [
                (d(!0),
                b(
                  P,
                  null,
                  H(
                    _(z),
                    (a, m) => (
                      d(),
                      $(
                        f,
                        {
                          key: m,
                          to: { path: "/", hash: a.hash },
                          class: Q(["app-menu__item", { current: y(a) }]),
                          onClick: G((S) => e(a), ["prevent"])
                        },
                        { default: L(() => [W(O(a.label), 1)]), _: 2 },
                        1032,
                        ["to", "class", "onClick"]
                      )
                    )
                  ),
                  128
                ))
              ]),
              R(X)
            ]));
      };
    }
  }),
  Me = Object.assign(M(je, [["__scopeId", "data-v-b5048c76"]]), {
    __name: "BaseAppMenu"
  }),
  Ve = B({
    __name: "default",
    setup(t) {
      const n = j();
      return (l, k) => (
        d(),
        b(
          P,
          null,
          [
            R(me),
            _e(l.$slots, "default"),
            R(
              I,
              { name: "main-menu" },
              {
                default: L(() => [
                  _(n).showMenu ? (d(), $(Me, { key: 0 })) : N("", !0)
                ]),
                _: 1
              }
            )
          ],
          64
        )
      );
    }
  });
export { Ve as default };
