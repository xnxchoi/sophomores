/**
 * R3F hooks for consuming Three.js Baker output.
 * Requires: three >= r152 (colorSpace API), @react-three/fiber v8+,
 * @react-three/drei v9+.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { BakedMapEntry, BakedMapKey, BakeManifest, findObjectEntry } from "./bakedManifest";

const PHYSICAL_KEYS: BakedMapKey[] = ["specular", "sheen", "anisotropy", "clearcoat"];

export interface BakedMaterialOptions {
  /** URL prefix for the texture files. Default '/textures/'. */
  basePath?: string;
  /** Override manifest flipY. Default: manifest value, else false (glTF). */
  flipY?: boolean;
  /** Any MeshPhysicalMaterial parameters to apply last (win over baked). */
  overrides?: THREE.MeshPhysicalMaterialParameters;
}

/** Suspense-loads and parses manifest.json (cached by URL). */
export function useBakedManifest(url: string): BakeManifest {
  const raw = useLoader(THREE.FileLoader, url);
  return useMemo(() => {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer);
    return JSON.parse(text) as BakeManifest;
  }, [raw]);
}

function prepTexture(t: THREE.Texture, entry: BakedMapEntry, flipY: boolean): THREE.Texture {
  t.flipY = flipY;
  t.colorSpace = entry.colorSpace === "srgb" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * Pure builder — shared by the single-object hook and the GLB-wide hook.
 * Chooses MeshPhysicalMaterial when any physical map exists.
 */
export function buildBakedMaterial(maps: Partial<Record<BakedMapKey, BakedMapEntry>>, tex: Partial<Record<BakedMapKey, THREE.Texture>>, overrides?: THREE.MeshPhysicalMaterialParameters): THREE.MeshStandardMaterial {
  const isPhysical = PHYSICAL_KEYS.some((k) => k in maps);
  const m = isPhysical ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial();
  if (tex.basecolor) ( m.map = tex.basecolor);
  if (tex.normal) (m.normalMap = tex.normal);

  if (tex.orm) {
    m.aoMap = tex.orm; // reads R
    m.roughnessMap = tex.orm; // reads G
    m.metalnessMap = tex.orm; // reads B
    m.roughness = 1;
    m.metalness = 1;
  } else {
    if (tex.roughness) {
      m.roughnessMap = tex.roughness;
      m.roughness = 1;
    }
    if (tex.metallic) {
      m.metalnessMap = tex.metallic;
      m.metalness = 1;
    }
  }


  if (isPhysical) {
    const p = m as THREE.MeshPhysicalMaterial;

    if (tex.clearcoat) {
      p.clearcoatMap = tex.clearcoat; // reads R
      p.clearcoat = 1;
    }
  }

  if (overrides) m.setValues(overrides);
  return m;
}

/**
 * Load all baked maps for one object and return a ready material.
 * Suspends while textures load. Disposes the material on unmount.
 */
export function useBakedMaterial(manifest: BakeManifest, objectName: string, opts: BakedMaterialOptions = {}): THREE.MeshStandardMaterial {
  const found = findObjectEntry(manifest, objectName);
  if (!found) {
    throw new Error(
      `[r3f-baked] '${objectName}' not in manifest ` + `(has: ${Object.keys(manifest.objects).join(", ")})`);
  }
  const { maps } = found.entry;
  const basePath = opts.basePath ?? "/textures/";
  const flipY = opts.flipY ?? manifest.flipY ?? false;

  const keys = useMemo(() => (Object.keys(maps) as BakedMapKey[]).sort(), [found.key] // stable per manifest entry
  );
  const urls = keys.map((k) => basePath + maps[k]!.file);
  const loaded = useTexture(urls);

  const material = useMemo(() => {
    const list = Array.isArray(loaded) ? loaded : [loaded];
    const tex: Partial<Record<BakedMapKey, THREE.Texture>> = {};
    keys.forEach((k, i) => {
      tex[k] = prepTexture(list[i], maps[k]!, flipY);
    });
    return buildBakedMaterial(maps, tex, opts.overrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, keys, flipY, opts.overrides]);

  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/**
 * Internal export for useBakedGLTF.
 */
export { prepTexture as _prepTexture };
