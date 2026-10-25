import { ClampToEdgeWrapping, DataTexture, NoColorSpace, Texture, TextureLoader } from 'three';
import { FLAME_APPEARANCE } from '../appearance';

export { DEFAULT_MASK_URL } from './parameters';

type MaskStatus = 'loading' | 'ready' | 'error';
type LoadMask = (url: string, onLoad: (texture: Texture) => void, onError: (error: unknown) => void) => Texture;
interface MaskTextureOptions {
  readonly onChange: (texture: Texture, status: MaskStatus) => void;
  readonly onError: (message: string) => void;
  readonly load?: LoadMask;
}

function configureMask(texture: Texture): Texture {
  texture.colorSpace = NoColorSpace;
  texture.flipY = true;
  texture.generateMipmaps = FLAME_APPEARANCE.rendering.generateMipmaps;
  texture.minFilter = FLAME_APPEARANCE.rendering.maskMinFilter;
  texture.magFilter = FLAME_APPEARANCE.rendering.maskMagFilter;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  return texture;
}

/** Keeps the GPU transparent during loads and ignores stale image callbacks after swaps/unmount. */
export function createMaskTextureSession({ onChange, onError, load = (url, ready, error) => new TextureLoader().load(url, ready, undefined, error) }: MaskTextureOptions) {
  const placeholder = configureMask(new DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1));
  placeholder.needsUpdate = true;
  const pending = new Set<Texture>();
  const released = new WeakSet<Texture>();
  let current: Texture | null = null;
  let generation = 0;
  let disposed = false;
  const release = (texture: Texture) => {
    if (released.has(texture)) return;
    released.add(texture);
    pending.delete(texture);
    texture.dispose();
  };

  function setSource(url: string) {
    if (disposed) return;
    const request = ++generation;
    if (current) release(current);
    current = null;
    onChange(placeholder, 'loading');
    let returned: Texture | null = null;
    let settled = false;
    const fail = () => {
      settled = true;
      if (returned) release(returned);
      if (disposed || request !== generation) return;
      onChange(placeholder, 'error');
      onError('The mask image could not be loaded. Choose another PNG or SVG to retry.');
    };
    try {
      returned = load(url, texture => {
        settled = true;
        pending.delete(texture);
        if (disposed || request !== generation) { release(texture); return; }
        current = configureMask(texture);
        onChange(current, 'ready');
      }, fail);
      if (!settled) pending.add(returned);
      else if (returned !== current) release(returned);
    } catch { fail(); }
  }

  function destroy() {
    if (disposed) return;
    disposed = true;
    generation++;
    if (current) release(current);
    for (const texture of pending) release(texture);
    release(placeholder);
  }

  return { placeholder, setSource, destroy };
}
