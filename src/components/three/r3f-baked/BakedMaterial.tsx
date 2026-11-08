/**
 * Declarative wrapper: drop inside a <mesh> and it attaches the baked
 * material for `object` from the manifest.
 */
import * as THREE from 'three'
import { BakeManifest } from './bakedManifest'
import { useBakedMaterial } from './useBakedMaterial'

export interface BakedMaterialProps {
  manifest: BakeManifest
  /** Object name as baked in Blender (sanitized match, prefix-tolerant). */
  object: string
  /** URL prefix for texture files. Default '/textures/'. */
  basePath?: string
  flipY?: boolean
  /** Material parameter overrides, applied after baked maps. */
  overrides?: THREE.MeshPhysicalMaterialParameters
}

export function BakedMaterial({
  manifest,
  object,
  basePath,
  flipY,
  overrides,
}: BakedMaterialProps) {
  const material = useBakedMaterial(manifest, object, {
    basePath,
    flipY,
    overrides,
  })
  return <primitive object={material} attach="material" />
}
