/**
 * Whole-model convenience: load a GLB and swap every mesh's material for
 * its baked counterpart from the manifest, by (sanitized) name match.
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF, useTexture } from '@react-three/drei'
import {
  BakeManifest,
  BakedMapKey,
  BakedMapEntry,
  findObjectEntry,
} from './bakedManifest'
import {
  BakedMaterialOptions,
  buildBakedMaterial,
  _prepTexture,
} from './useBakedMaterial'

export interface BakedGLTFResult {
  /** The glTF scene with baked materials applied (same object as gltf.scene). */
  scene: THREE.Group
  /** Baked materials keyed by manifest object name. */
  materials: Record<string, THREE.MeshStandardMaterial>
  /** The raw useGLTF result (nodes, animations, ...). */
  gltf: ReturnType<typeof useGLTF>
}

export function useBakedGLTF(
  gltfUrl: string,
  manifest: BakeManifest,
  opts: BakedMaterialOptions = {},
): BakedGLTFResult {
  const gltf = useGLTF(gltfUrl)
  const basePath = opts.basePath ?? '/textures/'
  const flipY = opts.flipY ?? manifest.flipY ?? false

  // Flatten every object's maps into one url list (stable order).
  const flat = useMemo(() => {
    const items: { obj: string; key: BakedMapKey; entry: BakedMapEntry }[] = []
    for (const obj of Object.keys(manifest.objects).sort()) {
      const maps = manifest.objects[obj].maps
      for (const key of (Object.keys(maps) as BakedMapKey[]).sort()) {
        items.push({ obj, key, entry: maps[key]! })
      }
    }
    return items
  }, [manifest])

  const loaded = useTexture(flat.map((i) => basePath + i.entry.file))

  const materials = useMemo(() => {
    const list = Array.isArray(loaded) ? loaded : [loaded]
    const perObject: Record<
      string,
      Partial<Record<BakedMapKey, THREE.Texture>>
    > = {}
    flat.forEach((item, i) => {
      ;(perObject[item.obj] ??= {})[item.key] = _prepTexture(
        list[i],
        item.entry,
        flipY,
      )
    })
    const out: Record<string, THREE.MeshStandardMaterial> = {}
    for (const obj of Object.keys(perObject)) {
      out[obj] = buildBakedMaterial(
        manifest.objects[obj].maps,
        perObject[obj],
        opts.overrides,
      )
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, flat, flipY, opts.overrides])

  // Apply to the scene by name (mesh name, or its parent object's name).
  useMemo(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const hit =
        findObjectEntry(manifest, mesh.name) ??
        (mesh.parent ? findObjectEntry(manifest, mesh.parent.name) : null)
      if (hit && materials[hit.key]) mesh.material = materials[hit.key]
    })
  }, [gltf.scene, manifest, materials])

  useEffect(
    () => () => {
      for (const m of Object.values(materials)) m.dispose()
    },
    [materials],
  )

  return { scene: gltf.scene, materials, gltf }
}
