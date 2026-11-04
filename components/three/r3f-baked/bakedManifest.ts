/**
 * Types + helpers for the manifest.json emitted by the Three.js Baker
 * Blender add-on (schema 1). This file is the shared contract between
 * the Blender bake and the R3F material hooks.
 */

export type BakedMapKey =
  | 'basecolor'
  | 'normal'
  | 'roughness'
  | 'metallic'
  | 'ao'
  | 'emissive'
  | 'height'
  | 'orm'          // R=AO, G=roughness, B=metalness
  | 'specular'     // RGB=specular color, A=specular intensity
  | 'sheen'        // RGB=sheen color × weight, A=sheen roughness
  | 'anisotropy'   // RG=direction, B=strength (glTF KHR_materials_anisotropy)
  | 'clearcoat'    // R=coat weight, G=coat roughness

export interface BakedMapEntry {
  file: string
  colorSpace: 'srgb' | 'linear'
  pack?: string
}

export interface BakedObjectEntry {
  resolution?: number
  maps: Partial<Record<BakedMapKey, BakedMapEntry>>
}

export interface BakeManifest {
  generator?: string
  schema?: number
  flipY?: boolean
  objects: Record<string, BakedObjectEntry>
}

/** Mirror of the add-on's _safe_name() — keep the two in sync. */
export function sanitizeName(name: string): string {
  return name.replace(/[^\w\-.]+/g, '_').replace(/^_+|_+$/g, '') || 'object'
}

/**
 * Find a manifest entry for a mesh/object name.
 * Exact sanitized match first; then prefix match (glTF exporters
 * commonly append suffixes like `.001` or `_1` to node names).
 */
export function findObjectEntry(
  manifest: BakeManifest,
  name: string,
): { key: string; entry: BakedObjectEntry } | null {
  const s = sanitizeName(name)
  if (manifest.objects[s]) return { key: s, entry: manifest.objects[s] }
  const key = Object.keys(manifest.objects).find(
    (k) => s.startsWith(k) || k.startsWith(s),
  )
  return key ? { key, entry: manifest.objects[key] } : null
}
