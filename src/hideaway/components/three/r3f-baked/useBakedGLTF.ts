/**
 * Whole-model convenience: load a GLB and swap every mesh's material for
 * its baked counterpart from the manifest, by (sanitized) name match.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  BakeManifest,
  BakedMapKey,
  BakedMapEntry,
  findObjectEntry
} from "./bakedManifest";
import {
  BakedMaterialOptions,
  buildBakedMaterial,
  _prepTexture
} from "./useBakedMaterial";

export interface BakedGLTFResult {
  /** The glTF scene with baked materials applied (same object as gltf.scene). */
  scene: THREE.Group;
  /** Baked materials keyed by manifest object name. */
  materials: Record<string, THREE.MeshStandardMaterial>;
  /** The raw useGLTF result (nodes, animations, ...). */
  gltf: ReturnType<typeof useGLTF>;
}
