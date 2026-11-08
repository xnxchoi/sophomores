"use client";
import {
  BufferGeometry,
  Mesh,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget
} from "three";
import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { useStore } from "zustand/index";
import { DateTime } from "luxon";
import { createStore } from "zustand/vanilla";

export const CachedReader = ({ children }: { children: ReactNode }) => {
  return (
    <CachedInner>
      <CacheManager>{children}</CacheManager>
    </CachedInner>
  );
};
type Pote = WeakRef<
  | BufferGeometry
  | ShaderMaterial
  | Mesh
  | Scene
  | WebGLRenderer
  | WebGLRenderTarget
  | Texture
>;
type RP_MemoryState = {
  ttl: number;
  lastUpdate: number;
  geometries: Map<
    string,
    { value: WeakRef<BufferGeometry>; timestamp: number }
  >;
  materials: Map<string, { value: WeakRef<ShaderMaterial>; timestamp: number }>;
  renderers: Map<string, { value: WeakRef<WebGLRenderer>; timestamp: number }>;
  renderTargets: Map<
    string,
    { value: WeakRef<WebGLRenderTarget>; timestamp: number }
  >;
  scenes: Map<string, { value: WeakRef<Scene>; timestamp: number }>;
  textures: Map<string, { value: WeakRef<Texture>; timestamp: number }>;
  meshes: Map<string, { value: WeakRef<Mesh>; timestamp: number }>;
};
export type RP_AccessMemories = RP_MemoryState & {
  shelve: () => void;
  clear: (
    storeName:
      | "geometries"
      | "materials"
      | "renderers"
      | "renderTargets"
      | "scenes"
      | "textures"
      | "meshes"
  ) => void;
  update: (
    storeName:
      | "geometries"
      | "materials"
      | "renderers"
      | "renderTargets"
      | "scenes"
      | "textures"
      | "meshes",
    key: string
  ) => void;
  dispose: (
    storeName?:
      | "geometries"
      | "materials"
      | "renderers"
      | "renderTargets"
      | "scenes"
      | "textures"
      | "meshes"
  ) => void;
  getGeometry: (key: string) => BufferGeometry | undefined;
  getMaterial: (key: string) => ShaderMaterial | undefined;
  getTexture: (key: string) => Texture | undefined;
  getMesh: (key: string) => Mesh | undefined;
  getRenderer: (key: string) => WebGLRenderer | undefined;
  getScene: (key: string) => Scene | undefined;
  setGeometry: (key: string, value: WeakRef<BufferGeometry>) => void;
  setMaterial: (key: string, value: WeakRef<ShaderMaterial>) => void;
  setTexture: (key: string, value: WeakRef<Texture>) => void;
  setMesh: (key: string, value: WeakRef<Mesh>) => void;
  setRenderer: (key: string, value: WeakRef<WebGLRenderer>) => void;
  setScene: (key: string, value: WeakRef<Scene>) => void;
  getRenderTargets: (key: string) => WebGLRenderTarget | undefined;
  setRenderTarget: (key: string, value: WeakRef<WebGLRenderTarget>) => void;
  remove: (
    storeName:
      | "geometries"
      | "materials"
      | "renderers"
      | "renderTargets"
      | "scenes"
      | "textures"
      | "meshes",
    key: string
  ) => void;
};
const nowMil = () => DateTime.now().toMillis();
const createThreeCache = (initState: RP_MemoryState) =>
  createStore<RP_AccessMemories>()((set, get) => {
    return {
      ...initState,
      shelve: () => {
        const mes = new Map(get().meshes);
        const meshe: string[] = [];
        mes.forEach((r, i) => {
          const va = r.value;
          const val = va.deref();
          val ? (val.visible = false) : meshe.push(i);
        });
        meshe.forEach((i) => mes.delete(i));
        return set((state) => ({
          ...state,
          meshes: new Map(mes)
        }));
      },
      clear: (storeName) => {
        return set((state) => {
          const store = state[storeName];
          if (!store) return state;
          const v = store.values().toArray()[0].value as Pote;
          (
            store as Map<
              string,
              {
                timestamp: number;
                value: typeof v;
              }
            >
          ).forEach((v, k) => {
            const actualValue = v.value.deref();
            if (actualValue) {
              ("dispose" in actualValue && actualValue.dispose()) ||
                ("remove" in actualValue && actualValue.remove());
            }
          });
          store.clear();
          const newm = new Map(
            store as Map<
              string,
              {
                timestamp: number;
                value: typeof v;
              }
            >
          );
          return {
            ...state,
            [storeName]: newm
          };
        });
      },
      update: (storeName, key) =>
        set((state) => {
          const store = state[storeName];
          const now = DateTime.now().toMillis();
          if (!store) return state;
          const res = store.get(key);
          if (res) {
            const v = res.value as Pote;
            res.timestamp = now;
            const newstore = new Map(
              store as Map<string, { value: typeof v; timestamp: number }>
            );
            newstore.set(key, { ...res });
            return {
              ...state,
              [storeName]: newstore
            };
          } else {
            return state;
          }
        }),
      remove: (storeName, key) => {
        const stor = get()[storeName];
        if (stor) {
          const store = stor as Map<string, { value: Pote; timestamp: number }>;
          store.delete(key);
          const newstore = new Map(store);
          return set((state) => {
            return {
              ...state,
              [storeName]: newstore
            };
          });
        }
      },

      dispose: (storeName) => {
        if (storeName) {
          return set((state) => {
            const stor = state[storeName];
            if (!stor) return state;
            const store = stor as Map<
              string,
              { timestamp: number; value: Pote }
            >;
            store.forEach((v, k) => {
              const actualValue = v.value.deref();
              if (actualValue) {
                ("dispose" in actualValue && actualValue.dispose()) ||
                  ("remove" in actualValue && actualValue.remove());
              }
            });
            store.clear();
            return {
              ...state,
              [storeName]: new Map(store)
            };
          });
        } else {
          return set((state) => {
            const prev = state;
            const arrs = Object.values(prev).filter(
              (store) =>
                typeof store !== "function" &&
                store !== null &&
                typeof store === "object"
            );
            arrs.forEach((store) => {
              store.forEach((v, k) => {
                const actualValue = v.value.deref();
                if (actualValue) {
                  ("dispose" in actualValue && actualValue.dispose()) ||
                    ("remove" in actualValue && actualValue.remove());
                }
              });
              store.clear();
            });
            return {
              ...state,
              ...initState
            };
          }, true);
        }
      },
      getRenderer: (key) => {
        const val = get().renderers.get(key)?.value;
        if (val) {
          const leg = val.deref();
          if (leg) {
            get().update("renderers", key);
            return leg;
          } else {
          }
        }
      },
      getScene: (key) => {
        const val = get().scenes.get(key)?.value;
        if (val) {
          const leg = val.deref();
          if (leg) {
            get().update("scenes", key);
            return leg;
          } else {
          }
        }
      },
      getGeometry: (key) => {
        const val = get().geometries.get(key)?.value;
        if (val) {
          const leg = val.deref();
          if (leg) {
            get().update("geometries", key);
            return leg;
          } else {
          }
        }
      },
      getMaterial: (key) => {
        const val = get().materials.get(key)?.value;
        if (val) {
          const leg = val.deref();
          if (leg) {
            get().update("materials", key);
            return leg;
          } else {
          }
        }
      },
      getTexture: (key) => {
        const val = get().textures.get(key)?.value;
        if (val) {
          const leg = val.deref();
          if (leg) {
            get().update("textures", key);
            return leg;
          } else {
          }
        }
      },
      getMesh: (key) => {
        const val = get().meshes.get(key)?.value;
        if (val) {
          const leg = val.deref();
          if (leg) {
            get().update("meshes", key);
            leg.visible = true;
            return leg;
          } else {
          }
        }
      },
      getRenderTargets: (key) => {
        const val = get().renderTargets.get(key)?.value;
        if (val) {
          const leg = val.deref();
          if (leg) {
            get().update("renderTargets", key);
            return leg;
          } else {
          }
        }
      },
      setRenderer: (key, value) =>
        set((state) => {
          const store = state.renderers;
          const now = nowMil();
          store.set(key, { value, timestamp: now });
          return {
            ...state,
            lastUpdate: now,
            renderers: new Map(store)
          };
        }),
      setScene: (key, value) =>
        set((state) => {
          const store = state.scenes;
          const now = nowMil();
          store.set(key, { value, timestamp: now });
          return {
            ...state,
            lastUpdate: now,
            scenes: new Map(store)
          };
        }),
      setGeometry: (key, value) =>
        set((state) => {
          const store = state.geometries;
          const now = nowMil();
          store.set(key, { value, timestamp: now });
          return {
            ...state,
            lastUpdate: now,
            geometries: new Map(store)
          };
        }),
      setMaterial: (key, value) =>
        set((state) => {
          const store = state.materials;
          const now = nowMil();
          store.set(key, { value, timestamp: now });
          return {
            ...state,
            lastUpdate: now,
            materials: new Map(store)
          };
        }),
      setTexture: (key, value) =>
        set((state) => {
          const store = state.textures;
          const now = nowMil();
          store.set(key, { value, timestamp: now });
          return {
            ...state,
            lastUpdate: now,
            textures: new Map(store)
          };
        }),
      setMesh: (key, value) =>
        set((state) => {
          const now = nowMil();
          const store = state.meshes;
          store.set(key, { value, timestamp: now });
          return {
            ...state,
            lastUpdate: now,
            meshes: new Map(store)
          };
        }),
      setRenderTarget: (key, value) =>
        set((state) => {
          const store = state.renderTargets;
          const now = nowMil();
          store.set(key, { value, timestamp: now });
          return {
            ...state,
            lastUpdate: now,
            renderTargets: new Map(store)
          };
        })
    };
  });
