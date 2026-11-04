import { useTexture } from "@react-three/drei";
import { Vector2, type MeshStandardMaterial } from "three";

export function useConfiguredTexture({
  name,
  path,
  map
}: {
  name: string;
  path: string;
  map?: MeshStandardMaterial["map"];
}) {
  const base = `${path}/${name}`;
  const color = useTexture(`${base}_d.png`);
  const normal = useTexture(`${base}_n.png`);
  const roughness = useTexture(`${base}_r.png`);
  const bump = useTexture(`${base}_b.png`);

  if (map) {
    [color, normal, roughness, bump].forEach((texture) => {
      texture.center = map.center as Vector2;
      texture.wrapT = map.wrapT!;
      texture.wrapS = map.wrapS!;
    });
  }

  return {
    color,
    normal,
    roughness,
    bump
  };
}
