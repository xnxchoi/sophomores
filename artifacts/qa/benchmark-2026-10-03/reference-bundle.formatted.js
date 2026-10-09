const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      "./tToSm3dq.js",
      "./DuULU8RX.js",
      "./WPl0FuOn.js",
      "./Lottie.vTs7bcGR.css",
      "./index.cTofM0tm.css",
      "./BYEoHfWb.js",
      "./default.Cm685Xoo.css",
      "./lenis.BThZsUO0.css"
    ])
) => i.map((i) => d[i]);
(function () {
  const t = document.createElement("link").relList;
  if (t && t.supports && t.supports("modulepreload")) return;
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) s(r);
  new MutationObserver((r) => {
    for (const o of r)
      if (o.type === "childList")
        for (const i of o.addedNodes)
          i.tagName === "LINK" && i.rel === "modulepreload" && s(i);
  }).observe(document, { childList: !0, subtree: !0 });
  function n(r) {
    const o = {};
    return (
      r.integrity && (o.integrity = r.integrity),
      r.referrerPolicy && (o.referrerPolicy = r.referrerPolicy),
      r.crossOrigin === "use-credentials"
        ? (o.credentials = "include")
        : r.crossOrigin === "anonymous"
          ? (o.credentials = "omit")
          : (o.credentials = "same-origin"),
      o
    );
  }
  function s(r) {
    if (r.ep) return;
    r.ep = !0;
    const o = n(r);
    fetch(r.href, o);
  }
})();
function ho(e) {
  const t = Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const le = {},
  mn = [],
  tt = () => {},
  Cl = () => !1,
  Zn = (e) =>
    e.charCodeAt(0) === 111 &&
    e.charCodeAt(1) === 110 &&
    (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97),
  po = (e) => e.startsWith("onUpdate:"),
  Se = Object.assign,
  go = (e, t) => {
    const n = e.indexOf(t);
    n > -1 && e.splice(n, 1);
  },
  tu = Object.prototype.hasOwnProperty,
  oe = (e, t) => tu.call(e, t),
  Y = Array.isArray,
  yn = (e) => es(e) === "[object Map]",
  Al = (e) => es(e) === "[object Set]",
  nu = (e) => es(e) === "[object RegExp]",
  X = (e) => typeof e == "function",
  me = (e) => typeof e == "string",
  Rt = (e) => typeof e == "symbol",
  ae = (e) => e !== null && typeof e == "object",
  mo = (e) => (ae(e) || X(e)) && X(e.then) && X(e.catch),
  kl = Object.prototype.toString,
  es = (e) => kl.call(e),
  su = (e) => es(e).slice(8, -1),
  xl = (e) => es(e) === "[object Object]",
  Gs = (e) =>
    me(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e,
  _n = ho(
    ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
  ),
  qs = (e) => {
    const t = Object.create(null);
    return (n) => t[n] || (t[n] = e(n));
  },
  ru = /-\w/g,
  Je = qs((e) => e.replace(ru, (t) => t.slice(1).toUpperCase())),
  ou = /\B([A-Z])/g,
  on = qs((e) => e.replace(ou, "-$1").toLowerCase()),
  zs = qs((e) => e.charAt(0).toUpperCase() + e.slice(1)),
  ur = qs((e) => (e ? `on${zs(e)}` : "")),
  Ft = (e, t) => !Object.is(e, t),
  Fn = (e, ...t) => {
    for (let n = 0; n < e.length; n++) e[n](...t);
  },
  Pl = (e, t, n, s = !1) => {
    Object.defineProperty(e, t, {
      configurable: !0,
      enumerable: !1,
      writable: s,
      value: n
    });
  },
  iu = (e) => {
    const t = parseFloat(e);
    return isNaN(t) ? e : t;
  },
  Ol = (e) => {
    const t = me(e) ? Number(e) : NaN;
    return isNaN(t) ? e : t;
  };
let ti;
const Ys = () =>
  ti ||
  (ti =
    typeof globalThis < "u"
      ? globalThis
      : typeof self < "u"
        ? self
        : typeof window < "u"
          ? window
          : typeof global < "u"
            ? global
            : {});
function Js(e) {
  if (Y(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const s = e[n],
        r = me(s) ? uu(s) : Js(s);
      if (r) for (const o in r) t[o] = r[o];
    }
    return t;
  } else if (me(e) || ae(e)) return e;
}
const lu = /;(?![^(]*\))/g,
  au = /:([^]+)/,
  cu = /\/\*[^]*?\*\//g;
function uu(e) {
  const t = {};
  return (
    e
      .replace(cu, "")
      .split(lu)
      .forEach((n) => {
        if (n) {
          const s = n.split(au);
          s.length > 1 && (t[s[0].trim()] = s[1].trim());
        }
      }),
    t
  );
}
function Xs(e) {
  let t = "";
  if (me(e)) t = e;
  else if (Y(e))
    for (let n = 0; n < e.length; n++) {
      const s = Xs(e[n]);
      s && (t += s + " ");
    }
  else if (ae(e)) for (const n in e) e[n] && (t += n + " ");
  return t.trim();
}
const fu =
    "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly",
  hu = ho(fu);
function Nl(e) {
  return !!e || e === "";
}
const Ml = (e) => !!(e && e.__v_isRef === !0),
  du = (e) =>
    me(e)
      ? e
      : e == null
        ? ""
        : Y(e) || (ae(e) && (e.toString === kl || !X(e.toString)))
          ? Ml(e)
            ? du(e.value)
            : JSON.stringify(e, Ll, 2)
          : String(e),
  Ll = (e, t) =>
    Ml(t)
      ? Ll(e, t.value)
      : yn(t)
        ? {
            [`Map(${t.size})`]: [...t.entries()].reduce(
              (n, [s, r], o) => ((n[fr(s, o) + " =>"] = r), n),
              {}
            )
          }
        : Al(t)
          ? { [`Set(${t.size})`]: [...t.values()].map((n) => fr(n)) }
          : Rt(t)
            ? fr(t)
            : ae(t) && !Y(t) && !xl(t)
              ? String(t)
              : t,
  fr = (e, t = "") => {
    var n;
    return Rt(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e;
  };
function pu(e) {
  return e == null
    ? "initial"
    : typeof e == "string"
      ? e === ""
        ? " "
        : e
      : String(e);
}
let xe;
class Il {
  constructor(t = !1) {
    ((this.detached = t),
      (this._active = !0),
      (this._on = 0),
      (this.effects = []),
      (this.cleanups = []),
      (this._isPaused = !1),
      (this.parent = xe),
      !t &&
        xe &&
        (this.index = (xe.scopes || (xe.scopes = [])).push(this) - 1));
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = !0;
      let t, n;
      if (this.scopes)
        for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].pause();
      for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].pause();
    }
  }
  resume() {
    if (this._active && this._isPaused) {
      this._isPaused = !1;
      let t, n;
      if (this.scopes)
        for (t = 0, n = this.scopes.length; t < n; t++) this.scopes[t].resume();
      for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].resume();
    }
  }
  run(t) {
    if (this._active) {
      const n = xe;
      try {
        return ((xe = this), t());
      } finally {
        xe = n;
      }
    }
  }
  on() {
    ++this._on === 1 && ((this.prevScope = xe), (xe = this));
  }
  off() {
    this._on > 0 &&
      --this._on === 0 &&
      ((xe = this.prevScope), (this.prevScope = void 0));
  }
  stop(t) {
    if (this._active) {
      this._active = !1;
      let n, s;
      for (n = 0, s = this.effects.length; n < s; n++) this.effects[n].stop();
      for (this.effects.length = 0, n = 0, s = this.cleanups.length; n < s; n++)
        this.cleanups[n]();
      if (((this.cleanups.length = 0), this.scopes)) {
        for (n = 0, s = this.scopes.length; n < s; n++) this.scopes[n].stop(!0);
        this.scopes.length = 0;
      }
      if (!this.detached && this.parent && !t) {
        const r = this.parent.scopes.pop();
        r &&
          r !== this &&
          ((this.parent.scopes[this.index] = r), (r.index = this.index));
      }
      this.parent = void 0;
    }
  }
}
function yo(e) {
  return new Il(e);
}
function _o() {
  return xe;
}
function gu(e, t = !1) {
  xe && xe.cleanups.push(e);
}
let ue;
const hr = new WeakSet();
class Hl {
  constructor(t) {
    ((this.fn = t),
      (this.deps = void 0),
      (this.depsTail = void 0),
      (this.flags = 5),
      (this.next = void 0),
      (this.cleanup = void 0),
      (this.scheduler = void 0),
      xe && xe.active && xe.effects.push(this));
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 &&
      ((this.flags &= -65), hr.has(this) && (hr.delete(this), this.trigger()));
  }
  notify() {
    (this.flags & 2 && !(this.flags & 32)) || this.flags & 8 || jl(this);
  }
  run() {
    if (!(this.flags & 1)) return this.fn();
    ((this.flags |= 2), ni(this), Fl(this));
    const t = ue,
      n = nt;
    ((ue = this), (nt = !0));
    try {
      return this.fn();
    } finally {
      ($l(this), (ue = t), (nt = n), (this.flags &= -3));
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep) wo(t);
      ((this.deps = this.depsTail = void 0),
        ni(this),
        this.onStop && this.onStop(),
        (this.flags &= -2));
    }
  }
  trigger() {
    this.flags & 64
      ? hr.add(this)
      : this.scheduler
        ? this.scheduler()
        : this.runIfDirty();
  }
  runIfDirty() {
    Ir(this) && this.run();
  }
  get dirty() {
    return Ir(this);
  }
}
let Dl = 0,
  $n,
  Bn;
function jl(e, t = !1) {
  if (((e.flags |= 8), t)) {
    ((e.next = Bn), (Bn = e));
    return;
  }
  ((e.next = $n), ($n = e));
}
function vo() {
  Dl++;
}
function bo() {
  if (--Dl > 0) return;
  if (Bn) {
    let t = Bn;
    for (Bn = void 0; t;) {
      const n = t.next;
      ((t.next = void 0), (t.flags &= -9), (t = n));
    }
  }
  let e;
  for (; $n;) {
    let t = $n;
    for ($n = void 0; t;) {
      const n = t.next;
      if (((t.next = void 0), (t.flags &= -9), t.flags & 1))
        try {
          t.trigger();
        } catch (s) {
          e || (e = s);
        }
      t = n;
    }
  }
  if (e) throw e;
}
function Fl(e) {
  for (let t = e.deps; t; t = t.nextDep)
    ((t.version = -1),
      (t.prevActiveLink = t.dep.activeLink),
      (t.dep.activeLink = t));
}
function $l(e) {
  let t,
    n = e.depsTail,
    s = n;
  for (; s;) {
    const r = s.prevDep;
    (s.version === -1 ? (s === n && (n = r), wo(s), mu(s)) : (t = s),
      (s.dep.activeLink = s.prevActiveLink),
      (s.prevActiveLink = void 0),
      (s = r));
  }
  ((e.deps = t), (e.depsTail = n));
}
function Ir(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (
      t.dep.version !== t.version ||
      (t.dep.computed && (Bl(t.dep.computed) || t.dep.version !== t.version))
    )
      return !0;
  return !!e._dirty;
}
function Bl(e) {
  if (
    (e.flags & 4 && !(e.flags & 16)) ||
    ((e.flags &= -17), e.globalVersion === qn) ||
    ((e.globalVersion = qn),
    !e.isSSR && e.flags & 128 && ((!e.deps && !e._dirty) || !Ir(e)))
  )
    return;
  e.flags |= 2;
  const t = e.dep,
    n = ue,
    s = nt;
  ((ue = e), (nt = !0));
  try {
    Fl(e);
    const r = e.fn(e._value);
    (t.version === 0 || Ft(r, e._value)) &&
      ((e.flags |= 128), (e._value = r), t.version++);
  } catch (r) {
    throw (t.version++, r);
  } finally {
    ((ue = n), (nt = s), $l(e), (e.flags &= -3));
  }
}
function wo(e, t = !1) {
  const { dep: n, prevSub: s, nextSub: r } = e;
  if (
    (s && ((s.nextSub = r), (e.prevSub = void 0)),
    r && ((r.prevSub = s), (e.nextSub = void 0)),
    n.subs === e && ((n.subs = s), !s && n.computed))
  ) {
    n.computed.flags &= -5;
    for (let o = n.computed.deps; o; o = o.nextDep) wo(o, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function mu(e) {
  const { prevDep: t, nextDep: n } = e;
  (t && ((t.nextDep = n), (e.prevDep = void 0)),
    n && ((n.prevDep = t), (e.nextDep = void 0)));
}
let nt = !0;
const Ul = [];
function St() {
  (Ul.push(nt), (nt = !1));
}
function Tt() {
  const e = Ul.pop();
  nt = e === void 0 ? !0 : e;
}
function ni(e) {
  const { cleanup: t } = e;
  if (((e.cleanup = void 0), t)) {
    const n = ue;
    ue = void 0;
    try {
      t();
    } finally {
      ue = n;
    }
  }
}
let qn = 0;
class yu {
  constructor(t, n) {
    ((this.sub = t),
      (this.dep = n),
      (this.version = n.version),
      (this.nextDep =
        this.prevDep =
        this.nextSub =
        this.prevSub =
        this.prevActiveLink =
          void 0));
  }
}
class Eo {
  constructor(t) {
    ((this.computed = t),
      (this.version = 0),
      (this.activeLink = void 0),
      (this.subs = void 0),
      (this.map = void 0),
      (this.key = void 0),
      (this.sc = 0),
      (this.__v_skip = !0));
  }
  track(t) {
    if (!ue || !nt || ue === this.computed) return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== ue)
      ((n = this.activeLink = new yu(ue, this)),
        ue.deps
          ? ((n.prevDep = ue.depsTail),
            (ue.depsTail.nextDep = n),
            (ue.depsTail = n))
          : (ue.deps = ue.depsTail = n),
        Wl(n));
    else if (n.version === -1 && ((n.version = this.version), n.nextDep)) {
      const s = n.nextDep;
      ((s.prevDep = n.prevDep),
        n.prevDep && (n.prevDep.nextDep = s),
        (n.prevDep = ue.depsTail),
        (n.nextDep = void 0),
        (ue.depsTail.nextDep = n),
        (ue.depsTail = n),
        ue.deps === n && (ue.deps = s));
    }
    return n;
  }
  trigger(t) {
    (this.version++, qn++, this.notify(t));
  }
  notify(t) {
    vo();
    try {
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      bo();
    }
  }
}
function Wl(e) {
  if ((e.dep.sc++, e.sub.flags & 4)) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let s = t.deps; s; s = s.nextDep) Wl(s);
    }
    const n = e.dep.subs;
    (n !== e && ((e.prevSub = n), n && (n.nextSub = e)), (e.dep.subs = e));
  }
}
const Rs = new WeakMap(),
  Zt = Symbol(""),
  Hr = Symbol(""),
  zn = Symbol("");
function Pe(e, t, n) {
  if (nt && ue) {
    let s = Rs.get(e);
    s || Rs.set(e, (s = new Map()));
    let r = s.get(n);
    (r || (s.set(n, (r = new Eo())), (r.map = s), (r.key = n)), r.track());
  }
}
function bt(e, t, n, s, r, o) {
  const i = Rs.get(e);
  if (!i) {
    qn++;
    return;
  }
  const l = (c) => {
    c && c.trigger();
  };
  if ((vo(), t === "clear")) i.forEach(l);
  else {
    const c = Y(e),
      u = c && Gs(n);
    if (c && n === "length") {
      const a = Number(s);
      i.forEach((f, h) => {
        (h === "length" || h === zn || (!Rt(h) && h >= a)) && l(f);
      });
    } else
      switch (
        ((n !== void 0 || i.has(void 0)) && l(i.get(n)), u && l(i.get(zn)), t)
      ) {
        case "add":
          c ? u && l(i.get("length")) : (l(i.get(Zt)), yn(e) && l(i.get(Hr)));
          break;
        case "delete":
          c || (l(i.get(Zt)), yn(e) && l(i.get(Hr)));
          break;
        case "set":
          yn(e) && l(i.get(Zt));
          break;
      }
  }
  bo();
}
function _u(e, t) {
  const n = Rs.get(e);
  return n && n.get(t);
}
function un(e) {
  const t = ne(e);
  return t === e ? t : (Pe(t, "iterate", zn), We(e) ? t : t.map(st));
}
function Qs(e) {
  return (Pe((e = ne(e)), "iterate", zn), e);
}
function Lt(e, t) {
  return pt(e) ? (dt(e) ? Tn(st(t)) : Tn(t)) : st(t);
}
const vu = {
  __proto__: null,
  [Symbol.iterator]() {
    return dr(this, Symbol.iterator, (e) => Lt(this, e));
  },
  concat(...e) {
    return un(this).concat(...e.map((t) => (Y(t) ? un(t) : t)));
  },
  entries() {
    return dr(this, "entries", (e) => ((e[1] = Lt(this, e[1])), e));
  },
  every(e, t) {
    return mt(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return mt(
      this,
      "filter",
      e,
      t,
      (n) => n.map((s) => Lt(this, s)),
      arguments
    );
  },
  find(e, t) {
    return mt(this, "find", e, t, (n) => Lt(this, n), arguments);
  },
  findIndex(e, t) {
    return mt(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return mt(this, "findLast", e, t, (n) => Lt(this, n), arguments);
  },
  findLastIndex(e, t) {
    return mt(this, "findLastIndex", e, t, void 0, arguments);
  },
  forEach(e, t) {
    return mt(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return pr(this, "includes", e);
  },
  indexOf(...e) {
    return pr(this, "indexOf", e);
  },
  join(e) {
    return un(this).join(e);
  },
  lastIndexOf(...e) {
    return pr(this, "lastIndexOf", e);
  },
  map(e, t) {
    return mt(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return Nn(this, "pop");
  },
  push(...e) {
    return Nn(this, "push", e);
  },
  reduce(e, ...t) {
    return si(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return si(this, "reduceRight", e, t);
  },
  shift() {
    return Nn(this, "shift");
  },
  some(e, t) {
    return mt(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return Nn(this, "splice", e);
  },
  toReversed() {
    return un(this).toReversed();
  },
  toSorted(e) {
    return un(this).toSorted(e);
  },
  toSpliced(...e) {
    return un(this).toSpliced(...e);
  },
  unshift(...e) {
    return Nn(this, "unshift", e);
  },
  values() {
    return dr(this, "values", (e) => Lt(this, e));
  }
};
function dr(e, t, n) {
  const s = Qs(e),
    r = s[t]();
  return (
    s !== e &&
      !We(e) &&
      ((r._next = r.next),
      (r.next = () => {
        const o = r._next();
        return (o.done || (o.value = n(o.value)), o);
      })),
    r
  );
}
const bu = Array.prototype;
function mt(e, t, n, s, r, o) {
  const i = Qs(e),
    l = i !== e && !We(e),
    c = i[t];
  if (c !== bu[t]) {
    const f = c.apply(e, o);
    return l ? st(f) : f;
  }
  let u = n;
  i !== e &&
    (l
      ? (u = function (f, h) {
          return n.call(this, Lt(e, f), h, e);
        })
      : n.length > 2 &&
        (u = function (f, h) {
          return n.call(this, f, h, e);
        }));
  const a = c.call(i, u, s);
  return l && r ? r(a) : a;
}
function si(e, t, n, s) {
  const r = Qs(e);
  let o = n;
  return (
    r !== e &&
      (We(e)
        ? n.length > 3 &&
          (o = function (i, l, c) {
            return n.call(this, i, l, c, e);
          })
        : (o = function (i, l, c) {
            return n.call(this, i, Lt(e, l), c, e);
          })),
    r[t](o, ...s)
  );
}
function pr(e, t, n) {
  const s = ne(e);
  Pe(s, "iterate", zn);
  const r = s[t](...n);
  return (r === -1 || r === !1) && Zs(n[0])
    ? ((n[0] = ne(n[0])), s[t](...n))
    : r;
}
function Nn(e, t, n = []) {
  (St(), vo());
  const s = ne(e)[t].apply(e, n);
  return (bo(), Tt(), s);
}
const wu = ho("__proto__,__v_isRef,__isVue"),
  Vl = new Set(
    Object.getOwnPropertyNames(Symbol)
      .filter((e) => e !== "arguments" && e !== "caller")
      .map((e) => Symbol[e])
      .filter(Rt)
  );
function Eu(e) {
  Rt(e) || (e = String(e));
  const t = ne(this);
  return (Pe(t, "has", e), t.hasOwnProperty(e));
}
class Kl {
  constructor(t = !1, n = !1) {
    ((this._isReadonly = t), (this._isShallow = n));
  }
  get(t, n, s) {
    if (n === "__v_skip") return t.__v_skip;
    const r = this._isReadonly,
      o = this._isShallow;
    if (n === "__v_isReactive") return !r;
    if (n === "__v_isReadonly") return r;
    if (n === "__v_isShallow") return o;
    if (n === "__v_raw")
      return s === (r ? (o ? Nu : Yl) : o ? zl : ql).get(t) ||
        Object.getPrototypeOf(t) === Object.getPrototypeOf(s)
        ? t
        : void 0;
    const i = Y(t);
    if (!r) {
      let c;
      if (i && (c = vu[n])) return c;
      if (n === "hasOwnProperty") return Eu;
    }
    const l = Reflect.get(t, n, he(t) ? t : s);
    if ((Rt(n) ? Vl.has(n) : wu(n)) || (r || Pe(t, "get", n), o)) return l;
    if (he(l)) {
      const c = i && Gs(n) ? l : l.value;
      return r && ae(c) ? jr(c) : c;
    }
    return ae(l) ? (r ? jr(l) : Ct(l)) : l;
  }
}
class Gl extends Kl {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, s, r) {
    let o = t[n];
    const i = Y(t) && Gs(n);
    if (!this._isShallow) {
      const u = pt(o);
      if (
        (!We(s) && !pt(s) && ((o = ne(o)), (s = ne(s))), !i && he(o) && !he(s))
      )
        return (u || (o.value = s), !0);
    }
    const l = i ? Number(n) < t.length : oe(t, n),
      c = Reflect.set(t, n, s, he(t) ? t : r);
    return (
      t === ne(r) && (l ? Ft(s, o) && bt(t, "set", n, s) : bt(t, "add", n, s)),
      c
    );
  }
  deleteProperty(t, n) {
    const s = oe(t, n);
    t[n];
    const r = Reflect.deleteProperty(t, n);
    return (r && s && bt(t, "delete", n, void 0), r);
  }
  has(t, n) {
    const s = Reflect.has(t, n);
    return ((!Rt(n) || !Vl.has(n)) && Pe(t, "has", n), s);
  }
  ownKeys(t) {
    return (Pe(t, "iterate", Y(t) ? "length" : Zt), Reflect.ownKeys(t));
  }
}
class Su extends Kl {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return !0;
  }
  deleteProperty(t, n) {
    return !0;
  }
}
const Tu = new Gl(),
  Ru = new Su(),
  Cu = new Gl(!0);
const Dr = (e) => e,
  as = (e) => Reflect.getPrototypeOf(e);
function Au(e, t, n) {
  return function (...s) {
    const r = this.__v_raw,
      o = ne(r),
      i = yn(o),
      l = e === "entries" || (e === Symbol.iterator && i),
      c = e === "keys" && i,
      u = r[e](...s),
      a = n ? Dr : t ? Tn : st;
    return (
      !t && Pe(o, "iterate", c ? Hr : Zt),
      {
        next() {
          const { value: f, done: h } = u.next();
          return h
            ? { value: f, done: h }
            : { value: l ? [a(f[0]), a(f[1])] : a(f), done: h };
        },
        [Symbol.iterator]() {
          return this;
        }
      }
    );
  };
}
function cs(e) {
  return function (...t) {
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function ku(e, t) {
  const n = {
    get(r) {
      const o = this.__v_raw,
        i = ne(o),
        l = ne(r);
      e || (Ft(r, l) && Pe(i, "get", r), Pe(i, "get", l));
      const { has: c } = as(i),
        u = t ? Dr : e ? Tn : st;
      if (c.call(i, r)) return u(o.get(r));
      if (c.call(i, l)) return u(o.get(l));
      o !== i && o.get(r);
    },
    get size() {
      const r = this.__v_raw;
      return (!e && Pe(ne(r), "iterate", Zt), r.size);
    },
    has(r) {
      const o = this.__v_raw,
        i = ne(o),
        l = ne(r);
      return (
        e || (Ft(r, l) && Pe(i, "has", r), Pe(i, "has", l)),
        r === l ? o.has(r) : o.has(r) || o.has(l)
      );
    },
    forEach(r, o) {
      const i = this,
        l = i.__v_raw,
        c = ne(l),
        u = t ? Dr : e ? Tn : st;
      return (
        !e && Pe(c, "iterate", Zt),
        l.forEach((a, f) => r.call(o, u(a), u(f), i))
      );
    }
  };
  return (
    Se(
      n,
      e
        ? {
            add: cs("add"),
            set: cs("set"),
            delete: cs("delete"),
            clear: cs("clear")
          }
        : {
            add(r) {
              !t && !We(r) && !pt(r) && (r = ne(r));
              const o = ne(this);
              return (
                as(o).has.call(o, r) || (o.add(r), bt(o, "add", r, r)),
                this
              );
            },
            set(r, o) {
              !t && !We(o) && !pt(o) && (o = ne(o));
              const i = ne(this),
                { has: l, get: c } = as(i);
              let u = l.call(i, r);
              u || ((r = ne(r)), (u = l.call(i, r)));
              const a = c.call(i, r);
              return (
                i.set(r, o),
                u ? Ft(o, a) && bt(i, "set", r, o) : bt(i, "add", r, o),
                this
              );
            },
            delete(r) {
              const o = ne(this),
                { has: i, get: l } = as(o);
              let c = i.call(o, r);
              (c || ((r = ne(r)), (c = i.call(o, r))), l && l.call(o, r));
              const u = o.delete(r);
              return (c && bt(o, "delete", r, void 0), u);
            },
            clear() {
              const r = ne(this),
                o = r.size !== 0,
                i = r.clear();
              return (o && bt(r, "clear", void 0, void 0), i);
            }
          }
    ),
    ["keys", "values", "entries", Symbol.iterator].forEach((r) => {
      n[r] = Au(r, e, t);
    }),
    n
  );
}
function So(e, t) {
  const n = ku(e, t);
  return (s, r, o) =>
    r === "__v_isReactive"
      ? !e
      : r === "__v_isReadonly"
        ? e
        : r === "__v_raw"
          ? s
          : Reflect.get(oe(n, r) && r in s ? n : s, r, o);
}
const xu = { get: So(!1, !1) },
  Pu = { get: So(!1, !0) },
  Ou = { get: So(!0, !1) };
const ql = new WeakMap(),
  zl = new WeakMap(),
  Yl = new WeakMap(),
  Nu = new WeakMap();
function Mu(e) {
  switch (e) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
function Lu(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : Mu(su(e));
}
function Ct(e) {
  return pt(e) ? e : To(e, !1, Tu, xu, ql);
}
function ht(e) {
  return To(e, !1, Cu, Pu, zl);
}
function jr(e) {
  return To(e, !0, Ru, Ou, Yl);
}
function To(e, t, n, s, r) {
  if (!ae(e) || (e.__v_raw && !(t && e.__v_isReactive))) return e;
  const o = Lu(e);
  if (o === 0) return e;
  const i = r.get(e);
  if (i) return i;
  const l = new Proxy(e, o === 2 ? s : n);
  return (r.set(e, l), l);
}
function dt(e) {
  return pt(e) ? dt(e.__v_raw) : !!(e && e.__v_isReactive);
}
function pt(e) {
  return !!(e && e.__v_isReadonly);
}
function We(e) {
  return !!(e && e.__v_isShallow);
}
function Zs(e) {
  return e ? !!e.__v_raw : !1;
}
function ne(e) {
  const t = e && e.__v_raw;
  return t ? ne(t) : e;
}
function Ro(e) {
  return (
    !oe(e, "__v_skip") && Object.isExtensible(e) && Pl(e, "__v_skip", !0),
    e
  );
}
const st = (e) => (ae(e) ? Ct(e) : e),
  Tn = (e) => (ae(e) ? jr(e) : e);
function he(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function ze(e) {
  return Jl(e, !1);
}
function Ut(e) {
  return Jl(e, !0);
}
function Jl(e, t) {
  return he(e) ? e : new Iu(e, t);
}
class Iu {
  constructor(t, n) {
    ((this.dep = new Eo()),
      (this.__v_isRef = !0),
      (this.__v_isShallow = !1),
      (this._rawValue = n ? t : ne(t)),
      (this._value = n ? t : st(t)),
      (this.__v_isShallow = n));
  }
  get value() {
    return (this.dep.track(), this._value);
  }
  set value(t) {
    const n = this._rawValue,
      s = this.__v_isShallow || We(t) || pt(t);
    ((t = s ? t : ne(t)),
      Ft(t, n) &&
        ((this._rawValue = t),
        (this._value = s ? t : st(t)),
        this.dep.trigger()));
  }
}
function pe(e) {
  return he(e) ? e.value : e;
}
function Hu(e) {
  return X(e) ? e() : pe(e);
}
const Du = {
  get: (e, t, n) => (t === "__v_raw" ? e : pe(Reflect.get(e, t, n))),
  set: (e, t, n, s) => {
    const r = e[t];
    return he(r) && !he(n) ? ((r.value = n), !0) : Reflect.set(e, t, n, s);
  }
};
function Xl(e) {
  return dt(e) ? e : new Proxy(e, Du);
}
function ju(e) {
  const t = Y(e) ? new Array(e.length) : {};
  for (const n in e) t[n] = Zl(e, n);
  return t;
}
class Fu {
  constructor(t, n, s) {
    ((this._object = t),
      (this._key = n),
      (this._defaultValue = s),
      (this.__v_isRef = !0),
      (this._value = void 0),
      (this._raw = ne(t)));
    let r = !0,
      o = t;
    if (!Y(t) || !Gs(String(n)))
      do r = !Zs(o) || We(o);
      while (r && (o = o.__v_raw));
    this._shallow = r;
  }
  get value() {
    let t = this._object[this._key];
    return (
      this._shallow && (t = pe(t)),
      (this._value = t === void 0 ? this._defaultValue : t)
    );
  }
  set value(t) {
    if (this._shallow && he(this._raw[this._key])) {
      const n = this._object[this._key];
      if (he(n)) {
        n.value = t;
        return;
      }
    }
    this._object[this._key] = t;
  }
  get dep() {
    return _u(this._raw, this._key);
  }
}
class $u {
  constructor(t) {
    ((this._getter = t),
      (this.__v_isRef = !0),
      (this.__v_isReadonly = !0),
      (this._value = void 0));
  }
  get value() {
    return (this._value = this._getter());
  }
}
function Ql(e, t, n) {
  return he(e)
    ? e
    : X(e)
      ? new $u(e)
      : ae(e) && arguments.length > 1
        ? Zl(e, t, n)
        : ze(e);
}
function Zl(e, t, n) {
  return new Fu(e, t, n);
}
class Bu {
  constructor(t, n, s) {
    ((this.fn = t),
      (this.setter = n),
      (this._value = void 0),
      (this.dep = new Eo(this)),
      (this.__v_isRef = !0),
      (this.deps = void 0),
      (this.depsTail = void 0),
      (this.flags = 16),
      (this.globalVersion = qn - 1),
      (this.next = void 0),
      (this.effect = this),
      (this.__v_isReadonly = !n),
      (this.isSSR = s));
  }
  notify() {
    if (((this.flags |= 16), !(this.flags & 8) && ue !== this))
      return (jl(this, !0), !0);
  }
  get value() {
    const t = this.dep.track();
    return (Bl(this), t && (t.version = this.dep.version), this._value);
  }
  set value(t) {
    this.setter && this.setter(t);
  }
}
function Uu(e, t, n = !1) {
  let s, r;
  return (X(e) ? (s = e) : ((s = e.get), (r = e.set)), new Bu(s, r, n));
}
const us = {},
  Cs = new WeakMap();
let Jt;
function Wu(e, t = !1, n = Jt) {
  if (n) {
    let s = Cs.get(n);
    (s || Cs.set(n, (s = [])), s.push(e));
  }
}
function Vu(e, t, n = le) {
  const {
      immediate: s,
      deep: r,
      once: o,
      scheduler: i,
      augmentJob: l,
      call: c
    } = n,
    u = (_) => (r ? _ : We(_) || r === !1 || r === 0 ? wt(_, 1) : wt(_));
  let a,
    f,
    h,
    d,
    y = !1,
    v = !1;
  if (
    (he(e)
      ? ((f = () => e.value), (y = We(e)))
      : dt(e)
        ? ((f = () => u(e)), (y = !0))
        : Y(e)
          ? ((v = !0),
            (y = e.some((_) => dt(_) || We(_))),
            (f = () =>
              e.map((_) => {
                if (he(_)) return _.value;
                if (dt(_)) return u(_);
                if (X(_)) return c ? c(_, 2) : _();
              })))
          : X(e)
            ? t
              ? (f = c ? () => c(e, 2) : e)
              : (f = () => {
                  if (h) {
                    St();
                    try {
                      h();
                    } finally {
                      Tt();
                    }
                  }
                  const _ = Jt;
                  Jt = a;
                  try {
                    return c ? c(e, 3, [d]) : e(d);
                  } finally {
                    Jt = _;
                  }
                })
            : (f = tt),
    t && r)
  ) {
    const _ = f,
      b = r === !0 ? 1 / 0 : r;
    f = () => wt(_(), b);
  }
  const T = _o(),
    S = () => {
      (a.stop(), T && T.active && go(T.effects, a));
    };
  if (o && t) {
    const _ = t;
    t = (...b) => {
      (_(...b), S());
    };
  }
  let w = v ? new Array(e.length).fill(us) : us;
  const g = (_) => {
    if (!(!(a.flags & 1) || (!a.dirty && !_)))
      if (t) {
        const b = a.run();
        if (r || y || (v ? b.some((k, L) => Ft(k, w[L])) : Ft(b, w))) {
          h && h();
          const k = Jt;
          Jt = a;
          try {
            const L = [b, w === us ? void 0 : v && w[0] === us ? [] : w, d];
            ((w = b), c ? c(t, 3, L) : t(...L));
          } finally {
            Jt = k;
          }
        }
      } else a.run();
  };
  return (
    l && l(g),
    (a = new Hl(f)),
    (a.scheduler = i ? () => i(g, !1) : g),
    (d = (_) => Wu(_, !1, a)),
    (h = a.onStop =
      () => {
        const _ = Cs.get(a);
        if (_) {
          if (c) c(_, 4);
          else for (const b of _) b();
          Cs.delete(a);
        }
      }),
    t ? (s ? g(!0) : (w = a.run())) : i ? i(g.bind(null, !0), !0) : a.run(),
    (S.pause = a.pause.bind(a)),
    (S.resume = a.resume.bind(a)),
    (S.stop = S),
    S
  );
}
function wt(e, t = 1 / 0, n) {
  if (
    t <= 0 ||
    !ae(e) ||
    e.__v_skip ||
    ((n = n || new Map()), (n.get(e) || 0) >= t)
  )
    return e;
  if ((n.set(e, t), t--, he(e))) wt(e.value, t, n);
  else if (Y(e)) for (let s = 0; s < e.length; s++) wt(e[s], t, n);
  else if (Al(e) || yn(e))
    e.forEach((s) => {
      wt(s, t, n);
    });
  else if (xl(e)) {
    for (const s in e) wt(e[s], t, n);
    for (const s of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, s) && wt(e[s], t, n);
  }
  return e;
}
function ts(e, t, n, s) {
  try {
    return s ? e(...s) : e();
  } catch (r) {
    Pn(r, t, n);
  }
}
function rt(e, t, n, s) {
  if (X(e)) {
    const r = ts(e, t, n, s);
    return (
      r &&
        mo(r) &&
        r.catch((o) => {
          Pn(o, t, n);
        }),
      r
    );
  }
  if (Y(e)) {
    const r = [];
    for (let o = 0; o < e.length; o++) r.push(rt(e[o], t, n, s));
    return r;
  }
}
function Pn(e, t, n, s = !0) {
  const r = t ? t.vnode : null,
    { errorHandler: o, throwUnhandledErrorInProduction: i } =
      (t && t.appContext.config) || le;
  if (t) {
    let l = t.parent;
    const c = t.proxy,
      u = `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; l;) {
      const a = l.ec;
      if (a) {
        for (let f = 0; f < a.length; f++) if (a[f](e, c, u) === !1) return;
      }
      l = l.parent;
    }
    if (o) {
      (St(), ts(o, null, 10, [e, c, u]), Tt());
      return;
    }
  }
  Ku(e, n, r, s, i);
}
function Ku(e, t, n, s = !0, r = !1) {
  if (r) throw e;
  console.error(e);
}
const Me = [];
let ct = -1;
const vn = [];
let It = null,
  dn = 0;
const ea = Promise.resolve();
let As = null;
function Wt(e) {
  const t = As || ea;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function Gu(e) {
  let t = ct + 1,
    n = Me.length;
  for (; t < n;) {
    const s = (t + n) >>> 1,
      r = Me[s],
      o = Yn(r);
    o < e || (o === e && r.flags & 2) ? (t = s + 1) : (n = s);
  }
  return t;
}
function Co(e) {
  if (!(e.flags & 1)) {
    const t = Yn(e),
      n = Me[Me.length - 1];
    (!n || (!(e.flags & 2) && t >= Yn(n)) ? Me.push(e) : Me.splice(Gu(t), 0, e),
      (e.flags |= 1),
      ta());
  }
}
function ta() {
  As || (As = ea.then(na));
}
function ks(e) {
  (Y(e)
    ? vn.push(...e)
    : It && e.id === -1
      ? It.splice(dn + 1, 0, e)
      : e.flags & 1 || (vn.push(e), (e.flags |= 1)),
    ta());
}
function ri(e, t, n = ct + 1) {
  for (; n < Me.length; n++) {
    const s = Me[n];
    if (s && s.flags & 2) {
      if (e && s.id !== e.uid) continue;
      (Me.splice(n, 1),
        n--,
        s.flags & 4 && (s.flags &= -2),
        s(),
        s.flags & 4 || (s.flags &= -2));
    }
  }
}
function xs(e) {
  if (vn.length) {
    const t = [...new Set(vn)].sort((n, s) => Yn(n) - Yn(s));
    if (((vn.length = 0), It)) {
      It.push(...t);
      return;
    }
    for (It = t, dn = 0; dn < It.length; dn++) {
      const n = It[dn];
      (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), (n.flags &= -2));
    }
    ((It = null), (dn = 0));
  }
}
const Yn = (e) => (e.id == null ? (e.flags & 2 ? -1 : 1 / 0) : e.id);
function na(e) {
  try {
    for (ct = 0; ct < Me.length; ct++) {
      const t = Me[ct];
      t &&
        !(t.flags & 8) &&
        (t.flags & 4 && (t.flags &= -2),
        ts(t, t.i, t.i ? 15 : 14),
        t.flags & 4 || (t.flags &= -2));
    }
  } finally {
    for (; ct < Me.length; ct++) {
      const t = Me[ct];
      t && (t.flags &= -2);
    }
    ((ct = -1),
      (Me.length = 0),
      xs(),
      (As = null),
      (Me.length || vn.length) && na());
  }
}
let Ae = null,
  sa = null;
function Ps(e) {
  const t = Ae;
  return ((Ae = e), (sa = (e && e.type.__scopeId) || null), t);
}
function Ao(e, t = Ae, n) {
  if (!t || e._n) return e;
  const s = (...r) => {
    s._d && Is(-1);
    const o = Ps(t);
    let i;
    try {
      i = e(...r);
    } finally {
      (Ps(o), s._d && Is(1));
    }
    return i;
  };
  return ((s._n = !0), (s._c = !0), (s._d = !0), s);
}
function Oy(e, t) {
  if (Ae === null) return e;
  const n = rr(Ae),
    s = e.dirs || (e.dirs = []);
  for (let r = 0; r < t.length; r++) {
    let [o, i, l, c = le] = t[r];
    o &&
      (X(o) && (o = { mounted: o, updated: o }),
      o.deep && wt(i),
      s.push({
        dir: o,
        instance: n,
        value: i,
        oldValue: void 0,
        arg: l,
        modifiers: c
      }));
  }
  return e;
}
function ut(e, t, n, s) {
  const r = e.dirs,
    o = t && t.dirs;
  for (let i = 0; i < r.length; i++) {
    const l = r[i];
    o && (l.oldValue = o[i].value);
    let c = l.dir[s];
    c && (St(), rt(c, n, 8, [e.el, l, e, t]), Tt());
  }
}
function $t(e, t) {
  if (Ce) {
    let n = Ce.provides;
    const s = Ce.parent && Ce.parent.provides;
    (s === n && (n = Ce.provides = Object.create(s)), (n[e] = t));
  }
}
function Re(e, t, n = !1) {
  const s = gt();
  if (s || en) {
    let r = en
      ? en._context.provides
      : s
        ? s.parent == null || s.ce
          ? s.vnode.appContext && s.vnode.appContext.provides
          : s.parent.provides
        : void 0;
    if (r && e in r) return r[e];
    if (arguments.length > 1) return n && X(t) ? t.call(s && s.proxy) : t;
  }
}
function ns() {
  return !!(gt() || en);
}
const qu = Symbol.for("v-scx"),
  zu = () => Re(qu);
function Yu(e, t) {
  return ko(e, null, t);
}
function Bt(e, t, n) {
  return ko(e, t, n);
}
function ko(e, t, n = le) {
  const { immediate: s, deep: r, flush: o, once: i } = n,
    l = Se({}, n),
    c = (t && s) || (!t && o !== "post");
  let u;
  if (Cn) {
    if (o === "sync") {
      const d = zu();
      u = d.__watcherHandles || (d.__watcherHandles = []);
    } else if (!c) {
      const d = () => {};
      return ((d.stop = tt), (d.resume = tt), (d.pause = tt), d);
    }
  }
  const a = Ce;
  l.call = (d, y, v) => rt(d, a, y, v);
  let f = !1;
  (o === "post"
    ? (l.scheduler = (d) => {
        Te(d, a && a.suspense);
      })
    : o !== "sync" &&
      ((f = !0),
      (l.scheduler = (d, y) => {
        y ? d() : Co(d);
      })),
    (l.augmentJob = (d) => {
      (t && (d.flags |= 4),
        f && ((d.flags |= 2), a && ((d.id = a.uid), (d.i = a))));
    }));
  const h = Vu(e, t, l);
  return (Cn && (u ? u.push(h) : c && h()), h);
}
function Ju(e, t, n) {
  const s = this.proxy,
    r = me(e) ? (e.includes(".") ? ra(s, e) : () => s[e]) : e.bind(s, s);
  let o;
  X(t) ? (o = t) : ((o = t.handler), (n = t));
  const i = os(this),
    l = ko(r, o.bind(s), n);
  return (i(), l);
}
function ra(e, t) {
  const n = t.split(".");
  return () => {
    let s = e;
    for (let r = 0; r < n.length && s; r++) s = s[n[r]];
    return s;
  };
}
const Xu = Symbol("_vte"),
  oa = (e) => e.__isTeleport,
  vt = Symbol("_leaveCb"),
  fs = Symbol("_enterCb");
function ia() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: new Map()
  };
  return (
    Kt(() => {
      e.isMounted = !0;
    }),
    rs(() => {
      e.isUnmounting = !0;
    }),
    e
  );
}
const Ge = [Function, Array],
  la = {
    mode: String,
    appear: Boolean,
    persisted: Boolean,
    onBeforeEnter: Ge,
    onEnter: Ge,
    onAfterEnter: Ge,
    onEnterCancelled: Ge,
    onBeforeLeave: Ge,
    onLeave: Ge,
    onAfterLeave: Ge,
    onLeaveCancelled: Ge,
    onBeforeAppear: Ge,
    onAppear: Ge,
    onAfterAppear: Ge,
    onAppearCancelled: Ge
  },
  aa = (e) => {
    const t = e.subTree;
    return t.component ? aa(t.component) : t;
  },
  Qu = {
    name: "BaseTransition",
    props: la,
    setup(e, { slots: t }) {
      const n = gt(),
        s = ia();
      return () => {
        const r = t.default && xo(t.default(), !0);
        if (!r || !r.length) return;
        const o = ca(r),
          i = ne(e),
          { mode: l } = i;
        if (s.isLeaving) return gr(o);
        const c = oi(o);
        if (!c) return gr(o);
        let u = Jn(c, i, s, n, (f) => (u = f));
        c.type !== ve && Vt(c, u);
        let a = n.subTree && oi(n.subTree);
        if (a && a.type !== ve && !et(a, c) && aa(n).type !== ve) {
          let f = Jn(a, i, s, n);
          if ((Vt(a, f), l === "out-in" && c.type !== ve))
            return (
              (s.isLeaving = !0),
              (f.afterLeave = () => {
                ((s.isLeaving = !1),
                  n.job.flags & 8 || n.update(),
                  delete f.afterLeave,
                  (a = void 0));
              }),
              gr(o)
            );
          l === "in-out" && c.type !== ve
            ? (f.delayLeave = (h, d, y) => {
                const v = ua(s, a);
                ((v[String(a.key)] = a),
                  (h[vt] = () => {
                    (d(),
                      (h[vt] = void 0),
                      delete u.delayedLeave,
                      (a = void 0));
                  }),
                  (u.delayedLeave = () => {
                    (y(), delete u.delayedLeave, (a = void 0));
                  }));
              })
            : (a = void 0);
        } else a && (a = void 0);
        return o;
      };
    }
  };
function ca(e) {
  let t = e[0];
  if (e.length > 1) {
    for (const n of e)
      if (n.type !== ve) {
        t = n;
        break;
      }
  }
  return t;
}
const Zu = Qu;
function ua(e, t) {
  const { leavingVNodes: n } = e;
  let s = n.get(t.type);
  return (s || ((s = Object.create(null)), n.set(t.type, s)), s);
}
function Jn(e, t, n, s, r) {
  const {
      appear: o,
      mode: i,
      persisted: l = !1,
      onBeforeEnter: c,
      onEnter: u,
      onAfterEnter: a,
      onEnterCancelled: f,
      onBeforeLeave: h,
      onLeave: d,
      onAfterLeave: y,
      onLeaveCancelled: v,
      onBeforeAppear: T,
      onAppear: S,
      onAfterAppear: w,
      onAppearCancelled: g
    } = t,
    _ = String(e.key),
    b = ua(n, e),
    k = (A, P) => {
      A && rt(A, s, 9, P);
    },
    L = (A, P) => {
      const V = P[1];
      (k(A, P),
        Y(A) ? A.every((O) => O.length <= 1) && V() : A.length <= 1 && V());
    },
    I = {
      mode: i,
      persisted: l,
      beforeEnter(A) {
        let P = c;
        if (!n.isMounted)
          if (o) P = T || c;
          else return;
        A[vt] && A[vt](!0);
        const V = b[_];
        (V && et(e, V) && V.el[vt] && V.el[vt](), k(P, [A]));
      },
      enter(A) {
        let P = u,
          V = a,
          O = f;
        if (!n.isMounted)
          if (o) ((P = S || u), (V = w || a), (O = g || f));
          else return;
        let K = !1;
        const ee = (A[fs] = (se) => {
          K ||
            ((K = !0),
            se ? k(O, [A]) : k(V, [A]),
            I.delayedLeave && I.delayedLeave(),
            (A[fs] = void 0));
        });
        P ? L(P, [A, ee]) : ee();
      },
      leave(A, P) {
        const V = String(e.key);
        if ((A[fs] && A[fs](!0), n.isUnmounting)) return P();
        k(h, [A]);
        let O = !1;
        const K = (A[vt] = (ee) => {
          O ||
            ((O = !0),
            P(),
            ee ? k(v, [A]) : k(y, [A]),
            (A[vt] = void 0),
            b[V] === e && delete b[V]);
        });
        ((b[V] = e), d ? L(d, [A, K]) : K());
      },
      clone(A) {
        const P = Jn(A, t, n, s, r);
        return (r && r(P), P);
      }
    };
  return I;
}
function gr(e) {
  if (ss(e)) return ((e = Ye(e)), (e.children = null), e);
}
function oi(e) {
  if (!ss(e)) return oa(e.type) && e.children ? ca(e.children) : e;
  if (e.component) return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16) return n[0];
    if (t & 32 && X(n.default)) return n.default();
  }
}
function Vt(e, t) {
  e.shapeFlag & 6 && e.component
    ? ((e.transition = t), Vt(e.component.subTree, t))
    : e.shapeFlag & 128
      ? ((e.ssContent.transition = t.clone(e.ssContent)),
        (e.ssFallback.transition = t.clone(e.ssFallback)))
      : (e.transition = t);
}
function xo(e, t = !1, n) {
  let s = [],
    r = 0;
  for (let o = 0; o < e.length; o++) {
    let i = e[o];
    const l = n == null ? i.key : String(n) + String(i.key != null ? i.key : o);
    i.type === Ee
      ? (i.patchFlag & 128 && r++, (s = s.concat(xo(i.children, t, l))))
      : (t || i.type !== ve) && s.push(l != null ? Ye(i, { key: l }) : i);
  }
  if (r > 1) for (let o = 0; o < s.length; o++) s[o].patchFlag = -2;
  return s;
}
function Xe(e, t) {
  return X(e) ? Se({ name: e.name }, t, { setup: e }) : e;
}
function Po(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
function Ny(e) {
  const t = gt(),
    n = Ut(null);
  if (t) {
    const r = t.refs === le ? (t.refs = {}) : t.refs;
    Object.defineProperty(r, e, {
      enumerable: !0,
      get: () => n.value,
      set: (o) => (n.value = o)
    });
  }
  return n;
}
const Os = new WeakMap();
function bn(e, t, n, s, r = !1) {
  if (Y(e)) {
    e.forEach((y, v) => bn(y, t && (Y(t) ? t[v] : t), n, s, r));
    return;
  }
  if (Et(s) && !r) {
    s.shapeFlag & 512 &&
      s.type.__asyncResolved &&
      s.component.subTree.component &&
      bn(e, t, n, s.component.subTree);
    return;
  }
  const o = s.shapeFlag & 4 ? rr(s.component) : s.el,
    i = r ? null : o,
    { i: l, r: c } = e,
    u = t && t.r,
    a = l.refs === le ? (l.refs = {}) : l.refs,
    f = l.setupState,
    h = ne(f),
    d = f === le ? Cl : (y) => oe(h, y);
  if (u != null && u !== c) {
    if ((ii(t), me(u))) ((a[u] = null), d(u) && (f[u] = null));
    else if (he(u)) {
      u.value = null;
      const y = t;
      y.k && (a[y.k] = null);
    }
  }
  if (X(c)) ts(c, l, 12, [i, a]);
  else {
    const y = me(c),
      v = he(c);
    if (y || v) {
      const T = () => {
        if (e.f) {
          const S = y ? (d(c) ? f[c] : a[c]) : c.value;
          if (r) Y(S) && go(S, o);
          else if (Y(S)) S.includes(o) || S.push(o);
          else if (y) ((a[c] = [o]), d(c) && (f[c] = a[c]));
          else {
            const w = [o];
            ((c.value = w), e.k && (a[e.k] = w));
          }
        } else
          y
            ? ((a[c] = i), d(c) && (f[c] = i))
            : v && ((c.value = i), e.k && (a[e.k] = i));
      };
      if (i) {
        const S = () => {
          (T(), Os.delete(e));
        };
        ((S.id = -1), Os.set(e, S), Te(S, n));
      } else (ii(e), T());
    }
  }
}
function ii(e) {
  const t = Os.get(e);
  t && ((t.flags |= 8), Os.delete(e));
}
let li = !1;
const fn = () => {
    li ||
      (console.error("Hydration completed but contains mismatches."),
      (li = !0));
  },
  ef = (e) => e.namespaceURI.includes("svg") && e.tagName !== "foreignObject",
  tf = (e) => e.namespaceURI.includes("MathML"),
  hs = (e) => {
    if (e.nodeType === 1) {
      if (ef(e)) return "svg";
      if (tf(e)) return "mathml";
    }
  },
  gn = (e) => e.nodeType === 8;
function nf(e) {
  const {
      mt: t,
      p: n,
      o: {
        patchProp: s,
        createText: r,
        nextSibling: o,
        parentNode: i,
        remove: l,
        insert: c,
        createComment: u
      }
    } = e,
    a = (g, _) => {
      if (!_.hasChildNodes()) {
        (n(null, g, _), xs(), (_._vnode = g));
        return;
      }
      (f(_.firstChild, g, null, null, null), xs(), (_._vnode = g));
    },
    f = (g, _, b, k, L, I = !1) => {
      I = I || !!_.dynamicChildren;
      const A = gn(g) && g.data === "[",
        P = () => v(g, _, b, k, L, A),
        { type: V, ref: O, shapeFlag: K, patchFlag: ee } = _;
      let se = g.nodeType;
      ((_.el = g), ee === -2 && ((I = !1), (_.dynamicChildren = null)));
      let B = null;
      switch (V) {
        case tn:
          se !== 3
            ? _.children === ""
              ? (c((_.el = r("")), i(g), g), (B = g))
              : (B = P())
            : (g.data !== _.children && (fn(), (g.data = _.children)),
              (B = o(g)));
          break;
        case ve:
          w(g)
            ? ((B = o(g)), S((_.el = g.content.firstChild), g, b))
            : se !== 8 || A
              ? (B = P())
              : (B = o(g));
          break;
        case En:
          if ((A && ((g = o(g)), (se = g.nodeType)), se === 1 || se === 3)) {
            B = g;
            const G = !_.children.length;
            for (let U = 0; U < _.staticCount; U++)
              (G && (_.children += B.nodeType === 1 ? B.outerHTML : B.data),
                U === _.staticCount - 1 && (_.anchor = B),
                (B = o(B)));
            return A ? o(B) : B;
          } else P();
          break;
        case Ee:
          A ? (B = y(g, _, b, k, L, I)) : (B = P());
          break;
        default:
          if (K & 1)
            (se !== 1 || _.type.toLowerCase() !== g.tagName.toLowerCase()) &&
            !w(g)
              ? (B = P())
              : (B = h(g, _, b, k, L, I));
          else if (K & 6) {
            _.slotScopeIds = L;
            const G = i(g);
            if (
              (A
                ? (B = T(g))
                : gn(g) && g.data === "teleport start"
                  ? (B = T(g, g.data, "teleport end"))
                  : (B = o(g)),
              t(_, G, null, b, k, hs(G), I),
              Et(_) && !_.type.__asyncResolved)
            ) {
              let U;
              (A
                ? ((U = ge(Ee)),
                  (U.anchor = B ? B.previousSibling : G.lastChild))
                : (U = g.nodeType === 3 ? Do("") : ge("div")),
                (U.el = g),
                (_.component.subTree = U));
            }
          } else
            K & 64
              ? se !== 8
                ? (B = P())
                : (B = _.type.hydrate(g, _, b, k, L, I, e, d))
              : K & 128 &&
                (B = _.type.hydrate(g, _, b, k, hs(i(g)), L, I, e, f));
      }
      return (O != null && bn(O, null, k, _), B);
    },
    h = (g, _, b, k, L, I) => {
      I = I || !!_.dynamicChildren;
      const {
          type: A,
          props: P,
          patchFlag: V,
          shapeFlag: O,
          dirs: K,
          transition: ee
        } = _,
        se = A === "input" || A === "option";
      if (se || V !== -1) {
        K && ut(_, null, b, "created");
        let B = !1;
        if (w(g)) {
          B = La(null, ee) && b && b.vnode.props && b.vnode.props.appear;
          const U = g.content.firstChild;
          if (B) {
            const fe = U.getAttribute("class");
            (fe && (U.$cls = fe), ee.beforeEnter(U));
          }
          (S(U, g, b), (_.el = g = U));
        }
        if (O & 16 && !(P && (P.innerHTML || P.textContent))) {
          let U = d(g.firstChild, _, g, b, k, L, I);
          for (; U;) {
            ds(g, 1) || fn();
            const fe = U;
            ((U = U.nextSibling), l(fe));
          }
        } else if (O & 8) {
          let U = _.children;
          U[0] ===
            `
` &&
            (g.tagName === "PRE" || g.tagName === "TEXTAREA") &&
            (U = U.slice(1));
          const { textContent: fe } = g;
          fe !== U &&
            fe !==
              U.replace(
                /\r\n|\r/g,
                `
`
              ) &&
            (ds(g, 0) || fn(), (g.textContent = _.children));
        }
        if (P) {
          if (se || !I || V & 48) {
            const U = g.tagName.includes("-");
            for (const fe in P)
              ((se && (fe.endsWith("value") || fe === "indeterminate")) ||
                (Zn(fe) && !_n(fe)) ||
                fe[0] === "." ||
                U) &&
                s(g, fe, null, P[fe], void 0, b);
          } else if (P.onClick) s(g, "onClick", null, P.onClick, void 0, b);
          else if (V & 4 && dt(P.style)) for (const U in P.style) P.style[U];
        }
        let G;
        ((G = P && P.onVnodeBeforeMount) && He(G, b, _),
          K && ut(_, null, b, "beforeMount"),
          ((G = P && P.onVnodeMounted) || K || B) &&
            Fa(() => {
              (G && He(G, b, _),
                B && ee.enter(g),
                K && ut(_, null, b, "mounted"));
            }, k));
      }
      return g.nextSibling;
    },
    d = (g, _, b, k, L, I, A) => {
      A = A || !!_.dynamicChildren;
      const P = _.children,
        V = P.length;
      for (let O = 0; O < V; O++) {
        const K = A ? P[O] : (P[O] = Ue(P[O])),
          ee = K.type === tn;
        g
          ? (ee &&
              !A &&
              O + 1 < V &&
              Ue(P[O + 1]).type === tn &&
              (c(r(g.data.slice(K.children.length)), b, o(g)),
              (g.data = K.children)),
            (g = f(g, K, k, L, I, A)))
          : ee && !K.children
            ? c((K.el = r("")), b)
            : (ds(b, 1) || fn(), n(null, K, b, null, k, L, hs(b), I));
      }
      return g;
    },
    y = (g, _, b, k, L, I) => {
      const { slotScopeIds: A } = _;
      A && (L = L ? L.concat(A) : A);
      const P = i(g),
        V = d(o(g), _, P, b, k, L, I);
      return V && gn(V) && V.data === "]"
        ? o((_.anchor = V))
        : (fn(), c((_.anchor = u("]")), P, V), V);
    },
    v = (g, _, b, k, L, I) => {
      if ((ds(g.parentElement, 1) || fn(), (_.el = null), I)) {
        const V = T(g);
        for (;;) {
          const O = o(g);
          if (O && O !== V) l(O);
          else break;
        }
      }
      const A = o(g),
        P = i(g);
      return (
        l(g),
        n(null, _, P, A, b, k, hs(P), L),
        b && ((b.vnode.el = _.el), sr(b, _.el)),
        A
      );
    },
    T = (g, _ = "[", b = "]") => {
      let k = 0;
      for (; g;)
        if (((g = o(g)), g && gn(g) && (g.data === _ && k++, g.data === b))) {
          if (k === 0) return o(g);
          k--;
        }
      return g;
    },
    S = (g, _, b) => {
      const k = _.parentNode;
      k && k.replaceChild(g, _);
      let L = b;
      for (; L;)
        (L.vnode.el === _ && (L.vnode.el = L.subTree.el = g), (L = L.parent));
    },
    w = (g) => g.nodeType === 1 && g.tagName === "TEMPLATE";
  return [a, f];
}
const ai = "data-allow-mismatch",
  sf = { 0: "text", 1: "children", 2: "class", 3: "style", 4: "attribute" };
function ds(e, t) {
  if (t === 0 || t === 1) for (; e && !e.hasAttribute(ai);) e = e.parentElement;
  const n = e && e.getAttribute(ai);
  if (n == null) return !1;
  if (n === "") return !0;
  {
    const s = n.split(",");
    return t === 0 && s.includes("children") ? !0 : s.includes(sf[t]);
  }
}
Ys().requestIdleCallback;
Ys().cancelIdleCallback;
function rf(e, t) {
  if (gn(e) && e.data === "[") {
    let n = 1,
      s = e.nextSibling;
    for (; s;) {
      if (s.nodeType === 1) {
        if (t(s) === !1) break;
      } else if (gn(s))
        if (s.data === "]") {
          if (--n === 0) break;
        } else s.data === "[" && n++;
      s = s.nextSibling;
    }
  } else t(e);
}
const Et = (e) => !!e.type.__asyncLoader;
function fa(e) {
  X(e) && (e = { loader: e });
  const {
    loader: t,
    loadingComponent: n,
    errorComponent: s,
    delay: r = 200,
    hydrate: o,
    timeout: i,
    suspensible: l = !0,
    onError: c
  } = e;
  let u = null,
    a,
    f = 0;
  const h = () => (f++, (u = null), d()),
    d = () => {
      let y;
      return (
        u ||
        (y = u =
          t()
            .catch((v) => {
              if (((v = v instanceof Error ? v : new Error(String(v))), c))
                return new Promise((T, S) => {
                  c(
                    v,
                    () => T(h()),
                    () => S(v),
                    f + 1
                  );
                });
              throw v;
            })
            .then((v) =>
              y !== u && u
                ? u
                : (v &&
                    (v.__esModule || v[Symbol.toStringTag] === "Module") &&
                    (v = v.default),
                  (a = v),
                  v)
            ))
      );
    };
  return Xe({
    name: "AsyncComponentWrapper",
    __asyncLoader: d,
    __asyncHydrate(y, v, T) {
      let S = !1;
      (v.bu || (v.bu = [])).push(() => (S = !0));
      const w = () => {
          S || T();
        },
        g = o
          ? () => {
              const _ = o(w, (b) => rf(y, b));
              _ && (v.bum || (v.bum = [])).push(_);
            }
          : w;
      a ? g() : d().then(() => !v.isUnmounted && g());
    },
    get __asyncResolved() {
      return a;
    },
    setup() {
      const y = Ce;
      if ((Po(y), a)) return () => ps(a, y);
      const v = (g) => {
        ((u = null), Pn(g, y, 13, !s));
      };
      if ((l && y.suspense) || Cn)
        return d()
          .then((g) => () => ps(g, y))
          .catch((g) => (v(g), () => (s ? ge(s, { error: g }) : null)));
      const T = ze(!1),
        S = ze(),
        w = ze(!!r);
      return (
        r &&
          setTimeout(() => {
            w.value = !1;
          }, r),
        i != null &&
          setTimeout(() => {
            if (!T.value && !S.value) {
              const g = new Error(`Async component timed out after ${i}ms.`);
              (v(g), (S.value = g));
            }
          }, i),
        d()
          .then(() => {
            ((T.value = !0),
              y.parent && ss(y.parent.vnode) && y.parent.update());
          })
          .catch((g) => {
            (v(g), (S.value = g));
          }),
        () => {
          if (T.value && a) return ps(a, y);
          if (S.value && s) return ge(s, { error: S.value });
          if (n && !w.value) return ps(n, y);
        }
      );
    }
  });
}
function ps(e, t) {
  const { ref: n, props: s, children: r, ce: o } = t.vnode,
    i = ge(e, s, r);
  return ((i.ref = n), (i.ce = o), delete t.vnode.ce, i);
}
const ss = (e) => e.type.__isKeepAlive,
  of = {
    name: "KeepAlive",
    __isKeepAlive: !0,
    props: {
      include: [String, RegExp, Array],
      exclude: [String, RegExp, Array],
      max: [String, Number]
    },
    setup(e, { slots: t }) {
      const n = gt(),
        s = n.ctx;
      if (!s.renderer)
        return () => {
          const w = t.default && t.default();
          return w && w.length === 1 ? w[0] : w;
        };
      const r = new Map(),
        o = new Set();
      let i = null;
      const l = n.suspense,
        {
          renderer: {
            p: c,
            m: u,
            um: a,
            o: { createElement: f }
          }
        } = s,
        h = f("div");
      ((s.activate = (w, g, _, b, k) => {
        const L = w.component;
        (u(w, g, _, 0, l),
          c(L.vnode, w, g, _, L, l, b, w.slotScopeIds, k),
          Te(() => {
            ((L.isDeactivated = !1), L.a && Fn(L.a));
            const I = w.props && w.props.onVnodeMounted;
            I && He(I, L.parent, w);
          }, l));
      }),
        (s.deactivate = (w) => {
          const g = w.component;
          (Ms(g.m),
            Ms(g.a),
            u(w, h, null, 1, l),
            Te(() => {
              g.da && Fn(g.da);
              const _ = w.props && w.props.onVnodeUnmounted;
              (_ && He(_, g.parent, w), (g.isDeactivated = !0));
            }, l));
        }));
      function d(w) {
        (mr(w), a(w, n, l, !0));
      }
      function y(w) {
        r.forEach((g, _) => {
          const b = Gr(Et(g) ? g.type.__asyncResolved || {} : g.type);
          b && !w(b) && v(_);
        });
      }
      function v(w) {
        const g = r.get(w);
        (g && (!i || !et(g, i)) ? d(g) : i && mr(i), r.delete(w), o.delete(w));
      }
      Bt(
        () => [e.include, e.exclude],
        ([w, g]) => {
          (w && y((_) => Dn(w, _)), g && y((_) => !Dn(g, _)));
        },
        { flush: "post", deep: !0 }
      );
      let T = null;
      const S = () => {
        T != null &&
          (Ls(n.subTree.type)
            ? Te(() => {
                r.set(T, gs(n.subTree));
              }, n.subTree.suspense)
            : r.set(T, gs(n.subTree)));
      };
      return (
        Kt(S),
        Oo(S),
        rs(() => {
          r.forEach((w) => {
            const { subTree: g, suspense: _ } = n,
              b = gs(g);
            if (w.type === b.type && w.key === b.key) {
              mr(b);
              const k = b.component.da;
              k && Te(k, _);
              return;
            }
            d(w);
          });
        }),
        () => {
          if (((T = null), !t.default)) return (i = null);
          const w = t.default(),
            g = w[0];
          if (w.length > 1) return ((i = null), w);
          if (!sn(g) || (!(g.shapeFlag & 4) && !(g.shapeFlag & 128)))
            return ((i = null), g);
          let _ = gs(g);
          if (_.type === ve) return ((i = null), _);
          const b = _.type,
            k = Gr(Et(_) ? _.type.__asyncResolved || {} : b),
            { include: L, exclude: I, max: A } = e;
          if ((L && (!k || !Dn(L, k))) || (I && k && Dn(I, k)))
            return ((_.shapeFlag &= -257), (i = _), g);
          const P = _.key == null ? b : _.key,
            V = r.get(P);
          return (
            _.el && ((_ = Ye(_)), g.shapeFlag & 128 && (g.ssContent = _)),
            (T = P),
            V
              ? ((_.el = V.el),
                (_.component = V.component),
                _.transition && Vt(_, _.transition),
                (_.shapeFlag |= 512),
                o.delete(P),
                o.add(P))
              : (o.add(P),
                A && o.size > parseInt(A, 10) && v(o.values().next().value)),
            (_.shapeFlag |= 256),
            (i = _),
            Ls(g.type) ? g : _
          );
        }
      );
    }
  },
  lf = of;
function Dn(e, t) {
  return Y(e)
    ? e.some((n) => Dn(n, t))
    : me(e)
      ? e.split(",").includes(t)
      : nu(e)
        ? ((e.lastIndex = 0), e.test(t))
        : !1;
}
function ha(e, t) {
  pa(e, "a", t);
}
function da(e, t) {
  pa(e, "da", t);
}
function pa(e, t, n = Ce) {
  const s =
    e.__wdc ||
    (e.__wdc = () => {
      let r = n;
      for (; r;) {
        if (r.isDeactivated) return;
        r = r.parent;
      }
      return e();
    });
  if ((er(t, s, n), n)) {
    let r = n.parent;
    for (; r && r.parent;)
      (ss(r.parent.vnode) && af(s, t, n, r), (r = r.parent));
  }
}
function af(e, t, n, s) {
  const r = er(t, e, s, !0);
  tr(() => {
    go(s[t], r);
  }, n);
}
function mr(e) {
  ((e.shapeFlag &= -257), (e.shapeFlag &= -513));
}
function gs(e) {
  return e.shapeFlag & 128 ? e.ssContent : e;
}
function er(e, t, n = Ce, s = !1) {
  if (n) {
    const r = n[e] || (n[e] = []),
      o =
        t.__weh ||
        (t.__weh = (...i) => {
          St();
          const l = os(n),
            c = rt(t, n, e, i);
          return (l(), Tt(), c);
        });
    return (s ? r.unshift(o) : r.push(o), o);
  }
}
const At =
    (e) =>
    (t, n = Ce) => {
      (!Cn || e === "sp") && er(e, (...s) => t(...s), n);
    },
  cf = At("bm"),
  Kt = At("m"),
  ga = At("bu"),
  Oo = At("u"),
  rs = At("bum"),
  tr = At("um"),
  uf = At("sp"),
  ff = At("rtg"),
  hf = At("rtc");
function ma(e, t = Ce) {
  er("ec", e, t);
}
const ya = "components";
function My(e, t) {
  return va(ya, e, !0, t) || e;
}
const _a = Symbol.for("v-ndc");
function df(e) {
  return me(e) ? va(ya, e, !1) || e : e || _a;
}
function va(e, t, n = !0, s = !1) {
  const r = Ae || Ce;
  if (r) {
    const o = r.type;
    {
      const l = Gr(o, !1);
      if (l && (l === t || l === Je(t) || l === zs(Je(t)))) return o;
    }
    const i = ci(r[e] || o[e], t) || ci(r.appContext[e], t);
    return !i && s ? o : i;
  }
}
function ci(e, t) {
  return e && (e[t] || e[Je(t)] || e[zs(Je(t))]);
}
function Ly(e, t, n, s) {
  let r;
  const o = n,
    i = Y(e);
  if (i || me(e)) {
    const l = i && dt(e);
    let c = !1,
      u = !1;
    (l && ((c = !We(e)), (u = pt(e)), (e = Qs(e))), (r = new Array(e.length)));
    for (let a = 0, f = e.length; a < f; a++)
      r[a] = t(c ? (u ? Tn(st(e[a])) : st(e[a])) : e[a], a, void 0, o);
  } else if (typeof e == "number") {
    r = new Array(e);
    for (let l = 0; l < e; l++) r[l] = t(l + 1, l, void 0, o);
  } else if (ae(e))
    if (e[Symbol.iterator]) r = Array.from(e, (l, c) => t(l, c, void 0, o));
    else {
      const l = Object.keys(e);
      r = new Array(l.length);
      for (let c = 0, u = l.length; c < u; c++) {
        const a = l[c];
        r[c] = t(e[a], a, c, o);
      }
    }
  else r = [];
  return r;
}
function Iy(e, t) {
  for (let n = 0; n < t.length; n++) {
    const s = t[n];
    if (Y(s)) for (let r = 0; r < s.length; r++) e[s[r].name] = s[r].fn;
    else
      s &&
        (e[s.name] = s.key
          ? (...r) => {
              const o = s.fn(...r);
              return (o && (o.key = s.key), o);
            }
          : s.fn);
  }
  return e;
}
function Hy(e, t, n = {}, s, r) {
  if (Ae.ce || (Ae.parent && Et(Ae.parent) && Ae.parent.ce)) {
    const u = Object.keys(n).length > 0;
    return (
      t !== "default" && (n.name = t),
      De(),
      ft(Ee, null, [ge("slot", n, s)], u ? -2 : 64)
    );
  }
  let o = e[t];
  (o && o._c && (o._d = !1), De());
  const i = o && ba(o(n)),
    l = n.key || (i && i.key),
    c = ft(
      Ee,
      { key: (l && !Rt(l) ? l : `_${t}`) + (!i && s ? "_fb" : "") },
      i || [],
      i && e._ === 1 ? 64 : -2
    );
  return (
    !r && c.scopeId && (c.slotScopeIds = [c.scopeId + "-s"]),
    o && o._c && (o._d = !0),
    c
  );
}
function ba(e) {
  return e.some((t) =>
    sn(t) ? !(t.type === ve || (t.type === Ee && !ba(t.children))) : !0
  )
    ? e
    : null;
}
const Fr = (e) => (e ? (Va(e) ? rr(e) : Fr(e.parent)) : null),
  Un = Se(Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => Fr(e.parent),
    $root: (e) => Fr(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ea(e),
    $forceUpdate: (e) =>
      e.f ||
      (e.f = () => {
        Co(e.update);
      }),
    $nextTick: (e) => e.n || (e.n = Wt.bind(e.proxy)),
    $watch: (e) => Ju.bind(e)
  }),
  yr = (e, t) => e !== le && !e.__isScriptSetup && oe(e, t),
  pf = {
    get({ _: e }, t) {
      if (t === "__v_skip") return !0;
      const {
        ctx: n,
        setupState: s,
        data: r,
        props: o,
        accessCache: i,
        type: l,
        appContext: c
      } = e;
      if (t[0] !== "$") {
        const h = i[t];
        if (h !== void 0)
          switch (h) {
            case 1:
              return s[t];
            case 2:
              return r[t];
            case 4:
              return n[t];
            case 3:
              return o[t];
          }
        else {
          if (yr(s, t)) return ((i[t] = 1), s[t]);
          if (r !== le && oe(r, t)) return ((i[t] = 2), r[t]);
          if (oe(o, t)) return ((i[t] = 3), o[t]);
          if (n !== le && oe(n, t)) return ((i[t] = 4), n[t]);
          $r && (i[t] = 0);
        }
      }
      const u = Un[t];
      let a, f;
      if (u) return (t === "$attrs" && Pe(e.attrs, "get", ""), u(e));
      if ((a = l.__cssModules) && (a = a[t])) return a;
      if (n !== le && oe(n, t)) return ((i[t] = 4), n[t]);
      if (((f = c.config.globalProperties), oe(f, t))) return f[t];
    },
    set({ _: e }, t, n) {
      const { data: s, setupState: r, ctx: o } = e;
      return yr(r, t)
        ? ((r[t] = n), !0)
        : s !== le && oe(s, t)
          ? ((s[t] = n), !0)
          : oe(e.props, t) || (t[0] === "$" && t.slice(1) in e)
            ? !1
            : ((o[t] = n), !0);
    },
    has(
      {
        _: {
          data: e,
          setupState: t,
          accessCache: n,
          ctx: s,
          appContext: r,
          props: o,
          type: i
        }
      },
      l
    ) {
      let c;
      return !!(
        n[l] ||
        (e !== le && l[0] !== "$" && oe(e, l)) ||
        yr(t, l) ||
        oe(o, l) ||
        oe(s, l) ||
        oe(Un, l) ||
        oe(r.config.globalProperties, l) ||
        ((c = i.__cssModules) && c[l])
      );
    },
    defineProperty(e, t, n) {
      return (
        n.get != null
          ? (e._.accessCache[t] = 0)
          : oe(n, "value") && this.set(e, t, n.value, null),
        Reflect.defineProperty(e, t, n)
      );
    }
  };
function ui(e) {
  return Y(e) ? e.reduce((t, n) => ((t[n] = null), t), {}) : e;
}
let $r = !0;
function gf(e) {
  const t = Ea(e),
    n = e.proxy,
    s = e.ctx;
  (($r = !1), t.beforeCreate && fi(t.beforeCreate, e, "bc"));
  const {
    data: r,
    computed: o,
    methods: i,
    watch: l,
    provide: c,
    inject: u,
    created: a,
    beforeMount: f,
    mounted: h,
    beforeUpdate: d,
    updated: y,
    activated: v,
    deactivated: T,
    beforeDestroy: S,
    beforeUnmount: w,
    destroyed: g,
    unmounted: _,
    render: b,
    renderTracked: k,
    renderTriggered: L,
    errorCaptured: I,
    serverPrefetch: A,
    expose: P,
    inheritAttrs: V,
    components: O,
    directives: K,
    filters: ee
  } = t;
  if ((u && mf(u, s, null), i))
    for (const G in i) {
      const U = i[G];
      X(U) && (s[G] = U.bind(n));
    }
  if (r) {
    const G = r.call(n, n);
    ae(G) && (e.data = Ct(G));
  }
  if ((($r = !0), o))
    for (const G in o) {
      const U = o[G],
        fe = X(U) ? U.bind(n, n) : X(U.get) ? U.get.bind(n, n) : tt,
        kt = !X(U) && X(U.set) ? U.set.bind(n) : tt,
        it = je({ get: fe, set: kt });
      Object.defineProperty(s, G, {
        enumerable: !0,
        configurable: !0,
        get: () => it.value,
        set: (Le) => (it.value = Le)
      });
    }
  if (l) for (const G in l) wa(l[G], s, n, G);
  if (c) {
    const G = X(c) ? c.call(n) : c;
    Reflect.ownKeys(G).forEach((U) => {
      $t(U, G[U]);
    });
  }
  a && fi(a, e, "c");
  function B(G, U) {
    Y(U) ? U.forEach((fe) => G(fe.bind(n))) : U && G(U.bind(n));
  }
  if (
    (B(cf, f),
    B(Kt, h),
    B(ga, d),
    B(Oo, y),
    B(ha, v),
    B(da, T),
    B(ma, I),
    B(hf, k),
    B(ff, L),
    B(rs, w),
    B(tr, _),
    B(uf, A),
    Y(P))
  )
    if (P.length) {
      const G = e.exposed || (e.exposed = {});
      P.forEach((U) => {
        Object.defineProperty(G, U, {
          get: () => n[U],
          set: (fe) => (n[U] = fe),
          enumerable: !0
        });
      });
    } else e.exposed || (e.exposed = {});
  (b && e.render === tt && (e.render = b),
    V != null && (e.inheritAttrs = V),
    O && (e.components = O),
    K && (e.directives = K),
    A && Po(e));
}
function mf(e, t, n = tt) {
  Y(e) && (e = Br(e));
  for (const s in e) {
    const r = e[s];
    let o;
    (ae(r)
      ? "default" in r
        ? (o = Re(r.from || s, r.default, !0))
        : (o = Re(r.from || s))
      : (o = Re(r)),
      he(o)
        ? Object.defineProperty(t, s, {
            enumerable: !0,
            configurable: !0,
            get: () => o.value,
            set: (i) => (o.value = i)
          })
        : (t[s] = o));
  }
}
function fi(e, t, n) {
  rt(Y(e) ? e.map((s) => s.bind(t.proxy)) : e.bind(t.proxy), t, n);
}
function wa(e, t, n, s) {
  let r = s.includes(".") ? ra(n, s) : () => n[s];
  if (me(e)) {
    const o = t[e];
    X(o) && Bt(r, o);
  } else if (X(e)) Bt(r, e.bind(n));
  else if (ae(e))
    if (Y(e)) e.forEach((o) => wa(o, t, n, s));
    else {
      const o = X(e.handler) ? e.handler.bind(n) : t[e.handler];
      X(o) && Bt(r, o, e);
    }
}
function Ea(e) {
  const t = e.type,
    { mixins: n, extends: s } = t,
    {
      mixins: r,
      optionsCache: o,
      config: { optionMergeStrategies: i }
    } = e.appContext,
    l = o.get(t);
  let c;
  return (
    l
      ? (c = l)
      : !r.length && !n && !s
        ? (c = t)
        : ((c = {}),
          r.length && r.forEach((u) => Ns(c, u, i, !0)),
          Ns(c, t, i)),
    ae(t) && o.set(t, c),
    c
  );
}
function Ns(e, t, n, s = !1) {
  const { mixins: r, extends: o } = t;
  (o && Ns(e, o, n, !0), r && r.forEach((i) => Ns(e, i, n, !0)));
  for (const i in t)
    if (!(s && i === "expose")) {
      const l = yf[i] || (n && n[i]);
      e[i] = l ? l(e[i], t[i]) : t[i];
    }
  return e;
}
const yf = {
  data: hi,
  props: di,
  emits: di,
  methods: jn,
  computed: jn,
  beforeCreate: Oe,
  created: Oe,
  beforeMount: Oe,
  mounted: Oe,
  beforeUpdate: Oe,
  updated: Oe,
  beforeDestroy: Oe,
  beforeUnmount: Oe,
  destroyed: Oe,
  unmounted: Oe,
  activated: Oe,
  deactivated: Oe,
  errorCaptured: Oe,
  serverPrefetch: Oe,
  components: jn,
  directives: jn,
  watch: vf,
  provide: hi,
  inject: _f
};
function hi(e, t) {
  return t
    ? e
      ? function () {
          return Se(
            X(e) ? e.call(this, this) : e,
            X(t) ? t.call(this, this) : t
          );
        }
      : t
    : e;
}
function _f(e, t) {
  return jn(Br(e), Br(t));
}
function Br(e) {
  if (Y(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) t[e[n]] = e[n];
    return t;
  }
  return e;
}
function Oe(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function jn(e, t) {
  return e ? Se(Object.create(null), e, t) : t;
}
function di(e, t) {
  return e
    ? Y(e) && Y(t)
      ? [...new Set([...e, ...t])]
      : Se(Object.create(null), ui(e), ui(t ?? {}))
    : t;
}
function vf(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Se(Object.create(null), e);
  for (const s in t) n[s] = Oe(e[s], t[s]);
  return n;
}
function Sa() {
  return {
    app: null,
    config: {
      isNativeTag: Cl,
      performance: !1,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap()
  };
}
let bf = 0;
function wf(e, t) {
  return function (s, r = null) {
    (X(s) || (s = Se({}, s)), r != null && !ae(r) && (r = null));
    const o = Sa(),
      i = new WeakSet(),
      l = [];
    let c = !1;
    const u = (o.app = {
      _uid: bf++,
      _component: s,
      _props: r,
      _container: null,
      _context: o,
      _instance: null,
      version: nh,
      get config() {
        return o.config;
      },
      set config(a) {},
      use(a, ...f) {
        return (
          i.has(a) ||
            (a && X(a.install)
              ? (i.add(a), a.install(u, ...f))
              : X(a) && (i.add(a), a(u, ...f))),
          u
        );
      },
      mixin(a) {
        return (o.mixins.includes(a) || o.mixins.push(a), u);
      },
      component(a, f) {
        return f ? ((o.components[a] = f), u) : o.components[a];
      },
      directive(a, f) {
        return f ? ((o.directives[a] = f), u) : o.directives[a];
      },
      mount(a, f, h) {
        if (!c) {
          const d = u._ceVNode || ge(s, r);
          return (
            (d.appContext = o),
            h === !0 ? (h = "svg") : h === !1 && (h = void 0),
            f && t ? t(d, a) : e(d, a, h),
            (c = !0),
            (u._container = a),
            (a.__vue_app__ = u),
            rr(d.component)
          );
        }
      },
      onUnmount(a) {
        l.push(a);
      },
      unmount() {
        c &&
          (rt(l, u._instance, 16),
          e(null, u._container),
          delete u._container.__vue_app__);
      },
      provide(a, f) {
        return ((o.provides[a] = f), u);
      },
      runWithContext(a) {
        const f = en;
        en = u;
        try {
          return a();
        } finally {
          en = f;
        }
      }
    });
    return u;
  };
}
let en = null;
const Ef = (e, t) =>
  t === "modelValue" || t === "model-value"
    ? e.modelModifiers
    : e[`${t}Modifiers`] || e[`${Je(t)}Modifiers`] || e[`${on(t)}Modifiers`];
function Sf(e, t, ...n) {
  if (e.isUnmounted) return;
  const s = e.vnode.props || le;
  let r = n;
  const o = t.startsWith("update:"),
    i = o && Ef(s, t.slice(7));
  i &&
    (i.trim && (r = n.map((a) => (me(a) ? a.trim() : a))),
    i.number && (r = n.map(iu)));
  let l,
    c = s[(l = ur(t))] || s[(l = ur(Je(t)))];
  (!c && o && (c = s[(l = ur(on(t)))]), c && rt(c, e, 6, r));
  const u = s[l + "Once"];
  if (u) {
    if (!e.emitted) e.emitted = {};
    else if (e.emitted[l]) return;
    ((e.emitted[l] = !0), rt(u, e, 6, r));
  }
}
const Tf = new WeakMap();
function Ta(e, t, n = !1) {
  const s = n ? Tf : t.emitsCache,
    r = s.get(e);
  if (r !== void 0) return r;
  const o = e.emits;
  let i = {},
    l = !1;
  if (!X(e)) {
    const c = (u) => {
      const a = Ta(u, t, !0);
      a && ((l = !0), Se(i, a));
    };
    (!n && t.mixins.length && t.mixins.forEach(c),
      e.extends && c(e.extends),
      e.mixins && e.mixins.forEach(c));
  }
  return !o && !l
    ? (ae(e) && s.set(e, null), null)
    : (Y(o) ? o.forEach((c) => (i[c] = null)) : Se(i, o),
      ae(e) && s.set(e, i),
      i);
}
function nr(e, t) {
  return !e || !Zn(t)
    ? !1
    : ((t = t.slice(2).replace(/Once$/, "")),
      oe(e, t[0].toLowerCase() + t.slice(1)) || oe(e, on(t)) || oe(e, t));
}
function _r(e) {
  const {
      type: t,
      vnode: n,
      proxy: s,
      withProxy: r,
      propsOptions: [o],
      slots: i,
      attrs: l,
      emit: c,
      render: u,
      renderCache: a,
      props: f,
      data: h,
      setupState: d,
      ctx: y,
      inheritAttrs: v
    } = e,
    T = Ps(e);
  let S, w;
  try {
    if (n.shapeFlag & 4) {
      const _ = r || s,
        b = _;
      ((S = Ue(u.call(b, _, a, f, d, h, y))), (w = l));
    } else {
      const _ = t;
      ((S = Ue(
        _.length > 1 ? _(f, { attrs: l, slots: i, emit: c }) : _(f, null)
      )),
        (w = t.props ? l : Cf(l)));
    }
  } catch (_) {
    ((Wn.length = 0), Pn(_, e, 1), (S = ge(ve)));
  }
  let g = S;
  if (w && v !== !1) {
    const _ = Object.keys(w),
      { shapeFlag: b } = g;
    _.length &&
      b & 7 &&
      (o && _.some(po) && (w = Af(w, o)), (g = Ye(g, w, !1, !0)));
  }
  return (
    n.dirs &&
      ((g = Ye(g, null, !1, !0)),
      (g.dirs = g.dirs ? g.dirs.concat(n.dirs) : n.dirs)),
    n.transition && Vt(g, n.transition),
    (S = g),
    Ps(T),
    S
  );
}
function Rf(e, t = !0) {
  let n;
  for (let s = 0; s < e.length; s++) {
    const r = e[s];
    if (sn(r)) {
      if (r.type !== ve || r.children === "v-if") {
        if (n) return;
        n = r;
      }
    } else return;
  }
  return n;
}
const Cf = (e) => {
    let t;
    for (const n in e)
      (n === "class" || n === "style" || Zn(n)) && ((t || (t = {}))[n] = e[n]);
    return t;
  },
  Af = (e, t) => {
    const n = {};
    for (const s in e) (!po(s) || !(s.slice(9) in t)) && (n[s] = e[s]);
    return n;
  };
function kf(e, t, n) {
  const { props: s, children: r, component: o } = e,
    { props: i, children: l, patchFlag: c } = t,
    u = o.emitsOptions;
  if (t.dirs || t.transition) return !0;
  if (n && c >= 0) {
    if (c & 1024) return !0;
    if (c & 16) return s ? pi(s, i, u) : !!i;
    if (c & 8) {
      const a = t.dynamicProps;
      for (let f = 0; f < a.length; f++) {
        const h = a[f];
        if (i[h] !== s[h] && !nr(u, h)) return !0;
      }
    }
  } else
    return (r || l) && (!l || !l.$stable)
      ? !0
      : s === i
        ? !1
        : s
          ? i
            ? pi(s, i, u)
            : !0
          : !!i;
  return !1;
}
function pi(e, t, n) {
  const s = Object.keys(t);
  if (s.length !== Object.keys(e).length) return !0;
  for (let r = 0; r < s.length; r++) {
    const o = s[r];
    if (t[o] !== e[o] && !nr(n, o)) return !0;
  }
  return !1;
}
function sr({ vnode: e, parent: t }, n) {
  for (; t;) {
    const s = t.subTree;
    if ((s.suspense && s.suspense.activeBranch === e && (s.el = e.el), s === e))
      (((e = t.vnode).el = n), (t = t.parent));
    else break;
  }
}
const Ra = {},
  Ca = () => Object.create(Ra),
  Aa = (e) => Object.getPrototypeOf(e) === Ra;
function xf(e, t, n, s = !1) {
  const r = {},
    o = Ca();
  ((e.propsDefaults = Object.create(null)), ka(e, t, r, o));
  for (const i in e.propsOptions[0]) i in r || (r[i] = void 0);
  (n ? (e.props = s ? r : ht(r)) : e.type.props ? (e.props = r) : (e.props = o),
    (e.attrs = o));
}
function Pf(e, t, n, s) {
  const {
      props: r,
      attrs: o,
      vnode: { patchFlag: i }
    } = e,
    l = ne(r),
    [c] = e.propsOptions;
  let u = !1;
  if ((s || i > 0) && !(i & 16)) {
    if (i & 8) {
      const a = e.vnode.dynamicProps;
      for (let f = 0; f < a.length; f++) {
        let h = a[f];
        if (nr(e.emitsOptions, h)) continue;
        const d = t[h];
        if (c)
          if (oe(o, h)) d !== o[h] && ((o[h] = d), (u = !0));
          else {
            const y = Je(h);
            r[y] = Ur(c, l, y, d, e, !1);
          }
        else d !== o[h] && ((o[h] = d), (u = !0));
      }
    }
  } else {
    ka(e, t, r, o) && (u = !0);
    let a;
    for (const f in l)
      (!t || (!oe(t, f) && ((a = on(f)) === f || !oe(t, a)))) &&
        (c
          ? n &&
            (n[f] !== void 0 || n[a] !== void 0) &&
            (r[f] = Ur(c, l, f, void 0, e, !0))
          : delete r[f]);
    if (o !== l)
      for (const f in o) (!t || !oe(t, f)) && (delete o[f], (u = !0));
  }
  u && bt(e.attrs, "set", "");
}
function ka(e, t, n, s) {
  const [r, o] = e.propsOptions;
  let i = !1,
    l;
  if (t)
    for (let c in t) {
      if (_n(c)) continue;
      const u = t[c];
      let a;
      r && oe(r, (a = Je(c)))
        ? !o || !o.includes(a)
          ? (n[a] = u)
          : ((l || (l = {}))[a] = u)
        : nr(e.emitsOptions, c) ||
          ((!(c in s) || u !== s[c]) && ((s[c] = u), (i = !0)));
    }
  if (o) {
    const c = ne(n),
      u = l || le;
    for (let a = 0; a < o.length; a++) {
      const f = o[a];
      n[f] = Ur(r, c, f, u[f], e, !oe(u, f));
    }
  }
  return i;
}
function Ur(e, t, n, s, r, o) {
  const i = e[n];
  if (i != null) {
    const l = oe(i, "default");
    if (l && s === void 0) {
      const c = i.default;
      if (i.type !== Function && !i.skipFactory && X(c)) {
        const { propsDefaults: u } = r;
        if (n in u) s = u[n];
        else {
          const a = os(r);
          ((s = u[n] = c.call(null, t)), a());
        }
      } else s = c;
      r.ce && r.ce._setProp(n, s);
    }
    i[0] &&
      (o && !l ? (s = !1) : i[1] && (s === "" || s === on(n)) && (s = !0));
  }
  return s;
}
const Of = new WeakMap();
function xa(e, t, n = !1) {
  const s = n ? Of : t.propsCache,
    r = s.get(e);
  if (r) return r;
  const o = e.props,
    i = {},
    l = [];
  let c = !1;
  if (!X(e)) {
    const a = (f) => {
      c = !0;
      const [h, d] = xa(f, t, !0);
      (Se(i, h), d && l.push(...d));
    };
    (!n && t.mixins.length && t.mixins.forEach(a),
      e.extends && a(e.extends),
      e.mixins && e.mixins.forEach(a));
  }
  if (!o && !c) return (ae(e) && s.set(e, mn), mn);
  if (Y(o))
    for (let a = 0; a < o.length; a++) {
      const f = Je(o[a]);
      gi(f) && (i[f] = le);
    }
  else if (o)
    for (const a in o) {
      const f = Je(a);
      if (gi(f)) {
        const h = o[a],
          d = (i[f] = Y(h) || X(h) ? { type: h } : Se({}, h)),
          y = d.type;
        let v = !1,
          T = !0;
        if (Y(y))
          for (let S = 0; S < y.length; ++S) {
            const w = y[S],
              g = X(w) && w.name;
            if (g === "Boolean") {
              v = !0;
              break;
            } else g === "String" && (T = !1);
          }
        else v = X(y) && y.name === "Boolean";
        ((d[0] = v), (d[1] = T), (v || oe(d, "default")) && l.push(f));
      }
    }
  const u = [i, l];
  return (ae(e) && s.set(e, u), u);
}
function gi(e) {
  return e[0] !== "$" && !_n(e);
}
const No = (e) => e === "_" || e === "_ctx" || e === "$stable",
  Mo = (e) => (Y(e) ? e.map(Ue) : [Ue(e)]),
  Nf = (e, t, n) => {
    if (t._n) return t;
    const s = Ao((...r) => Mo(t(...r)), n);
    return ((s._c = !1), s);
  },
  Pa = (e, t, n) => {
    const s = e._ctx;
    for (const r in e) {
      if (No(r)) continue;
      const o = e[r];
      if (X(o)) t[r] = Nf(r, o, s);
      else if (o != null) {
        const i = Mo(o);
        t[r] = () => i;
      }
    }
  },
  Oa = (e, t) => {
    const n = Mo(t);
    e.slots.default = () => n;
  },
  Na = (e, t, n) => {
    for (const s in t) (n || !No(s)) && (e[s] = t[s]);
  },
  Mf = (e, t, n) => {
    const s = (e.slots = Ca());
    if (e.vnode.shapeFlag & 32) {
      const r = t._;
      r ? (Na(s, t, n), n && Pl(s, "_", r, !0)) : Pa(t, s);
    } else t && Oa(e, t);
  },
  Lf = (e, t, n) => {
    const { vnode: s, slots: r } = e;
    let o = !0,
      i = le;
    if (s.shapeFlag & 32) {
      const l = t._;
      (l
        ? n && l === 1
          ? (o = !1)
          : Na(r, t, n)
        : ((o = !t.$stable), Pa(t, r)),
        (i = t));
    } else t && (Oa(e, t), (i = { default: 1 }));
    if (o) for (const l in r) !No(l) && i[l] == null && delete r[l];
  },
  Te = Fa;
function If(e) {
  return Ma(e);
}
function Hf(e) {
  return Ma(e, nf);
}
function Ma(e, t) {
  const n = Ys();
  n.__VUE__ = !0;
  const {
      insert: s,
      remove: r,
      patchProp: o,
      createElement: i,
      createText: l,
      createComment: c,
      setText: u,
      setElementText: a,
      parentNode: f,
      nextSibling: h,
      setScopeId: d = tt,
      insertStaticContent: y
    } = e,
    v = (
      p,
      m,
      E,
      x = null,
      R = null,
      N = null,
      j = void 0,
      D = null,
      H = !!m.dynamicChildren
    ) => {
      if (p === m) return;
      (p && !et(p, m) && ((x = C(p)), Le(p, R, N, !0), (p = null)),
        m.patchFlag === -2 && ((H = !1), (m.dynamicChildren = null)));
      const { type: M, ref: J, shapeFlag: $ } = m;
      switch (M) {
        case tn:
          T(p, m, E, x);
          break;
        case ve:
          S(p, m, E, x);
          break;
        case En:
          p == null && w(m, E, x, j);
          break;
        case Ee:
          O(p, m, E, x, R, N, j, D, H);
          break;
        default:
          $ & 1
            ? b(p, m, E, x, R, N, j, D, H)
            : $ & 6
              ? K(p, m, E, x, R, N, j, D, H)
              : ($ & 64 || $ & 128) && M.process(p, m, E, x, R, N, j, D, H, z);
      }
      J != null && R
        ? bn(J, p && p.ref, N, m || p, !m)
        : J == null && p && p.ref != null && bn(p.ref, null, N, p, !0);
    },
    T = (p, m, E, x) => {
      if (p == null) s((m.el = l(m.children)), E, x);
      else {
        const R = (m.el = p.el);
        m.children !== p.children && u(R, m.children);
      }
    },
    S = (p, m, E, x) => {
      p == null ? s((m.el = c(m.children || "")), E, x) : (m.el = p.el);
    },
    w = (p, m, E, x) => {
      [p.el, p.anchor] = y(p.children, m, E, x, p.el, p.anchor);
    },
    g = ({ el: p, anchor: m }, E, x) => {
      let R;
      for (; p && p !== m;) ((R = h(p)), s(p, E, x), (p = R));
      s(m, E, x);
    },
    _ = ({ el: p, anchor: m }) => {
      let E;
      for (; p && p !== m;) ((E = h(p)), r(p), (p = E));
      r(m);
    },
    b = (p, m, E, x, R, N, j, D, H) => {
      if (
        (m.type === "svg" ? (j = "svg") : m.type === "math" && (j = "mathml"),
        p == null)
      )
        k(m, E, x, R, N, j, D, H);
      else {
        const M = p.el && p.el._isVueCE ? p.el : null;
        try {
          (M && M._beginPatch(), A(p, m, R, N, j, D, H));
        } finally {
          M && M._endPatch();
        }
      }
    },
    k = (p, m, E, x, R, N, j, D) => {
      let H, M;
      const { props: J, shapeFlag: $, transition: q, dirs: Q } = p;
      if (
        ((H = p.el = i(p.type, N, J && J.is, J)),
        $ & 8
          ? a(H, p.children)
          : $ & 16 && I(p.children, H, null, x, R, vr(p, N), j, D),
        Q && ut(p, null, x, "created"),
        L(H, p, p.scopeId, j, x),
        J)
      ) {
        for (const ce in J)
          ce !== "value" && !_n(ce) && o(H, ce, null, J[ce], N, x);
        ("value" in J && o(H, "value", null, J.value, N),
          (M = J.onVnodeBeforeMount) && He(M, x, p));
      }
      Q && ut(p, null, x, "beforeMount");
      const te = La(R, q);
      (te && q.beforeEnter(H),
        s(H, m, E),
        ((M = J && J.onVnodeMounted) || te || Q) &&
          Te(() => {
            (M && He(M, x, p),
              te && q.enter(H),
              Q && ut(p, null, x, "mounted"));
          }, R));
    },
    L = (p, m, E, x, R) => {
      if ((E && d(p, E), x)) for (let N = 0; N < x.length; N++) d(p, x[N]);
      if (R) {
        let N = R.subTree;
        if (
          m === N ||
          (Ls(N.type) && (N.ssContent === m || N.ssFallback === m))
        ) {
          const j = R.vnode;
          L(p, j, j.scopeId, j.slotScopeIds, R.parent);
        }
      }
    },
    I = (p, m, E, x, R, N, j, D, H = 0) => {
      for (let M = H; M < p.length; M++) {
        const J = (p[M] = D ? Ht(p[M]) : Ue(p[M]));
        v(null, J, m, E, x, R, N, j, D);
      }
    },
    A = (p, m, E, x, R, N, j) => {
      const D = (m.el = p.el);
      let { patchFlag: H, dynamicChildren: M, dirs: J } = m;
      H |= p.patchFlag & 16;
      const $ = p.props || le,
        q = m.props || le;
      let Q;
      if (
        (E && qt(E, !1),
        (Q = q.onVnodeBeforeUpdate) && He(Q, E, m, p),
        J && ut(m, p, E, "beforeUpdate"),
        E && qt(E, !0),
        (($.innerHTML && q.innerHTML == null) ||
          ($.textContent && q.textContent == null)) &&
          a(D, ""),
        M
          ? P(p.dynamicChildren, M, D, E, x, vr(m, R), N)
          : j || U(p, m, D, null, E, x, vr(m, R), N, !1),
        H > 0)
      ) {
        if (H & 16) V(D, $, q, E, R);
        else if (
          (H & 2 && $.class !== q.class && o(D, "class", null, q.class, R),
          H & 4 && o(D, "style", $.style, q.style, R),
          H & 8)
        ) {
          const te = m.dynamicProps;
          for (let ce = 0; ce < te.length; ce++) {
            const ie = te[ce],
              Ie = $[ie],
              ke = q[ie];
            (ke !== Ie || ie === "value") && o(D, ie, Ie, ke, R, E);
          }
        }
        H & 1 && p.children !== m.children && a(D, m.children);
      } else !j && M == null && V(D, $, q, E, R);
      ((Q = q.onVnodeUpdated) || J) &&
        Te(() => {
          (Q && He(Q, E, m, p), J && ut(m, p, E, "updated"));
        }, x);
    },
    P = (p, m, E, x, R, N, j) => {
      for (let D = 0; D < m.length; D++) {
        const H = p[D],
          M = m[D],
          J =
            H.el && (H.type === Ee || !et(H, M) || H.shapeFlag & 198)
              ? f(H.el)
              : E;
        v(H, M, J, null, x, R, N, j, !0);
      }
    },
    V = (p, m, E, x, R) => {
      if (m !== E) {
        if (m !== le)
          for (const N in m) !_n(N) && !(N in E) && o(p, N, m[N], null, R, x);
        for (const N in E) {
          if (_n(N)) continue;
          const j = E[N],
            D = m[N];
          j !== D && N !== "value" && o(p, N, D, j, R, x);
        }
        "value" in E && o(p, "value", m.value, E.value, R);
      }
    },
    O = (p, m, E, x, R, N, j, D, H) => {
      const M = (m.el = p ? p.el : l("")),
        J = (m.anchor = p ? p.anchor : l(""));
      let { patchFlag: $, dynamicChildren: q, slotScopeIds: Q } = m;
      (Q && (D = D ? D.concat(Q) : Q),
        p == null
          ? (s(M, E, x), s(J, E, x), I(m.children || [], E, J, R, N, j, D, H))
          : $ > 0 &&
              $ & 64 &&
              q &&
              p.dynamicChildren &&
              p.dynamicChildren.length === q.length
            ? (P(p.dynamicChildren, q, E, R, N, j, D),
              (m.key != null || (R && m === R.subTree)) && Ia(p, m, !0))
            : U(p, m, E, J, R, N, j, D, H));
    },
    K = (p, m, E, x, R, N, j, D, H) => {
      ((m.slotScopeIds = D),
        p == null
          ? m.shapeFlag & 512
            ? R.ctx.activate(m, E, x, j, H)
            : ee(m, E, x, R, N, j, H)
          : se(p, m, H));
    },
    ee = (p, m, E, x, R, N, j) => {
      const D = (p.component = Jf(p, x, R));
      if ((ss(p) && (D.ctx.renderer = z), Xf(D, !1, j), D.asyncDep)) {
        if ((R && R.registerDep(D, B, j), !p.el)) {
          const H = (D.subTree = ge(ve));
          (S(null, H, m, E), (p.placeholder = H.el));
        }
      } else B(D, p, m, E, R, N, j);
    },
    se = (p, m, E) => {
      const x = (m.component = p.component);
      if (kf(p, m, E))
        if (x.asyncDep && !x.asyncResolved) {
          G(x, m, E);
          return;
        } else ((x.next = m), x.update());
      else ((m.el = p.el), (x.vnode = m));
    },
    B = (p, m, E, x, R, N, j) => {
      const D = () => {
        if (p.isMounted) {
          let { next: $, bu: q, u: Q, parent: te, vnode: ce } = p;
          {
            const $e = Ha(p);
            if ($e) {
              ($ && (($.el = ce.el), G(p, $, j)),
                $e.asyncDep.then(() => {
                  p.isUnmounted || D();
                }));
              return;
            }
          }
          let ie = $,
            Ie;
          (qt(p, !1),
            $ ? (($.el = ce.el), G(p, $, j)) : ($ = ce),
            q && Fn(q),
            (Ie = $.props && $.props.onVnodeBeforeUpdate) && He(Ie, te, $, ce),
            qt(p, !0));
          const ke = _r(p),
            Ze = p.subTree;
          ((p.subTree = ke),
            v(Ze, ke, f(Ze.el), C(Ze), p, R, N),
            ($.el = ke.el),
            ie === null && sr(p, ke.el),
            Q && Te(Q, R),
            (Ie = $.props && $.props.onVnodeUpdated) &&
              Te(() => He(Ie, te, $, ce), R));
        } else {
          let $;
          const { el: q, props: Q } = m,
            { bm: te, m: ce, parent: ie, root: Ie, type: ke } = p,
            Ze = Et(m);
          if (
            (qt(p, !1),
            te && Fn(te),
            !Ze && ($ = Q && Q.onVnodeBeforeMount) && He($, ie, m),
            qt(p, !0),
            q && de)
          ) {
            const $e = () => {
              ((p.subTree = _r(p)), de(q, p.subTree, p, R, null));
            };
            Ze && ke.__asyncHydrate ? ke.__asyncHydrate(q, p, $e) : $e();
          } else {
            Ie.ce &&
              Ie.ce._def.shadowRoot !== !1 &&
              Ie.ce._injectChildStyle(ke);
            const $e = (p.subTree = _r(p));
            (v(null, $e, E, x, p, R, N), (m.el = $e.el));
          }
          if ((ce && Te(ce, R), !Ze && ($ = Q && Q.onVnodeMounted))) {
            const $e = m;
            Te(() => He($, ie, $e), R);
          }
          ((m.shapeFlag & 256 ||
            (ie && Et(ie.vnode) && ie.vnode.shapeFlag & 256)) &&
            p.a &&
            Te(p.a, R),
            (p.isMounted = !0),
            (m = E = x = null));
        }
      };
      p.scope.on();
      const H = (p.effect = new Hl(D));
      p.scope.off();
      const M = (p.update = H.run.bind(H)),
        J = (p.job = H.runIfDirty.bind(H));
      ((J.i = p), (J.id = p.uid), (H.scheduler = () => Co(J)), qt(p, !0), M());
    },
    G = (p, m, E) => {
      m.component = p;
      const x = p.vnode.props;
      ((p.vnode = m),
        (p.next = null),
        Pf(p, m.props, x, E),
        Lf(p, m.children, E),
        St(),
        ri(p),
        Tt());
    },
    U = (p, m, E, x, R, N, j, D, H = !1) => {
      const M = p && p.children,
        J = p ? p.shapeFlag : 0,
        $ = m.children,
        { patchFlag: q, shapeFlag: Q } = m;
      if (q > 0) {
        if (q & 128) {
          kt(M, $, E, x, R, N, j, D, H);
          return;
        } else if (q & 256) {
          fe(M, $, E, x, R, N, j, D, H);
          return;
        }
      }
      Q & 8
        ? (J & 16 && Ke(M, R, N), $ !== M && a(E, $))
        : J & 16
          ? Q & 16
            ? kt(M, $, E, x, R, N, j, D, H)
            : Ke(M, R, N, !0)
          : (J & 8 && a(E, ""), Q & 16 && I($, E, x, R, N, j, D, H));
    },
    fe = (p, m, E, x, R, N, j, D, H) => {
      ((p = p || mn), (m = m || mn));
      const M = p.length,
        J = m.length,
        $ = Math.min(M, J);
      let q;
      for (q = 0; q < $; q++) {
        const Q = (m[q] = H ? Ht(m[q]) : Ue(m[q]));
        v(p[q], Q, E, null, R, N, j, D, H);
      }
      M > J ? Ke(p, R, N, !0, !1, $) : I(m, E, x, R, N, j, D, H, $);
    },
    kt = (p, m, E, x, R, N, j, D, H) => {
      let M = 0;
      const J = m.length;
      let $ = p.length - 1,
        q = J - 1;
      for (; M <= $ && M <= q;) {
        const Q = p[M],
          te = (m[M] = H ? Ht(m[M]) : Ue(m[M]));
        if (et(Q, te)) v(Q, te, E, null, R, N, j, D, H);
        else break;
        M++;
      }
      for (; M <= $ && M <= q;) {
        const Q = p[$],
          te = (m[q] = H ? Ht(m[q]) : Ue(m[q]));
        if (et(Q, te)) v(Q, te, E, null, R, N, j, D, H);
        else break;
        ($--, q--);
      }
      if (M > $) {
        if (M <= q) {
          const Q = q + 1,
            te = Q < J ? m[Q].el : x;
          for (; M <= q;)
            (v(null, (m[M] = H ? Ht(m[M]) : Ue(m[M])), E, te, R, N, j, D, H),
              M++);
        }
      } else if (M > q) for (; M <= $;) (Le(p[M], R, N, !0), M++);
      else {
        const Q = M,
          te = M,
          ce = new Map();
        for (M = te; M <= q; M++) {
          const Be = (m[M] = H ? Ht(m[M]) : Ue(m[M]));
          Be.key != null && ce.set(Be.key, M);
        }
        let ie,
          Ie = 0;
        const ke = q - te + 1;
        let Ze = !1,
          $e = 0;
        const On = new Array(ke);
        for (M = 0; M < ke; M++) On[M] = 0;
        for (M = Q; M <= $; M++) {
          const Be = p[M];
          if (Ie >= ke) {
            Le(Be, R, N, !0);
            continue;
          }
          let lt;
          if (Be.key != null) lt = ce.get(Be.key);
          else
            for (ie = te; ie <= q; ie++)
              if (On[ie - te] === 0 && et(Be, m[ie])) {
                lt = ie;
                break;
              }
          lt === void 0
            ? Le(Be, R, N, !0)
            : ((On[lt - te] = M + 1),
              lt >= $e ? ($e = lt) : (Ze = !0),
              v(Be, m[lt], E, null, R, N, j, D, H),
              Ie++);
        }
        const Qo = Ze ? Df(On) : mn;
        for (ie = Qo.length - 1, M = ke - 1; M >= 0; M--) {
          const Be = te + M,
            lt = m[Be],
            Zo = m[Be + 1],
            ei = Be + 1 < J ? Zo.el || Da(Zo) : x;
          On[M] === 0
            ? v(null, lt, E, ei, R, N, j, D, H)
            : Ze && (ie < 0 || M !== Qo[ie] ? it(lt, E, ei, 2) : ie--);
        }
      }
    },
    it = (p, m, E, x, R = null) => {
      const { el: N, type: j, transition: D, children: H, shapeFlag: M } = p;
      if (M & 6) {
        it(p.component.subTree, m, E, x);
        return;
      }
      if (M & 128) {
        p.suspense.move(m, E, x);
        return;
      }
      if (M & 64) {
        j.move(p, m, E, z);
        return;
      }
      if (j === Ee) {
        s(N, m, E);
        for (let $ = 0; $ < H.length; $++) it(H[$], m, E, x);
        s(p.anchor, m, E);
        return;
      }
      if (j === En) {
        g(p, m, E);
        return;
      }
      if (x !== 2 && M & 1 && D)
        if (x === 0) (D.beforeEnter(N), s(N, m, E), Te(() => D.enter(N), R));
        else {
          const { leave: $, delayLeave: q, afterLeave: Q } = D,
            te = () => {
              p.ctx.isUnmounted ? r(N) : s(N, m, E);
            },
            ce = () => {
              (N._isLeaving && N[vt](!0),
                $(N, () => {
                  (te(), Q && Q());
                }));
            };
          q ? q(N, te, ce) : ce();
        }
      else s(N, m, E);
    },
    Le = (p, m, E, x = !1, R = !1) => {
      const {
        type: N,
        props: j,
        ref: D,
        children: H,
        dynamicChildren: M,
        shapeFlag: J,
        patchFlag: $,
        dirs: q,
        cacheIndex: Q
      } = p;
      if (
        ($ === -2 && (R = !1),
        D != null && (St(), bn(D, null, E, p, !0), Tt()),
        Q != null && (m.renderCache[Q] = void 0),
        J & 256)
      ) {
        m.ctx.deactivate(p);
        return;
      }
      const te = J & 1 && q,
        ce = !Et(p);
      let ie;
      if ((ce && (ie = j && j.onVnodeBeforeUnmount) && He(ie, m, p), J & 6))
        Gt(p.component, E, x);
      else {
        if (J & 128) {
          p.suspense.unmount(E, x);
          return;
        }
        (te && ut(p, null, m, "beforeUnmount"),
          J & 64
            ? p.type.remove(p, m, E, z, x)
            : M && !M.hasOnce && (N !== Ee || ($ > 0 && $ & 64))
              ? Ke(M, m, E, !1, !0)
              : ((N === Ee && $ & 384) || (!R && J & 16)) && Ke(H, m, E),
          x && an(p));
      }
      ((ce && (ie = j && j.onVnodeUnmounted)) || te) &&
        Te(() => {
          (ie && He(ie, m, p), te && ut(p, null, m, "unmounted"));
        }, E);
    },
    an = (p) => {
      const { type: m, el: E, anchor: x, transition: R } = p;
      if (m === Ee) {
        cn(E, x);
        return;
      }
      if (m === En) {
        _(p);
        return;
      }
      const N = () => {
        (r(E), R && !R.persisted && R.afterLeave && R.afterLeave());
      };
      if (p.shapeFlag & 1 && R && !R.persisted) {
        const { leave: j, delayLeave: D } = R,
          H = () => j(E, N);
        D ? D(p.el, N, H) : H();
      } else N();
    },
    cn = (p, m) => {
      let E;
      for (; p !== m;) ((E = h(p)), r(p), (p = E));
      r(m);
    },
    Gt = (p, m, E) => {
      const { bum: x, scope: R, job: N, subTree: j, um: D, m: H, a: M } = p;
      (Ms(H),
        Ms(M),
        x && Fn(x),
        R.stop(),
        N && ((N.flags |= 8), Le(j, p, m, E)),
        D && Te(D, m),
        Te(() => {
          p.isUnmounted = !0;
        }, m));
    },
    Ke = (p, m, E, x = !1, R = !1, N = 0) => {
      for (let j = N; j < p.length; j++) Le(p[j], m, E, x, R);
    },
    C = (p) => {
      if (p.shapeFlag & 6) return C(p.component.subTree);
      if (p.shapeFlag & 128) return p.suspense.next();
      const m = h(p.anchor || p.el),
        E = m && m[Xu];
      return E ? h(E) : m;
    };
  let W = !1;
  const F = (p, m, E) => {
      let x;
      (p == null
        ? m._vnode && (Le(m._vnode, null, null, !0), (x = m._vnode.component))
        : v(m._vnode || null, p, m, null, null, null, E),
        (m._vnode = p),
        W || ((W = !0), ri(x), xs(), (W = !1)));
    },
    z = {
      p: v,
      um: Le,
      m: it,
      r: an,
      mt: ee,
      mc: I,
      pc: U,
      pbc: P,
      n: C,
      o: e
    };
  let Z, de;
  return (
    t && ([Z, de] = t(z)),
    { render: F, hydrate: Z, createApp: wf(F, Z) }
  );
}
function vr({ type: e, props: t }, n) {
  return (n === "svg" && e === "foreignObject") ||
    (n === "mathml" &&
      e === "annotation-xml" &&
      t &&
      t.encoding &&
      t.encoding.includes("html"))
    ? void 0
    : n;
}
function qt({ effect: e, job: t }, n) {
  n ? ((e.flags |= 32), (t.flags |= 4)) : ((e.flags &= -33), (t.flags &= -5));
}
function La(e, t) {
  return (!e || (e && !e.pendingBranch)) && t && !t.persisted;
}
function Ia(e, t, n = !1) {
  const s = e.children,
    r = t.children;
  if (Y(s) && Y(r))
    for (let o = 0; o < s.length; o++) {
      const i = s[o];
      let l = r[o];
      (l.shapeFlag & 1 &&
        !l.dynamicChildren &&
        ((l.patchFlag <= 0 || l.patchFlag === 32) &&
          ((l = r[o] = Ht(r[o])), (l.el = i.el)),
        !n && l.patchFlag !== -2 && Ia(i, l)),
        l.type === tn &&
          (l.patchFlag !== -1
            ? (l.el = i.el)
            : (l.__elIndex = o + (e.type === Ee ? 1 : 0))),
        l.type === ve && !l.el && (l.el = i.el));
    }
}
function Df(e) {
  const t = e.slice(),
    n = [0];
  let s, r, o, i, l;
  const c = e.length;
  for (s = 0; s < c; s++) {
    const u = e[s];
    if (u !== 0) {
      if (((r = n[n.length - 1]), e[r] < u)) {
        ((t[s] = r), n.push(s));
        continue;
      }
      for (o = 0, i = n.length - 1; o < i;)
        ((l = (o + i) >> 1), e[n[l]] < u ? (o = l + 1) : (i = l));
      u < e[n[o]] && (o > 0 && (t[s] = n[o - 1]), (n[o] = s));
    }
  }
  for (o = n.length, i = n[o - 1]; o-- > 0;) ((n[o] = i), (i = t[i]));
  return n;
}
function Ha(e) {
  const t = e.subTree.component;
  if (t) return t.asyncDep && !t.asyncResolved ? t : Ha(t);
}
function Ms(e) {
  if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
function Da(e) {
  if (e.placeholder) return e.placeholder;
  const t = e.component;
  return t ? Da(t.subTree) : null;
}
const Ls = (e) => e.__isSuspense;
let Wr = 0;
const jf = {
    name: "Suspense",
    __isSuspense: !0,
    process(e, t, n, s, r, o, i, l, c, u) {
      if (e == null) Ff(t, n, s, r, o, i, l, c, u);
      else {
        if (o && o.deps > 0 && !e.suspense.isInFallback) {
          ((t.suspense = e.suspense), (t.suspense.vnode = t), (t.el = e.el));
          return;
        }
        $f(e, t, n, s, r, i, l, c, u);
      }
    },
    hydrate: Bf,
    normalize: Uf
  },
  Lo = jf;
function Xn(e, t) {
  const n = e.props && e.props[t];
  X(n) && n();
}
function Ff(e, t, n, s, r, o, i, l, c) {
  const {
      p: u,
      o: { createElement: a }
    } = c,
    f = a("div"),
    h = (e.suspense = ja(e, r, s, t, f, n, o, i, l, c));
  (u(null, (h.pendingBranch = e.ssContent), f, null, s, h, o, i),
    h.deps > 0
      ? (Xn(e, "onPending"),
        Xn(e, "onFallback"),
        u(null, e.ssFallback, t, n, s, null, o, i),
        wn(h, e.ssFallback))
      : h.resolve(!1, !0));
}
function $f(e, t, n, s, r, o, i, l, { p: c, um: u, o: { createElement: a } }) {
  const f = (t.suspense = e.suspense);
  ((f.vnode = t), (t.el = e.el));
  const h = t.ssContent,
    d = t.ssFallback,
    { activeBranch: y, pendingBranch: v, isInFallback: T, isHydrating: S } = f;
  if (v)
    ((f.pendingBranch = h),
      et(v, h)
        ? (c(v, h, f.hiddenContainer, null, r, f, o, i, l),
          f.deps <= 0
            ? f.resolve()
            : T && (S || (c(y, d, n, s, r, null, o, i, l), wn(f, d))))
        : ((f.pendingId = Wr++),
          S ? ((f.isHydrating = !1), (f.activeBranch = v)) : u(v, r, f),
          (f.deps = 0),
          (f.effects.length = 0),
          (f.hiddenContainer = a("div")),
          T
            ? (c(null, h, f.hiddenContainer, null, r, f, o, i, l),
              f.deps <= 0
                ? f.resolve()
                : (c(y, d, n, s, r, null, o, i, l), wn(f, d)))
            : y && et(y, h)
              ? (c(y, h, n, s, r, f, o, i, l), f.resolve(!0))
              : (c(null, h, f.hiddenContainer, null, r, f, o, i, l),
                f.deps <= 0 && f.resolve())));
  else if (y && et(y, h)) (c(y, h, n, s, r, f, o, i, l), wn(f, h));
  else if (
    (Xn(t, "onPending"),
    (f.pendingBranch = h),
    h.shapeFlag & 512
      ? (f.pendingId = h.component.suspenseId)
      : (f.pendingId = Wr++),
    c(null, h, f.hiddenContainer, null, r, f, o, i, l),
    f.deps <= 0)
  )
    f.resolve();
  else {
    const { timeout: w, pendingId: g } = f;
    w > 0
      ? setTimeout(() => {
          f.pendingId === g && f.fallback(d);
        }, w)
      : w === 0 && f.fallback(d);
  }
}
function ja(e, t, n, s, r, o, i, l, c, u, a = !1) {
  const {
    p: f,
    m: h,
    um: d,
    n: y,
    o: { parentNode: v, remove: T }
  } = u;
  let S;
  const w = Wf(e);
  w && t && t.pendingBranch && ((S = t.pendingId), t.deps++);
  const g = e.props ? Ol(e.props.timeout) : void 0,
    _ = o,
    b = {
      vnode: e,
      parent: t,
      parentComponent: n,
      namespace: i,
      container: s,
      hiddenContainer: r,
      deps: 0,
      pendingId: Wr++,
      timeout: typeof g == "number" ? g : -1,
      activeBranch: null,
      pendingBranch: null,
      isInFallback: !a,
      isHydrating: a,
      isUnmounted: !1,
      effects: [],
      resolve(k = !1, L = !1) {
        const {
          vnode: I,
          activeBranch: A,
          pendingBranch: P,
          pendingId: V,
          effects: O,
          parentComponent: K,
          container: ee,
          isInFallback: se
        } = b;
        let B = !1;
        (b.isHydrating
          ? (b.isHydrating = !1)
          : k ||
            ((B = A && P.transition && P.transition.mode === "out-in"),
            B &&
              (A.transition.afterLeave = () => {
                V === b.pendingId &&
                  (h(P, ee, o === _ ? y(A) : o, 0),
                  ks(O),
                  se && I.ssFallback && (I.ssFallback.el = null));
              }),
            A &&
              (v(A.el) === ee && (o = y(A)),
              d(A, K, b, !0),
              !B &&
                se &&
                I.ssFallback &&
                Te(() => (I.ssFallback.el = null), b)),
            B || h(P, ee, o, 0)),
          wn(b, P),
          (b.pendingBranch = null),
          (b.isInFallback = !1));
        let G = b.parent,
          U = !1;
        for (; G;) {
          if (G.pendingBranch) {
            (G.effects.push(...O), (U = !0));
            break;
          }
          G = G.parent;
        }
        (!U && !B && ks(O),
          (b.effects = []),
          w &&
            t &&
            t.pendingBranch &&
            S === t.pendingId &&
            (t.deps--, t.deps === 0 && !L && t.resolve()),
          Xn(I, "onResolve"));
      },
      fallback(k) {
        if (!b.pendingBranch) return;
        const {
          vnode: L,
          activeBranch: I,
          parentComponent: A,
          container: P,
          namespace: V
        } = b;
        Xn(L, "onFallback");
        const O = y(I),
          K = () => {
            b.isInFallback && (f(null, k, P, O, A, null, V, l, c), wn(b, k));
          },
          ee = k.transition && k.transition.mode === "out-in";
        (ee && (I.transition.afterLeave = K),
          (b.isInFallback = !0),
          d(I, A, null, !0),
          ee || K());
      },
      move(k, L, I) {
        (b.activeBranch && h(b.activeBranch, k, L, I), (b.container = k));
      },
      next() {
        return b.activeBranch && y(b.activeBranch);
      },
      registerDep(k, L, I) {
        const A = !!b.pendingBranch;
        A && b.deps++;
        const P = k.vnode.el;
        k.asyncDep
          .catch((V) => {
            Pn(V, k, 0);
          })
          .then((V) => {
            if (k.isUnmounted || b.isUnmounted || b.pendingId !== k.suspenseId)
              return;
            k.asyncResolved = !0;
            const { vnode: O } = k;
            (Kr(k, V), P && (O.el = P));
            const K = !P && k.subTree.el;
            (L(k, O, v(P || k.subTree.el), P ? null : y(k.subTree), b, i, I),
              K && ((O.placeholder = null), T(K)),
              sr(k, O.el),
              A && --b.deps === 0 && b.resolve());
          });
      },
      unmount(k, L) {
        ((b.isUnmounted = !0),
          b.activeBranch && d(b.activeBranch, n, k, L),
          b.pendingBranch && d(b.pendingBranch, n, k, L));
      }
    };
  return b;
}
function Bf(e, t, n, s, r, o, i, l, c) {
  const u = (t.suspense = ja(
      t,
      s,
      n,
      e.parentNode,
      document.createElement("div"),
      null,
      r,
      o,
      i,
      l,
      !0
    )),
    a = c(e, (u.pendingBranch = t.ssContent), n, u, o, i);
  return (u.deps === 0 && u.resolve(!1, !0), a);
}
function Uf(e) {
  const { shapeFlag: t, children: n } = e,
    s = t & 32;
  ((e.ssContent = mi(s ? n.default : n)),
    (e.ssFallback = s ? mi(n.fallback) : ge(ve)));
}
function mi(e) {
  let t;
  if (X(e)) {
    const n = Rn && e._c;
    (n && ((e._d = !1), De()), (e = e()), n && ((e._d = !0), (t = Fe), $a()));
  }
  return (
    Y(e) && (e = Rf(e)),
    (e = Ue(e)),
    t && !e.dynamicChildren && (e.dynamicChildren = t.filter((n) => n !== e)),
    e
  );
}
function Fa(e, t) {
  t && t.pendingBranch
    ? Y(e)
      ? t.effects.push(...e)
      : t.effects.push(e)
    : ks(e);
}
function wn(e, t) {
  e.activeBranch = t;
  const { vnode: n, parentComponent: s } = e;
  let r = t.el;
  for (; !r && t.component;) ((t = t.component.subTree), (r = t.el));
  ((n.el = r), s && s.subTree === n && ((s.vnode.el = r), sr(s, r)));
}
function Wf(e) {
  const t = e.props && e.props.suspensible;
  return t != null && t !== !1;
}
const Ee = Symbol.for("v-fgt"),
  tn = Symbol.for("v-txt"),
  ve = Symbol.for("v-cmt"),
  En = Symbol.for("v-stc"),
  Wn = [];
let Fe = null;
function De(e = !1) {
  Wn.push((Fe = e ? null : []));
}
function $a() {
  (Wn.pop(), (Fe = Wn[Wn.length - 1] || null));
}
let Rn = 1;
function Is(e, t = !1) {
  ((Rn += e), e < 0 && Fe && t && (Fe.hasOnce = !0));
}
function Ba(e) {
  return (
    (e.dynamicChildren = Rn > 0 ? Fe || mn : null),
    $a(),
    Rn > 0 && Fe && Fe.push(e),
    e
  );
}
function Io(e, t, n, s, r, o) {
  return Ba(Ho(e, t, n, s, r, o, !0));
}
function ft(e, t, n, s, r) {
  return Ba(ge(e, t, n, s, r, !0));
}
function sn(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function et(e, t) {
  return e.type === t.type && e.key === t.key;
}
const Ua = ({ key: e }) => e ?? null,
  ws = ({ ref: e, ref_key: t, ref_for: n }) => (
    typeof e == "number" && (e = "" + e),
    e != null
      ? me(e) || he(e) || X(e)
        ? { i: Ae, r: e, k: t, f: !!n }
        : e
      : null
  );
function Ho(
  e,
  t = null,
  n = null,
  s = 0,
  r = null,
  o = e === Ee ? 0 : 1,
  i = !1,
  l = !1
) {
  const c = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Ua(t),
    ref: t && ws(t),
    scopeId: sa,
    slotScopeIds: null,
    children: n,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetStart: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag: o,
    patchFlag: s,
    dynamicProps: r,
    dynamicChildren: null,
    appContext: null,
    ctx: Ae
  };
  return (
    l
      ? (jo(c, n), o & 128 && e.normalize(c))
      : n && (c.shapeFlag |= me(n) ? 8 : 16),
    Rn > 0 &&
      !i &&
      Fe &&
      (c.patchFlag > 0 || o & 6) &&
      c.patchFlag !== 32 &&
      Fe.push(c),
    c
  );
}
const ge = Vf;
function Vf(e, t = null, n = null, s = 0, r = null, o = !1) {
  if (((!e || e === _a) && (e = ve), sn(e))) {
    const l = Ye(e, t, !0);
    return (
      n && jo(l, n),
      Rn > 0 &&
        !o &&
        Fe &&
        (l.shapeFlag & 6 ? (Fe[Fe.indexOf(e)] = l) : Fe.push(l)),
      (l.patchFlag = -2),
      l
    );
  }
  if ((th(e) && (e = e.__vccOpts), t)) {
    t = Kf(t);
    let { class: l, style: c } = t;
    (l && !me(l) && (t.class = Xs(l)),
      ae(c) && (Zs(c) && !Y(c) && (c = Se({}, c)), (t.style = Js(c))));
  }
  const i = me(e) ? 1 : Ls(e) ? 128 : oa(e) ? 64 : ae(e) ? 4 : X(e) ? 2 : 0;
  return Ho(e, t, n, s, r, i, o, !0);
}
function Kf(e) {
  return e ? (Zs(e) || Aa(e) ? Se({}, e) : e) : null;
}
function Ye(e, t, n = !1, s = !1) {
  const { props: r, ref: o, patchFlag: i, children: l, transition: c } = e,
    u = t ? Wa(r || {}, t) : r,
    a = {
      __v_isVNode: !0,
      __v_skip: !0,
      type: e.type,
      props: u,
      key: u && Ua(u),
      ref:
        t && t.ref
          ? n && o
            ? Y(o)
              ? o.concat(ws(t))
              : [o, ws(t)]
            : ws(t)
          : o,
      scopeId: e.scopeId,
      slotScopeIds: e.slotScopeIds,
      children: l,
      target: e.target,
      targetStart: e.targetStart,
      targetAnchor: e.targetAnchor,
      staticCount: e.staticCount,
      shapeFlag: e.shapeFlag,
      patchFlag: t && e.type !== Ee ? (i === -1 ? 16 : i | 16) : i,
      dynamicProps: e.dynamicProps,
      dynamicChildren: e.dynamicChildren,
      appContext: e.appContext,
      dirs: e.dirs,
      transition: c,
      component: e.component,
      suspense: e.suspense,
      ssContent: e.ssContent && Ye(e.ssContent),
      ssFallback: e.ssFallback && Ye(e.ssFallback),
      placeholder: e.placeholder,
      el: e.el,
      anchor: e.anchor,
      ctx: e.ctx,
      ce: e.ce
    };
  return (c && s && Vt(a, c.clone(a)), a);
}
function Do(e = " ", t = 0) {
  return ge(tn, null, e, t);
}
function Gf(e, t) {
  const n = ge(En, null, e);
  return ((n.staticCount = t), n);
}
function qf(e = "", t = !1) {
  return t ? (De(), ft(ve, null, e)) : ge(ve, null, e);
}
function Ue(e) {
  return e == null || typeof e == "boolean"
    ? ge(ve)
    : Y(e)
      ? ge(Ee, null, e.slice())
      : sn(e)
        ? Ht(e)
        : ge(tn, null, String(e));
}
function Ht(e) {
  return (e.el === null && e.patchFlag !== -1) || e.memo ? e : Ye(e);
}
function jo(e, t) {
  let n = 0;
  const { shapeFlag: s } = e;
  if (t == null) t = null;
  else if (Y(t)) n = 16;
  else if (typeof t == "object")
    if (s & 65) {
      const r = t.default;
      r && (r._c && (r._d = !1), jo(e, r()), r._c && (r._d = !0));
      return;
    } else {
      n = 32;
      const r = t._;
      !r && !Aa(t)
        ? (t._ctx = Ae)
        : r === 3 &&
          Ae &&
          (Ae.slots._ === 1 ? (t._ = 1) : ((t._ = 2), (e.patchFlag |= 1024)));
    }
  else
    X(t)
      ? ((t = { default: t, _ctx: Ae }), (n = 32))
      : ((t = String(t)), s & 64 ? ((n = 16), (t = [Do(t)])) : (n = 8));
  ((e.children = t), (e.shapeFlag |= n));
}
function Wa(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const s = e[n];
    for (const r in s)
      if (r === "class")
        t.class !== s.class && (t.class = Xs([t.class, s.class]));
      else if (r === "style") t.style = Js([t.style, s.style]);
      else if (Zn(r)) {
        const o = t[r],
          i = s[r];
        i &&
          o !== i &&
          !(Y(o) && o.includes(i)) &&
          (t[r] = o ? [].concat(o, i) : i);
      } else r !== "" && (t[r] = s[r]);
  }
  return t;
}
function He(e, t, n, s = null) {
  rt(e, t, 7, [n, s]);
}
const zf = Sa();
let Yf = 0;
function Jf(e, t, n) {
  const s = e.type,
    r = (t ? t.appContext : e.appContext) || zf,
    o = {
      uid: Yf++,
      vnode: e,
      type: s,
      parent: t,
      appContext: r,
      root: null,
      next: null,
      subTree: null,
      effect: null,
      update: null,
      job: null,
      scope: new Il(!0),
      render: null,
      proxy: null,
      exposed: null,
      exposeProxy: null,
      withProxy: null,
      provides: t ? t.provides : Object.create(r.provides),
      ids: t ? t.ids : ["", 0, 0],
      accessCache: null,
      renderCache: [],
      components: null,
      directives: null,
      propsOptions: xa(s, r),
      emitsOptions: Ta(s, r),
      emit: null,
      emitted: null,
      propsDefaults: le,
      inheritAttrs: s.inheritAttrs,
      ctx: le,
      data: le,
      props: le,
      attrs: le,
      slots: le,
      refs: le,
      setupState: le,
      setupContext: null,
      suspense: n,
      suspenseId: n ? n.pendingId : 0,
      asyncDep: null,
      asyncResolved: !1,
      isMounted: !1,
      isUnmounted: !1,
      isDeactivated: !1,
      bc: null,
      c: null,
      bm: null,
      m: null,
      bu: null,
      u: null,
      um: null,
      bum: null,
      da: null,
      a: null,
      rtg: null,
      rtc: null,
      ec: null,
      sp: null
    };
  return (
    (o.ctx = { _: o }),
    (o.root = t ? t.root : o),
    (o.emit = Sf.bind(null, o)),
    e.ce && e.ce(o),
    o
  );
}
let Ce = null;
const gt = () => Ce || Ae;
let Hs, Vr;
{
  const e = Ys(),
    t = (n, s) => {
      let r;
      return (
        (r = e[n]) || (r = e[n] = []),
        r.push(s),
        (o) => {
          r.length > 1 ? r.forEach((i) => i(o)) : r[0](o);
        }
      );
    };
  ((Hs = t("__VUE_INSTANCE_SETTERS__", (n) => (Ce = n))),
    (Vr = t("__VUE_SSR_SETTERS__", (n) => (Cn = n))));
}
const os = (e) => {
    const t = Ce;
    return (
      Hs(e),
      e.scope.on(),
      () => {
        (e.scope.off(), Hs(t));
      }
    );
  },
  yi = () => {
    (Ce && Ce.scope.off(), Hs(null));
  };
function Va(e) {
  return e.vnode.shapeFlag & 4;
}
let Cn = !1;
function Xf(e, t = !1, n = !1) {
  t && Vr(t);
  const { props: s, children: r } = e.vnode,
    o = Va(e);
  (xf(e, s, o, t), Mf(e, r, n || t));
  const i = o ? Qf(e, t) : void 0;
  return (t && Vr(!1), i);
}
function Qf(e, t) {
  const n = e.type;
  ((e.accessCache = Object.create(null)), (e.proxy = new Proxy(e.ctx, pf)));
  const { setup: s } = n;
  if (s) {
    St();
    const r = (e.setupContext = s.length > 1 ? eh(e) : null),
      o = os(e),
      i = ts(s, e, 0, [e.props, r]),
      l = mo(i);
    if ((Tt(), o(), (l || e.sp) && !Et(e) && Po(e), l)) {
      if ((i.then(yi, yi), t))
        return i
          .then((c) => {
            Kr(e, c);
          })
          .catch((c) => {
            Pn(c, e, 0);
          });
      e.asyncDep = i;
    } else Kr(e, i);
  } else Ka(e);
}
function Kr(e, t, n) {
  (X(t)
    ? e.type.__ssrInlineRender
      ? (e.ssrRender = t)
      : (e.render = t)
    : ae(t) && (e.setupState = Xl(t)),
    Ka(e));
}
function Ka(e, t, n) {
  const s = e.type;
  e.render || (e.render = s.render || tt);
  {
    const r = os(e);
    St();
    try {
      gf(e);
    } finally {
      (Tt(), r());
    }
  }
}
const Zf = {
  get(e, t) {
    return (Pe(e, "get", ""), e[t]);
  }
};
function eh(e) {
  const t = (n) => {
    e.exposed = n || {};
  };
  return {
    attrs: new Proxy(e.attrs, Zf),
    slots: e.slots,
    emit: e.emit,
    expose: t
  };
}
function rr(e) {
  return e.exposed
    ? e.exposeProxy ||
        (e.exposeProxy = new Proxy(Xl(Ro(e.exposed)), {
          get(t, n) {
            if (n in t) return t[n];
            if (n in Un) return Un[n](e);
          },
          has(t, n) {
            return n in t || n in Un;
          }
        }))
    : e.proxy;
}
function Gr(e, t = !0) {
  return X(e) ? e.displayName || e.name : e.name || (t && e.__name);
}
function th(e) {
  return X(e) && "__vccOpts" in e;
}
const je = (e, t) => Uu(e, t, Cn);
function be(e, t, n) {
  try {
    Is(-1);
    const s = arguments.length;
    return s === 2
      ? ae(t) && !Y(t)
        ? sn(t)
          ? ge(e, null, [t])
          : ge(e, t)
        : ge(e, null, t)
      : (s > 3
          ? (n = Array.prototype.slice.call(arguments, 2))
          : s === 3 && sn(n) && (n = [n]),
        ge(e, t, n));
  } finally {
    Is(1);
  }
}
const nh = "3.5.26";
let qr;
const _i = typeof window < "u" && window.trustedTypes;
if (_i)
  try {
    qr = _i.createPolicy("vue", { createHTML: (e) => e });
  } catch {}
const Ga = qr ? (e) => qr.createHTML(e) : (e) => e,
  sh = "http://www.w3.org/2000/svg",
  rh = "http://www.w3.org/1998/Math/MathML",
  _t = typeof document < "u" ? document : null,
  vi = _t && _t.createElement("template"),
  oh = {
    insert: (e, t, n) => {
      t.insertBefore(e, n || null);
    },
    remove: (e) => {
      const t = e.parentNode;
      t && t.removeChild(e);
    },
    createElement: (e, t, n, s) => {
      const r =
        t === "svg"
          ? _t.createElementNS(sh, e)
          : t === "mathml"
            ? _t.createElementNS(rh, e)
            : n
              ? _t.createElement(e, { is: n })
              : _t.createElement(e);
      return (
        e === "select" &&
          s &&
          s.multiple != null &&
          r.setAttribute("multiple", s.multiple),
        r
      );
    },
    createText: (e) => _t.createTextNode(e),
    createComment: (e) => _t.createComment(e),
    setText: (e, t) => {
      e.nodeValue = t;
    },
    setElementText: (e, t) => {
      e.textContent = t;
    },
    parentNode: (e) => e.parentNode,
    nextSibling: (e) => e.nextSibling,
    querySelector: (e) => _t.querySelector(e),
    setScopeId(e, t) {
      e.setAttribute(t, "");
    },
    insertStaticContent(e, t, n, s, r, o) {
      const i = n ? n.previousSibling : t.lastChild;
      if (r && (r === o || r.nextSibling))
        for (
          ;
          t.insertBefore(r.cloneNode(!0), n),
            !(r === o || !(r = r.nextSibling));
        );
      else {
        vi.innerHTML = Ga(
          s === "svg"
            ? `<svg>${e}</svg>`
            : s === "mathml"
              ? `<math>${e}</math>`
              : e
        );
        const l = vi.content;
        if (s === "svg" || s === "mathml") {
          const c = l.firstChild;
          for (; c.firstChild;) l.appendChild(c.firstChild);
          l.removeChild(c);
        }
        t.insertBefore(l, n);
      }
      return [
        i ? i.nextSibling : t.firstChild,
        n ? n.previousSibling : t.lastChild
      ];
    }
  },
  xt = "transition",
  Mn = "animation",
  An = Symbol("_vtc"),
  qa = {
    name: String,
    type: String,
    css: { type: Boolean, default: !0 },
    duration: [String, Number, Object],
    enterFromClass: String,
    enterActiveClass: String,
    enterToClass: String,
    appearFromClass: String,
    appearActiveClass: String,
    appearToClass: String,
    leaveFromClass: String,
    leaveActiveClass: String,
    leaveToClass: String
  },
  za = Se({}, la, qa),
  ih = (e) => ((e.displayName = "Transition"), (e.props = za), e),
  lh = ih((e, { slots: t }) => be(Zu, Ya(e), t)),
  zt = (e, t = []) => {
    Y(e) ? e.forEach((n) => n(...t)) : e && e(...t);
  },
  bi = (e) => (e ? (Y(e) ? e.some((t) => t.length > 1) : e.length > 1) : !1);
function Ya(e) {
  const t = {};
  for (const O in e) O in qa || (t[O] = e[O]);
  if (e.css === !1) return t;
  const {
      name: n = "v",
      type: s,
      duration: r,
      enterFromClass: o = `${n}-enter-from`,
      enterActiveClass: i = `${n}-enter-active`,
      enterToClass: l = `${n}-enter-to`,
      appearFromClass: c = o,
      appearActiveClass: u = i,
      appearToClass: a = l,
      leaveFromClass: f = `${n}-leave-from`,
      leaveActiveClass: h = `${n}-leave-active`,
      leaveToClass: d = `${n}-leave-to`
    } = e,
    y = ah(r),
    v = y && y[0],
    T = y && y[1],
    {
      onBeforeEnter: S,
      onEnter: w,
      onEnterCancelled: g,
      onLeave: _,
      onLeaveCancelled: b,
      onBeforeAppear: k = S,
      onAppear: L = w,
      onAppearCancelled: I = g
    } = t,
    A = (O, K, ee, se) => {
      ((O._enterCancelled = se),
        Nt(O, K ? a : l),
        Nt(O, K ? u : i),
        ee && ee());
    },
    P = (O, K) => {
      ((O._isLeaving = !1), Nt(O, f), Nt(O, d), Nt(O, h), K && K());
    },
    V = (O) => (K, ee) => {
      const se = O ? L : w,
        B = () => A(K, O, ee);
      (zt(se, [K, B]),
        wi(() => {
          (Nt(K, O ? c : o), at(K, O ? a : l), bi(se) || Ei(K, s, v, B));
        }));
    };
  return Se(t, {
    onBeforeEnter(O) {
      (zt(S, [O]), at(O, o), at(O, i));
    },
    onBeforeAppear(O) {
      (zt(k, [O]), at(O, c), at(O, u));
    },
    onEnter: V(!1),
    onAppear: V(!0),
    onLeave(O, K) {
      O._isLeaving = !0;
      const ee = () => P(O, K);
      (at(O, f),
        O._enterCancelled ? (at(O, h), zr(O)) : (zr(O), at(O, h)),
        wi(() => {
          O._isLeaving && (Nt(O, f), at(O, d), bi(_) || Ei(O, s, T, ee));
        }),
        zt(_, [O, ee]));
    },
    onEnterCancelled(O) {
      (A(O, !1, void 0, !0), zt(g, [O]));
    },
    onAppearCancelled(O) {
      (A(O, !0, void 0, !0), zt(I, [O]));
    },
    onLeaveCancelled(O) {
      (P(O), zt(b, [O]));
    }
  });
}
function ah(e) {
  if (e == null) return null;
  if (ae(e)) return [br(e.enter), br(e.leave)];
  {
    const t = br(e);
    return [t, t];
  }
}
function br(e) {
  return Ol(e);
}
function at(e, t) {
  (t.split(/\s+/).forEach((n) => n && e.classList.add(n)),
    (e[An] || (e[An] = new Set())).add(t));
}
function Nt(e, t) {
  t.split(/\s+/).forEach((s) => s && e.classList.remove(s));
  const n = e[An];
  n && (n.delete(t), n.size || (e[An] = void 0));
}
function wi(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let ch = 0;
function Ei(e, t, n, s) {
  const r = (e._endId = ++ch),
    o = () => {
      r === e._endId && s();
    };
  if (n != null) return setTimeout(o, n);
  const { type: i, timeout: l, propCount: c } = Ja(e, t);
  if (!i) return s();
  const u = i + "end";
  let a = 0;
  const f = () => {
      (e.removeEventListener(u, h), o());
    },
    h = (d) => {
      d.target === e && ++a >= c && f();
    };
  (setTimeout(() => {
    a < c && f();
  }, l + 1),
    e.addEventListener(u, h));
}
function Ja(e, t) {
  const n = window.getComputedStyle(e),
    s = (y) => (n[y] || "").split(", "),
    r = s(`${xt}Delay`),
    o = s(`${xt}Duration`),
    i = Si(r, o),
    l = s(`${Mn}Delay`),
    c = s(`${Mn}Duration`),
    u = Si(l, c);
  let a = null,
    f = 0,
    h = 0;
  t === xt
    ? i > 0 && ((a = xt), (f = i), (h = o.length))
    : t === Mn
      ? u > 0 && ((a = Mn), (f = u), (h = c.length))
      : ((f = Math.max(i, u)),
        (a = f > 0 ? (i > u ? xt : Mn) : null),
        (h = a ? (a === xt ? o.length : c.length) : 0));
  const d =
    a === xt &&
    /\b(?:transform|all)(?:,|$)/.test(s(`${xt}Property`).toString());
  return { type: a, timeout: f, propCount: h, hasTransform: d };
}
function Si(e, t) {
  for (; e.length < t.length;) e = e.concat(e);
  return Math.max(...t.map((n, s) => Ti(n) + Ti(e[s])));
}
function Ti(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function zr(e) {
  return (e ? e.ownerDocument : document).body.offsetHeight;
}
function uh(e, t, n) {
  const s = e[An];
  (s && (t = (t ? [t, ...s] : [...s]).join(" ")),
    t == null
      ? e.removeAttribute("class")
      : n
        ? e.setAttribute("class", t)
        : (e.className = t));
}
const Ds = Symbol("_vod"),
  Xa = Symbol("_vsh"),
  Dy = {
    name: "show",
    beforeMount(e, { value: t }, { transition: n }) {
      ((e[Ds] = e.style.display === "none" ? "" : e.style.display),
        n && t ? n.beforeEnter(e) : Ln(e, t));
    },
    mounted(e, { value: t }, { transition: n }) {
      n && t && n.enter(e);
    },
    updated(e, { value: t, oldValue: n }, { transition: s }) {
      !t != !n &&
        (s
          ? t
            ? (s.beforeEnter(e), Ln(e, !0), s.enter(e))
            : s.leave(e, () => {
                Ln(e, !1);
              })
          : Ln(e, t));
    },
    beforeUnmount(e, { value: t }) {
      Ln(e, t);
    }
  };
function Ln(e, t) {
  ((e.style.display = t ? e[Ds] : "none"), (e[Xa] = !t));
}
const Qa = Symbol("");
function jy(e) {
  const t = gt();
  if (!t) return;
  const n = (t.ut = (r = e(t.proxy)) => {
      Array.from(
        document.querySelectorAll(`[data-v-owner="${t.uid}"]`)
      ).forEach((o) => js(o, r));
    }),
    s = () => {
      const r = e(t.proxy);
      (t.ce ? js(t.ce, r) : Yr(t.subTree, r), n(r));
    };
  (ga(() => {
    ks(s);
  }),
    Kt(() => {
      Bt(s, tt, { flush: "post" });
      const r = new MutationObserver(s);
      (r.observe(t.subTree.el.parentNode, { childList: !0 }),
        tr(() => r.disconnect()));
    }));
}
function Yr(e, t) {
  if (e.shapeFlag & 128) {
    const n = e.suspense;
    ((e = n.activeBranch),
      n.pendingBranch &&
        !n.isHydrating &&
        n.effects.push(() => {
          Yr(n.activeBranch, t);
        }));
  }
  for (; e.component;) e = e.component.subTree;
  if (e.shapeFlag & 1 && e.el) js(e.el, t);
  else if (e.type === Ee) e.children.forEach((n) => Yr(n, t));
  else if (e.type === En) {
    let { el: n, anchor: s } = e;
    for (; n && (js(n, t), n !== s);) n = n.nextSibling;
  }
}
function js(e, t) {
  if (e.nodeType === 1) {
    const n = e.style;
    let s = "";
    for (const r in t) {
      const o = pu(t[r]);
      (n.setProperty(`--${r}`, o), (s += `--${r}: ${o};`));
    }
    n[Qa] = s;
  }
}
const fh = /(?:^|;)\s*display\s*:/;
function hh(e, t, n) {
  const s = e.style,
    r = me(n);
  let o = !1;
  if (n && !r) {
    if (t)
      if (me(t))
        for (const i of t.split(";")) {
          const l = i.slice(0, i.indexOf(":")).trim();
          n[l] == null && Es(s, l, "");
        }
      else for (const i in t) n[i] == null && Es(s, i, "");
    for (const i in n) (i === "display" && (o = !0), Es(s, i, n[i]));
  } else if (r) {
    if (t !== n) {
      const i = s[Qa];
      (i && (n += ";" + i), (s.cssText = n), (o = fh.test(n)));
    }
  } else t && e.removeAttribute("style");
  Ds in e && ((e[Ds] = o ? s.display : ""), e[Xa] && (s.display = "none"));
}
const Ri = /\s*!important$/;
function Es(e, t, n) {
  if (Y(n)) n.forEach((s) => Es(e, t, s));
  else if ((n == null && (n = ""), t.startsWith("--"))) e.setProperty(t, n);
  else {
    const s = dh(e, t);
    Ri.test(n)
      ? e.setProperty(on(s), n.replace(Ri, ""), "important")
      : (e[s] = n);
  }
}
const Ci = ["Webkit", "Moz", "ms"],
  wr = {};
function dh(e, t) {
  const n = wr[t];
  if (n) return n;
  let s = Je(t);
  if (s !== "filter" && s in e) return (wr[t] = s);
  s = zs(s);
  for (let r = 0; r < Ci.length; r++) {
    const o = Ci[r] + s;
    if (o in e) return (wr[t] = o);
  }
  return t;
}
const Ai = "http://www.w3.org/1999/xlink";
function ki(e, t, n, s, r, o = hu(t)) {
  s && t.startsWith("xlink:")
    ? n == null
      ? e.removeAttributeNS(Ai, t.slice(6, t.length))
      : e.setAttributeNS(Ai, t, n)
    : n == null || (o && !Nl(n))
      ? e.removeAttribute(t)
      : e.setAttribute(t, o ? "" : Rt(n) ? String(n) : n);
}
function xi(e, t, n, s, r) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? Ga(n) : n);
    return;
  }
  const o = e.tagName;
  if (t === "value" && o !== "PROGRESS" && !o.includes("-")) {
    const l = o === "OPTION" ? e.getAttribute("value") || "" : e.value,
      c = n == null ? (e.type === "checkbox" ? "on" : "") : String(n);
    ((l !== c || !("_value" in e)) && (e.value = c),
      n == null && e.removeAttribute(t),
      (e._value = n));
    return;
  }
  let i = !1;
  if (n === "" || n == null) {
    const l = typeof e[t];
    l === "boolean"
      ? (n = Nl(n))
      : n == null && l === "string"
        ? ((n = ""), (i = !0))
        : l === "number" && ((n = 0), (i = !0));
  }
  try {
    e[t] = n;
  } catch {}
  i && e.removeAttribute(r || t);
}
function ph(e, t, n, s) {
  e.addEventListener(t, n, s);
}
function gh(e, t, n, s) {
  e.removeEventListener(t, n, s);
}
const Pi = Symbol("_vei");
function mh(e, t, n, s, r = null) {
  const o = e[Pi] || (e[Pi] = {}),
    i = o[t];
  if (s && i) i.value = s;
  else {
    const [l, c] = yh(t);
    if (s) {
      const u = (o[t] = bh(s, r));
      ph(e, l, u, c);
    } else i && (gh(e, l, i, c), (o[t] = void 0));
  }
}
const Oi = /(?:Once|Passive|Capture)$/;
function yh(e) {
  let t;
  if (Oi.test(e)) {
    t = {};
    let s;
    for (; (s = e.match(Oi));)
      ((e = e.slice(0, e.length - s[0].length)), (t[s[0].toLowerCase()] = !0));
  }
  return [e[2] === ":" ? e.slice(3) : on(e.slice(2)), t];
}
let Er = 0;
const _h = Promise.resolve(),
  vh = () => Er || (_h.then(() => (Er = 0)), (Er = Date.now()));
function bh(e, t) {
  const n = (s) => {
    if (!s._vts) s._vts = Date.now();
    else if (s._vts <= n.attached) return;
    rt(wh(s, n.value), t, 5, [s]);
  };
  return ((n.value = e), (n.attached = vh()), n);
}
function wh(e, t) {
  if (Y(t)) {
    const n = e.stopImmediatePropagation;
    return (
      (e.stopImmediatePropagation = () => {
        (n.call(e), (e._stopped = !0));
      }),
      t.map((s) => (r) => !r._stopped && s && s(r))
    );
  } else return t;
}
const Ni = (e) =>
    e.charCodeAt(0) === 111 &&
    e.charCodeAt(1) === 110 &&
    e.charCodeAt(2) > 96 &&
    e.charCodeAt(2) < 123,
  Eh = (e, t, n, s, r, o) => {
    const i = r === "svg";
    t === "class"
      ? uh(e, s, i)
      : t === "style"
        ? hh(e, n, s)
        : Zn(t)
          ? po(t) || mh(e, t, n, s, o)
          : (
                t[0] === "."
                  ? ((t = t.slice(1)), !0)
                  : t[0] === "^"
                    ? ((t = t.slice(1)), !1)
                    : Sh(e, t, s, i)
              )
            ? (xi(e, t, s),
              !e.tagName.includes("-") &&
                (t === "value" || t === "checked" || t === "selected") &&
                ki(e, t, s, i, o, t !== "value"))
            : e._isVueCE && (/[A-Z]/.test(t) || !me(s))
              ? xi(e, Je(t), s, o, t)
              : (t === "true-value"
                  ? (e._trueValue = s)
                  : t === "false-value" && (e._falseValue = s),
                ki(e, t, s, i));
  };
function Sh(e, t, n, s) {
  if (s)
    return !!(
      t === "innerHTML" ||
      t === "textContent" ||
      (t in e && Ni(t) && X(n))
    );
  if (
    t === "spellcheck" ||
    t === "draggable" ||
    t === "translate" ||
    t === "autocorrect" ||
    (t === "sandbox" && e.tagName === "IFRAME") ||
    t === "form" ||
    (t === "list" && e.tagName === "INPUT") ||
    (t === "type" && e.tagName === "TEXTAREA")
  )
    return !1;
  if (t === "width" || t === "height") {
    const r = e.tagName;
    if (r === "IMG" || r === "VIDEO" || r === "CANVAS" || r === "SOURCE")
      return !1;
  }
  return Ni(t) && me(n) ? !1 : t in e;
}
const Za = new WeakMap(),
  ec = new WeakMap(),
  Fs = Symbol("_moveCb"),
  Mi = Symbol("_enterCb"),
  Th = (e) => (delete e.props.mode, e),
  Rh = Th({
    name: "TransitionGroup",
    props: Se({}, za, { tag: String, moveClass: String }),
    setup(e, { slots: t }) {
      const n = gt(),
        s = ia();
      let r, o;
      return (
        Oo(() => {
          if (!r.length) return;
          const i = e.moveClass || `${e.name || "v"}-move`;
          if (!xh(r[0].el, n.vnode.el, i)) {
            r = [];
            return;
          }
          (r.forEach(Ch), r.forEach(Ah));
          const l = r.filter(kh);
          (zr(n.vnode.el),
            l.forEach((c) => {
              const u = c.el,
                a = u.style;
              (at(u, i),
                (a.transform = a.webkitTransform = a.transitionDuration = ""));
              const f = (u[Fs] = (h) => {
                (h && h.target !== u) ||
                  ((!h || h.propertyName.endsWith("transform")) &&
                    (u.removeEventListener("transitionend", f),
                    (u[Fs] = null),
                    Nt(u, i)));
              });
              u.addEventListener("transitionend", f);
            }),
            (r = []));
        }),
        () => {
          const i = ne(e),
            l = Ya(i);
          let c = i.tag || Ee;
          if (((r = []), o))
            for (let u = 0; u < o.length; u++) {
              const a = o[u];
              a.el &&
                a.el instanceof Element &&
                (r.push(a),
                Vt(a, Jn(a, l, s, n)),
                Za.set(a, { left: a.el.offsetLeft, top: a.el.offsetTop }));
            }
          o = t.default ? xo(t.default()) : [];
          for (let u = 0; u < o.length; u++) {
            const a = o[u];
            a.key != null && Vt(a, Jn(a, l, s, n));
          }
          return ge(c, null, o);
        }
      );
    }
  }),
  Fy = Rh;
function Ch(e) {
  const t = e.el;
  (t[Fs] && t[Fs](), t[Mi] && t[Mi]());
}
function Ah(e) {
  ec.set(e, { left: e.el.offsetLeft, top: e.el.offsetTop });
}
function kh(e) {
  const t = Za.get(e),
    n = ec.get(e),
    s = t.left - n.left,
    r = t.top - n.top;
  if (s || r) {
    const o = e.el.style;
    return (
      (o.transform = o.webkitTransform = `translate(${s}px,${r}px)`),
      (o.transitionDuration = "0s"),
      e
    );
  }
}
function xh(e, t, n) {
  const s = e.cloneNode(),
    r = e[An];
  (r &&
    r.forEach((l) => {
      l.split(/\s+/).forEach((c) => c && s.classList.remove(c));
    }),
    n.split(/\s+/).forEach((l) => l && s.classList.add(l)),
    (s.style.display = "none"));
  const o = t.nodeType === 1 ? t : t.parentNode;
  o.appendChild(s);
  const { hasTransform: i } = Ja(s);
  return (o.removeChild(s), i);
}
const Ph = ["ctrl", "shift", "alt", "meta"],
  Oh = {
    stop: (e) => e.stopPropagation(),
    prevent: (e) => e.preventDefault(),
    self: (e) => e.target !== e.currentTarget,
    ctrl: (e) => !e.ctrlKey,
    shift: (e) => !e.shiftKey,
    alt: (e) => !e.altKey,
    meta: (e) => !e.metaKey,
    left: (e) => "button" in e && e.button !== 0,
    middle: (e) => "button" in e && e.button !== 1,
    right: (e) => "button" in e && e.button !== 2,
    exact: (e, t) => Ph.some((n) => e[`${n}Key`] && !t.includes(n))
  },
  $y = (e, t) => {
    const n = e._withMods || (e._withMods = {}),
      s = t.join(".");
    return (
      n[s] ||
      (n[s] = (r, ...o) => {
        for (let i = 0; i < t.length; i++) {
          const l = Oh[t[i]];
          if (l && l(r, t)) return;
        }
        return e(r, ...o);
      })
    );
  },
  tc = Se({ patchProp: Eh }, oh);
let Vn,
  Li = !1;
function Nh() {
  return Vn || (Vn = If(tc));
}
function Mh() {
  return ((Vn = Li ? Vn : Hf(tc)), (Li = !0), Vn);
}
const Lh = (...e) => {
    const t = Nh().createApp(...e),
      { mount: n } = t;
    return (
      (t.mount = (s) => {
        const r = sc(s);
        if (!r) return;
        const o = t._component;
        (!X(o) && !o.render && !o.template && (o.template = r.innerHTML),
          r.nodeType === 1 && (r.textContent = ""));
        const i = n(r, !1, nc(r));
        return (
          r instanceof Element &&
            (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")),
          i
        );
      }),
      t
    );
  },
  Ih = (...e) => {
    const t = Mh().createApp(...e),
      { mount: n } = t;
    return (
      (t.mount = (s) => {
        const r = sc(s);
        if (r) return n(r, !0, nc(r));
      }),
      t
    );
  };
function nc(e) {
  if (e instanceof SVGElement) return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function sc(e) {
  return me(e) ? document.querySelector(e) : e;
}
const Hh =
    /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/,
  Dh =
    /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/,
  jh = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function Fh(e, t) {
  if (
    e === "__proto__" ||
    (e === "constructor" && t && typeof t == "object" && "prototype" in t)
  ) {
    $h(e);
    return;
  }
  return t;
}
function $h(e) {
  console.warn(`[destr] Dropping "${e}" key to prevent prototype pollution.`);
}
function $s(e, t = {}) {
  if (typeof e != "string") return e;
  if (e[0] === '"' && e[e.length - 1] === '"' && e.indexOf("\\") === -1)
    return e.slice(1, -1);
  const n = e.trim();
  if (n.length <= 9)
    switch (n.toLowerCase()) {
      case "true":
        return !0;
      case "false":
        return !1;
      case "undefined":
        return;
      case "null":
        return null;
      case "nan":
        return Number.NaN;
      case "infinity":
        return Number.POSITIVE_INFINITY;
      case "-infinity":
        return Number.NEGATIVE_INFINITY;
    }
  if (!jh.test(e)) {
    if (t.strict) throw new SyntaxError("[destr] Invalid JSON");
    return e;
  }
  try {
    if (Hh.test(e) || Dh.test(e)) {
      if (t.strict) throw new Error("[destr] Possible prototype pollution");
      return JSON.parse(e, Fh);
    }
    return JSON.parse(e);
  } catch (s) {
    if (t.strict) throw s;
    return e;
  }
}
const Bh = /#/g,
  Uh = /&/g,
  Wh = /\//g,
  Vh = /=/g,
  Fo = /\+/g,
  Kh = /%5e/gi,
  Gh = /%60/gi,
  qh = /%7c/gi,
  zh = /%20/gi;
function Yh(e) {
  return encodeURI("" + e).replace(qh, "|");
}
function Jr(e) {
  return Yh(typeof e == "string" ? e : JSON.stringify(e))
    .replace(Fo, "%2B")
    .replace(zh, "+")
    .replace(Bh, "%23")
    .replace(Uh, "%26")
    .replace(Gh, "`")
    .replace(Kh, "^")
    .replace(Wh, "%2F");
}
function Sr(e) {
  return Jr(e).replace(Vh, "%3D");
}
function Bs(e = "") {
  try {
    return decodeURIComponent("" + e);
  } catch {
    return "" + e;
  }
}
function Jh(e) {
  return Bs(e.replace(Fo, " "));
}
function Xh(e) {
  return Bs(e.replace(Fo, " "));
}
function rc(e = "") {
  const t = Object.create(null);
  e[0] === "?" && (e = e.slice(1));
  for (const n of e.split("&")) {
    const s = n.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) continue;
    const r = Jh(s[1]);
    if (r === "__proto__" || r === "constructor") continue;
    const o = Xh(s[2] || "");
    t[r] === void 0
      ? (t[r] = o)
      : Array.isArray(t[r])
        ? t[r].push(o)
        : (t[r] = [t[r], o]);
  }
  return t;
}
function Qh(e, t) {
  return (
    (typeof t == "number" || typeof t == "boolean") && (t = String(t)),
    t
      ? Array.isArray(t)
        ? t.map((n) => `${Sr(e)}=${Jr(n)}`).join("&")
        : `${Sr(e)}=${Jr(t)}`
      : Sr(e)
  );
}
function Zh(e) {
  return Object.keys(e)
    .filter((t) => e[t] !== void 0)
    .map((t) => Qh(t, e[t]))
    .filter(Boolean)
    .join("&");
}
const ed = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/,
  td = /^[\s\w\0+.-]{2,}:([/\\]{2})?/,
  nd = /^([/\\]\s*){2,}[^/\\]/,
  sd = /^[\s\0]*(blob|data|javascript|vbscript):$/i,
  rd = /\/$|\/\?|\/#/,
  od = /^\.?\//;
function ln(e, t = {}) {
  return (
    typeof t == "boolean" && (t = { acceptRelative: t }),
    t.strict ? ed.test(e) : td.test(e) || (t.acceptRelative ? nd.test(e) : !1)
  );
}
function id(e) {
  return !!e && sd.test(e);
}
function Xr(e = "", t) {
  return t ? rd.test(e) : e.endsWith("/");
}
function Us(e = "", t) {
  if (!t) return (Xr(e) ? e.slice(0, -1) : e) || "/";
  if (!Xr(e, !0)) return e || "/";
  let n = e,
    s = "";
  const r = e.indexOf("#");
  r !== -1 && ((n = e.slice(0, r)), (s = e.slice(r)));
  const [o, ...i] = n.split("?");
  return (
    ((o.endsWith("/") ? o.slice(0, -1) : o) || "/") +
    (i.length > 0 ? `?${i.join("?")}` : "") +
    s
  );
}
function ld(e = "", t) {
  if (!t) return e.endsWith("/") ? e : e + "/";
  if (Xr(e, !0)) return e || "/";
  let n = e,
    s = "";
  const r = e.indexOf("#");
  if (r !== -1 && ((n = e.slice(0, r)), (s = e.slice(r)), !n)) return s;
  const [o, ...i] = n.split("?");
  return o + "/" + (i.length > 0 ? `?${i.join("?")}` : "") + s;
}
function ad(e, t) {
  if (ic(t) || ln(e)) return e;
  const n = Us(t);
  return e.startsWith(n) ? e : $o(n, e);
}
function Ii(e, t) {
  if (ic(t)) return e;
  const n = Us(t);
  if (!e.startsWith(n)) return e;
  const s = e.slice(n.length);
  return s[0] === "/" ? s : "/" + s;
}
function oc(e, t) {
  const n = cc(e),
    s = { ...rc(n.search), ...t };
  return ((n.search = Zh(s)), fd(n));
}
function ic(e) {
  return !e || e === "/";
}
function cd(e) {
  return e && e !== "/";
}
function $o(e, ...t) {
  let n = e || "";
  for (const s of t.filter((r) => cd(r)))
    if (n) {
      const r = s.replace(od, "");
      n = ld(n) + r;
    } else n = s;
  return n;
}
function lc(...e) {
  const t = /\/(?!\/)/,
    n = e.filter(Boolean),
    s = [];
  let r = 0;
  for (const i of n)
    if (!(!i || i === "/")) {
      for (const [l, c] of i.split(t).entries())
        if (!(!c || c === ".")) {
          if (c === "..") {
            if (s.length === 1 && ln(s[0])) continue;
            (s.pop(), r--);
            continue;
          }
          if (l === 1 && s[s.length - 1]?.endsWith(":/")) {
            s[s.length - 1] += "/" + c;
            continue;
          }
          (s.push(c), r++);
        }
    }
  let o = s.join("/");
  return (
    r >= 0
      ? n[0]?.startsWith("/") && !o.startsWith("/")
        ? (o = "/" + o)
        : n[0]?.startsWith("./") && !o.startsWith("./") && (o = "./" + o)
      : (o = "../".repeat(-1 * r) + o),
    n[n.length - 1]?.endsWith("/") && !o.endsWith("/") && (o += "/"),
    o
  );
}
function ud(e, t) {
  return Bs(Us(e)) === Bs(Us(t));
}
const ac = Symbol.for("ufo:protocolRelative");
function cc(e = "", t) {
  const n = e.match(/^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i);
  if (n) {
    const [, f, h = ""] = n;
    return {
      protocol: f.toLowerCase(),
      pathname: h,
      href: f + h,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!ln(e, { acceptRelative: !0 })) return Hi(e);
  const [, s = "", r, o = ""] =
    e.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) ||
    [];
  let [, i = "", l = ""] = o.match(/([^#/?]*)(.*)?/) || [];
  s === "file:" && (l = l.replace(/\/(?=[A-Za-z]:)/, ""));
  const { pathname: c, search: u, hash: a } = Hi(l);
  return {
    protocol: s.toLowerCase(),
    auth: r ? r.slice(0, Math.max(0, r.length - 1)) : "",
    host: i,
    pathname: c,
    search: u,
    hash: a,
    [ac]: !s
  };
}
function Hi(e = "") {
  const [t = "", n = "", s = ""] = (
    e.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []
  ).splice(1);
  return { pathname: t, search: n, hash: s };
}
function fd(e) {
  const t = e.pathname || "",
    n = e.search ? (e.search.startsWith("?") ? "" : "?") + e.search : "",
    s = e.hash || "",
    r = e.auth ? e.auth + "@" : "",
    o = e.host || "";
  return (
    (e.protocol || e[ac] ? (e.protocol || "") + "//" : "") + r + o + t + n + s
  );
}
class hd extends Error {
  constructor(t, n) {
    (super(t, n),
      (this.name = "FetchError"),
      n?.cause && !this.cause && (this.cause = n.cause));
  }
}
function dd(e) {
  const t = e.error?.message || e.error?.toString() || "",
    n = e.request?.method || e.options?.method || "GET",
    s = e.request?.url || String(e.request) || "/",
    r = `[${n}] ${JSON.stringify(s)}`,
    o = e.response
      ? `${e.response.status} ${e.response.statusText}`
      : "<no response>",
    i = `${r}: ${o}${t ? ` ${t}` : ""}`,
    l = new hd(i, e.error ? { cause: e.error } : void 0);
  for (const c of ["request", "options", "response"])
    Object.defineProperty(l, c, {
      get() {
        return e[c];
      }
    });
  for (const [c, u] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ])
    Object.defineProperty(l, c, {
      get() {
        return e.response && e.response[u];
      }
    });
  return l;
}
const pd = new Set(Object.freeze(["PATCH", "POST", "PUT", "DELETE"]));
function Di(e = "GET") {
  return pd.has(e.toUpperCase());
}
function gd(e) {
  if (e === void 0) return !1;
  const t = typeof e;
  return t === "string" || t === "number" || t === "boolean" || t === null
    ? !0
    : t !== "object"
      ? !1
      : Array.isArray(e)
        ? !0
        : e.buffer || e instanceof FormData || e instanceof URLSearchParams
          ? !1
          : (e.constructor && e.constructor.name === "Object") ||
            typeof e.toJSON == "function";
}
const md = new Set([
    "image/svg",
    "application/xml",
    "application/xhtml",
    "application/html"
  ]),
  yd = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function _d(e = "") {
  if (!e) return "json";
  const t = e.split(";").shift() || "";
  return yd.test(t)
    ? "json"
    : t === "text/event-stream"
      ? "stream"
      : md.has(t) || t.startsWith("text/")
        ? "text"
        : "blob";
}
function vd(e, t, n, s) {
  const r = bd(t?.headers ?? e?.headers, n?.headers, s);
  let o;
  return (
    (n?.query || n?.params || t?.params || t?.query) &&
      (o = { ...n?.params, ...n?.query, ...t?.params, ...t?.query }),
    { ...n, ...t, query: o, params: o, headers: r }
  );
}
function bd(e, t, n) {
  if (!t) return new n(e);
  const s = new n(t);
  if (e)
    for (const [r, o] of Symbol.iterator in e || Array.isArray(e)
      ? e
      : new n(e))
      s.set(r, o);
  return s;
}
async function ms(e, t) {
  if (t)
    if (Array.isArray(t)) for (const n of t) await n(e);
    else await t(e);
}
const wd = new Set([408, 409, 425, 429, 500, 502, 503, 504]),
  Ed = new Set([101, 204, 205, 304]);
function uc(e = {}) {
  const {
    fetch: t = globalThis.fetch,
    Headers: n = globalThis.Headers,
    AbortController: s = globalThis.AbortController
  } = e;
  async function r(l) {
    const c =
      (l.error && l.error.name === "AbortError" && !l.options.timeout) || !1;
    if (l.options.retry !== !1 && !c) {
      let a;
      typeof l.options.retry == "number"
        ? (a = l.options.retry)
        : (a = Di(l.options.method) ? 0 : 1);
      const f = (l.response && l.response.status) || 500;
      if (
        a > 0 &&
        (Array.isArray(l.options.retryStatusCodes)
          ? l.options.retryStatusCodes.includes(f)
          : wd.has(f))
      ) {
        const h =
          typeof l.options.retryDelay == "function"
            ? l.options.retryDelay(l)
            : l.options.retryDelay || 0;
        return (
          h > 0 && (await new Promise((d) => setTimeout(d, h))),
          o(l.request, { ...l.options, retry: a - 1 })
        );
      }
    }
    const u = dd(l);
    throw (Error.captureStackTrace && Error.captureStackTrace(u, o), u);
  }
  const o = async function (c, u = {}) {
      const a = {
        request: c,
        options: vd(c, u, e.defaults, n),
        response: void 0,
        error: void 0
      };
      if (
        (a.options.method &&
          (a.options.method = a.options.method.toUpperCase()),
        a.options.onRequest &&
          (await ms(a, a.options.onRequest),
          a.options.headers instanceof n ||
            (a.options.headers = new n(a.options.headers || {}))),
        typeof a.request == "string" &&
          (a.options.baseURL && (a.request = ad(a.request, a.options.baseURL)),
          a.options.query &&
            ((a.request = oc(a.request, a.options.query)),
            delete a.options.query),
          "query" in a.options && delete a.options.query,
          "params" in a.options && delete a.options.params),
        a.options.body && Di(a.options.method))
      )
        if (gd(a.options.body)) {
          const d = a.options.headers.get("content-type");
          (typeof a.options.body != "string" &&
            (a.options.body =
              d === "application/x-www-form-urlencoded"
                ? new URLSearchParams(a.options.body).toString()
                : JSON.stringify(a.options.body)),
            d || a.options.headers.set("content-type", "application/json"),
            a.options.headers.has("accept") ||
              a.options.headers.set("accept", "application/json"));
        } else
          (("pipeTo" in a.options.body &&
            typeof a.options.body.pipeTo == "function") ||
            typeof a.options.body.pipe == "function") &&
            ("duplex" in a.options || (a.options.duplex = "half"));
      let f;
      if (!a.options.signal && a.options.timeout) {
        const d = new s();
        ((f = setTimeout(() => {
          const y = new Error(
            "[TimeoutError]: The operation was aborted due to timeout"
          );
          ((y.name = "TimeoutError"), (y.code = 23), d.abort(y));
        }, a.options.timeout)),
          (a.options.signal = d.signal));
      }
      try {
        a.response = await t(a.request, a.options);
      } catch (d) {
        return (
          (a.error = d),
          a.options.onRequestError && (await ms(a, a.options.onRequestError)),
          await r(a)
        );
      } finally {
        f && clearTimeout(f);
      }
      if (
        (a.response.body || a.response._bodyInit) &&
        !Ed.has(a.response.status) &&
        a.options.method !== "HEAD"
      ) {
        const d =
          (a.options.parseResponse ? "json" : a.options.responseType) ||
          _d(a.response.headers.get("content-type") || "");
        switch (d) {
          case "json": {
            const y = await a.response.text(),
              v = a.options.parseResponse || $s;
            a.response._data = v(y);
            break;
          }
          case "stream": {
            a.response._data = a.response.body || a.response._bodyInit;
            break;
          }
          default:
            a.response._data = await a.response[d]();
        }
      }
      return (
        a.options.onResponse && (await ms(a, a.options.onResponse)),
        !a.options.ignoreResponseError &&
        a.response.status >= 400 &&
        a.response.status < 600
          ? (a.options.onResponseError &&
              (await ms(a, a.options.onResponseError)),
            await r(a))
          : a.response
      );
    },
    i = async function (c, u) {
      return (await o(c, u))._data;
    };
  return (
    (i.raw = o),
    (i.native = (...l) => t(...l)),
    (i.create = (l = {}, c = {}) =>
      uc({ ...e, ...c, defaults: { ...e.defaults, ...c.defaults, ...l } })),
    i
  );
}
const Ws = (function () {
    if (typeof globalThis < "u") return globalThis;
    if (typeof self < "u") return self;
    if (typeof window < "u") return window;
    if (typeof global < "u") return global;
    throw new Error("unable to locate global object");
  })(),
  Sd = Ws.fetch
    ? (...e) => Ws.fetch(...e)
    : () =>
        Promise.reject(new Error("[ofetch] global.fetch is not supported!")),
  Td = Ws.Headers,
  Rd = Ws.AbortController,
  Cd = uc({ fetch: Sd, Headers: Td, AbortController: Rd }),
  Ad = Cd,
  kd = () => window?.__NUXT__?.config || window?.useNuxtApp?.().payload?.config,
  Bo = () => kd().app,
  xd = () => Bo().baseURL,
  Pd = () => Bo().buildAssetsDir,
  Uo = (...e) => lc(Wo(), Pd(), ...e),
  Wo = (...e) => {
    const t = Bo(),
      n = t.cdnURL || t.baseURL;
    return e.length ? lc(n, ...e) : n;
  };
((globalThis.__buildAssetsURL = Uo), (globalThis.__publicAssetsURL = Wo));
globalThis.$fetch || (globalThis.$fetch = Ad.create({ baseURL: xd() }));
"global" in globalThis || (globalThis.global = globalThis);
function Qr(e, t = {}, n) {
  for (const s in e) {
    const r = e[s],
      o = n ? `${n}:${s}` : s;
    typeof r == "object" && r !== null
      ? Qr(r, t, o)
      : typeof r == "function" && (t[o] = r);
  }
  return t;
}
const Od = { run: (e) => e() },
  Nd = () => Od,
  fc = typeof console.createTask < "u" ? console.createTask : Nd;
function Md(e, t) {
  const n = t.shift(),
    s = fc(n);
  return e.reduce(
    (r, o) => r.then(() => s.run(() => o(...t))),
    Promise.resolve()
  );
}
function Ld(e, t) {
  const n = t.shift(),
    s = fc(n);
  return Promise.all(e.map((r) => s.run(() => r(...t))));
}
function Tr(e, t) {
  for (const n of [...e]) n(t);
}
let Id = class {
  constructor() {
    ((this._hooks = {}),
      (this._before = void 0),
      (this._after = void 0),
      (this._deprecatedMessages = void 0),
      (this._deprecatedHooks = {}),
      (this.hook = this.hook.bind(this)),
      (this.callHook = this.callHook.bind(this)),
      (this.callHookWith = this.callHookWith.bind(this)));
  }
  hook(t, n, s = {}) {
    if (!t || typeof n != "function") return () => {};
    const r = t;
    let o;
    for (; this._deprecatedHooks[t];)
      ((o = this._deprecatedHooks[t]), (t = o.to));
    if (o && !s.allowDeprecated) {
      let i = o.message;
      (i ||
        (i =
          `${r} hook has been deprecated` +
          (o.to ? `, please use ${o.to}` : "")),
        this._deprecatedMessages || (this._deprecatedMessages = new Set()),
        this._deprecatedMessages.has(i) ||
          (console.warn(i), this._deprecatedMessages.add(i)));
    }
    if (!n.name)
      try {
        Object.defineProperty(n, "name", {
          get: () => "_" + t.replace(/\W+/g, "_") + "_hook_cb",
          configurable: !0
        });
      } catch {}
    return (
      (this._hooks[t] = this._hooks[t] || []),
      this._hooks[t].push(n),
      () => {
        n && (this.removeHook(t, n), (n = void 0));
      }
    );
  }
  hookOnce(t, n) {
    let s,
      r = (...o) => (
        typeof s == "function" && s(),
        (s = void 0),
        (r = void 0),
        n(...o)
      );
    return ((s = this.hook(t, r)), s);
  }
  removeHook(t, n) {
    if (this._hooks[t]) {
      const s = this._hooks[t].indexOf(n);
      (s !== -1 && this._hooks[t].splice(s, 1),
        this._hooks[t].length === 0 && delete this._hooks[t]);
    }
  }
  deprecateHook(t, n) {
    this._deprecatedHooks[t] = typeof n == "string" ? { to: n } : n;
    const s = this._hooks[t] || [];
    delete this._hooks[t];
    for (const r of s) this.hook(t, r);
  }
  deprecateHooks(t) {
    Object.assign(this._deprecatedHooks, t);
    for (const n in t) this.deprecateHook(n, t[n]);
  }
  addHooks(t) {
    const n = Qr(t),
      s = Object.keys(n).map((r) => this.hook(r, n[r]));
    return () => {
      for (const r of s.splice(0, s.length)) r();
    };
  }
  removeHooks(t) {
    const n = Qr(t);
    for (const s in n) this.removeHook(s, n[s]);
  }
  removeAllHooks() {
    for (const t in this._hooks) delete this._hooks[t];
  }
  callHook(t, ...n) {
    return (n.unshift(t), this.callHookWith(Md, t, ...n));
  }
  callHookParallel(t, ...n) {
    return (n.unshift(t), this.callHookWith(Ld, t, ...n));
  }
  callHookWith(t, n, ...s) {
    const r =
      this._before || this._after ? { name: n, args: s, context: {} } : void 0;
    this._before && Tr(this._before, r);
    const o = t(n in this._hooks ? [...this._hooks[n]] : [], s);
    return o instanceof Promise
      ? o.finally(() => {
          this._after && r && Tr(this._after, r);
        })
      : (this._after && r && Tr(this._after, r), o);
  }
  beforeEach(t) {
    return (
      (this._before = this._before || []),
      this._before.push(t),
      () => {
        if (this._before !== void 0) {
          const n = this._before.indexOf(t);
          n !== -1 && this._before.splice(n, 1);
        }
      }
    );
  }
  afterEach(t) {
    return (
      (this._after = this._after || []),
      this._after.push(t),
      () => {
        if (this._after !== void 0) {
          const n = this._after.indexOf(t);
          n !== -1 && this._after.splice(n, 1);
        }
      }
    );
  }
};
function Hd() {
  return new Id();
}
function Dd(e = {}) {
  let t,
    n = !1;
  const s = (i) => {
    if (t && t !== i) throw new Error("Context conflict");
  };
  let r;
  if (e.asyncContext) {
    const i = e.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    i
      ? (r = new i())
      : console.warn("[unctx] `AsyncLocalStorage` is not provided.");
  }
  const o = () => {
    if (r) {
      const i = r.getStore();
      if (i !== void 0) return i;
    }
    return t;
  };
  return {
    use: () => {
      const i = o();
      if (i === void 0) throw new Error("Context is not available");
      return i;
    },
    tryUse: () => o(),
    set: (i, l) => {
      (l || s(i), (t = i), (n = !0));
    },
    unset: () => {
      ((t = void 0), (n = !1));
    },
    call: (i, l) => {
      (s(i), (t = i));
      try {
        return r ? r.run(i, l) : l();
      } finally {
        n || (t = void 0);
      }
    },
    async callAsync(i, l) {
      t = i;
      const c = () => {
          t = i;
        },
        u = () => (t === i ? c : void 0);
      Zr.add(u);
      try {
        const a = r ? r.run(i, l) : l();
        return (n || (t = void 0), await a);
      } finally {
        Zr.delete(u);
      }
    }
  };
}
function jd(e = {}) {
  const t = {};
  return {
    get(n, s = {}) {
      return (t[n] || (t[n] = Dd({ ...e, ...s })), t[n]);
    }
  };
}
const Vs =
    typeof globalThis < "u"
      ? globalThis
      : typeof self < "u"
        ? self
        : typeof global < "u"
          ? global
          : typeof window < "u"
            ? window
            : {},
  ji = "__unctx__",
  Fd = Vs[ji] || (Vs[ji] = jd()),
  $d = (e, t = {}) => Fd.get(e, t),
  Fi = "__unctx_async_handlers__",
  Zr = Vs[Fi] || (Vs[Fi] = new Set());
function Sn(e) {
  const t = [];
  for (const r of Zr) {
    const o = r();
    o && t.push(o);
  }
  const n = () => {
    for (const r of t) r();
  };
  let s = e();
  return (
    s &&
      typeof s == "object" &&
      "catch" in s &&
      (s = s.catch((r) => {
        throw (n(), r);
      })),
    [s, n]
  );
}
const Bd = !1,
  $i = !1,
  Ud = !1,
  Bi = { id: "__nuxt-loader" },
  Uy = {
    componentName: "NuxtLink",
    prefetch: !0,
    prefetchOn: { visibility: !0 }
  },
  Wd = "#__nuxt",
  hc = "nuxt-app",
  Ui = 36e5,
  Vd = "vite:preloadError";
function dc(e = hc) {
  return $d(e, { asyncContext: !1 });
}
const Kd = "__nuxt_plugin";
function Gd(e) {
  let t = 0;
  const n = {
    _id: e.id || hc || "nuxt-app",
    _scope: yo(),
    provide: void 0,
    versions: {
      get nuxt() {
        return "4.2.2";
      },
      get vue() {
        return n.vueApp.version;
      }
    },
    payload: ht({
      ...(e.ssrContext?.payload || {}),
      data: ht({}),
      state: Ct({}),
      once: new Set(),
      _errors: ht({})
    }),
    static: { data: {} },
    runWithContext(r) {
      return n._scope.active && !_o() ? n._scope.run(() => Wi(n, r)) : Wi(n, r);
    },
    isHydrating: !0,
    deferHydration() {
      if (!n.isHydrating) return () => {};
      t++;
      let r = !1;
      return () => {
        if (!r && ((r = !0), t--, t === 0))
          return ((n.isHydrating = !1), n.callHook("app:suspense:resolve"));
      };
    },
    _asyncDataPromises: {},
    _asyncData: ht({}),
    _payloadRevivers: {},
    ...e
  };
  {
    const r = window.__NUXT__;
    if (r)
      for (const o in r)
        switch (o) {
          case "data":
          case "state":
          case "_errors":
            Object.assign(n.payload[o], r[o]);
            break;
          default:
            n.payload[o] = r[o];
        }
  }
  ((n.hooks = Hd()),
    (n.hook = n.hooks.hook),
    (n.callHook = n.hooks.callHook),
    (n.provide = (r, o) => {
      const i = "$" + r;
      (ys(n, i, o), ys(n.vueApp.config.globalProperties, i, o));
    }),
    ys(n.vueApp, "$nuxt", n),
    ys(n.vueApp.config.globalProperties, "$nuxt", n));
  {
    (window.addEventListener(Vd, (o) => {
      (n.callHook("app:chunkError", { error: o.payload }),
        o.payload.message.includes("Unable to preload CSS") &&
          o.preventDefault());
    }),
      (window.useNuxtApp ||= _e));
    const r = n.hook("app:error", (...o) => {
      console.error("[nuxt] error caught during app initialization", ...o);
    });
    n.hook("app:mounted", r);
  }
  const s = n.payload.config;
  return (n.provide("config", s), n);
}
function qd(e, t) {
  t.hooks && e.hooks.addHooks(t.hooks);
}
async function zd(e, t) {
  if (typeof t == "function") {
    const { provide: n } = (await e.runWithContext(() => t(e))) || {};
    if (n && typeof n == "object") for (const s in n) e.provide(s, n[s]);
  }
}
async function Yd(e, t) {
  const n = new Set(),
    s = [],
    r = [];
  let o,
    i = 0;
  async function l(c) {
    const u =
      c.dependsOn?.filter((a) => t.some((f) => f._name === a) && !n.has(a)) ??
      [];
    if (u.length > 0) s.push([new Set(u), c]);
    else {
      const a = zd(e, c)
        .then(async () => {
          c._name &&
            (n.add(c._name),
            await Promise.all(
              s.map(async ([f, h]) => {
                f.has(c._name) &&
                  (f.delete(c._name), f.size === 0 && (i++, await l(h)));
              })
            ));
        })
        .catch((f) => {
          if (!c.parallel && !e.payload.error) throw f;
          o ||= f;
        });
      c.parallel ? r.push(a) : await a;
    }
  }
  for (const c of t) qd(e, c);
  for (const c of t) await l(c);
  if ((await Promise.all(r), i))
    for (let c = 0; c < i; c++) await Promise.all(r);
  if (o) throw e.payload.error || o;
}
function Qe(e) {
  if (typeof e == "function") return e;
  const t = e._name || e.name;
  return (
    delete e.name,
    Object.assign(e.setup || (() => {}), e, { [Kd]: !0, _name: t })
  );
}
const Jd = Qe;
function Wi(e, t, n) {
  const s = () => t();
  return (dc(e._id).set(e), e.vueApp.runWithContext(s));
}
function Xd(e) {
  let t;
  return (
    ns() && (t = gt()?.appContext.app.$nuxt),
    (t ||= dc(e).tryUse()),
    t || null
  );
}
function _e(e) {
  const t = Xd(e);
  if (!t) throw new Error("[nuxt] instance unavailable");
  return t;
}
function or(e) {
  return _e().$config;
}
function ys(e, t, n) {
  Object.defineProperty(e, t, { get: () => n });
}
function Qd(e, t) {
  return { ctx: { table: e }, matchAll: (n) => gc(n, e) };
}
function pc(e) {
  const t = {};
  for (const n in e)
    t[n] =
      n === "dynamic"
        ? new Map(Object.entries(e[n]).map(([s, r]) => [s, pc(r)]))
        : new Map(Object.entries(e[n]));
  return t;
}
function Zd(e) {
  return Qd(pc(e));
}
function gc(e, t, n) {
  e.endsWith("/") && (e = e.slice(0, -1) || "/");
  const s = [];
  for (const [o, i] of Vi(t.wildcard))
    (e === o || e.startsWith(o + "/")) && s.push(i);
  for (const [o, i] of Vi(t.dynamic))
    if (e.startsWith(o + "/")) {
      const l = "/" + e.slice(o.length).split("/").splice(2).join("/");
      s.push(...gc(l, i));
    }
  const r = t.static.get(e);
  return (r && s.push(r), s.filter(Boolean));
}
function Vi(e) {
  return [...e.entries()].sort((t, n) => t[0].length - n[0].length);
}
function Rr(e) {
  if (e === null || typeof e != "object") return !1;
  const t = Object.getPrototypeOf(e);
  return (t !== null &&
    t !== Object.prototype &&
    Object.getPrototypeOf(t) !== null) ||
    Symbol.iterator in e
    ? !1
    : Symbol.toStringTag in e
      ? Object.prototype.toString.call(e) === "[object Module]"
      : !0;
}
function eo(e, t, n = ".", s) {
  if (!Rr(t)) return eo(e, {}, n, s);
  const r = Object.assign({}, t);
  for (const o in e) {
    if (o === "__proto__" || o === "constructor") continue;
    const i = e[o];
    i != null &&
      ((s && s(r, o, i, n)) ||
        (Array.isArray(i) && Array.isArray(r[o])
          ? (r[o] = [...i, ...r[o]])
          : Rr(i) && Rr(r[o])
            ? (r[o] = eo(i, r[o], (n ? `${n}.` : "") + o.toString(), s))
            : (r[o] = i)));
  }
  return r;
}
function ep(e) {
  return (...t) => t.reduce((n, s) => eo(n, s, "", e), {});
}
const mc = ep();
function tp(e, t) {
  try {
    return t in e;
  } catch {
    return !1;
  }
}
class Ki extends Error {
  static __h3_error__ = !0;
  statusCode = 500;
  fatal = !1;
  unhandled = !1;
  statusMessage;
  data;
  cause;
  constructor(t, n = {}) {
    (super(t, n), n.cause && !this.cause && (this.cause = n.cause));
  }
  toJSON() {
    const t = { message: this.message, statusCode: to(this.statusCode, 500) };
    return (
      this.statusMessage && (t.statusMessage = yc(this.statusMessage)),
      this.data !== void 0 && (t.data = this.data),
      t
    );
  }
}
function np(e) {
  if (typeof e == "string") return new Ki(e);
  if (sp(e)) return e;
  const t = new Ki(e.message ?? e.statusMessage ?? "", { cause: e.cause || e });
  if (tp(e, "stack"))
    try {
      Object.defineProperty(t, "stack", {
        get() {
          return e.stack;
        }
      });
    } catch {
      try {
        t.stack = e.stack;
      } catch {}
    }
  if (
    (e.data && (t.data = e.data),
    e.statusCode
      ? (t.statusCode = to(e.statusCode, t.statusCode))
      : e.status && (t.statusCode = to(e.status, t.statusCode)),
    e.statusMessage
      ? (t.statusMessage = e.statusMessage)
      : e.statusText && (t.statusMessage = e.statusText),
    t.statusMessage)
  ) {
    const n = t.statusMessage;
    yc(t.statusMessage) !== n &&
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
  }
  return (
    e.fatal !== void 0 && (t.fatal = e.fatal),
    e.unhandled !== void 0 && (t.unhandled = e.unhandled),
    t
  );
}
function sp(e) {
  return e?.constructor?.__h3_error__ === !0;
}
const rp = /[^\u0009\u0020-\u007E]/g;
function yc(e = "") {
  return e.replace(rp, "");
}
function to(e, t = 200) {
  return !e ||
    (typeof e == "string" && (e = Number.parseInt(e, 10)), e < 100 || e > 999)
    ? t
    : e;
}
const _c = Symbol("layout-meta"),
  rn = Symbol("route");
import.meta.url.replace(/\/app\/.*$/, "/");
const Ve = () => _e()?.$router,
  is = () => (ns() ? Re(rn, _e()._route) : _e()._route);
const op = () => {
    try {
      if (_e()._processingMiddleware) return !0;
    } catch {
      return !1;
    }
    return !1;
  },
  ip = (e, t) => {
    e ||= "/";
    const n =
      typeof e == "string" ? e : "path" in e ? lp(e) : Ve().resolve(e).href;
    if (t?.open) {
      const { target: c = "_blank", windowFeatures: u = {} } = t.open,
        a = [];
      for (const [f, h] of Object.entries(u))
        h !== void 0 && a.push(`${f.toLowerCase()}=${h}`);
      return (open(n, c, a.join(", ")), Promise.resolve());
    }
    const s = ln(n, { acceptRelative: !0 }),
      r = t?.external || s;
    if (r) {
      if (!t?.external)
        throw new Error(
          "Navigating to an external URL is not allowed by default. Use `navigateTo(url, { external: true })`."
        );
      const { protocol: c } = new URL(n, window.location.href);
      if (c && id(c))
        throw new Error(`Cannot navigate to a URL with '${c}' protocol.`);
    }
    const o = op();
    if (!r && o) {
      if (t?.replace) {
        if (typeof e == "string") {
          const { pathname: c, search: u, hash: a } = cc(e);
          return {
            path: c,
            ...(u && { query: rc(u) }),
            ...(a && { hash: a }),
            replace: !0
          };
        }
        return { ...e, replace: !0 };
      }
      return e;
    }
    const i = Ve(),
      l = _e();
    return r
      ? (l._scope.stop(),
        t?.replace ? location.replace(n) : (location.href = n),
        o ? (l.isHydrating ? new Promise(() => {}) : !1) : Promise.resolve())
      : t?.replace
        ? i.replace(e)
        : i.push(e);
  };
function lp(e) {
  return oc(e.path || "", e.query || {}) + (e.hash || "");
}
const vc = "__nuxt_error",
  ir = () => Ql(_e().payload, "error"),
  Xt = (e) => {
    const t = nn(e);
    try {
      const n = ir();
      (_e().hooks.callHook("app:error", t), (n.value ||= t));
    } catch {
      throw t;
    }
    return t;
  },
  ap = async (e = {}) => {
    const t = _e(),
      n = ir();
    (t.callHook("app:error:cleared", e),
      e.redirect && (await Ve().replace(e.redirect)),
      (n.value = void 0));
  },
  bc = (e) => !!e && typeof e == "object" && vc in e,
  nn = (e) => {
    const t = np(e);
    return (
      Object.defineProperty(t, vc, {
        value: !0,
        configurable: !1,
        writable: !1
      }),
      t
    );
  };
let wc;
const ls = (e) => (wc = e),
  Ec = Symbol();
function no(e) {
  return (
    e &&
    typeof e == "object" &&
    Object.prototype.toString.call(e) === "[object Object]" &&
    typeof e.toJSON != "function"
  );
}
var Kn;
(function (e) {
  ((e.direct = "direct"),
    (e.patchObject = "patch object"),
    (e.patchFunction = "patch function"));
})(Kn || (Kn = {}));
function cp() {
  const e = yo(!0),
    t = e.run(() => ze({}));
  let n = [],
    s = [];
  const r = Ro({
    install(o) {
      (ls(r),
        (r._a = o),
        o.provide(Ec, r),
        (o.config.globalProperties.$pinia = r),
        s.forEach((i) => n.push(i)),
        (s = []));
    },
    use(o) {
      return (this._a ? n.push(o) : s.push(o), this);
    },
    _p: n,
    _a: null,
    _e: e,
    _s: new Map(),
    state: t
  });
  return r;
}
const Sc = () => {};
function Gi(e, t, n, s = Sc) {
  e.push(t);
  const r = () => {
    const o = e.indexOf(t);
    o > -1 && (e.splice(o, 1), s());
  };
  return (!n && _o() && gu(r), r);
}
function hn(e, ...t) {
  e.slice().forEach((n) => {
    n(...t);
  });
}
const up = (e) => e(),
  qi = Symbol(),
  Cr = Symbol();
function so(e, t) {
  e instanceof Map && t instanceof Map
    ? t.forEach((n, s) => e.set(s, n))
    : e instanceof Set && t instanceof Set && t.forEach(e.add, e);
  for (const n in t) {
    if (!t.hasOwnProperty(n)) continue;
    const s = t[n],
      r = e[n];
    no(r) && no(s) && e.hasOwnProperty(n) && !he(s) && !dt(s)
      ? (e[n] = so(r, s))
      : (e[n] = s);
  }
  return e;
}
const fp = Symbol();
function hp(e) {
  return !no(e) || !Object.prototype.hasOwnProperty.call(e, fp);
}
const { assign: Mt } = Object;
function dp(e) {
  return !!(he(e) && e.effect);
}
function pp(e, t, n, s) {
  const { state: r, actions: o, getters: i } = t,
    l = n.state.value[e];
  let c;
  function u() {
    l || (n.state.value[e] = r ? r() : {});
    const a = ju(n.state.value[e]);
    return Mt(
      a,
      o,
      Object.keys(i || {}).reduce(
        (f, h) => (
          (f[h] = Ro(
            je(() => {
              ls(n);
              const d = n._s.get(e);
              return i[h].call(d, d);
            })
          )),
          f
        ),
        {}
      )
    );
  }
  return ((c = Tc(e, u, t, n, s, !0)), c);
}
function Tc(e, t, n = {}, s, r, o) {
  let i;
  const l = Mt({ actions: {} }, n),
    c = { deep: !0 };
  let u,
    a,
    f = [],
    h = [],
    d;
  const y = s.state.value[e];
  (!o && !y && (s.state.value[e] = {}), ze({}));
  let v;
  function T(I) {
    let A;
    ((u = a = !1),
      typeof I == "function"
        ? (I(s.state.value[e]),
          (A = { type: Kn.patchFunction, storeId: e, events: d }))
        : (so(s.state.value[e], I),
          (A = { type: Kn.patchObject, payload: I, storeId: e, events: d })));
    const P = (v = Symbol());
    (Wt().then(() => {
      v === P && (u = !0);
    }),
      (a = !0),
      hn(f, A, s.state.value[e]));
  }
  const S = o
    ? function () {
        const { state: A } = n,
          P = A ? A() : {};
        this.$patch((V) => {
          Mt(V, P);
        });
      }
    : Sc;
  function w() {
    (i.stop(), (f = []), (h = []), s._s.delete(e));
  }
  const g = (I, A = "") => {
      if (qi in I) return ((I[Cr] = A), I);
      const P = function () {
        ls(s);
        const V = Array.from(arguments),
          O = [],
          K = [];
        function ee(G) {
          O.push(G);
        }
        function se(G) {
          K.push(G);
        }
        hn(h, { args: V, name: P[Cr], store: b, after: ee, onError: se });
        let B;
        try {
          B = I.apply(this && this.$id === e ? this : b, V);
        } catch (G) {
          throw (hn(K, G), G);
        }
        return B instanceof Promise
          ? B.then((G) => (hn(O, G), G)).catch(
              (G) => (hn(K, G), Promise.reject(G))
            )
          : (hn(O, B), B);
      };
      return ((P[qi] = !0), (P[Cr] = A), P);
    },
    _ = {
      _p: s,
      $id: e,
      $onAction: Gi.bind(null, h),
      $patch: T,
      $reset: S,
      $subscribe(I, A = {}) {
        const P = Gi(f, I, A.detached, () => V()),
          V = i.run(() =>
            Bt(
              () => s.state.value[e],
              (O) => {
                (A.flush === "sync" ? a : u) &&
                  I({ storeId: e, type: Kn.direct, events: d }, O);
              },
              Mt({}, c, A)
            )
          );
        return P;
      },
      $dispose: w
    },
    b = Ct(_);
  s._s.set(e, b);
  const L = ((s._a && s._a.runWithContext) || up)(() =>
    s._e.run(() => (i = yo()).run(() => t({ action: g })))
  );
  for (const I in L) {
    const A = L[I];
    if ((he(A) && !dp(A)) || dt(A))
      o ||
        (y && hp(A) && (he(A) ? (A.value = y[I]) : so(A, y[I])),
        (s.state.value[e][I] = A));
    else if (typeof A == "function") {
      const P = g(A, I);
      ((L[I] = P), (l.actions[I] = A));
    }
  }
  return (
    Mt(b, L),
    Mt(ne(b), L),
    Object.defineProperty(b, "$state", {
      get: () => s.state.value[e],
      set: (I) => {
        T((A) => {
          Mt(A, I);
        });
      }
    }),
    s._p.forEach((I) => {
      Mt(
        b,
        i.run(() => I({ store: b, app: s._a, pinia: s, options: l }))
      );
    }),
    y && o && n.hydrate && n.hydrate(b.$state, y),
    (u = !0),
    (a = !0),
    b
  );
}
function gp(e, t, n) {
  let s;
  const r = typeof t == "function";
  s = r ? n : t;
  function o(i, l) {
    const c = ns();
    return (
      (i = i || (c ? Re(Ec, null) : null)),
      i && ls(i),
      (i = wc),
      i._s.has(e) || (r ? Tc(e, t, s, i) : pp(e, s, i)),
      i._s.get(e)
    );
  }
  return ((o.$id = e), o);
}
function mp(e) {
  const t = _p(e),
    n = new ArrayBuffer(t.length),
    s = new DataView(n);
  for (let r = 0; r < n.byteLength; r++) s.setUint8(r, t.charCodeAt(r));
  return n;
}
const yp = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function _p(e) {
  e.length % 4 === 0 && (e = e.replace(/==?$/, ""));
  let t = "",
    n = 0,
    s = 0;
  for (let r = 0; r < e.length; r++)
    ((n <<= 6),
      (n |= yp.indexOf(e[r])),
      (s += 6),
      s === 24 &&
        ((t += String.fromCharCode((n & 16711680) >> 16)),
        (t += String.fromCharCode((n & 65280) >> 8)),
        (t += String.fromCharCode(n & 255)),
        (n = s = 0)));
  return (
    s === 12
      ? ((n >>= 4), (t += String.fromCharCode(n)))
      : s === 18 &&
        ((n >>= 2),
        (t += String.fromCharCode((n & 65280) >> 8)),
        (t += String.fromCharCode(n & 255))),
    t
  );
}
const vp = -1,
  bp = -2,
  wp = -3,
  Ep = -4,
  Sp = -5,
  Tp = -6;
function Rp(e, t) {
  return Cp(JSON.parse(e), t);
}
function Cp(e, t) {
  if (typeof e == "number") return r(e, !0);
  if (!Array.isArray(e) || e.length === 0) throw new Error("Invalid input");
  const n = e,
    s = Array(n.length);
  function r(o, i = !1) {
    if (o === vp) return;
    if (o === wp) return NaN;
    if (o === Ep) return 1 / 0;
    if (o === Sp) return -1 / 0;
    if (o === Tp) return -0;
    if (i || typeof o != "number") throw new Error("Invalid input");
    if (o in s) return s[o];
    const l = n[o];
    if (!l || typeof l != "object") s[o] = l;
    else if (Array.isArray(l))
      if (typeof l[0] == "string") {
        const c = l[0],
          u = t && Object.hasOwn(t, c) ? t[c] : void 0;
        if (u) {
          let a = l[1];
          return (
            typeof a != "number" && (a = n.push(l[1]) - 1),
            (s[o] = u(r(a)))
          );
        }
        switch (c) {
          case "Date":
            s[o] = new Date(l[1]);
            break;
          case "Set":
            const a = new Set();
            s[o] = a;
            for (let d = 1; d < l.length; d += 1) a.add(r(l[d]));
            break;
          case "Map":
            const f = new Map();
            s[o] = f;
            for (let d = 1; d < l.length; d += 2) f.set(r(l[d]), r(l[d + 1]));
            break;
          case "RegExp":
            s[o] = new RegExp(l[1], l[2]);
            break;
          case "Object":
            s[o] = Object(l[1]);
            break;
          case "BigInt":
            s[o] = BigInt(l[1]);
            break;
          case "null":
            const h = Object.create(null);
            s[o] = h;
            for (let d = 1; d < l.length; d += 2) h[l[d]] = r(l[d + 1]);
            break;
          case "Int8Array":
          case "Uint8Array":
          case "Uint8ClampedArray":
          case "Int16Array":
          case "Uint16Array":
          case "Int32Array":
          case "Uint32Array":
          case "Float32Array":
          case "Float64Array":
          case "BigInt64Array":
          case "BigUint64Array": {
            const d = globalThis[c],
              y = new d(r(l[1]));
            s[o] = l[2] !== void 0 ? y.subarray(l[2], l[3]) : y;
            break;
          }
          case "ArrayBuffer": {
            const d = l[1],
              y = mp(d);
            s[o] = y;
            break;
          }
          case "Temporal.Duration":
          case "Temporal.Instant":
          case "Temporal.PlainDate":
          case "Temporal.PlainTime":
          case "Temporal.PlainDateTime":
          case "Temporal.PlainMonthDay":
          case "Temporal.PlainYearMonth":
          case "Temporal.ZonedDateTime": {
            const d = c.slice(9);
            s[o] = Temporal[d].from(l[1]);
            break;
          }
          case "URL": {
            const d = new URL(l[1]);
            s[o] = d;
            break;
          }
          case "URLSearchParams": {
            const d = new URLSearchParams(l[1]);
            s[o] = d;
            break;
          }
          default:
            throw new Error(`Unknown type ${c}`);
        }
      } else {
        const c = new Array(l.length);
        s[o] = c;
        for (let u = 0; u < l.length; u += 1) {
          const a = l[u];
          a !== bp && (c[u] = r(a));
        }
      }
    else {
      const c = {};
      s[o] = c;
      for (const u in l) {
        if (u === "__proto__")
          throw new Error("Cannot parse an object with a `__proto__` property");
        const a = l[u];
        c[u] = r(a);
      }
    }
    return s[o];
  }
  return r(0);
}
const Ap = new Set(["link", "style", "script", "noscript"]),
  kp = new Set(["title", "titleTemplate", "script", "style", "noscript"]),
  zi = new Set(["base", "meta", "link", "style", "script", "noscript"]),
  xp = new Set([
    "title",
    "base",
    "htmlAttrs",
    "bodyAttrs",
    "meta",
    "link",
    "style",
    "script",
    "noscript"
  ]),
  Pp = new Set([
    "base",
    "title",
    "titleTemplate",
    "bodyAttrs",
    "htmlAttrs",
    "templateParams"
  ]),
  Op = new Set([
    "key",
    "tagPosition",
    "tagPriority",
    "tagDuplicateStrategy",
    "innerHTML",
    "textContent",
    "processTemplateParams"
  ]),
  Np = new Set(["templateParams", "htmlAttrs", "bodyAttrs"]),
  Mp = new Set([
    "theme-color",
    "google-site-verification",
    "og",
    "article",
    "book",
    "profile",
    "twitter",
    "author"
  ]);
function ro(e, t = {}, n) {
  for (const s in e) {
    const r = e[s],
      o = n ? `${n}:${s}` : s;
    typeof r == "object" && r !== null
      ? ro(r, t, o)
      : typeof r == "function" && (t[o] = r);
  }
  return t;
}
const Rc = (() => {
  if (console.createTask) return console.createTask;
  const e = { run: (t) => t() };
  return () => e;
})();
function Cc(e, t, n, s) {
  for (let r = n; r < e.length; r += 1)
    try {
      const o = s ? s.run(() => e[r](...t)) : e[r](...t);
      if (o instanceof Promise) return o.then(() => Cc(e, t, r + 1, s));
    } catch (o) {
      return Promise.reject(o);
    }
}
function Lp(e, t, n) {
  if (e.length > 0) return Cc(e, t, 0, Rc(n));
}
function Ip(e, t, n) {
  if (e.length > 0) {
    const s = Rc(n);
    return Promise.all(e.map((r) => s.run(() => r(...t))));
  }
}
function Ar(e, t) {
  for (const n of [...e]) n(t);
}
var Hp = class {
  _hooks;
  _before;
  _after;
  _deprecatedHooks;
  _deprecatedMessages;
  constructor() {
    ((this._hooks = {}),
      (this._before = void 0),
      (this._after = void 0),
      (this._deprecatedMessages = void 0),
      (this._deprecatedHooks = {}),
      (this.hook = this.hook.bind(this)),
      (this.callHook = this.callHook.bind(this)),
      (this.callHookWith = this.callHookWith.bind(this)));
  }
  hook(e, t, n = {}) {
    if (!e || typeof t != "function") return () => {};
    const s = e;
    let r;
    for (; this._deprecatedHooks[e];)
      ((r = this._deprecatedHooks[e]), (e = r.to));
    if (r && !n.allowDeprecated) {
      let o = r.message;
      (o ||
        (o =
          `${s} hook has been deprecated` +
          (r.to ? `, please use ${r.to}` : "")),
        this._deprecatedMessages || (this._deprecatedMessages = new Set()),
        this._deprecatedMessages.has(o) ||
          (console.warn(o), this._deprecatedMessages.add(o)));
    }
    if (!t.name)
      try {
        Object.defineProperty(t, "name", {
          get: () => "_" + e.replace(/\W+/g, "_") + "_hook_cb",
          configurable: !0
        });
      } catch {}
    return (
      (this._hooks[e] = this._hooks[e] || []),
      this._hooks[e].push(t),
      () => {
        t && (this.removeHook(e, t), (t = void 0));
      }
    );
  }
  hookOnce(e, t) {
    let n,
      s = (...r) => (
        typeof n == "function" && n(),
        (n = void 0),
        (s = void 0),
        t(...r)
      );
    return ((n = this.hook(e, s)), n);
  }
  removeHook(e, t) {
    const n = this._hooks[e];
    if (n) {
      const s = n.indexOf(t);
      (s !== -1 && n.splice(s, 1), n.length === 0 && (this._hooks[e] = void 0));
    }
  }
  deprecateHook(e, t) {
    this._deprecatedHooks[e] = typeof t == "string" ? { to: t } : t;
    const n = this._hooks[e] || [];
    this._hooks[e] = void 0;
    for (const s of n) this.hook(e, s);
  }
  deprecateHooks(e) {
    for (const t in e) this.deprecateHook(t, e[t]);
  }
  addHooks(e) {
    const t = ro(e),
      n = Object.keys(t).map((s) => this.hook(s, t[s]));
    return () => {
      for (const s of n) s();
      n.length = 0;
    };
  }
  removeHooks(e) {
    const t = ro(e);
    for (const n in t) this.removeHook(n, t[n]);
  }
  removeAllHooks() {
    this._hooks = {};
  }
  callHook(e, ...t) {
    return this.callHookWith(Lp, e, t);
  }
  callHookParallel(e, ...t) {
    return this.callHookWith(Ip, e, t);
  }
  callHookWith(e, t, n) {
    const s =
      this._before || this._after ? { name: t, args: n, context: {} } : void 0;
    this._before && Ar(this._before, s);
    const r = e(this._hooks[t] ? [...this._hooks[t]] : [], n, t);
    return r instanceof Promise
      ? r.finally(() => {
          this._after && s && Ar(this._after, s);
        })
      : (this._after && s && Ar(this._after, s), r);
  }
  beforeEach(e) {
    return (
      (this._before = this._before || []),
      this._before.push(e),
      () => {
        if (this._before !== void 0) {
          const t = this._before.indexOf(e);
          t !== -1 && this._before.splice(t, 1);
        }
      }
    );
  }
  afterEach(e) {
    return (
      (this._after = this._after || []),
      this._after.push(e),
      () => {
        if (this._after !== void 0) {
          const t = this._after.indexOf(e);
          t !== -1 && this._after.splice(t, 1);
        }
      }
    );
  }
};
function Dp() {
  return new Hp();
}
const jp = ["name", "property", "http-equiv"],
  Fp = new Set(["viewport", "description", "keywords", "robots"]);
function Ac(e) {
  const t = e.split(":");
  return t.length ? Mp.has(t[1]) : !1;
}
function oo(e) {
  const { props: t, tag: n } = e;
  if (Pp.has(n)) return n;
  if (n === "link" && t.rel === "canonical") return "canonical";
  if (t.charset) return "charset";
  if (e.tag === "meta") {
    for (const s of jp)
      if (t[s] !== void 0) {
        const r = t[s],
          o = r && typeof r == "string" && r.includes(":"),
          i = r && Fp.has(r),
          c = !(o || i) && e.key ? `:key:${e.key}` : "";
        return `${n}:${r}${c}`;
      }
  }
  if (e.key) return `${n}:key:${e.key}`;
  if (t.id) return `${n}:id:${t.id}`;
  if (kp.has(n)) {
    const s = e.textContent || e.innerHTML;
    if (s) return `${n}:content:${s}`;
  }
}
function Yi(e) {
  const t = e._h || e._d;
  if (t) return t;
  const n = e.textContent || e.innerHTML;
  return (
    n ||
    `${e.tag}:${Object.entries(e.props)
      .map(([s, r]) => `${s}:${String(r)}`)
      .join(",")}`
  );
}
function Ks(e, t, n) {
  typeof e === "function" &&
    (!n || (n !== "titleTemplate" && !(n[0] === "o" && n[1] === "n"))) &&
    (e = e());
  const r = t ? t(n, e) : e;
  if (Array.isArray(r)) return r.map((o) => Ks(o, t));
  if (r?.constructor === Object) {
    const o = {};
    for (const i of Object.keys(r)) o[i] = Ks(r[i], t, i);
    return o;
  }
  return r;
}
function $p(e, t) {
  const n = e === "style" ? new Map() : new Set();
  function s(r) {
    if (r == null || r === void 0) return;
    const o = String(r).trim();
    if (o)
      if (e === "style") {
        const [i, ...l] = o.split(":").map((c) => (c ? c.trim() : ""));
        i && l.length && n.set(i, l.join(":"));
      } else
        o.split(" ")
          .filter(Boolean)
          .forEach((i) => n.add(i));
  }
  return (
    typeof t == "string"
      ? e === "style"
        ? t.split(";").forEach(s)
        : s(t)
      : Array.isArray(t)
        ? t.forEach((r) => s(r))
        : t &&
          typeof t == "object" &&
          Object.entries(t).forEach(([r, o]) => {
            o &&
              o !== "false" &&
              (e === "style" ? n.set(String(r).trim(), String(o)) : s(r));
          }),
    n
  );
}
function kc(e, t) {
  return (
    (e.props = e.props || {}),
    t
      ? e.tag === "templateParams"
        ? ((e.props = t), e)
        : (Object.entries(t).forEach(([n, s]) => {
            if (s === null) {
              e.props[n] = null;
              return;
            }
            if (n === "class" || n === "style") {
              e.props[n] = $p(n, s);
              return;
            }
            if (Op.has(n)) {
              if (
                ["textContent", "innerHTML"].includes(n) &&
                typeof s == "object"
              ) {
                let l = t.type;
                if (
                  (t.type || (l = "application/json"),
                  !l?.endsWith("json") && l !== "speculationrules")
                )
                  return;
                ((t.type = l), (e.props.type = l), (e[n] = JSON.stringify(s)));
              } else e[n] = s;
              return;
            }
            const r = String(s),
              o = n.startsWith("data-"),
              i = e.tag === "meta" && n === "content";
            r === "true" || r === ""
              ? (e.props[n] = o || i ? r : !0)
              : !s && o && r === "false"
                ? (e.props[n] = "false")
                : s !== void 0 && (e.props[n] = s);
          }),
          e)
      : e
  );
}
function Bp(e, t) {
  const n =
      typeof t == "object" && typeof t != "function"
        ? t
        : {
            [e === "script" || e === "noscript" || e === "style"
              ? "innerHTML"
              : "textContent"]: t
          },
    s = kc({ tag: e, props: {} }, n);
  return (
    s.key && Ap.has(s.tag) && (s.props["data-hid"] = s._h = s.key),
    s.tag === "script" &&
      typeof s.innerHTML == "object" &&
      ((s.innerHTML = JSON.stringify(s.innerHTML)),
      (s.props.type = s.props.type || "application/json")),
    Array.isArray(s.props.content)
      ? s.props.content.map((r) => ({
          ...s,
          props: { ...s.props, content: r }
        }))
      : s
  );
}
function Up(e, t) {
  if (!e) return [];
  typeof e == "function" && (e = e());
  const n = (r, o) => {
    for (let i = 0; i < t.length; i++) o = t[i](r, o);
    return o;
  };
  e = n(void 0, e);
  const s = [];
  return (
    (e = Ks(e, n)),
    Object.entries(e || {}).forEach(([r, o]) => {
      if (o !== void 0)
        for (const i of Array.isArray(o) ? o : [o]) s.push(Bp(r, i));
    }),
    s.flat()
  );
}
const Ji = (e, t) => (e._w === t._w ? e._p - t._p : e._w - t._w),
  Xi = { base: -10, title: 10 },
  Wp = { critical: -8, high: -1, low: 2 },
  Qi = {
    meta: { "content-security-policy": -30, charset: -20, viewport: -15 },
    link: {
      preconnect: 20,
      stylesheet: 60,
      preload: 70,
      modulepreload: 70,
      prefetch: 90,
      "dns-prefetch": 90,
      prerender: 90
    },
    script: { async: 30, defer: 80, sync: 50 },
    style: { imported: 40, sync: 60 }
  },
  Vp = /@import/,
  In = (e) => e === "" || e === !0;
function Kp(e, t) {
  if (typeof t.tagPriority == "number") return t.tagPriority;
  let n = 100;
  const s = Wp[t.tagPriority] || 0,
    r = e.resolvedOptions.disableCapoSorting
      ? { link: {}, script: {}, style: {} }
      : Qi;
  if (t.tag in Xi) n = Xi[t.tag];
  else if (t.tag === "meta") {
    const o =
      t.props["http-equiv"] === "content-security-policy"
        ? "content-security-policy"
        : t.props.charset
          ? "charset"
          : t.props.name === "viewport"
            ? "viewport"
            : null;
    o && (n = Qi.meta[o]);
  } else if (t.tag === "link" && t.props.rel) n = r.link[t.props.rel];
  else if (t.tag === "script") {
    const o = String(t.props.type);
    In(t.props.async)
      ? (n = r.script.async)
      : (t.props.src &&
            !In(t.props.defer) &&
            !In(t.props.async) &&
            o !== "module" &&
            !o.endsWith("json")) ||
          (t.innerHTML && !o.endsWith("json"))
        ? (n = r.script.sync)
        : ((In(t.props.defer) && t.props.src && !In(t.props.async)) ||
            o === "module") &&
          (n = r.script.defer);
  } else
    t.tag === "style" &&
      (n =
        t.innerHTML && Vp.test(t.innerHTML) ? r.style.imported : r.style.sync);
  return (n || 100) + s;
}
function Zi(e, t) {
  const n = typeof t == "function" ? t(e) : t,
    s = n.key || String(e.plugins.size + 1);
  e.plugins.get(s) || (e.plugins.set(s, n), e.hooks.addHooks(n.hooks || {}));
}
function Gp(e = {}) {
  const t = Dp();
  t.addHooks(e.hooks || {});
  const n = !e.document,
    s = new Map(),
    r = new Map(),
    o = new Set(),
    i = {
      _entryCount: 1,
      plugins: r,
      dirty: !1,
      resolvedOptions: e,
      hooks: t,
      ssr: n,
      entries: s,
      headEntries() {
        return [...s.values()];
      },
      use: (l) => Zi(i, l),
      push(l, c) {
        const u = { ...(c || {}) };
        delete u.head;
        const a = u._index ?? i._entryCount++,
          f = { _i: a, input: l, options: u },
          h = {
            _poll(d = !1) {
              ((i.dirty = !0),
                !d && o.add(a),
                t.callHook("entries:updated", i));
            },
            dispose() {
              s.delete(a) && i.invalidate();
            },
            patch(d) {
              (!u.mode ||
                (u.mode === "server" && n) ||
                (u.mode === "client" && !n)) &&
                ((f.input = d), s.set(a, f), h._poll());
            }
          };
        return (h.patch(l), h);
      },
      async resolveTags() {
        const l = {
          tagMap: new Map(),
          tags: [],
          entries: [...i.entries.values()]
        };
        for (await t.callHook("entries:resolve", l); o.size;) {
          const h = o.values().next().value;
          o.delete(h);
          const d = s.get(h);
          if (d) {
            const y = {
              tags: Up(d.input, e.propResolvers || []).map((v) =>
                Object.assign(v, d.options)
              ),
              entry: d
            };
            (await t.callHook("entries:normalize", y),
              (d._tags = y.tags.map(
                (v, T) => (
                  (v._w = Kp(i, v)),
                  (v._p = (d._i << 10) + T),
                  (v._d = oo(v)),
                  v
                )
              )));
          }
        }
        let c = !1;
        l.entries
          .flatMap((h) =>
            (h._tags || []).map((d) => ({ ...d, props: { ...d.props } }))
          )
          .sort(Ji)
          .reduce((h, d) => {
            const y = String(d._d || d._p);
            if (!h.has(y)) return h.set(y, d);
            const v = h.get(y);
            if (
              (d?.tagDuplicateStrategy ||
                (Np.has(d.tag) ? "merge" : null) ||
                (d.key && d.key === v.key ? "merge" : null)) === "merge"
            ) {
              const S = { ...v.props };
              (Object.entries(d.props).forEach(
                ([w, g]) =>
                  (S[w] =
                    w === "style"
                      ? new Map([...(v.props.style || new Map()), ...g])
                      : w === "class"
                        ? new Set([...(v.props.class || new Set()), ...g])
                        : g)
              ),
                h.set(y, { ...d, props: S }));
            } else
              d._p >> 10 === v._p >> 10 && d.tag === "meta" && Ac(y)
                ? (h.set(
                    y,
                    Object.assign([...(Array.isArray(v) ? v : [v]), d], d)
                  ),
                  (c = !0))
                : (d._w === v._w ? d._p > v._p : d?._w < v?._w) && h.set(y, d);
            return h;
          }, l.tagMap);
        const u = l.tagMap.get("title"),
          a = l.tagMap.get("titleTemplate");
        if (((i._title = u?.textContent), a)) {
          const h = a?.textContent;
          if (((i._titleTemplate = h), h)) {
            let d = typeof h == "function" ? h(u?.textContent) : h;
            (typeof d == "string" &&
              !i.plugins.has("template-params") &&
              (d = d.replace("%s", u?.textContent || "")),
              u
                ? d === null
                  ? l.tagMap.delete("title")
                  : l.tagMap.set("title", { ...u, textContent: d })
                : ((a.tag = "title"), (a.textContent = d)));
          }
        }
        ((l.tags = Array.from(l.tagMap.values())),
          c && (l.tags = l.tags.flat().sort(Ji)),
          await t.callHook("tags:beforeResolve", l),
          await t.callHook("tags:resolve", l),
          await t.callHook("tags:afterResolve", l));
        const f = [];
        for (const h of l.tags) {
          const { innerHTML: d, tag: y, props: v } = h;
          if (
            xp.has(y) &&
            !(Object.keys(v).length === 0 && !h.innerHTML && !h.textContent) &&
            !(y === "meta" && !v.content && !v["http-equiv"] && !v.charset)
          ) {
            if (y === "script" && d) {
              if (String(v.type).endsWith("json")) {
                const T = typeof d == "string" ? d : JSON.stringify(d);
                h.innerHTML = T.replace(/</g, "\\u003C");
              } else
                typeof d == "string" &&
                  (h.innerHTML = d.replace(
                    new RegExp(`</${y}`, "g"),
                    `<\\/${y}`
                  ));
              h._d = oo(h);
            }
            f.push(h);
          }
        }
        return f;
      },
      invalidate() {
        for (const l of s.values()) o.add(l._i);
        ((i.dirty = !0), t.callHook("entries:updated", i));
      }
    };
  return (
    (e?.plugins || []).forEach((l) => Zi(i, l)),
    i.hooks.callHook("init", i),
    e.init?.forEach((l) => l && i.push(l)),
    i
  );
}
const qp = (e, t) => (he(t) ? Hu(t) : t),
  Vo = "usehead";
function zp(e) {
  return {
    install(n) {
      ((n.config.globalProperties.$unhead = e),
        (n.config.globalProperties.$head = e),
        n.provide(Vo, e));
    }
  }.install;
}
function Yp() {
  if (ns()) {
    const e = Re(Vo);
    if (!e)
      throw new Error(
        "useHead() was called without provide context, ensure you call it through the setup() function."
      );
    return e;
  }
  throw new Error(
    "useHead() was called without provide context, ensure you call it through the setup() function."
  );
}
function Jp(e, t = {}) {
  const n = t.head || Yp();
  return n.ssr ? n.push(e || {}, t) : Xp(n, e, t);
}
function Xp(e, t, n = {}) {
  const s = ze(!1);
  let r;
  return (
    Yu(() => {
      const i = s.value ? {} : Ks(t, qp);
      r ? r.patch(i) : (r = e.push(i, n));
    }),
    gt() &&
      (rs(() => {
        r.dispose();
      }),
      da(() => {
        s.value = !0;
      }),
      ha(() => {
        s.value = !1;
      })),
    r
  );
}
function Qp(e) {
  const t = e || _e();
  return (
    t.ssrContext?.head ||
    t.runWithContext(() => {
      if (ns()) {
        const n = Re(Vo);
        if (!n) throw new Error("[nuxt] [unhead] Missing Unhead instance.");
        return n;
      }
    })
  );
}
function Zp(e, t = {}) {
  const n = t.head || Qp(t.nuxt);
  return Jp(e, { head: n, ...t });
}
let Ss, Ts;
function eg() {
  return (
    (Ss = $fetch(Uo(`builds/meta/${or().app.buildId}.json`), {
      responseType: "json"
    })),
    Ss.then((e) => {
      Ts = Zd(e.matcher);
    }).catch((e) => {
      console.error("[nuxt] Error fetching app manifest.", e);
    }),
    Ss
  );
}
function lr() {
  return Ss || eg();
}
async function Ko(e) {
  const t = typeof e == "string" ? e : e.path;
  if ((await lr(), !Ts))
    return (
      console.error("[nuxt] Error creating app manifest matcher.", Ts),
      {}
    );
  try {
    return mc({}, ...Ts.matchAll(t).reverse());
  } catch (n) {
    return (console.error("[nuxt] Error matching route rules.", n), {});
  }
}
async function el(e, t = {}) {
  if (!(await Pc(e))) return null;
  const s = await ng(e, t);
  return (await xc(s)) || null;
}
const tg = "_payload.json";
async function ng(e, t = {}) {
  const n = new URL(e, "http://localhost");
  if (n.host !== "localhost" || ln(n.pathname, { acceptRelative: !0 }))
    throw new Error("Payload URL must not include hostname: " + e);
  const s = or(),
    r = t.hash || (t.fresh ? Date.now() : s.app.buildId),
    o = s.app.cdnURL,
    i = o && (await Pc(e)) ? o : s.app.baseURL;
  return $o(i, n.pathname, tg + (r ? `?${r}` : ""));
}
async function xc(e) {
  const t = fetch(e, { cache: "force-cache" }).then((n) => n.text().then(Oc));
  try {
    return await t;
  } catch (n) {
    console.warn("[nuxt] Cannot load payload ", e, n);
  }
  return null;
}
async function Pc(e = is().path) {
  const t = _e();
  return (
    (e = e === "/" ? e : e.replace(/\/$/, "")),
    (await lr()).prerendered.includes(e)
      ? !0
      : t.runWithContext(async () => {
          const s = await Ko({ path: e });
          return !!s.prerender && !s.redirect;
        })
  );
}
let Yt = null;
async function sg() {
  if (Yt) return Yt;
  const e = document.getElementById("__NUXT_DATA__");
  if (!e) return {};
  const t = await Oc(e.textContent || ""),
    n = e.dataset.src ? await xc(e.dataset.src) : void 0;
  return (
    (Yt = { ...t, ...n, ...window.__NUXT__ }),
    Yt.config?.public && (Yt.config.public = Ct(Yt.config.public)),
    Yt
  );
}
async function Oc(e) {
  return await Rp(e, _e()._payloadRevivers);
}
function Nc(e, t) {
  _e()._payloadRevivers[e] = t;
}
const rg = Jd(() => {
    Nc("skipHydrate", (e) => {});
  }),
  og = [
    ["NuxtError", (e) => nn(e)],
    [
      "EmptyShallowRef",
      (e) => Ut(e === "_" ? void 0 : e === "0n" ? BigInt(0) : $s(e))
    ],
    [
      "EmptyRef",
      (e) => ze(e === "_" ? void 0 : e === "0n" ? BigInt(0) : $s(e))
    ],
    ["ShallowRef", (e) => Ut(e)],
    ["ShallowReactive", (e) => ht(e)],
    ["Ref", (e) => ze(e)],
    ["Reactive", (e) => Ct(e)]
  ],
  ig = Qe({
    name: "nuxt:revive-payload:client",
    order: -30,
    async setup(e) {
      let t, n;
      for (const [s, r] of og) Nc(s, r);
      (Object.assign(
        e.payload,
        (([t, n] = Sn(() => e.runWithContext(sg))), (t = await t), n(), t)
      ),
        delete window.__NUXT__);
    }
  });
async function Go(e, t = {}) {
  const n = t.document || e.resolvedOptions.document;
  if (!n || !e.dirty) return;
  const s = { shouldRender: !0, tags: [] };
  if ((await e.hooks.callHook("dom:beforeRender", s), !!s.shouldRender))
    return (
      e._domUpdatePromise ||
        (e._domUpdatePromise = new Promise(async (r) => {
          const o = new Map(),
            i = new Promise((d) => {
              e.resolveTags().then((y) => {
                d(
                  y.map((v) => {
                    const T = o.get(v._d) || 0,
                      S = {
                        tag: v,
                        id: (T ? `${v._d}:${T}` : v._d) || Yi(v),
                        shouldRender: !0
                      };
                    return (v._d && Ac(v._d) && o.set(v._d, T + 1), S);
                  })
                );
              });
            });
          let l = e._dom;
          if (!l) {
            l = {
              title: n.title,
              elMap: new Map()
                .set("htmlAttrs", n.documentElement)
                .set("bodyAttrs", n.body)
            };
            for (const d of ["body", "head"]) {
              const y = n[d]?.children;
              for (const v of y) {
                const T = v.tagName.toLowerCase();
                if (!zi.has(T)) continue;
                const S = kc(
                  { tag: T, props: {} },
                  {
                    innerHTML: v.innerHTML,
                    ...(v
                      .getAttributeNames()
                      .reduce((w, g) => ((w[g] = v.getAttribute(g)), w), {}) ||
                      {})
                  }
                );
                if (
                  ((S.key = v.getAttribute("data-hid") || void 0),
                  (S._d = oo(S) || Yi(S)),
                  l.elMap.has(S._d))
                ) {
                  let w = 1,
                    g = S._d;
                  for (; l.elMap.has(g);) g = `${S._d}:${w++}`;
                  l.elMap.set(g, v);
                } else l.elMap.set(S._d, v);
              }
            }
          }
          ((l.pendingSideEffects = { ...l.sideEffects }), (l.sideEffects = {}));
          function c(d, y, v) {
            const T = `${d}:${y}`;
            ((l.sideEffects[T] = v), delete l.pendingSideEffects[T]);
          }
          function u({ id: d, $el: y, tag: v }) {
            const T = v.tag.endsWith("Attrs");
            (l.elMap.set(d, y),
              T ||
                (v.textContent &&
                  v.textContent !== y.textContent &&
                  (y.textContent = v.textContent),
                v.innerHTML &&
                  v.innerHTML !== y.innerHTML &&
                  (y.innerHTML = v.innerHTML),
                c(d, "el", () => {
                  (y?.remove(), l.elMap.delete(d));
                })));
            for (const S in v.props) {
              if (!Object.prototype.hasOwnProperty.call(v.props, S)) continue;
              const w = v.props[S];
              if (S.startsWith("on") && typeof w == "function") {
                const _ = y?.dataset;
                if (_ && _[`${S}fired`]) {
                  const b = S.slice(0, -5);
                  w.call(y, new Event(b.substring(2)));
                }
                y.getAttribute(`data-${S}`) !== "" &&
                  ((v.tag === "bodyAttrs" ? n.defaultView : y).addEventListener(
                    S.substring(2),
                    w.bind(y)
                  ),
                  y.setAttribute(`data-${S}`, ""));
                continue;
              }
              const g = `attr:${S}`;
              if (S === "class") {
                if (!w) continue;
                for (const _ of w)
                  (T && c(d, `${g}:${_}`, () => y.classList.remove(_)),
                    !y.classList.contains(_) && y.classList.add(_));
              } else if (S === "style") {
                if (!w) continue;
                for (const [_, b] of w)
                  (c(d, `${g}:${_}`, () => {
                    y.style.removeProperty(_);
                  }),
                    y.style.setProperty(_, b));
              } else
                w !== !1 &&
                  w !== null &&
                  (y.getAttribute(S) !== w &&
                    y.setAttribute(S, w === !0 ? "" : String(w)),
                  T && c(d, g, () => y.removeAttribute(S)));
            }
          }
          const a = [],
            f = { bodyClose: void 0, bodyOpen: void 0, head: void 0 },
            h = await i;
          for (const d of h) {
            const { tag: y, shouldRender: v, id: T } = d;
            if (v) {
              if (y.tag === "title") {
                ((n.title = y.textContent),
                  c("title", "", () => (n.title = l.title)));
                continue;
              }
              ((d.$el = d.$el || l.elMap.get(T)),
                d.$el ? u(d) : zi.has(y.tag) && a.push(d));
            }
          }
          for (const d of a) {
            const y = d.tag.tagPosition || "head";
            ((d.$el = n.createElement(d.tag.tag)),
              u(d),
              (f[y] = f[y] || n.createDocumentFragment()),
              f[y].appendChild(d.$el));
          }
          for (const d of h) await e.hooks.callHook("dom:renderTag", d, n, c);
          (f.head && n.head.appendChild(f.head),
            f.bodyOpen && n.body.insertBefore(f.bodyOpen, n.body.firstChild),
            f.bodyClose && n.body.appendChild(f.bodyClose));
          for (const d in l.pendingSideEffects) l.pendingSideEffects[d]();
          ((e._dom = l),
            await e.hooks.callHook("dom:rendered", { renders: h }),
            r());
        }).finally(() => {
          ((e._domUpdatePromise = void 0), (e.dirty = !1));
        })),
      e._domUpdatePromise
    );
}
function lg(e = {}) {
  const t = e.domOptions?.render || Go;
  e.document = e.document || (typeof window < "u" ? document : void 0);
  const n =
    e.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML ||
    !1;
  return Gp({
    ...e,
    plugins: [
      ...(e.plugins || []),
      { key: "client", hooks: { "entries:updated": t } }
    ],
    init: [n ? JSON.parse(n) : !1, ...(e.init || [])]
  });
}
function ag(e, t) {
  let n = 0;
  return () => {
    const s = ++n;
    t(() => {
      n === s && e();
    });
  };
}
function cg(e = {}) {
  const t = lg({
    domOptions: {
      render: ag(
        () => Go(t),
        (n) => setTimeout(n, 0)
      )
    },
    ...e
  });
  return ((t.install = zp(t)), t);
}
const ug = { disableDefaults: !0 },
  fg = Qe({
    name: "nuxt:head",
    enforce: "pre",
    setup(e) {
      const t = cg(ug);
      e.vueApp.use(t);
      {
        let n = !0;
        const s = async () => {
          ((n = !1), await Go(t));
        };
        (t.hooks.hook("dom:beforeRender", (r) => {
          r.shouldRender = !n;
        }),
          e.hooks.hook("page:start", () => {
            n = !0;
          }),
          e.hooks.hook("page:finish", () => {
            e.isHydrating || s();
          }),
          e.hooks.hook("app:error", s),
          e.hooks.hook("app:suspense:resolve", s));
      }
    }
  });
const pn = typeof document < "u";
function Mc(e) {
  return (
    typeof e == "object" ||
    "displayName" in e ||
    "props" in e ||
    "__vccOpts" in e
  );
}
function hg(e) {
  return (
    e.__esModule ||
    e[Symbol.toStringTag] === "Module" ||
    (e.default && Mc(e.default))
  );
}
const re = Object.assign;
function kr(e, t) {
  const n = {};
  for (const s in t) {
    const r = t[s];
    n[s] = ot(r) ? r.map(e) : e(r);
  }
  return n;
}
const Gn = () => {},
  ot = Array.isArray;
function tl(e, t) {
  const n = {};
  for (const s in e) n[s] = s in t ? t[s] : e[s];
  return n;
}
const Lc = /#/g,
  dg = /&/g,
  pg = /\//g,
  gg = /=/g,
  mg = /\?/g,
  Ic = /\+/g,
  yg = /%5B/g,
  _g = /%5D/g,
  Hc = /%5E/g,
  vg = /%60/g,
  Dc = /%7B/g,
  bg = /%7C/g,
  jc = /%7D/g,
  wg = /%20/g;
function qo(e) {
  return e == null
    ? ""
    : encodeURI("" + e)
        .replace(bg, "|")
        .replace(yg, "[")
        .replace(_g, "]");
}
function Eg(e) {
  return qo(e).replace(Dc, "{").replace(jc, "}").replace(Hc, "^");
}
function io(e) {
  return qo(e)
    .replace(Ic, "%2B")
    .replace(wg, "+")
    .replace(Lc, "%23")
    .replace(dg, "%26")
    .replace(vg, "`")
    .replace(Dc, "{")
    .replace(jc, "}")
    .replace(Hc, "^");
}
function Sg(e) {
  return io(e).replace(gg, "%3D");
}
function Tg(e) {
  return qo(e).replace(Lc, "%23").replace(mg, "%3F");
}
function Rg(e) {
  return Tg(e).replace(pg, "%2F");
}
function Qn(e) {
  if (e == null) return null;
  try {
    return decodeURIComponent("" + e);
  } catch {}
  return "" + e;
}
const Cg = /\/$/,
  Ag = (e) => e.replace(Cg, "");
function xr(e, t, n = "/") {
  let s,
    r = {},
    o = "",
    i = "";
  const l = t.indexOf("#");
  let c = t.indexOf("?");
  return (
    (c = l >= 0 && c > l ? -1 : c),
    c >= 0 &&
      ((s = t.slice(0, c)),
      (o = t.slice(c, l > 0 ? l : t.length)),
      (r = e(o.slice(1)))),
    l >= 0 && ((s = s || t.slice(0, l)), (i = t.slice(l, t.length))),
    (s = Og(s ?? t, n)),
    { fullPath: s + o + i, path: s, query: r, hash: Qn(i) }
  );
}
function kg(e, t) {
  const n = t.query ? e(t.query) : "";
  return t.path + (n && "?") + n + (t.hash || "");
}
function nl(e, t) {
  return !t || !e.toLowerCase().startsWith(t.toLowerCase())
    ? e
    : e.slice(t.length) || "/";
}
function xg(e, t, n) {
  const s = t.matched.length - 1,
    r = n.matched.length - 1;
  return (
    s > -1 &&
    s === r &&
    kn(t.matched[s], n.matched[r]) &&
    Fc(t.params, n.params) &&
    e(t.query) === e(n.query) &&
    t.hash === n.hash
  );
}
function kn(e, t) {
  return (e.aliasOf || e) === (t.aliasOf || t);
}
function Fc(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length) return !1;
  for (var n in e) if (!Pg(e[n], t[n])) return !1;
  return !0;
}
function Pg(e, t) {
  return ot(e) ? sl(e, t) : ot(t) ? sl(t, e) : e?.valueOf() === t?.valueOf();
}
function sl(e, t) {
  return ot(t)
    ? e.length === t.length && e.every((n, s) => n === t[s])
    : e.length === 1 && e[0] === t;
}
function Og(e, t) {
  if (e.startsWith("/")) return e;
  if (!e) return t;
  const n = t.split("/"),
    s = e.split("/"),
    r = s[s.length - 1];
  (r === ".." || r === ".") && s.push("");
  let o = n.length - 1,
    i,
    l;
  for (i = 0; i < s.length; i++)
    if (((l = s[i]), l !== "."))
      if (l === "..") o > 1 && o--;
      else break;
  return n.slice(0, o).join("/") + "/" + s.slice(i).join("/");
}
const qe = {
  path: "/",
  name: void 0,
  params: {},
  query: {},
  hash: "",
  fullPath: "/",
  matched: [],
  meta: {},
  redirectedFrom: void 0
};
let lo = (function (e) {
    return ((e.pop = "pop"), (e.push = "push"), e);
  })({}),
  Pr = (function (e) {
    return ((e.back = "back"), (e.forward = "forward"), (e.unknown = ""), e);
  })({});
function Ng(e) {
  if (!e)
    if (pn) {
      const t = document.querySelector("base");
      ((e = (t && t.getAttribute("href")) || "/"),
        (e = e.replace(/^\w+:\/\/[^\/]+/, "")));
    } else e = "/";
  return (e[0] !== "/" && e[0] !== "#" && (e = "/" + e), Ag(e));
}
const Mg = /^[^#]+#/;
function Lg(e, t) {
  return e.replace(Mg, "#") + t;
}
function Ig(e, t) {
  const n = document.documentElement.getBoundingClientRect(),
    s = e.getBoundingClientRect();
  return {
    behavior: t.behavior,
    left: s.left - n.left - (t.left || 0),
    top: s.top - n.top - (t.top || 0)
  };
}
const ar = () => ({ left: window.scrollX, top: window.scrollY });
function Hg(e) {
  let t;
  if ("el" in e) {
    const n = e.el,
      s = typeof n == "string" && n.startsWith("#"),
      r =
        typeof n == "string"
          ? s
            ? document.getElementById(n.slice(1))
            : document.querySelector(n)
          : n;
    if (!r) return;
    t = Ig(r, e);
  } else t = e;
  "scrollBehavior" in document.documentElement.style
    ? window.scrollTo(t)
    : window.scrollTo(
        t.left != null ? t.left : window.scrollX,
        t.top != null ? t.top : window.scrollY
      );
}
function rl(e, t) {
  return (history.state ? history.state.position - t : -1) + e;
}
const ao = new Map();
function Dg(e, t) {
  ao.set(e, t);
}
function jg(e) {
  const t = ao.get(e);
  return (ao.delete(e), t);
}
function Fg(e) {
  return typeof e == "string" || (e && typeof e == "object");
}
function $c(e) {
  return typeof e == "string" || typeof e == "symbol";
}
let ye = (function (e) {
  return (
    (e[(e.MATCHER_NOT_FOUND = 1)] = "MATCHER_NOT_FOUND"),
    (e[(e.NAVIGATION_GUARD_REDIRECT = 2)] = "NAVIGATION_GUARD_REDIRECT"),
    (e[(e.NAVIGATION_ABORTED = 4)] = "NAVIGATION_ABORTED"),
    (e[(e.NAVIGATION_CANCELLED = 8)] = "NAVIGATION_CANCELLED"),
    (e[(e.NAVIGATION_DUPLICATED = 16)] = "NAVIGATION_DUPLICATED"),
    e
  );
})({});
const Bc = Symbol("");
(ye.MATCHER_NOT_FOUND + "",
  ye.NAVIGATION_GUARD_REDIRECT + "",
  ye.NAVIGATION_ABORTED + "",
  ye.NAVIGATION_CANCELLED + "",
  ye.NAVIGATION_DUPLICATED + "");
function xn(e, t) {
  return re(new Error(), { type: e, [Bc]: !0 }, t);
}
function yt(e, t) {
  return e instanceof Error && Bc in e && (t == null || !!(e.type & t));
}
const $g = ["params", "query", "hash"];
function Bg(e) {
  if (typeof e == "string") return e;
  if (e.path != null) return e.path;
  const t = {};
  for (const n of $g) n in e && (t[n] = e[n]);
  return JSON.stringify(t, null, 2);
}
function Ug(e) {
  const t = {};
  if (e === "" || e === "?") return t;
  const n = (e[0] === "?" ? e.slice(1) : e).split("&");
  for (let s = 0; s < n.length; ++s) {
    const r = n[s].replace(Ic, " "),
      o = r.indexOf("="),
      i = Qn(o < 0 ? r : r.slice(0, o)),
      l = o < 0 ? null : Qn(r.slice(o + 1));
    if (i in t) {
      let c = t[i];
      (ot(c) || (c = t[i] = [c]), c.push(l));
    } else t[i] = l;
  }
  return t;
}
function ol(e) {
  let t = "";
  for (let n in e) {
    const s = e[n];
    if (((n = Sg(n)), s == null)) {
      s !== void 0 && (t += (t.length ? "&" : "") + n);
      continue;
    }
    (ot(s) ? s.map((r) => r && io(r)) : [s && io(s)]).forEach((r) => {
      r !== void 0 &&
        ((t += (t.length ? "&" : "") + n), r != null && (t += "=" + r));
    });
  }
  return t;
}
function Wg(e) {
  const t = {};
  for (const n in e) {
    const s = e[n];
    s !== void 0 &&
      (t[n] = ot(s)
        ? s.map((r) => (r == null ? null : "" + r))
        : s == null
          ? s
          : "" + s);
  }
  return t;
}
const Vg = Symbol(""),
  il = Symbol(""),
  zo = Symbol(""),
  Yo = Symbol(""),
  co = Symbol("");
function Hn() {
  let e = [];
  function t(s) {
    return (
      e.push(s),
      () => {
        const r = e.indexOf(s);
        r > -1 && e.splice(r, 1);
      }
    );
  }
  function n() {
    e = [];
  }
  return { add: t, list: () => e.slice(), reset: n };
}
function Dt(e, t, n, s, r, o = (i) => i()) {
  const i = s && (s.enterCallbacks[r] = s.enterCallbacks[r] || []);
  return () =>
    new Promise((l, c) => {
      const u = (h) => {
          h === !1
            ? c(xn(ye.NAVIGATION_ABORTED, { from: n, to: t }))
            : h instanceof Error
              ? c(h)
              : Fg(h)
                ? c(xn(ye.NAVIGATION_GUARD_REDIRECT, { from: t, to: h }))
                : (i &&
                    s.enterCallbacks[r] === i &&
                    typeof h == "function" &&
                    i.push(h),
                  l());
        },
        a = o(() => e.call(s && s.instances[r], t, n, u));
      let f = Promise.resolve(a);
      (e.length < 3 && (f = f.then(u)), f.catch((h) => c(h)));
    });
}
function Or(e, t, n, s, r = (o) => o()) {
  const o = [];
  for (const i of e)
    for (const l in i.components) {
      let c = i.components[l];
      if (!(t !== "beforeRouteEnter" && !i.instances[l]))
        if (Mc(c)) {
          const u = (c.__vccOpts || c)[t];
          u && o.push(Dt(u, n, s, i, l, r));
        } else {
          let u = c();
          o.push(() =>
            u.then((a) => {
              if (!a)
                throw new Error(
                  `Couldn't resolve component "${l}" at "${i.path}"`
                );
              const f = hg(a) ? a.default : a;
              ((i.mods[l] = a), (i.components[l] = f));
              const h = (f.__vccOpts || f)[t];
              return h && Dt(h, n, s, i, l, r)();
            })
          );
        }
    }
  return o;
}
function Kg(e, t) {
  const n = [],
    s = [],
    r = [],
    o = Math.max(t.matched.length, e.matched.length);
  for (let i = 0; i < o; i++) {
    const l = t.matched[i];
    l && (e.matched.find((u) => kn(u, l)) ? s.push(l) : n.push(l));
    const c = e.matched[i];
    c && (t.matched.find((u) => kn(u, c)) || r.push(c));
  }
  return [n, s, r];
}
let Gg = () => location.protocol + "//" + location.host;
function Uc(e, t) {
  const { pathname: n, search: s, hash: r } = t,
    o = e.indexOf("#");
  if (o > -1) {
    let i = r.includes(e.slice(o)) ? e.slice(o).length : 1,
      l = r.slice(i);
    return (l[0] !== "/" && (l = "/" + l), nl(l, ""));
  }
  return nl(n, e) + s + r;
}
function qg(e, t, n, s) {
  let r = [],
    o = [],
    i = null;
  const l = ({ state: h }) => {
    const d = Uc(e, location),
      y = n.value,
      v = t.value;
    let T = 0;
    if (h) {
      if (((n.value = d), (t.value = h), i && i === y)) {
        i = null;
        return;
      }
      T = v ? h.position - v.position : 0;
    } else s(d);
    r.forEach((S) => {
      S(n.value, y, {
        delta: T,
        type: lo.pop,
        direction: T ? (T > 0 ? Pr.forward : Pr.back) : Pr.unknown
      });
    });
  };
  function c() {
    i = n.value;
  }
  function u(h) {
    r.push(h);
    const d = () => {
      const y = r.indexOf(h);
      y > -1 && r.splice(y, 1);
    };
    return (o.push(d), d);
  }
  function a() {
    if (document.visibilityState === "hidden") {
      const { history: h } = window;
      if (!h.state) return;
      h.replaceState(re({}, h.state, { scroll: ar() }), "");
    }
  }
  function f() {
    for (const h of o) h();
    ((o = []),
      window.removeEventListener("popstate", l),
      window.removeEventListener("pagehide", a),
      document.removeEventListener("visibilitychange", a));
  }
  return (
    window.addEventListener("popstate", l),
    window.addEventListener("pagehide", a),
    document.addEventListener("visibilitychange", a),
    { pauseListeners: c, listen: u, destroy: f }
  );
}
function ll(e, t, n, s = !1, r = !1) {
  return {
    back: e,
    current: t,
    forward: n,
    replaced: s,
    position: window.history.length,
    scroll: r ? ar() : null
  };
}
function zg(e) {
  const { history: t, location: n } = window,
    s = { value: Uc(e, n) },
    r = { value: t.state };
  r.value ||
    o(
      s.value,
      {
        back: null,
        current: s.value,
        forward: null,
        position: t.length - 1,
        replaced: !0,
        scroll: null
      },
      !0
    );
  function o(c, u, a) {
    const f = e.indexOf("#"),
      h =
        f > -1
          ? (n.host && document.querySelector("base") ? e : e.slice(f)) + c
          : Gg() + e + c;
    try {
      (t[a ? "replaceState" : "pushState"](u, "", h), (r.value = u));
    } catch (d) {
      (console.error(d), n[a ? "replace" : "assign"](h));
    }
  }
  function i(c, u) {
    (o(
      c,
      re({}, t.state, ll(r.value.back, c, r.value.forward, !0), u, {
        position: r.value.position
      }),
      !0
    ),
      (s.value = c));
  }
  function l(c, u) {
    const a = re({}, r.value, t.state, { forward: c, scroll: ar() });
    (o(a.current, a, !0),
      o(c, re({}, ll(s.value, c, null), { position: a.position + 1 }, u), !1),
      (s.value = c));
  }
  return { location: s, state: r, push: l, replace: i };
}
function Yg(e) {
  e = Ng(e);
  const t = zg(e),
    n = qg(e, t.state, t.location, t.replace);
  function s(o, i = !0) {
    (i || n.pauseListeners(), history.go(o));
  }
  const r = re(
    { location: "", base: e, go: s, createHref: Lg.bind(null, e) },
    t,
    n
  );
  return (
    Object.defineProperty(r, "location", {
      enumerable: !0,
      get: () => t.location.value
    }),
    Object.defineProperty(r, "state", {
      enumerable: !0,
      get: () => t.state.value
    }),
    r
  );
}
let Qt = (function (e) {
  return (
    (e[(e.Static = 0)] = "Static"),
    (e[(e.Param = 1)] = "Param"),
    (e[(e.Group = 2)] = "Group"),
    e
  );
})({});
var we = (function (e) {
  return (
    (e[(e.Static = 0)] = "Static"),
    (e[(e.Param = 1)] = "Param"),
    (e[(e.ParamRegExp = 2)] = "ParamRegExp"),
    (e[(e.ParamRegExpEnd = 3)] = "ParamRegExpEnd"),
    (e[(e.EscapeNext = 4)] = "EscapeNext"),
    e
  );
})(we || {});
const Jg = { type: Qt.Static, value: "" },
  Xg = /[a-zA-Z0-9_]/;
function Qg(e) {
  if (!e) return [[]];
  if (e === "/") return [[Jg]];
  if (!e.startsWith("/")) throw new Error(`Invalid path "${e}"`);
  function t(d) {
    throw new Error(`ERR (${n})/"${u}": ${d}`);
  }
  let n = we.Static,
    s = n;
  const r = [];
  let o;
  function i() {
    (o && r.push(o), (o = []));
  }
  let l = 0,
    c,
    u = "",
    a = "";
  function f() {
    u &&
      (n === we.Static
        ? o.push({ type: Qt.Static, value: u })
        : n === we.Param || n === we.ParamRegExp || n === we.ParamRegExpEnd
          ? (o.length > 1 &&
              (c === "*" || c === "+") &&
              t(
                `A repeatable param (${u}) must be alone in its segment. eg: '/:ids+.`
              ),
            o.push({
              type: Qt.Param,
              value: u,
              regexp: a,
              repeatable: c === "*" || c === "+",
              optional: c === "*" || c === "?"
            }))
          : t("Invalid state to consume buffer"),
      (u = ""));
  }
  function h() {
    u += c;
  }
  for (; l < e.length;) {
    if (((c = e[l++]), c === "\\" && n !== we.ParamRegExp)) {
      ((s = n), (n = we.EscapeNext));
      continue;
    }
    switch (n) {
      case we.Static:
        c === "/" ? (u && f(), i()) : c === ":" ? (f(), (n = we.Param)) : h();
        break;
      case we.EscapeNext:
        (h(), (n = s));
        break;
      case we.Param:
        c === "("
          ? (n = we.ParamRegExp)
          : Xg.test(c)
            ? h()
            : (f(),
              (n = we.Static),
              c !== "*" && c !== "?" && c !== "+" && l--);
        break;
      case we.ParamRegExp:
        c === ")"
          ? a[a.length - 1] == "\\"
            ? (a = a.slice(0, -1) + c)
            : (n = we.ParamRegExpEnd)
          : (a += c);
        break;
      case we.ParamRegExpEnd:
        (f(),
          (n = we.Static),
          c !== "*" && c !== "?" && c !== "+" && l--,
          (a = ""));
        break;
      default:
        t("Unknown state");
        break;
    }
  }
  return (
    n === we.ParamRegExp && t(`Unfinished custom RegExp for param "${u}"`),
    f(),
    i(),
    r
  );
}
const al = "[^/]+?",
  Zg = { sensitive: !1, strict: !1, start: !0, end: !0 };
var Ne = (function (e) {
  return (
    (e[(e._multiplier = 10)] = "_multiplier"),
    (e[(e.Root = 90)] = "Root"),
    (e[(e.Segment = 40)] = "Segment"),
    (e[(e.SubSegment = 30)] = "SubSegment"),
    (e[(e.Static = 40)] = "Static"),
    (e[(e.Dynamic = 20)] = "Dynamic"),
    (e[(e.BonusCustomRegExp = 10)] = "BonusCustomRegExp"),
    (e[(e.BonusWildcard = -50)] = "BonusWildcard"),
    (e[(e.BonusRepeatable = -20)] = "BonusRepeatable"),
    (e[(e.BonusOptional = -8)] = "BonusOptional"),
    (e[(e.BonusStrict = 0.7000000000000001)] = "BonusStrict"),
    (e[(e.BonusCaseSensitive = 0.25)] = "BonusCaseSensitive"),
    e
  );
})(Ne || {});
const em = /[.+*?^${}()[\]/\\]/g;
function tm(e, t) {
  const n = re({}, Zg, t),
    s = [];
  let r = n.start ? "^" : "";
  const o = [];
  for (const u of e) {
    const a = u.length ? [] : [Ne.Root];
    n.strict && !u.length && (r += "/");
    for (let f = 0; f < u.length; f++) {
      const h = u[f];
      let d = Ne.Segment + (n.sensitive ? Ne.BonusCaseSensitive : 0);
      if (h.type === Qt.Static)
        (f || (r += "/"), (r += h.value.replace(em, "\\$&")), (d += Ne.Static));
      else if (h.type === Qt.Param) {
        const { value: y, repeatable: v, optional: T, regexp: S } = h;
        o.push({ name: y, repeatable: v, optional: T });
        const w = S || al;
        if (w !== al) {
          d += Ne.BonusCustomRegExp;
          try {
            `${w}`;
          } catch (_) {
            throw new Error(
              `Invalid custom RegExp for param "${y}" (${w}): ` + _.message
            );
          }
        }
        let g = v ? `((?:${w})(?:/(?:${w}))*)` : `(${w})`;
        (f || (g = T && u.length < 2 ? `(?:/${g})` : "/" + g),
          T && (g += "?"),
          (r += g),
          (d += Ne.Dynamic),
          T && (d += Ne.BonusOptional),
          v && (d += Ne.BonusRepeatable),
          w === ".*" && (d += Ne.BonusWildcard));
      }
      a.push(d);
    }
    s.push(a);
  }
  if (n.strict && n.end) {
    const u = s.length - 1;
    s[u][s[u].length - 1] += Ne.BonusStrict;
  }
  (n.strict || (r += "/?"),
    n.end ? (r += "$") : n.strict && !r.endsWith("/") && (r += "(?:/|$)"));
  const i = new RegExp(r, n.sensitive ? "" : "i");
  function l(u) {
    const a = u.match(i),
      f = {};
    if (!a) return null;
    for (let h = 1; h < a.length; h++) {
      const d = a[h] || "",
        y = o[h - 1];
      f[y.name] = d && y.repeatable ? d.split("/") : d;
    }
    return f;
  }
  function c(u) {
    let a = "",
      f = !1;
    for (const h of e) {
      ((!f || !a.endsWith("/")) && (a += "/"), (f = !1));
      for (const d of h)
        if (d.type === Qt.Static) a += d.value;
        else if (d.type === Qt.Param) {
          const { value: y, repeatable: v, optional: T } = d,
            S = y in u ? u[y] : "";
          if (ot(S) && !v)
            throw new Error(
              `Provided param "${y}" is an array but it is not repeatable (* or + modifiers)`
            );
          const w = ot(S) ? S.join("/") : S;
          if (!w)
            if (T)
              h.length < 2 &&
                (a.endsWith("/") ? (a = a.slice(0, -1)) : (f = !0));
            else throw new Error(`Missing required param "${y}"`);
          a += w;
        }
    }
    return a || "/";
  }
  return { re: i, score: s, keys: o, parse: l, stringify: c };
}
function nm(e, t) {
  let n = 0;
  for (; n < e.length && n < t.length;) {
    const s = t[n] - e[n];
    if (s) return s;
    n++;
  }
  return e.length < t.length
    ? e.length === 1 && e[0] === Ne.Static + Ne.Segment
      ? -1
      : 1
    : e.length > t.length
      ? t.length === 1 && t[0] === Ne.Static + Ne.Segment
        ? 1
        : -1
      : 0;
}
function Wc(e, t) {
  let n = 0;
  const s = e.score,
    r = t.score;
  for (; n < s.length && n < r.length;) {
    const o = nm(s[n], r[n]);
    if (o) return o;
    n++;
  }
  if (Math.abs(r.length - s.length) === 1) {
    if (cl(s)) return 1;
    if (cl(r)) return -1;
  }
  return r.length - s.length;
}
function cl(e) {
  const t = e[e.length - 1];
  return e.length > 0 && t[t.length - 1] < 0;
}
const sm = { strict: !1, end: !0, sensitive: !1 };
function rm(e, t, n) {
  const s = tm(Qg(e.path), n),
    r = re(s, { record: e, parent: t, children: [], alias: [] });
  return (t && !r.record.aliasOf == !t.record.aliasOf && t.children.push(r), r);
}
function om(e, t) {
  const n = [],
    s = new Map();
  t = tl(sm, t);
  function r(f) {
    return s.get(f);
  }
  function o(f, h, d) {
    const y = !d,
      v = fl(f);
    v.aliasOf = d && d.record;
    const T = tl(t, f),
      S = [v];
    if ("alias" in f) {
      const _ = typeof f.alias == "string" ? [f.alias] : f.alias;
      for (const b of _)
        S.push(
          fl(
            re({}, v, {
              components: d ? d.record.components : v.components,
              path: b,
              aliasOf: d ? d.record : v
            })
          )
        );
    }
    let w, g;
    for (const _ of S) {
      const { path: b } = _;
      if (h && b[0] !== "/") {
        const k = h.record.path,
          L = k[k.length - 1] === "/" ? "" : "/";
        _.path = h.record.path + (b && L + b);
      }
      if (
        ((w = rm(_, h, T)),
        d
          ? d.alias.push(w)
          : ((g = g || w),
            g !== w && g.alias.push(w),
            y && f.name && !hl(w) && i(f.name)),
        Vc(w) && c(w),
        v.children)
      ) {
        const k = v.children;
        for (let L = 0; L < k.length; L++) o(k[L], w, d && d.children[L]);
      }
      d = d || w;
    }
    return g
      ? () => {
          i(g);
        }
      : Gn;
  }
  function i(f) {
    if ($c(f)) {
      const h = s.get(f);
      h &&
        (s.delete(f),
        n.splice(n.indexOf(h), 1),
        h.children.forEach(i),
        h.alias.forEach(i));
    } else {
      const h = n.indexOf(f);
      h > -1 &&
        (n.splice(h, 1),
        f.record.name && s.delete(f.record.name),
        f.children.forEach(i),
        f.alias.forEach(i));
    }
  }
  function l() {
    return n;
  }
  function c(f) {
    const h = am(f, n);
    (n.splice(h, 0, f), f.record.name && !hl(f) && s.set(f.record.name, f));
  }
  function u(f, h) {
    let d,
      y = {},
      v,
      T;
    if ("name" in f && f.name) {
      if (((d = s.get(f.name)), !d))
        throw xn(ye.MATCHER_NOT_FOUND, { location: f });
      ((T = d.record.name),
        (y = re(
          ul(
            h.params,
            d.keys
              .filter((g) => !g.optional)
              .concat(d.parent ? d.parent.keys.filter((g) => g.optional) : [])
              .map((g) => g.name)
          ),
          f.params &&
            ul(
              f.params,
              d.keys.map((g) => g.name)
            )
        )),
        (v = d.stringify(y)));
    } else if (f.path != null)
      ((v = f.path),
        (d = n.find((g) => g.re.test(v))),
        d && ((y = d.parse(v)), (T = d.record.name)));
    else {
      if (((d = h.name ? s.get(h.name) : n.find((g) => g.re.test(h.path))), !d))
        throw xn(ye.MATCHER_NOT_FOUND, { location: f, currentLocation: h });
      ((T = d.record.name),
        (y = re({}, h.params, f.params)),
        (v = d.stringify(y)));
    }
    const S = [];
    let w = d;
    for (; w;) (S.unshift(w.record), (w = w.parent));
    return { name: T, path: v, params: y, matched: S, meta: lm(S) };
  }
  e.forEach((f) => o(f));
  function a() {
    ((n.length = 0), s.clear());
  }
  return {
    addRoute: o,
    resolve: u,
    removeRoute: i,
    clearRoutes: a,
    getRoutes: l,
    getRecordMatcher: r
  };
}
function ul(e, t) {
  const n = {};
  for (const s of t) s in e && (n[s] = e[s]);
  return n;
}
function fl(e) {
  const t = {
    path: e.path,
    redirect: e.redirect,
    name: e.name,
    meta: e.meta || {},
    aliasOf: e.aliasOf,
    beforeEnter: e.beforeEnter,
    props: im(e),
    children: e.children || [],
    instances: {},
    leaveGuards: new Set(),
    updateGuards: new Set(),
    enterCallbacks: {},
    components:
      "components" in e
        ? e.components || null
        : e.component && { default: e.component }
  };
  return (Object.defineProperty(t, "mods", { value: {} }), t);
}
function im(e) {
  const t = {},
    n = e.props || !1;
  if ("component" in e) t.default = n;
  else for (const s in e.components) t[s] = typeof n == "object" ? n[s] : n;
  return t;
}
function hl(e) {
  for (; e;) {
    if (e.record.aliasOf) return !0;
    e = e.parent;
  }
  return !1;
}
function lm(e) {
  return e.reduce((t, n) => re(t, n.meta), {});
}
function am(e, t) {
  let n = 0,
    s = t.length;
  for (; n !== s;) {
    const o = (n + s) >> 1;
    Wc(e, t[o]) < 0 ? (s = o) : (n = o + 1);
  }
  const r = cm(e);
  return (r && (s = t.lastIndexOf(r, s - 1)), s);
}
function cm(e) {
  let t = e;
  for (; (t = t.parent);) if (Vc(t) && Wc(e, t) === 0) return t;
}
function Vc({ record: e }) {
  return !!(
    e.name ||
    (e.components && Object.keys(e.components).length) ||
    e.redirect
  );
}
function dl(e) {
  const t = Re(zo),
    n = Re(Yo),
    s = je(() => {
      const c = pe(e.to);
      return t.resolve(c);
    }),
    r = je(() => {
      const { matched: c } = s.value,
        { length: u } = c,
        a = c[u - 1],
        f = n.matched;
      if (!a || !f.length) return -1;
      const h = f.findIndex(kn.bind(null, a));
      if (h > -1) return h;
      const d = pl(c[u - 2]);
      return u > 1 && pl(a) === d && f[f.length - 1].path !== d
        ? f.findIndex(kn.bind(null, c[u - 2]))
        : h;
    }),
    o = je(() => r.value > -1 && pm(n.params, s.value.params)),
    i = je(
      () =>
        r.value > -1 &&
        r.value === n.matched.length - 1 &&
        Fc(n.params, s.value.params)
    );
  function l(c = {}) {
    if (dm(c)) {
      const u = t[pe(e.replace) ? "replace" : "push"](pe(e.to)).catch(Gn);
      return (
        e.viewTransition &&
          typeof document < "u" &&
          "startViewTransition" in document &&
          document.startViewTransition(() => u),
        u
      );
    }
    return Promise.resolve();
  }
  return {
    route: s,
    href: je(() => s.value.href),
    isActive: o,
    isExactActive: i,
    navigate: l
  };
}
function um(e) {
  return e.length === 1 ? e[0] : e;
}
const fm = Xe({
    name: "RouterLink",
    compatConfig: { MODE: 3 },
    props: {
      to: { type: [String, Object], required: !0 },
      replace: Boolean,
      activeClass: String,
      exactActiveClass: String,
      custom: Boolean,
      ariaCurrentValue: { type: String, default: "page" },
      viewTransition: Boolean
    },
    useLink: dl,
    setup(e, { slots: t }) {
      const n = Ct(dl(e)),
        { options: s } = Re(zo),
        r = je(() => ({
          [gl(e.activeClass, s.linkActiveClass, "router-link-active")]:
            n.isActive,
          [gl(
            e.exactActiveClass,
            s.linkExactActiveClass,
            "router-link-exact-active"
          )]: n.isExactActive
        }));
      return () => {
        const o = t.default && um(t.default(n));
        return e.custom
          ? o
          : be(
              "a",
              {
                "aria-current": n.isExactActive ? e.ariaCurrentValue : null,
                href: n.href,
                onClick: n.navigate,
                class: r.value
              },
              o
            );
      };
    }
  }),
  hm = fm;
function dm(e) {
  if (
    !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) &&
    !e.defaultPrevented &&
    !(e.button !== void 0 && e.button !== 0)
  ) {
    if (e.currentTarget && e.currentTarget.getAttribute) {
      const t = e.currentTarget.getAttribute("target");
      if (/\b_blank\b/i.test(t)) return;
    }
    return (e.preventDefault && e.preventDefault(), !0);
  }
}
function pm(e, t) {
  for (const n in t) {
    const s = t[n],
      r = e[n];
    if (typeof s == "string") {
      if (s !== r) return !1;
    } else if (
      !ot(r) ||
      r.length !== s.length ||
      s.some((o, i) => o.valueOf() !== r[i].valueOf())
    )
      return !1;
  }
  return !0;
}
function pl(e) {
  return e ? (e.aliasOf ? e.aliasOf.path : e.path) : "";
}
const gl = (e, t, n) => e ?? t ?? n,
  gm = Xe({
    name: "RouterView",
    inheritAttrs: !1,
    props: { name: { type: String, default: "default" }, route: Object },
    compatConfig: { MODE: 3 },
    setup(e, { attrs: t, slots: n }) {
      const s = Re(co),
        r = je(() => e.route || s.value),
        o = Re(il, 0),
        i = je(() => {
          let u = pe(o);
          const { matched: a } = r.value;
          let f;
          for (; (f = a[u]) && !f.components;) u++;
          return u;
        }),
        l = je(() => r.value.matched[i.value]);
      ($t(
        il,
        je(() => i.value + 1)
      ),
        $t(Vg, l),
        $t(co, r));
      const c = ze();
      return (
        Bt(
          () => [c.value, l.value, e.name],
          ([u, a, f], [h, d, y]) => {
            (a &&
              ((a.instances[f] = u),
              d &&
                d !== a &&
                u &&
                u === h &&
                (a.leaveGuards.size || (a.leaveGuards = d.leaveGuards),
                a.updateGuards.size || (a.updateGuards = d.updateGuards))),
              u &&
                a &&
                (!d || !kn(a, d) || !h) &&
                (a.enterCallbacks[f] || []).forEach((v) => v(u)));
          },
          { flush: "post" }
        ),
        () => {
          const u = r.value,
            a = e.name,
            f = l.value,
            h = f && f.components[a];
          if (!h) return ml(n.default, { Component: h, route: u });
          const d = f.props[a],
            y = d
              ? d === !0
                ? u.params
                : typeof d == "function"
                  ? d(u)
                  : d
              : null,
            T = be(
              h,
              re({}, y, t, {
                onVnodeUnmounted: (S) => {
                  S.component.isUnmounted && (f.instances[a] = null);
                },
                ref: c
              })
            );
          return ml(n.default, { Component: T, route: u }) || T;
        }
      );
    }
  });
function ml(e, t) {
  if (!e) return null;
  const n = e(t);
  return n.length === 1 ? n[0] : n;
}
const Kc = gm;
function mm(e) {
  const t = om(e.routes, e),
    n = e.parseQuery || Ug,
    s = e.stringifyQuery || ol,
    r = e.history,
    o = Hn(),
    i = Hn(),
    l = Hn(),
    c = Ut(qe);
  let u = qe;
  pn &&
    e.scrollBehavior &&
    "scrollRestoration" in history &&
    (history.scrollRestoration = "manual");
  const a = kr.bind(null, (C) => "" + C),
    f = kr.bind(null, Rg),
    h = kr.bind(null, Qn);
  function d(C, W) {
    let F, z;
    return (
      $c(C) ? ((F = t.getRecordMatcher(C)), (z = W)) : (z = C),
      t.addRoute(z, F)
    );
  }
  function y(C) {
    const W = t.getRecordMatcher(C);
    W && t.removeRoute(W);
  }
  function v() {
    return t.getRoutes().map((C) => C.record);
  }
  function T(C) {
    return !!t.getRecordMatcher(C);
  }
  function S(C, W) {
    if (((W = re({}, W || c.value)), typeof C == "string")) {
      const m = xr(n, C, W.path),
        E = t.resolve({ path: m.path }, W),
        x = r.createHref(m.fullPath);
      return re(m, E, {
        params: h(E.params),
        hash: Qn(m.hash),
        redirectedFrom: void 0,
        href: x
      });
    }
    let F;
    if (C.path != null) F = re({}, C, { path: xr(n, C.path, W.path).path });
    else {
      const m = re({}, C.params);
      for (const E in m) m[E] == null && delete m[E];
      ((F = re({}, C, { params: f(m) })), (W.params = f(W.params)));
    }
    const z = t.resolve(F, W),
      Z = C.hash || "";
    z.params = a(h(z.params));
    const de = kg(s, re({}, C, { hash: Eg(Z), path: z.path })),
      p = r.createHref(de);
    return re(
      { fullPath: de, hash: Z, query: s === ol ? Wg(C.query) : C.query || {} },
      z,
      { redirectedFrom: void 0, href: p }
    );
  }
  function w(C) {
    return typeof C == "string" ? xr(n, C, c.value.path) : re({}, C);
  }
  function g(C, W) {
    if (u !== C) return xn(ye.NAVIGATION_CANCELLED, { from: W, to: C });
  }
  function _(C) {
    return L(C);
  }
  function b(C) {
    return _(re(w(C), { replace: !0 }));
  }
  function k(C, W) {
    const F = C.matched[C.matched.length - 1];
    if (F && F.redirect) {
      const { redirect: z } = F;
      let Z = typeof z == "function" ? z(C, W) : z;
      return (
        typeof Z == "string" &&
          ((Z = Z.includes("?") || Z.includes("#") ? (Z = w(Z)) : { path: Z }),
          (Z.params = {})),
        re(
          {
            query: C.query,
            hash: C.hash,
            params: Z.path != null ? {} : C.params
          },
          Z
        )
      );
    }
  }
  function L(C, W) {
    const F = (u = S(C)),
      z = c.value,
      Z = C.state,
      de = C.force,
      p = C.replace === !0,
      m = k(F, z);
    if (m)
      return L(
        re(w(m), {
          state: typeof m == "object" ? re({}, Z, m.state) : Z,
          force: de,
          replace: p
        }),
        W || F
      );
    const E = F;
    E.redirectedFrom = W;
    let x;
    return (
      !de &&
        xg(s, z, F) &&
        ((x = xn(ye.NAVIGATION_DUPLICATED, { to: E, from: z })),
        it(z, z, !0, !1)),
      (x ? Promise.resolve(x) : P(E, z))
        .catch((R) =>
          yt(R) ? (yt(R, ye.NAVIGATION_GUARD_REDIRECT) ? R : kt(R)) : U(R, E, z)
        )
        .then((R) => {
          if (R) {
            if (yt(R, ye.NAVIGATION_GUARD_REDIRECT))
              return L(
                re({ replace: p }, w(R.to), {
                  state: typeof R.to == "object" ? re({}, Z, R.to.state) : Z,
                  force: de
                }),
                W || E
              );
          } else R = O(E, z, !0, p, Z);
          return (V(E, z, R), R);
        })
    );
  }
  function I(C, W) {
    const F = g(C, W);
    return F ? Promise.reject(F) : Promise.resolve();
  }
  function A(C) {
    const W = cn.values().next().value;
    return W && typeof W.runWithContext == "function"
      ? W.runWithContext(C)
      : C();
  }
  function P(C, W) {
    let F;
    const [z, Z, de] = Kg(C, W);
    F = Or(z.reverse(), "beforeRouteLeave", C, W);
    for (const m of z)
      m.leaveGuards.forEach((E) => {
        F.push(Dt(E, C, W));
      });
    const p = I.bind(null, C, W);
    return (
      F.push(p),
      Ke(F)
        .then(() => {
          F = [];
          for (const m of o.list()) F.push(Dt(m, C, W));
          return (F.push(p), Ke(F));
        })
        .then(() => {
          F = Or(Z, "beforeRouteUpdate", C, W);
          for (const m of Z)
            m.updateGuards.forEach((E) => {
              F.push(Dt(E, C, W));
            });
          return (F.push(p), Ke(F));
        })
        .then(() => {
          F = [];
          for (const m of de)
            if (m.beforeEnter)
              if (ot(m.beforeEnter))
                for (const E of m.beforeEnter) F.push(Dt(E, C, W));
              else F.push(Dt(m.beforeEnter, C, W));
          return (F.push(p), Ke(F));
        })
        .then(
          () => (
            C.matched.forEach((m) => (m.enterCallbacks = {})),
            (F = Or(de, "beforeRouteEnter", C, W, A)),
            F.push(p),
            Ke(F)
          )
        )
        .then(() => {
          F = [];
          for (const m of i.list()) F.push(Dt(m, C, W));
          return (F.push(p), Ke(F));
        })
        .catch((m) => (yt(m, ye.NAVIGATION_CANCELLED) ? m : Promise.reject(m)))
    );
  }
  function V(C, W, F) {
    l.list().forEach((z) => A(() => z(C, W, F)));
  }
  function O(C, W, F, z, Z) {
    const de = g(C, W);
    if (de) return de;
    const p = W === qe,
      m = pn ? history.state : {};
    (F &&
      (z || p
        ? r.replace(C.fullPath, re({ scroll: p && m && m.scroll }, Z))
        : r.push(C.fullPath, Z)),
      (c.value = C),
      it(C, W, F, p),
      kt());
  }
  let K;
  function ee() {
    K ||
      (K = r.listen((C, W, F) => {
        if (!Gt.listening) return;
        const z = S(C),
          Z = k(z, Gt.currentRoute.value);
        if (Z) {
          L(re(Z, { replace: !0, force: !0 }), z).catch(Gn);
          return;
        }
        u = z;
        const de = c.value;
        (pn && Dg(rl(de.fullPath, F.delta), ar()),
          P(z, de)
            .catch((p) =>
              yt(p, ye.NAVIGATION_ABORTED | ye.NAVIGATION_CANCELLED)
                ? p
                : yt(p, ye.NAVIGATION_GUARD_REDIRECT)
                  ? (L(re(w(p.to), { force: !0 }), z)
                      .then((m) => {
                        yt(
                          m,
                          ye.NAVIGATION_ABORTED | ye.NAVIGATION_DUPLICATED
                        ) &&
                          !F.delta &&
                          F.type === lo.pop &&
                          r.go(-1, !1);
                      })
                      .catch(Gn),
                    Promise.reject())
                  : (F.delta && r.go(-F.delta, !1), U(p, z, de))
            )
            .then((p) => {
              ((p = p || O(z, de, !1)),
                p &&
                  (F.delta && !yt(p, ye.NAVIGATION_CANCELLED)
                    ? r.go(-F.delta, !1)
                    : F.type === lo.pop &&
                      yt(p, ye.NAVIGATION_ABORTED | ye.NAVIGATION_DUPLICATED) &&
                      r.go(-1, !1)),
                V(z, de, p));
            })
            .catch(Gn));
      }));
  }
  let se = Hn(),
    B = Hn(),
    G;
  function U(C, W, F) {
    kt(C);
    const z = B.list();
    return (
      z.length ? z.forEach((Z) => Z(C, W, F)) : console.error(C),
      Promise.reject(C)
    );
  }
  function fe() {
    return G && c.value !== qe
      ? Promise.resolve()
      : new Promise((C, W) => {
          se.add([C, W]);
        });
  }
  function kt(C) {
    return (
      G ||
        ((G = !C),
        ee(),
        se.list().forEach(([W, F]) => (C ? F(C) : W())),
        se.reset()),
      C
    );
  }
  function it(C, W, F, z) {
    const { scrollBehavior: Z } = e;
    if (!pn || !Z) return Promise.resolve();
    const de =
      (!F && jg(rl(C.fullPath, 0))) ||
      ((z || !F) && history.state && history.state.scroll) ||
      null;
    return Wt()
      .then(() => Z(C, W, de))
      .then((p) => p && Hg(p))
      .catch((p) => U(p, C, W));
  }
  const Le = (C) => r.go(C);
  let an;
  const cn = new Set(),
    Gt = {
      currentRoute: c,
      listening: !0,
      addRoute: d,
      removeRoute: y,
      clearRoutes: t.clearRoutes,
      hasRoute: T,
      getRoutes: v,
      resolve: S,
      options: e,
      push: _,
      replace: b,
      go: Le,
      back: () => Le(-1),
      forward: () => Le(1),
      beforeEach: o.add,
      beforeResolve: i.add,
      afterEach: l.add,
      onError: B.add,
      isReady: fe,
      install(C) {
        (C.component("RouterLink", hm),
          C.component("RouterView", Kc),
          (C.config.globalProperties.$router = Gt),
          Object.defineProperty(C.config.globalProperties, "$route", {
            enumerable: !0,
            get: () => pe(c)
          }),
          pn &&
            !an &&
            c.value === qe &&
            ((an = !0), _(r.location).catch((z) => {})));
        const W = {};
        for (const z in qe)
          Object.defineProperty(W, z, {
            get: () => c.value[z],
            enumerable: !0
          });
        (C.provide(zo, Gt), C.provide(Yo, ht(W)), C.provide(co, c));
        const F = C.unmount;
        (cn.add(C),
          (C.unmount = function () {
            (cn.delete(C),
              cn.size < 1 &&
                ((u = qe),
                K && K(),
                (K = null),
                (c.value = qe),
                (an = !1),
                (G = !1)),
              F());
          }));
      }
    };
  function Ke(C) {
    return C.reduce((W, F) => W.then(() => A(F)), Promise.resolve());
  }
  return Gt;
}
function Gc(e) {
  return Re(Yo);
}
const ym = /(:\w+)\([^)]+\)/g,
  _m = /(:\w+)[?+*]/g,
  vm = /:\w+/g,
  bm = (e, t) =>
    t.path
      .replace(ym, "$1")
      .replace(_m, "$1")
      .replace(vm, (n) => e.params[n.slice(1)]?.toString() || ""),
  uo = (e, t) => {
    const n = e.route.matched.find(
        (r) => r.components?.default === e.Component.type
      ),
      s = t ?? n?.meta.key ?? (n && bm(e.route, n));
    return typeof s == "function" ? s(e.route) : s;
  },
  wm = (e, t) => ({ default: () => (e ? be(lf, e === !0 ? {} : e, t) : t) });
function Jo(e) {
  return Array.isArray(e) ? e : [e];
}
const Em = "modulepreload",
  Sm = function (e, t) {
    return new URL(e, t).href;
  },
  yl = {},
  cr = function (t, n, s) {
    let r = Promise.resolve();
    if (n && n.length > 0) {
      let u = function (a) {
        return Promise.all(
          a.map((f) =>
            Promise.resolve(f).then(
              (h) => ({ status: "fulfilled", value: h }),
              (h) => ({ status: "rejected", reason: h })
            )
          )
        );
      };
      const i = document.getElementsByTagName("link"),
        l = document.querySelector("meta[property=csp-nonce]"),
        c = l?.nonce || l?.getAttribute("nonce");
      r = u(
        n.map((a) => {
          if (((a = Sm(a, s)), a in yl)) return;
          yl[a] = !0;
          const f = a.endsWith(".css"),
            h = f ? '[rel="stylesheet"]' : "";
          if (s)
            for (let y = i.length - 1; y >= 0; y--) {
              const v = i[y];
              if (v.href === a && (!f || v.rel === "stylesheet")) return;
            }
          else if (document.querySelector(`link[href="${a}"]${h}`)) return;
          const d = document.createElement("link");
          if (
            ((d.rel = f ? "stylesheet" : Em),
            f || (d.as = "script"),
            (d.crossOrigin = ""),
            (d.href = a),
            c && d.setAttribute("nonce", c),
            document.head.appendChild(d),
            f)
          )
            return new Promise((y, v) => {
              (d.addEventListener("load", y),
                d.addEventListener("error", () =>
                  v(new Error(`Unable to preload CSS for ${a}`))
                ));
            });
        })
      );
    }
    function o(i) {
      const l = new Event("vite:preloadError", { cancelable: !0 });
      if (((l.payload = i), window.dispatchEvent(l), !l.defaultPrevented))
        throw i;
    }
    return r.then((i) => {
      for (const l of i || []) l.status === "rejected" && o(l.reason);
      return t().catch(o);
    });
  },
  Nr = [
    {
      name: "index",
      path: "/",
      component: () =>
        cr(
          () => import("./tToSm3dq.js"),
          __vite__mapDeps([0, 1, 2, 3, 4]),
          import.meta.url
        )
    }
  ],
  qc = (e, t) => ({
    default: () => (e ? be(lh, e === !0 ? {} : e, t) : t.default?.())
  }),
  Tm = /(:\w+)\([^)]+\)/g,
  Rm = /(:\w+)[?+*]/g,
  Cm = /:\w+/g;
function _l(e) {
  const t =
    e?.meta.key ??
    e.path
      .replace(Tm, "$1")
      .replace(Rm, "$1")
      .replace(Cm, (n) => e.params[n.slice(1)]?.toString() || "");
  return typeof t == "function" ? t(e) : t;
}
function Am(e, t) {
  return e === t || t === qe
    ? !1
    : _l(e) !== _l(t)
      ? !0
      : !e.matched.every(
          (s, r) =>
            s.components &&
            s.components.default === t.matched[r]?.components?.default
        );
}
function km(e, t = !1) {
  if (e) {
    if (e.nodeName === "#comment" && e.nodeValue === "[") return zc(e, [], t);
    if (t) {
      const n = e.cloneNode(!0);
      return (
        n.querySelectorAll("[data-island-slot]").forEach((s) => {
          s.innerHTML = "";
        }),
        [n.outerHTML]
      );
    }
    return [e.outerHTML];
  }
}
function zc(e, t = [], n = !1) {
  if (e && e.nodeName) {
    if (Pm(e)) return t;
    if (!xm(e)) {
      const s = e.cloneNode(!0);
      (n &&
        s.querySelectorAll?.("[data-island-slot]").forEach((r) => {
          r.innerHTML = "";
        }),
        t.push(s.outerHTML));
    }
    zc(e.nextSibling, t, n);
  }
  return t;
}
function Mr(e, t) {
  const n = e ? km(e) : [t];
  return n ? Gf(n.join(""), n.length) : be("div");
}
function xm(e) {
  return e.nodeName === "#comment" && e.nodeValue === "[";
}
function Pm(e) {
  return e.nodeName === "#comment" && e.nodeValue === "]";
}
const Om = {
  scrollBehavior(e, t, n) {
    const s = _e(),
      r = Ve().options?.scrollBehaviorType ?? "auto";
    if (e.path.replace(/\/$/, "") === t.path.replace(/\/$/, ""))
      return t.hash && !e.hash
        ? { left: 0, top: 0 }
        : e.hash
          ? { el: e.hash, top: Yc(e.hash), behavior: r }
          : !1;
    if (
      (typeof e.meta.scrollToTop == "function"
        ? e.meta.scrollToTop(e, t)
        : e.meta.scrollToTop) === !1
    )
      return !1;
    const i = s._runningTransition
      ? "page:transition:finish"
      : "page:loading:end";
    return new Promise((l) => {
      if (t === qe) {
        l(vl(e, t, n, r));
        return;
      }
      s.hooks.hookOnce(i, () => {
        requestAnimationFrame(() => l(vl(e, t, n, r)));
      });
    });
  }
};
function Yc(e) {
  try {
    const t = document.querySelector(e);
    if (t)
      return (
        (Number.parseFloat(getComputedStyle(t).scrollMarginTop) || 0) +
        (Number.parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop
        ) || 0)
      );
  } catch {}
  return 0;
}
function vl(e, t, n, s) {
  if (n) return n;
  const r = Am(e, t);
  return e.hash
    ? { el: e.hash, top: Yc(e.hash), behavior: r ? s : "instant" }
    : { left: 0, top: 0 };
}
const Nm = { hashMode: !1, scrollBehaviorType: "auto" },
  Pt = { ...Nm, ...Om },
  Mm = async (e, t) => {
    let n, s;
    if (!e.meta?.validate) return;
    const r =
      (([n, s] = Sn(() => Promise.resolve(e.meta.validate(e)))),
      (n = await n),
      s(),
      n);
    if (r === !0) return;
    const o = nn({
      fatal: !0,
      statusCode: (r && r.statusCode) || 404,
      statusMessage: (r && r.statusMessage) || `Page Not Found: ${e.fullPath}`,
      data: { path: e.fullPath }
    });
    return (
      typeof window < "u" && window.history.pushState({}, "", t.fullPath),
      o
    );
  },
  Lm = (e) => {
    const n = {
      "/origin": "#origin",
      "/how": "#how",
      "/strategy": "#strategy",
      "/people": "#people"
    }[e.path];
    if (n) return ip({ path: "/", hash: n }, {});
  },
  Im = async (e) => {
    let t, n;
    const s =
      (([t, n] = Sn(() => Ko({ path: e.path }))), (t = await t), n(), t);
    if (s.redirect) {
      const r = s.redirect.includes("#") ? s.redirect : s.redirect + e.hash;
      return ln(r, { acceptRelative: !0 })
        ? ((window.location.href = r), !1)
        : r;
    }
  },
  Hm = [Mm, Lm, Im],
  fo = {};
function Dm(e, t, n) {
  const { pathname: s, search: r, hash: o } = t,
    i = e.indexOf("#");
  if (i > -1) {
    const u = o.includes(e.slice(i)) ? e.slice(i).length : 1;
    let a = o.slice(u);
    return (a[0] !== "/" && (a = "/" + a), Ii(a, ""));
  }
  const l = Ii(s, e),
    c = !n || ud(l, n) ? l : n;
  return c + (c.includes("?") ? "" : r) + o;
}
const jm = Qe({
    name: "nuxt:router",
    enforce: "pre",
    async setup(e) {
      let t,
        n,
        s = or().app.baseURL;
      const r = Pt.history?.(s) ?? Yg(s),
        o = Pt.routes
          ? (([t, n] = Sn(() => Pt.routes(Nr))), (t = await t), n(), t ?? Nr)
          : Nr;
      let i;
      const l = mm({
        ...Pt,
        scrollBehavior: (T, S, w) => {
          if (S === qe) {
            i = w;
            return;
          }
          if (Pt.scrollBehavior) {
            if (
              ((l.options.scrollBehavior = Pt.scrollBehavior),
              "scrollRestoration" in window.history)
            ) {
              const g = l.beforeEach(() => {
                (g(), (window.history.scrollRestoration = "manual"));
              });
            }
            return Pt.scrollBehavior(T, qe, i || w);
          }
        },
        history: r,
        routes: o
      });
      ("scrollRestoration" in window.history &&
        (window.history.scrollRestoration = "auto"),
        e.vueApp.use(l));
      const c = Ut(l.currentRoute.value);
      (l.afterEach((T, S) => {
        c.value = S;
      }),
        Object.defineProperty(
          e.vueApp.config.globalProperties,
          "previousRoute",
          { get: () => c.value }
        ));
      const u = Dm(s, window.location, e.payload.path),
        a = Ut(l.currentRoute.value),
        f = () => {
          a.value = l.currentRoute.value;
        };
      l.afterEach((T, S) => {
        T.matched.at(-1)?.components?.default ===
          S.matched.at(-1)?.components?.default && f();
      });
      const h = { sync: f };
      for (const T in a.value)
        Object.defineProperty(h, T, { get: () => a.value[T], enumerable: !0 });
      ((e._route = ht(h)), (e._middleware ||= { global: [], named: {} }));
      const d = ir();
      l.afterEach(async (T, S, w) => {
        (delete e._processingMiddleware,
          !e.isHydrating && d.value && (await e.runWithContext(ap)),
          w && (await e.callHook("page:loading:end")));
      });
      try {
        (([t, n] = Sn(() => l.isReady())), await t, n());
      } catch (T) {
        (([t, n] = Sn(() => e.runWithContext(() => Xt(T)))), await t, n());
      }
      const y =
        u !== l.currentRoute.value.fullPath
          ? l.resolve(u)
          : l.currentRoute.value;
      f();
      const v = e.payload.state._layout;
      return (
        l.beforeEach(async (T, S) => {
          (await e.callHook("page:loading:start"),
            (T.meta = Ct(T.meta)),
            e.isHydrating && v && !pt(T.meta.layout) && (T.meta.layout = v),
            (e._processingMiddleware = !0));
          {
            const w = new Set([...Hm, ...e._middleware.global]);
            for (const g of T.matched) {
              const _ = g.meta.middleware;
              if (_) for (const b of Jo(_)) w.add(b);
            }
            {
              const g = await e.runWithContext(() => Ko({ path: T.path }));
              if (g.appMiddleware)
                for (const _ in g.appMiddleware)
                  g.appMiddleware[_] ? w.add(_) : w.delete(_);
            }
            for (const g of w) {
              const _ =
                typeof g == "string"
                  ? e._middleware.named[g] ||
                    (await fo[g]?.().then((b) => b.default || b))
                  : g;
              if (!_) throw new Error(`Unknown route middleware: '${g}'.`);
              try {
                const b = await e.runWithContext(() => _(T, S));
                if (
                  !e.payload.serverRendered &&
                  e.isHydrating &&
                  (b === !1 || b instanceof Error)
                ) {
                  const k =
                    b ||
                    nn({
                      statusCode: 404,
                      statusMessage: `Page Not Found: ${u}`
                    });
                  return (await e.runWithContext(() => Xt(k)), !1);
                }
                if (b === !0) continue;
                if (b === !1) return b;
                if (b)
                  return (
                    bc(b) && b.fatal && (await e.runWithContext(() => Xt(b))),
                    b
                  );
              } catch (b) {
                const k = nn(b);
                return (k.fatal && (await e.runWithContext(() => Xt(k))), k);
              }
            }
          }
        }),
        l.onError(async () => {
          (delete e._processingMiddleware,
            await e.callHook("page:loading:end"));
        }),
        l.afterEach((T) => {
          if (T.matched.length === 0)
            return e.runWithContext(() =>
              Xt(
                nn({
                  statusCode: 404,
                  fatal: !1,
                  statusMessage: `Page not found: ${T.fullPath}`,
                  data: { path: T.fullPath }
                })
              )
            );
        }),
        e.hooks.hookOnce("app:created", async () => {
          try {
            ("name" in y && (y.name = void 0),
              await l.replace({ ...y, force: !0 }),
              (l.options.scrollBehavior = Pt.scrollBehavior));
          } catch (T) {
            await e.runWithContext(() => Xt(T));
          }
        }),
        { provide: { router: l } }
      );
    }
  }),
  bl =
    globalThis.requestIdleCallback ||
    ((e) => {
      const t = Date.now(),
        n = {
          didTimeout: !1,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - t))
        };
      return setTimeout(() => {
        e(n);
      }, 1);
    }),
  Wy =
    globalThis.cancelIdleCallback ||
    ((e) => {
      clearTimeout(e);
    }),
  Xo = (e) => {
    const t = _e();
    t.isHydrating
      ? t.hooks.hookOnce("app:suspense:resolve", () => {
          bl(() => e());
        })
      : bl(() => e());
  },
  Fm = Qe({
    name: "nuxt:payload",
    setup(e) {
      const t = new Set();
      (Ve().beforeResolve(async (n, s) => {
        if (n.path === s.path) return;
        const r = await el(n.path);
        if (r) {
          for (const o of t) delete e.static.data[o];
          for (const o in r.data)
            (o in e.static.data || t.add(o), (e.static.data[o] = r.data[o]));
        }
      }),
        Xo(() => {
          (e.hooks.hook("link:prefetch", async (n) => {
            const { hostname: s } = new URL(n, window.location.href);
            s === window.location.hostname &&
              (await el(n).catch(() => {
                console.warn("[nuxt] Error preloading payload for", n);
              }));
          }),
            navigator.connection?.effectiveType !== "slow-2g" &&
              setTimeout(lr, 1e3));
        }));
    }
  }),
  $m = Qe(() => {
    const e = Ve();
    Xo(() => {
      e.beforeResolve(async () => {
        await new Promise((t) => {
          (setTimeout(t, 100),
            requestAnimationFrame(() => {
              setTimeout(t, 0);
            }));
        });
      });
    });
  }),
  Bm = Qe((e) => {
    let t;
    async function n() {
      let s;
      try {
        s = await lr();
      } catch (r) {
        const o = r;
        if (!("status" in o && (o.status === 404 || o.status === 403))) throw o;
      }
      (t && clearTimeout(t), (t = setTimeout(n, Ui)));
      try {
        const r = await $fetch(Uo("builds/latest.json") + `?${Date.now()}`);
        r.id !== s?.id &&
          (e.hooks.callHook("app:manifest:update", r), t && clearTimeout(t));
      } catch {}
    }
    Xo(() => {
      t = setTimeout(n, Ui);
    });
  });
function Um(e = {}) {
  const t = e.path || window.location.pathname;
  let n = {};
  try {
    n = $s(sessionStorage.getItem("nuxt:reload") || "{}");
  } catch {}
  if (e.force || n?.path !== t || n?.expires < Date.now()) {
    try {
      sessionStorage.setItem(
        "nuxt:reload",
        JSON.stringify({ path: t, expires: Date.now() + (e.ttl ?? 1e4) })
      );
    } catch {}
    if (e.persistState)
      try {
        sessionStorage.setItem(
          "nuxt:reload:state",
          JSON.stringify({ state: _e().payload.state })
        );
      } catch {}
    window.location.pathname !== t
      ? (window.location.href = t)
      : window.location.reload();
  }
}
const Wm = Qe({
    name: "nuxt:chunk-reload",
    setup(e) {
      const t = Ve(),
        n = or(),
        s = new Set();
      (t.beforeEach(() => {
        s.clear();
      }),
        e.hook("app:chunkError", ({ error: o }) => {
          s.add(o);
        }));
      function r(o) {
        const i = $o(n.app.baseURL, o.fullPath);
        Um({ path: i, persistState: !0 });
      }
      (e.hook("app:manifest:update", () => {
        t.beforeResolve(r);
      }),
        t.onError((o, i) => {
          s.has(o) && r(i);
        }));
    }
  }),
  _s = "<div></div>",
  Lr = new WeakMap();
function Vm(e) {
  if (Lr.has(e)) return Lr.get(e);
  const t = { ...e };
  return (
    t.render
      ? (t.render = (n, s, r, o, i, l) => {
          if (o.mounted$ ?? n.mounted$) {
            const c = e.render?.bind(n)(n, s, r, o, i, l);
            return c.children === null || typeof c.children == "string"
              ? Ye(c)
              : be(c);
          }
          return Mr(n._.vnode.el, _s);
        })
      : (t.template &&= `
      <template v-if="mounted$">${e.template}</template>
      <template v-else>${_s}</template>
    `),
    (t.setup = (n, s) => {
      const r = _e(),
        o = Ut(r.isHydrating === !1),
        i = gt();
      if (r.isHydrating) {
        const c = { ...i.attrs },
          u = Km(i);
        for (const a in c) delete i.attrs[a];
        Kt(() => {
          (Object.assign(i.attrs, c), (i.vnode.dirs = u));
        });
      }
      Kt(() => {
        o.value = !0;
      });
      const l = e.setup?.(n, s) || {};
      return mo(l)
        ? Promise.resolve(l).then((c) =>
            typeof c != "function"
              ? ((c ||= {}), (c.mounted$ = o), c)
              : (...u) => {
                  if (o.value || !r.isHydrating) {
                    const a = c(...u);
                    return a.children === null || typeof a.children == "string"
                      ? Ye(a)
                      : be(a);
                  }
                  return Mr(i?.vnode.el, _s);
                }
          )
        : typeof l == "function"
          ? (...c) => {
              if (o.value) {
                const u = l(...c),
                  a = t.inheritAttrs !== !1 ? s.attrs : void 0;
                return u.children === null || typeof u.children == "string"
                  ? Ye(u, a)
                  : be(u, a);
              }
              return Mr(i?.vnode.el, _s);
            }
          : Object.assign(l, { mounted$: o });
    }),
    Lr.set(e, t),
    t
  );
}
function Km(e) {
  if (!e || !e.vnode.dirs) return null;
  const t = e.vnode.dirs;
  return ((e.vnode.dirs = null), t);
}
const Gm = "$s";
function vs(...e) {
  const t = typeof e[e.length - 1] == "string" ? e.pop() : void 0;
  typeof e[0] != "string" && e.unshift(t);
  const [n, s] = e;
  if (!n || typeof n != "string")
    throw new TypeError("[nuxt] [useState] key must be a string: " + n);
  if (s !== void 0 && typeof s != "function")
    throw new Error("[nuxt] [useState] init must be a function: " + s);
  const r = Gm + n,
    o = _e(),
    i = Ql(o.payload.state, r);
  if (i.value === void 0 && s) {
    const l = s();
    if (he(l)) return ((o.payload.state[r] = l), l);
    i.value = l;
  }
  return i;
}
function qm(e) {
  if (e?.__asyncLoader && !e.__asyncResolved) return e.__asyncLoader();
}
async function zm(e, t = Ve()) {
  const { path: n, matched: s } = t.resolve(e);
  if (
    !s.length ||
    ((t._routePreloaded ||= new Set()), t._routePreloaded.has(n))
  )
    return;
  const r = (t._preloadPromises ||= []);
  if (r.length > 4) return Promise.all(r).then(() => zm(e, t));
  t._routePreloaded.add(n);
  for (const o of s) {
    const i = o.components?.default;
    if (typeof i != "function") continue;
    const l = Promise.resolve(i())
      .catch(() => {})
      .finally(() => r.splice(r.indexOf(l)));
    r.push(l);
  }
  await Promise.all(r);
}
const Ym = Qe({
    name: "pinia",
    setup(e) {
      const t = cp();
      return (
        e.vueApp.use(t),
        ls(t),
        e.payload && e.payload.pinia && (t.state.value = e.payload.pinia),
        { provide: { pinia: t } }
      );
    }
  }),
  Jm = fa(() =>
    cr(
      () => import("./WPl0FuOn.js"),
      __vite__mapDeps([2, 3]),
      import.meta.url
    ).then((e) => Vm(e.default || e.default || e))
  ),
  Xm = [["Lottie", Jm]],
  Qm = Qe({
    name: "nuxt:global-components",
    setup(e) {
      for (const [t, n] of Xm)
        (e.vueApp.component(t, n), e.vueApp.component("Lazy" + t, n));
    }
  }),
  jt = {
    default: fa(() =>
      cr(
        () => import("./BYEoHfWb.js"),
        __vite__mapDeps([5, 1, 6]),
        import.meta.url
      ).then((e) => e.default || e)
    )
  },
  Zm = Qe({
    name: "nuxt:prefetch",
    setup(e) {
      const t = Ve();
      (e.hooks.hook("app:mounted", () => {
        t.beforeEach(async (n) => {
          const s = n?.meta?.layout;
          s && typeof jt[s] == "function" && (await jt[s]());
        });
      }),
        e.hooks.hook("link:prefetch", (n) => {
          if (ln(n)) return;
          const s = t.resolve(n);
          if (!s) return;
          const r = s.meta.layout;
          let o = Jo(s.meta.middleware);
          o = o.filter((i) => typeof i == "string");
          for (const i of o) typeof fo[i] == "function" && fo[i]();
          typeof r == "string" && r in jt && qm(jt[r]);
        }));
    }
  }),
  ey = Qe(
    () => (
      cr(() => Promise.resolve({}), __vite__mapDeps([7]), import.meta.url),
      { provide: {} }
    )
  ),
  ty = [rg, ig, fg, jm, Fm, $m, Bm, Wm, Ym, Qm, Zm, ey],
  Jc = (e = "RouteProvider") =>
    Xe({
      name: e,
      props: {
        route: { type: Object, required: !0 },
        vnode: Object,
        vnodeRef: Object,
        renderKey: String,
        trackRootNodes: Boolean
      },
      setup(t) {
        const n = t.renderKey,
          s = t.route,
          r = {};
        for (const o in t.route)
          Object.defineProperty(r, o, {
            get: () => (n === t.renderKey ? t.route[o] : s[o]),
            enumerable: !0
          });
        return (
          $t(rn, ht(r)),
          () => (t.vnode ? be(t.vnode, { ref: t.vnodeRef }) : t.vnode)
        );
      }
    }),
  ny = Jc(),
  wl = new WeakMap(),
  sy = Xe({
    name: "NuxtPage",
    inheritAttrs: !1,
    props: {
      name: { type: String },
      transition: { type: [Boolean, Object], default: void 0 },
      keepalive: { type: [Boolean, Object], default: void 0 },
      route: { type: Object },
      pageKey: { type: [Function, String], default: null }
    },
    setup(e, { attrs: t, slots: n, expose: s }) {
      const r = _e(),
        o = ze(),
        i = Re(rn, null);
      let l;
      s({ pageRef: o });
      const c = Re(_c, null);
      let u;
      const a = r.deferHydration();
      if (r.isHydrating) {
        const h = r.hooks.hookOnce("app:error", a);
        Ve().beforeEach(h);
      }
      e.pageKey &&
        Bt(
          () => e.pageKey,
          (h, d) => {
            h !== d && r.callHook("page:loading:start");
          }
        );
      let f = !1;
      {
        const h = Ve().beforeResolve(() => {
          f = !1;
        });
        rs(() => {
          h();
        });
      }
      return () =>
        be(
          Kc,
          { name: e.name, route: e.route, ...t },
          {
            default: (h) => {
              const d = oy(i, h.route, h.Component),
                y = i && i.matched.length === h.route.matched.length;
              if (!h.Component) {
                if (u && !y) return u;
                a();
                return;
              }
              if (u && c && !c.isCurrent(h.route)) return u;
              if (d && i && (!c || c?.isCurrent(i))) return y ? u : null;
              const v = uo(h, e.pageKey),
                T = iy(i, h.route, h.Component);
              (!r.isHydrating &&
                l === v &&
                !T &&
                Wt(() => {
                  ((f = !0), r.callHook("page:loading:end"));
                }),
                (l = v));
              const S = !!(e.transition ?? h.route.meta.pageTransition ?? $i),
                w =
                  S &&
                  ry([
                    e.transition,
                    h.route.meta.pageTransition,
                    $i,
                    {
                      onAfterLeave() {
                        (delete r._runningTransition,
                          r.callHook("page:transition:finish", h.Component));
                      }
                    }
                  ]),
                g = e.keepalive ?? h.route.meta.keepalive ?? Ud;
              return (
                (u = qc(
                  S && w,
                  wm(
                    g,
                    be(
                      Lo,
                      {
                        suspensible: !0,
                        onPending: () => {
                          (S && (r._runningTransition = !0),
                            r.callHook("page:start", h.Component));
                        },
                        onResolve: async () => {
                          await Wt();
                          try {
                            (r._route.sync?.(),
                              await r.callHook("page:finish", h.Component),
                              delete r._runningTransition,
                              !f &&
                                !T &&
                                ((f = !0),
                                await r.callHook("page:loading:end")));
                          } finally {
                            a();
                          }
                        }
                      },
                      {
                        default: () => {
                          const _ = {
                            key: v || void 0,
                            vnode: n.default ? ly(n.default, h) : h.Component,
                            route: h.route,
                            renderKey: v || void 0,
                            trackRootNodes: S,
                            vnodeRef: o
                          };
                          if (!g) return be(ny, _);
                          const b = h.Component.type,
                            k = b;
                          let L = wl.get(k);
                          return (
                            L || ((L = Jc(b.name || b.__name)), wl.set(k, L)),
                            be(L, _)
                          );
                        }
                      }
                    )
                  )
                ).default()),
                u
              );
            }
          }
        );
    }
  });
function ry(e) {
  const t = [];
  for (const n of e)
    n &&
      t.push({
        ...n,
        onAfterLeave: n.onAfterLeave ? Jo(n.onAfterLeave) : void 0
      });
  return mc(...t);
}
function oy(e, t, n) {
  if (!e) return !1;
  const s = t.matched.findIndex((r) => r.components?.default === n?.type);
  return !s || s === -1
    ? !1
    : t.matched
        .slice(0, s)
        .some(
          (r, o) => r.components?.default !== e.matched[o]?.components?.default
        ) ||
        (n &&
          uo({ route: t, Component: n }) !== uo({ route: e, Component: n }));
}
function iy(e, t, n) {
  return e
    ? t.matched.findIndex((r) => r.components?.default === n?.type) <
        t.matched.length - 1
    : !1;
}
function ly(e, t) {
  const n = e(t);
  return n.length === 1 ? be(n[0]) : be(Ee, void 0, n);
}
const ay = Xe({
    name: "LayoutLoader",
    inheritAttrs: !1,
    props: { name: String, layoutProps: Object },
    setup(e, t) {
      return () => be(jt[e.name], e.layoutProps, t.slots);
    }
  }),
  cy = {
    name: { type: [String, Boolean, Object], default: null },
    fallback: { type: [String, Object], default: null }
  },
  uy = Xe({
    name: "NuxtLayout",
    inheritAttrs: !1,
    props: cy,
    setup(e, t) {
      const n = _e(),
        s = Re(rn),
        o = !s || s === is() ? Gc() : s,
        i = je(() => {
          let a = pe(e.name) ?? o?.meta.layout ?? "default";
          return (a && !(a in jt) && e.fallback && (a = pe(e.fallback)), a);
        }),
        l = Ut();
      t.expose({ layoutRef: l });
      const c = n.deferHydration();
      if (n.isHydrating) {
        const a = n.hooks.hookOnce("app:error", c);
        Ve().beforeEach(a);
      }
      let u;
      return () => {
        const a = i.value && i.value in jt,
          f = o?.meta.layoutTransition ?? Bd,
          h = u;
        return (
          (u = i.value),
          qc(a && f, {
            default: () =>
              be(
                Lo,
                {
                  suspensible: !0,
                  onResolve: () => {
                    Wt(c);
                  }
                },
                {
                  default: () =>
                    be(
                      fy,
                      {
                        layoutProps: Wa(t.attrs, { ref: l }),
                        key: i.value || void 0,
                        name: i.value,
                        shouldProvide: !e.name,
                        isRenderingNewLayout: (d) => d !== h && d === i.value,
                        hasTransition: !!f
                      },
                      t.slots
                    )
                }
              )
          }).default()
        );
      };
    }
  }),
  fy = Xe({
    name: "NuxtLayoutProvider",
    inheritAttrs: !1,
    props: {
      name: { type: [String, Boolean] },
      layoutProps: { type: Object },
      hasTransition: { type: Boolean },
      shouldProvide: { type: Boolean },
      isRenderingNewLayout: { type: Function, required: !0 }
    },
    setup(e, t) {
      const n = e.name;
      e.shouldProvide &&
        $t(_c, { isCurrent: (o) => n === (o.meta.layout ?? "default") });
      const s = Re(rn);
      if (s && s === is()) {
        const o = Gc(),
          i = {};
        for (const l in o) {
          const c = l;
          Object.defineProperty(i, c, {
            enumerable: !0,
            get: () => (e.isRenderingNewLayout(e.name) ? o[c] : s[c])
          });
        }
        $t(rn, ht(i));
      }
      return () =>
        !n || (typeof n == "string" && !(n in jt))
          ? t.slots.default?.()
          : be(ay, { key: n, layoutProps: e.layoutProps, name: n }, t.slots);
    }
  }),
  bs = ["hero", "origin", "how", "strategy", "people", "contacts"],
  Vy = [
    { label: "Home", hash: "#hero" },
    { label: "Origin", hash: "#origin" },
    { label: "How blink works", hash: "#how" },
    { label: "Strategy", hash: "#strategy" },
    { label: "The people behind it", hash: "#people" },
    { label: "Contacts", hash: "#contacts" }
  ],
  Xc = gp("store", {
    state: () => ({
      showMenu: !1,
      showSkip: !1,
      backgroundAnimationStep: null,
      activeSection: "hero",
      teleporting: !1,
      navigating: !1,
      heroProgress: 0,
      mobile: !1,
      lenisData: { progress: 0, velocity: 0, scroll: 0, limit: 0 }
    }),
    actions: {
      updateScrollData(e) {
        this.lenisData = e;
      },
      checkMobile() {
        this.mobile = window.innerWidth < 767;
      }
    }
  });
var hy = "1.3.16";
function Qc(e, t, n) {
  return Math.max(e, Math.min(t, n));
}
function dy(e, t, n) {
  return (1 - n) * e + n * t;
}
function py(e, t, n, s) {
  return dy(e, t, 1 - Math.exp(-n * s));
}
function gy(e, t) {
  return ((e % t) + t) % t;
}
var my = class {
  isRunning = !1;
  value = 0;
  from = 0;
  to = 0;
  currentTime = 0;
  lerp;
  duration;
  easing;
  onUpdate;
  advance(e) {
    if (!this.isRunning) return;
    let t = !1;
    if (this.duration && this.easing) {
      this.currentTime += e;
      const n = Qc(0, this.currentTime / this.duration, 1);
      t = n >= 1;
      const s = t ? 1 : this.easing(n);
      this.value = this.from + (this.to - this.from) * s;
    } else
      this.lerp
        ? ((this.value = py(this.value, this.to, this.lerp * 60, e)),
          Math.round(this.value) === this.to &&
            ((this.value = this.to), (t = !0)))
        : ((this.value = this.to), (t = !0));
    (t && this.stop(), this.onUpdate?.(this.value, t));
  }
  stop() {
    this.isRunning = !1;
  }
  fromTo(e, t, { lerp: n, duration: s, easing: r, onStart: o, onUpdate: i }) {
    ((this.from = this.value = e),
      (this.to = t),
      (this.lerp = n),
      (this.duration = s),
      (this.easing = r),
      (this.currentTime = 0),
      (this.isRunning = !0),
      o?.(),
      (this.onUpdate = i));
  }
};
function yy(e, t) {
  let n;
  return function (...s) {
    let r = this;
    (clearTimeout(n),
      (n = setTimeout(() => {
        ((n = void 0), e.apply(r, s));
      }, t)));
  };
}
var _y = class {
    constructor(e, t, { autoResize: n = !0, debounce: s = 250 } = {}) {
      ((this.wrapper = e),
        (this.content = t),
        n &&
          ((this.debouncedResize = yy(this.resize, s)),
          this.wrapper instanceof Window
            ? window.addEventListener("resize", this.debouncedResize, !1)
            : ((this.wrapperResizeObserver = new ResizeObserver(
                this.debouncedResize
              )),
              this.wrapperResizeObserver.observe(this.wrapper)),
          (this.contentResizeObserver = new ResizeObserver(
            this.debouncedResize
          )),
          this.contentResizeObserver.observe(this.content)),
        this.resize());
    }
    width = 0;
    height = 0;
    scrollHeight = 0;
    scrollWidth = 0;
    debouncedResize;
    wrapperResizeObserver;
    contentResizeObserver;
    destroy() {
      (this.wrapperResizeObserver?.disconnect(),
        this.contentResizeObserver?.disconnect(),
        this.wrapper === window &&
          this.debouncedResize &&
          window.removeEventListener("resize", this.debouncedResize, !1));
    }
    resize = () => {
      (this.onWrapperResize(), this.onContentResize());
    };
    onWrapperResize = () => {
      this.wrapper instanceof Window
        ? ((this.width = window.innerWidth), (this.height = window.innerHeight))
        : ((this.width = this.wrapper.clientWidth),
          (this.height = this.wrapper.clientHeight));
    };
    onContentResize = () => {
      this.wrapper instanceof Window
        ? ((this.scrollHeight = this.content.scrollHeight),
          (this.scrollWidth = this.content.scrollWidth))
        : ((this.scrollHeight = this.wrapper.scrollHeight),
          (this.scrollWidth = this.wrapper.scrollWidth));
    };
    get limit() {
      return {
        x: this.scrollWidth - this.width,
        y: this.scrollHeight - this.height
      };
    }
  },
  Zc = class {
    events = {};
    emit(e, ...t) {
      let n = this.events[e] || [];
      for (let s = 0, r = n.length; s < r; s++) n[s]?.(...t);
    }
    on(e, t) {
      return (
        this.events[e]?.push(t) || (this.events[e] = [t]),
        () => {
          this.events[e] = this.events[e]?.filter((n) => t !== n);
        }
      );
    }
    off(e, t) {
      this.events[e] = this.events[e]?.filter((n) => t !== n);
    }
    destroy() {
      this.events = {};
    }
  },
  El = 100 / 6,
  Ot = { passive: !1 },
  vy = class {
    constructor(e, t = { wheelMultiplier: 1, touchMultiplier: 1 }) {
      ((this.element = e),
        (this.options = t),
        window.addEventListener("resize", this.onWindowResize, !1),
        this.onWindowResize(),
        this.element.addEventListener("wheel", this.onWheel, Ot),
        this.element.addEventListener("touchstart", this.onTouchStart, Ot),
        this.element.addEventListener("touchmove", this.onTouchMove, Ot),
        this.element.addEventListener("touchend", this.onTouchEnd, Ot));
    }
    touchStart = { x: 0, y: 0 };
    lastDelta = { x: 0, y: 0 };
    window = { width: 0, height: 0 };
    emitter = new Zc();
    on(e, t) {
      return this.emitter.on(e, t);
    }
    destroy() {
      (this.emitter.destroy(),
        window.removeEventListener("resize", this.onWindowResize, !1),
        this.element.removeEventListener("wheel", this.onWheel, Ot),
        this.element.removeEventListener("touchstart", this.onTouchStart, Ot),
        this.element.removeEventListener("touchmove", this.onTouchMove, Ot),
        this.element.removeEventListener("touchend", this.onTouchEnd, Ot));
    }
    onTouchStart = (e) => {
      const { clientX: t, clientY: n } = e.targetTouches
        ? e.targetTouches[0]
        : e;
      ((this.touchStart.x = t),
        (this.touchStart.y = n),
        (this.lastDelta = { x: 0, y: 0 }),
        this.emitter.emit("scroll", { deltaX: 0, deltaY: 0, event: e }));
    };
    onTouchMove = (e) => {
      const { clientX: t, clientY: n } = e.targetTouches
          ? e.targetTouches[0]
          : e,
        s = -(t - this.touchStart.x) * this.options.touchMultiplier,
        r = -(n - this.touchStart.y) * this.options.touchMultiplier;
      ((this.touchStart.x = t),
        (this.touchStart.y = n),
        (this.lastDelta = { x: s, y: r }),
        this.emitter.emit("scroll", { deltaX: s, deltaY: r, event: e }));
    };
    onTouchEnd = (e) => {
      this.emitter.emit("scroll", {
        deltaX: this.lastDelta.x,
        deltaY: this.lastDelta.y,
        event: e
      });
    };
    onWheel = (e) => {
      let { deltaX: t, deltaY: n, deltaMode: s } = e;
      const r = s === 1 ? El : s === 2 ? this.window.width : 1,
        o = s === 1 ? El : s === 2 ? this.window.height : 1;
      ((t *= r),
        (n *= o),
        (t *= this.options.wheelMultiplier),
        (n *= this.options.wheelMultiplier),
        this.emitter.emit("scroll", { deltaX: t, deltaY: n, event: e }));
    };
    onWindowResize = () => {
      this.window = { width: window.innerWidth, height: window.innerHeight };
    };
  },
  Sl = (e) => Math.min(1, 1.001 - Math.pow(2, -10 * e)),
  by = class {
    _isScrolling = !1;
    _isStopped = !1;
    _isLocked = !1;
    _preventNextNativeScrollEvent = !1;
    _resetVelocityTimeout = null;
    __rafID = null;
    isTouching;
    time = 0;
    userData = {};
    lastVelocity = 0;
    velocity = 0;
    direction = 0;
    options;
    targetScroll;
    animatedScroll;
    animate = new my();
    emitter = new Zc();
    dimensions;
    virtualScroll;
    constructor({
      wrapper: e = window,
      content: t = document.documentElement,
      eventsTarget: n = e,
      smoothWheel: s = !0,
      syncTouch: r = !1,
      syncTouchLerp: o = 0.075,
      touchInertiaExponent: i = 1.7,
      duration: l,
      easing: c,
      lerp: u = 0.1,
      infinite: a = !1,
      orientation: f = "vertical",
      gestureOrientation: h = f === "horizontal" ? "both" : "vertical",
      touchMultiplier: d = 1,
      wheelMultiplier: y = 1,
      autoResize: v = !0,
      prevent: T,
      virtualScroll: S,
      overscroll: w = !0,
      autoRaf: g = !1,
      anchors: _ = !1,
      autoToggle: b = !1,
      allowNestedScroll: k = !1,
      __experimental__naiveDimensions: L = !1
    } = {}) {
      ((window.lenisVersion = hy),
        (!e || e === document.documentElement) && (e = window),
        typeof l == "number" && typeof c != "function"
          ? (c = Sl)
          : typeof c == "function" && typeof l != "number" && (l = 1),
        (this.options = {
          wrapper: e,
          content: t,
          eventsTarget: n,
          smoothWheel: s,
          syncTouch: r,
          syncTouchLerp: o,
          touchInertiaExponent: i,
          duration: l,
          easing: c,
          lerp: u,
          infinite: a,
          gestureOrientation: h,
          orientation: f,
          touchMultiplier: d,
          wheelMultiplier: y,
          autoResize: v,
          prevent: T,
          virtualScroll: S,
          overscroll: w,
          autoRaf: g,
          anchors: _,
          autoToggle: b,
          allowNestedScroll: k,
          __experimental__naiveDimensions: L
        }),
        (this.dimensions = new _y(e, t, { autoResize: v })),
        this.updateClassName(),
        (this.targetScroll = this.animatedScroll = this.actualScroll),
        this.options.wrapper.addEventListener(
          "scroll",
          this.onNativeScroll,
          !1
        ),
        this.options.wrapper.addEventListener("scrollend", this.onScrollEnd, {
          capture: !0
        }),
        this.options.anchors &&
          this.options.wrapper === window &&
          this.options.wrapper.addEventListener("click", this.onClick, !1),
        this.options.wrapper.addEventListener(
          "pointerdown",
          this.onPointerDown,
          !1
        ),
        (this.virtualScroll = new vy(n, {
          touchMultiplier: d,
          wheelMultiplier: y
        })),
        this.virtualScroll.on("scroll", this.onVirtualScroll),
        this.options.autoToggle &&
          (this.checkOverflow(),
          this.rootElement.addEventListener(
            "transitionend",
            this.onTransitionEnd,
            { passive: !0 }
          )),
        this.options.autoRaf &&
          (this.__rafID = requestAnimationFrame(this.raf)));
    }
    destroy() {
      (this.emitter.destroy(),
        this.options.wrapper.removeEventListener(
          "scroll",
          this.onNativeScroll,
          !1
        ),
        this.options.wrapper.removeEventListener(
          "scrollend",
          this.onScrollEnd,
          { capture: !0 }
        ),
        this.options.wrapper.removeEventListener(
          "pointerdown",
          this.onPointerDown,
          !1
        ),
        this.options.anchors &&
          this.options.wrapper === window &&
          this.options.wrapper.removeEventListener("click", this.onClick, !1),
        this.virtualScroll.destroy(),
        this.dimensions.destroy(),
        this.cleanUpClassName(),
        this.__rafID && cancelAnimationFrame(this.__rafID));
    }
    on(e, t) {
      return this.emitter.on(e, t);
    }
    off(e, t) {
      return this.emitter.off(e, t);
    }
    onScrollEnd = (e) => {
      e instanceof CustomEvent ||
        ((this.isScrolling === "smooth" || this.isScrolling === !1) &&
          e.stopPropagation());
    };
    dispatchScrollendEvent = () => {
      this.options.wrapper.dispatchEvent(
        new CustomEvent("scrollend", {
          bubbles: this.options.wrapper === window,
          detail: { lenisScrollEnd: !0 }
        })
      );
    };
    get overflow() {
      const e = this.isHorizontal ? "overflow-x" : "overflow-y";
      return getComputedStyle(this.rootElement)[e];
    }
    checkOverflow() {
      ["hidden", "clip"].includes(this.overflow)
        ? this.internalStop()
        : this.internalStart();
    }
    onTransitionEnd = (e) => {
      e.propertyName.includes("overflow") && this.checkOverflow();
    };
    setScroll(e) {
      this.isHorizontal
        ? this.options.wrapper.scrollTo({ left: e, behavior: "instant" })
        : this.options.wrapper.scrollTo({ top: e, behavior: "instant" });
    }
    onClick = (e) => {
      const n = e
        .composedPath()
        .find(
          (s) =>
            s instanceof HTMLAnchorElement &&
            s.getAttribute("href")?.includes("#")
        );
      if (n) {
        const s = n.getAttribute("href");
        if (s) {
          const r =
              typeof this.options.anchors == "object" && this.options.anchors
                ? this.options.anchors
                : void 0,
            o = `#${s.split("#")[1]}`;
          this.scrollTo(o, r);
        }
      }
    };
    onPointerDown = (e) => {
      e.button === 1 && this.reset();
    };
    onVirtualScroll = (e) => {
      if (
        typeof this.options.virtualScroll == "function" &&
        this.options.virtualScroll(e) === !1
      )
        return;
      const { deltaX: t, deltaY: n, event: s } = e;
      if (
        (this.emitter.emit("virtual-scroll", {
          deltaX: t,
          deltaY: n,
          event: s
        }),
        s.ctrlKey || s.lenisStopPropagation)
      )
        return;
      const r = s.type.includes("touch"),
        o = s.type.includes("wheel");
      this.isTouching = s.type === "touchstart" || s.type === "touchmove";
      const i = t === 0 && n === 0;
      if (
        this.options.syncTouch &&
        r &&
        s.type === "touchstart" &&
        i &&
        !this.isStopped &&
        !this.isLocked
      ) {
        this.reset();
        return;
      }
      const c =
        (this.options.gestureOrientation === "vertical" && n === 0) ||
        (this.options.gestureOrientation === "horizontal" && t === 0);
      if (i || c) return;
      let u = s.composedPath();
      u = u.slice(0, u.indexOf(this.rootElement));
      const a = this.options.prevent;
      if (
        u.find(
          (T) =>
            T instanceof HTMLElement &&
            ((typeof a == "function" && a?.(T)) ||
              T.hasAttribute?.("data-lenis-prevent") ||
              (r && T.hasAttribute?.("data-lenis-prevent-touch")) ||
              (o && T.hasAttribute?.("data-lenis-prevent-wheel")) ||
              (this.options.allowNestedScroll &&
                this.checkNestedScroll(T, { deltaX: t, deltaY: n })))
        )
      )
        return;
      if (this.isStopped || this.isLocked) {
        s.cancelable && s.preventDefault();
        return;
      }
      if (!((this.options.syncTouch && r) || (this.options.smoothWheel && o))) {
        ((this.isScrolling = "native"),
          this.animate.stop(),
          (s.lenisStopPropagation = !0));
        return;
      }
      let h = n;
      (this.options.gestureOrientation === "both"
        ? (h = Math.abs(n) > Math.abs(t) ? n : t)
        : this.options.gestureOrientation === "horizontal" && (h = t),
        (!this.options.overscroll ||
          this.options.infinite ||
          (this.options.wrapper !== window &&
            this.limit > 0 &&
            ((this.animatedScroll > 0 && this.animatedScroll < this.limit) ||
              (this.animatedScroll === 0 && n > 0) ||
              (this.animatedScroll === this.limit && n < 0)))) &&
          (s.lenisStopPropagation = !0),
        s.cancelable && s.preventDefault());
      const d = r && this.options.syncTouch,
        v = r && s.type === "touchend";
      (v &&
        (h =
          Math.sign(this.velocity) *
          Math.pow(Math.abs(this.velocity), this.options.touchInertiaExponent)),
        this.scrollTo(this.targetScroll + h, {
          programmatic: !1,
          ...(d
            ? { lerp: v ? this.options.syncTouchLerp : 1 }
            : {
                lerp: this.options.lerp,
                duration: this.options.duration,
                easing: this.options.easing
              })
        }));
    };
    resize() {
      (this.dimensions.resize(),
        (this.animatedScroll = this.targetScroll = this.actualScroll),
        this.emit());
    }
    emit() {
      this.emitter.emit("scroll", this);
    }
    onNativeScroll = () => {
      if (
        (this._resetVelocityTimeout !== null &&
          (clearTimeout(this._resetVelocityTimeout),
          (this._resetVelocityTimeout = null)),
        this._preventNextNativeScrollEvent)
      ) {
        this._preventNextNativeScrollEvent = !1;
        return;
      }
      if (this.isScrolling === !1 || this.isScrolling === "native") {
        const e = this.animatedScroll;
        ((this.animatedScroll = this.targetScroll = this.actualScroll),
          (this.lastVelocity = this.velocity),
          (this.velocity = this.animatedScroll - e),
          (this.direction = Math.sign(this.animatedScroll - e)),
          this.isStopped || (this.isScrolling = "native"),
          this.emit(),
          this.velocity !== 0 &&
            (this._resetVelocityTimeout = setTimeout(() => {
              ((this.lastVelocity = this.velocity),
                (this.velocity = 0),
                (this.isScrolling = !1),
                this.emit());
            }, 400)));
      }
    };
    reset() {
      ((this.isLocked = !1),
        (this.isScrolling = !1),
        (this.animatedScroll = this.targetScroll = this.actualScroll),
        (this.lastVelocity = this.velocity = 0),
        this.animate.stop());
    }
    start() {
      if (this.isStopped) {
        if (this.options.autoToggle) {
          this.rootElement.style.removeProperty("overflow");
          return;
        }
        this.internalStart();
      }
    }
    internalStart() {
      this.isStopped && (this.reset(), (this.isStopped = !1), this.emit());
    }
    stop() {
      if (!this.isStopped) {
        if (this.options.autoToggle) {
          this.rootElement.style.setProperty("overflow", "clip");
          return;
        }
        this.internalStop();
      }
    }
    internalStop() {
      this.isStopped || (this.reset(), (this.isStopped = !0), this.emit());
    }
    raf = (e) => {
      const t = e - (this.time || e);
      ((this.time = e),
        this.animate.advance(t * 0.001),
        this.options.autoRaf &&
          (this.__rafID = requestAnimationFrame(this.raf)));
    };
    scrollTo(
      e,
      {
        offset: t = 0,
        immediate: n = !1,
        lock: s = !1,
        duration: r = this.options.duration,
        easing: o = this.options.easing,
        lerp: i = this.options.lerp,
        onStart: l,
        onComplete: c,
        force: u = !1,
        programmatic: a = !0,
        userData: f
      } = {}
    ) {
      if (!((this.isStopped || this.isLocked) && !u)) {
        if (typeof e == "string" && ["top", "left", "start", "#"].includes(e))
          e = 0;
        else if (typeof e == "string" && ["bottom", "right", "end"].includes(e))
          e = this.limit;
        else {
          let h;
          if (
            (typeof e == "string"
              ? ((h = document.querySelector(e)),
                h ||
                  (e === "#top"
                    ? (e = 0)
                    : console.warn("Lenis: Target not found", e)))
              : e instanceof HTMLElement && e?.nodeType && (h = e),
            h)
          ) {
            if (this.options.wrapper !== window) {
              const y = this.rootElement.getBoundingClientRect();
              t -= this.isHorizontal ? y.left : y.top;
            }
            const d = h.getBoundingClientRect();
            e = (this.isHorizontal ? d.left : d.top) + this.animatedScroll;
          }
        }
        if (typeof e == "number") {
          if (((e += t), (e = Math.round(e)), this.options.infinite)) {
            if (a) {
              this.targetScroll = this.animatedScroll = this.scroll;
              const h = e - this.animatedScroll;
              h > this.limit / 2
                ? (e = e - this.limit)
                : h < -this.limit / 2 && (e = e + this.limit);
            }
          } else e = Qc(0, e, this.limit);
          if (e === this.targetScroll) {
            (l?.(this), c?.(this));
            return;
          }
          if (((this.userData = f ?? {}), n)) {
            ((this.animatedScroll = this.targetScroll = e),
              this.setScroll(this.scroll),
              this.reset(),
              this.preventNextNativeScrollEvent(),
              this.emit(),
              c?.(this),
              (this.userData = {}),
              requestAnimationFrame(() => {
                this.dispatchScrollendEvent();
              }));
            return;
          }
          (a || (this.targetScroll = e),
            typeof r == "number" && typeof o != "function"
              ? (o = Sl)
              : typeof o == "function" && typeof r != "number" && (r = 1),
            this.animate.fromTo(this.animatedScroll, e, {
              duration: r,
              easing: o,
              lerp: i,
              onStart: () => {
                (s && (this.isLocked = !0),
                  (this.isScrolling = "smooth"),
                  l?.(this));
              },
              onUpdate: (h, d) => {
                ((this.isScrolling = "smooth"),
                  (this.lastVelocity = this.velocity),
                  (this.velocity = h - this.animatedScroll),
                  (this.direction = Math.sign(this.velocity)),
                  (this.animatedScroll = h),
                  this.setScroll(this.scroll),
                  a && (this.targetScroll = h),
                  d || this.emit(),
                  d &&
                    (this.reset(),
                    this.emit(),
                    c?.(this),
                    (this.userData = {}),
                    requestAnimationFrame(() => {
                      this.dispatchScrollendEvent();
                    }),
                    this.preventNextNativeScrollEvent()));
              }
            }));
        }
      }
    }
    preventNextNativeScrollEvent() {
      ((this._preventNextNativeScrollEvent = !0),
        requestAnimationFrame(() => {
          this._preventNextNativeScrollEvent = !1;
        }));
    }
    checkNestedScroll(e, { deltaX: t, deltaY: n }) {
      const s = Date.now(),
        r = (e._lenis ??= {});
      let o, i, l, c, u, a, f, h;
      const d = this.options.gestureOrientation;
      if (s - (r.time ?? 0) > 2e3) {
        r.time = Date.now();
        const b = window.getComputedStyle(e);
        r.computedStyle = b;
        const k = b.overflowX,
          L = b.overflowY;
        if (
          ((o = ["auto", "overlay", "scroll"].includes(k)),
          (i = ["auto", "overlay", "scroll"].includes(L)),
          (r.hasOverflowX = o),
          (r.hasOverflowY = i),
          (!o && !i) || (d === "vertical" && !i) || (d === "horizontal" && !o))
        )
          return !1;
        ((u = e.scrollWidth),
          (a = e.scrollHeight),
          (f = e.clientWidth),
          (h = e.clientHeight),
          (l = u > f),
          (c = a > h),
          (r.isScrollableX = l),
          (r.isScrollableY = c),
          (r.scrollWidth = u),
          (r.scrollHeight = a),
          (r.clientWidth = f),
          (r.clientHeight = h));
      } else
        ((l = r.isScrollableX),
          (c = r.isScrollableY),
          (o = r.hasOverflowX),
          (i = r.hasOverflowY),
          (u = r.scrollWidth),
          (a = r.scrollHeight),
          (f = r.clientWidth),
          (h = r.clientHeight));
      if (
        (!o && !i) ||
        (!l && !c) ||
        (d === "vertical" && (!i || !c)) ||
        (d === "horizontal" && (!o || !l))
      )
        return !1;
      let y;
      if (d === "horizontal") y = "x";
      else if (d === "vertical") y = "y";
      else {
        const b = t !== 0,
          k = n !== 0;
        (b && o && l && (y = "x"), k && i && c && (y = "y"));
      }
      if (!y) return !1;
      let v, T, S, w, g;
      if (y === "x")
        ((v = e.scrollLeft), (T = u - f), (S = t), (w = o), (g = l));
      else if (y === "y")
        ((v = e.scrollTop), (T = a - h), (S = n), (w = i), (g = c));
      else return !1;
      return (S > 0 ? v < T : v > 0) && w && g;
    }
    get rootElement() {
      return this.options.wrapper === window
        ? document.documentElement
        : this.options.wrapper;
    }
    get limit() {
      return this.options.__experimental__naiveDimensions
        ? this.isHorizontal
          ? this.rootElement.scrollWidth - this.rootElement.clientWidth
          : this.rootElement.scrollHeight - this.rootElement.clientHeight
        : this.dimensions.limit[this.isHorizontal ? "x" : "y"];
    }
    get isHorizontal() {
      return this.options.orientation === "horizontal";
    }
    get actualScroll() {
      const e = this.options.wrapper;
      return this.isHorizontal
        ? (e.scrollX ?? e.scrollLeft)
        : (e.scrollY ?? e.scrollTop);
    }
    get scroll() {
      return this.options.infinite
        ? gy(this.animatedScroll, this.limit)
        : this.animatedScroll;
    }
    get progress() {
      return this.limit === 0 ? 1 : this.scroll / this.limit;
    }
    get isScrolling() {
      return this._isScrolling;
    }
    set isScrolling(e) {
      this._isScrolling !== e &&
        ((this._isScrolling = e), this.updateClassName());
    }
    get isStopped() {
      return this._isStopped;
    }
    set isStopped(e) {
      this._isStopped !== e && ((this._isStopped = e), this.updateClassName());
    }
    get isLocked() {
      return this._isLocked;
    }
    set isLocked(e) {
      this._isLocked !== e && ((this._isLocked = e), this.updateClassName());
    }
    get isSmooth() {
      return this.isScrolling === "smooth";
    }
    get className() {
      let e = "lenis";
      return (
        this.options.autoToggle && (e += " lenis-autoToggle"),
        this.isStopped && (e += " lenis-stopped"),
        this.isLocked && (e += " lenis-locked"),
        this.isScrolling && (e += " lenis-scrolling"),
        this.isScrolling === "smooth" && (e += " lenis-smooth"),
        e
      );
    }
    updateClassName() {
      (this.cleanUpClassName(),
        (this.rootElement.className =
          `${this.rootElement.className} ${this.className}`.trim()));
    }
    cleanUpClassName() {
      this.rootElement.className = this.rootElement.className
        .replace(/lenis(-\w+)?/g, "")
        .trim();
    }
  };
const wy = () => {
    const e = vs("lenis", () => null),
      t = vs("lenis-progress", () => 0),
      n = vs("lenis-velocity", () => 0),
      s = vs("lenis-scrolling", () => !1);
    return {
      lenis: e,
      scrollProgress: t,
      scrollVelocity: n,
      isScrolling: s,
      initLenis: (u) => {
        if (typeof window > "u") return;
        if (e.value) return e.value;
        const a = new by({
          duration: 1.2,
          easing: (h) => Math.min(1, 1.001 - Math.pow(2, -10 * h)),
          orientation: "vertical",
          gestureOrientation: "vertical",
          smoothWheel: !0,
          wheelMultiplier: 1,
          touchMultiplier: 2,
          infinite: !1,
          autoResize: !0,
          ...u
        });
        ((e.value = a),
          a.on("scroll", (h) => {
            ((t.value = h.progress), (n.value = h.velocity), (s.value = !0));
          }));
        const f = (h) => {
          (a.raf(h), requestAnimationFrame(f));
        };
        return (
          requestAnimationFrame(f),
          console.log("🎯 Lenis initialized"),
          a
        );
      },
      destroyLenis: () => {
        e.value &&
          (e.value.destroy(),
          (e.value = null),
          console.log("🗑️ Lenis destroyed"));
      },
      scrollTo: (u, a) => {
        e.value && e.value.scrollTo(u, a);
      },
      stop: () => {
        e.value && e.value.stop();
      },
      start: () => {
        e.value && e.value.start();
      }
    };
  },
  Ey = Xe({
    __name: "app",
    setup(e) {
      const t = Xc(),
        n = is(),
        { initLenis: s, destroyLenis: r, lenis: o, scrollTo: i } = wy();
      Zp({
        link: [
          {
            rel: "preload",
            href: "/fonts/GuidaMonoPro-Regular.woff2",
            as: "font",
            type: "font/woff2",
            crossorigin: ""
          },
          {
            rel: "preload",
            href: "/fonts/NibPro-Regular.woff2",
            as: "font",
            type: "font/woff2",
            crossorigin: ""
          },
          { rel: "preload", href: "/images/image.png", as: "image" },
          { rel: "preload", href: "/images/story.png", as: "image" }
        ]
      });
      const l = (u) => {
        const a = bs.indexOf(t.activeSection);
        if (a === -1) return;
        let f;
        (["ArrowDown", "ArrowRight", "PageDown"].includes(u.key)
          ? (f = bs[a + 1])
          : ["ArrowUp", "ArrowLeft", "PageUp"].includes(u.key) &&
            (f = bs[a - 1]),
          f &&
            (u.preventDefault(),
            (t.navigating = !0),
            i("#" + f),
            setTimeout(() => (t.navigating = !1), 1400)));
      };
      let c = null;
      return (
        Kt(() => {
          (s({
            duration: 1.2,
            easing: (u) => Math.min(1, 1.001 - Math.pow(2, -10 * u)),
            smoothWheel: !0,
            syncTouch: !0,
            wheelMultiplier: 1,
            touchMultiplier: 2
          }),
            o.value &&
              o.value.on("scroll", (u) => {
                t.updateScrollData({
                  progress: u.progress,
                  velocity: u.velocity,
                  scroll: u.scroll,
                  limit: u.limit
                });
              }),
            n.hash &&
              n.hash !== "#hero" &&
              Wt(() => i(n.hash, { immediate: !0, force: !0 })),
            (c = new IntersectionObserver(
              (u) => {
                u.forEach((a) => {
                  a.isIntersecting && (t.activeSection = a.target.id);
                });
              },
              { rootMargin: "-50% 0px -50% 0px" }
            )),
            bs.forEach((u) => {
              const a = document.getElementById(u);
              a && c?.observe(a);
            }),
            addEventListener("keydown", l),
            addEventListener("resize", t.checkMobile),
            t.checkMobile());
        }),
        tr(() => {
          (r(),
            c?.disconnect(),
            removeEventListener("keydown", l),
            removeEventListener("resize", t.checkMobile));
        }),
        (u, a) => {
          const f = sy,
            h = uy;
          return (De(), ft(h, null, { default: Ao(() => [ge(f)]), _: 1 }));
        }
      );
    }
  }),
  Sy = Wo("/videos/3000.mp4"),
  Ty = Xe({
    __name: "VideoBackground",
    setup(e) {
      const t = ze(null);
      return (
        Kt(() => {
          t.value &&
            t.value.play().catch((n) => {
              console.warn("Video autoplay failed:", n);
            });
        }),
        (n, s) => (
          De(),
          Io(
            "video",
            {
              ref_key: "videoRef",
              ref: t,
              autoplay: "",
              loop: "",
              muted: "",
              playsinline: "",
              class: "video-background"
            },
            [
              ...(s[0] ||
                (s[0] = [
                  Ho("source", { src: Sy, type: "video/mp4" }, null, -1),
                  Do(" Your browser does not support the video. ", -1)
                ]))
            ],
            512
          )
        )
      );
    }
  }),
  eu = (e, t) => {
    const n = e.__vccOpts || e;
    for (const [s, r] of t) n[s] = r;
    return n;
  },
  Ry = Object.assign(eu(Ty, [["__scopeId", "data-v-fe4cedff"]]), {
    __name: "OtherVideoBackground"
  }),
  Cy = { key: 0, class: "app-background" },
  Ay = Xe({
    __name: "AppBackground",
    setup(e) {
      const t = Xc(),
        n = je(() => {
          if (t.backgroundAnimationStep !== "scrub") return;
          const s = t.heroProgress,
            r = Math.min(Math.max((1 - s) / 0.3, 0), 1);
          return {
            transform: t.mobile
              ? `scale(${2 + s * 0.8}) translateY(-7%)`
              : `scale(${1.3 + s * 0.5})`,
            opacity: r,
            visibility: r === 0 ? "hidden" : void 0
          };
        });
      return (s, r) =>
        pe(t).backgroundAnimationStep
          ? (De(),
            Io("div", Cy, [
              ge(
                Ry,
                {
                  class: Xs([
                    "app-background__effect",
                    pe(t).backgroundAnimationStep
                  ]),
                  style: Js(pe(n))
                },
                null,
                8,
                ["class", "style"]
              )
            ]))
          : qf("", !0);
    }
  }),
  ky = Object.assign(eu(Ay, [["__scopeId", "data-v-49ca3061"]]), {
    __name: "BaseAppBackground"
  }),
  xy = Xe({
    __name: "error",
    setup(e) {
      return (t, n) => (De(), ft(ky));
    }
  }),
  Py = { key: 0 },
  Tl = {
    __name: "nuxt-root",
    setup(e) {
      const t = () => null,
        n = _e(),
        s = n.deferHydration();
      if (n.isHydrating) {
        const u = n.hooks.hookOnce("app:error", s);
        Ve().beforeEach(u);
      }
      const r = !1;
      ($t(rn, is()),
        n.hooks.callHookWith((u) => u.map((a) => a()), "vue:setup"));
      const o = ir(),
        i = !1,
        l = /bot\b|chrome-lighthouse|facebookexternalhit|google\b/i;
      ma((u, a, f) => {
        if (
          (n.hooks
            .callHook("vue:error", u, a, f)
            .catch((h) => console.error("[nuxt] Error in `vue:error` hook", h)),
          l.test(navigator.userAgent))
        )
          return (
            n.hooks.callHook("app:error", u),
            console.error(
              `[nuxt] Not rendering error page for bot with user agent \`${navigator.userAgent}\`:`,
              u
            ),
            !1
          );
        if (bc(u) && (u.fatal || u.unhandled))
          return (n.runWithContext(() => Xt(u)), !1);
      });
      const c = !1;
      return (u, a) => (
        De(),
        ft(
          Lo,
          { onResolve: pe(s) },
          {
            default: Ao(() => [
              pe(i)
                ? (De(), Io("div", Py))
                : pe(o)
                  ? (De(),
                    ft(pe(xy), { key: 1, error: pe(o) }, null, 8, ["error"]))
                  : pe(c)
                    ? (De(),
                      ft(pe(t), { key: 2, context: pe(c) }, null, 8, [
                        "context"
                      ]))
                    : pe(r)
                      ? (De(), ft(df(pe(r)), { key: 3 }))
                      : (De(), ft(pe(Ey), { key: 4 }))
            ]),
            _: 1
          },
          8,
          ["onResolve"]
        )
      );
    }
  };
let Rl;
{
  let e;
  ((Rl = async function () {
    if (e) return e;
    const n = !!(
        window.__NUXT__?.serverRendered ??
        document.getElementById("__NUXT_DATA__")?.dataset.ssr === "true"
      ),
      s = n ? Ih(Tl) : Lh(Tl),
      r = Gd({ vueApp: s });
    async function o(i) {
      (await r.callHook("app:error", i), (r.payload.error ||= nn(i)));
    }
    ((s.config.errorHandler = o),
      r.hook("app:suspense:resolve", () => {
        s.config.errorHandler === o && (s.config.errorHandler = void 0);
      }),
      !n &&
        Bi.id &&
        r.hook("app:suspense:resolve", () => {
          document.getElementById(Bi.id)?.remove();
        }));
    try {
      await Yd(r, ty);
    } catch (i) {
      o(i);
    }
    try {
      (await r.hooks.callHook("app:created", s),
        await r.hooks.callHook("app:beforeMount", s),
        s.mount(Wd),
        await r.hooks.callHook("app:mounted", s),
        await Wt());
    } catch (i) {
      o(i);
    }
    return s;
  }),
    (e = Rl().catch((t) => {
      throw (console.error("Error while mounting app:", t), t);
    })));
}
export {
  ip as $,
  be as A,
  Vm as B,
  Fy as C,
  Iy as D,
  df as E,
  Ee as F,
  Do as G,
  Wo as H,
  Gf as I,
  Yu as J,
  Js as K,
  Ve as L,
  Ut as M,
  _e as N,
  Xo as O,
  bl as P,
  Wy as Q,
  My as R,
  rc as S,
  lh as T,
  lp as U,
  Ry as V,
  zm as W,
  ln as X,
  $o as Y,
  or as Z,
  eu as _,
  De as a,
  ld as a0,
  Us as a1,
  Uy as a2,
  bs as a3,
  Vy as a4,
  $y as a5,
  ky as a6,
  Ho as b,
  Io as c,
  Xe as d,
  Ny as e,
  ge as f,
  ft as g,
  qf as h,
  Xc as i,
  je as j,
  Wt as k,
  rs as l,
  is as m,
  Xs as n,
  Kt as o,
  wy as p,
  Bt as q,
  ze as r,
  Oy as s,
  du as t,
  pe as u,
  Dy as v,
  Ao as w,
  jy as x,
  Hy as y,
  Ly as z
};