type RP_MaitreD = ReturnType<typeof createThreeCache>;
export const CacheThreeContext = createContext<RP_MaitreD | undefined>(
  undefined
);

const CachedInner = ({ children }: { children: React.ReactNode }) => {
  const cache = useRef<RP_MaitreD>(null!);
  if (!cache.current) {
    console.log("CachedReader");
    cache.current = createThreeCache({
      ttl: 60 * 1000 * 15,
      lastUpdate: nowMil(),
      geometries: new Map(),
      materials: new Map(),
      renderers: new Map(),
      renderTargets: new Map(),
      scenes: new Map(),
      textures: new Map(),
      meshes: new Map()
    });
  }
  return (
    <CacheThreeContext.Provider value={cache.current}>
      {children}
    </CacheThreeContext.Provider>
  );
};
export const useCache = <T,>(selector: (store: RP_AccessMemories) => T) => {
  const cache = useContext(CacheThreeContext);
  if (!cache) {
    throw new Error("CacheThreeContext is not defined");
  }
  return useStore(cache, selector);
};
const CacheManager = ({ children }: { children: React.ReactNode }) => {
  const lastUpdate = useCache((store) => store.lastUpdate);
  const dispose = useCache((store) => store.dispose);
  const shelve = useCache((store) => store.shelve);
  const ttl = useCache((store) => store.ttl);
  const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTimes = useRef(0);
  useEffect(() => {
    toRef.current && clearTimeout(toRef.current);
    toRef.current = setTimeout(dispose, ttl);
    const runtime = runTimes.current;
    return () => {
      toRef.current && clearTimeout(toRef.current);
      toRef.current = null;
      runTimes.current = runtime + 1;
      if (runtime + 1 > 1) {
        dispose();
      } else {
        shelve();
        toRef.current = setTimeout(dispose, ttl);
      }
    };
  }, [lastUpdate, ttl, dispose, shelve]);

  return <>{children}</>;
};
