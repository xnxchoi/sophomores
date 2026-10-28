import assert from "node:assert/strict";
import test from "node:test";
import {
  Texture,
  DataTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  NoColorSpace
} from "three";
import {
  createMaskTextureSession,
  DEFAULT_MASK_URL
} from "@/components/gl/flame-backdrop/field/texture";

function harness() {
  const requests: Array<{
    texture: Texture;
    resolve: () => void;
    reject: () => void;
  }> = [];
  const changes: Array<{ texture: Texture; status: string }> = [];
  const errors: string[] = [];
  const disposed = new Map<Texture, number>();
  const session = createMaskTextureSession({
    onChange: (texture, status) => changes.push({ texture, status }),
    onError: (message) => errors.push(message),
    load: (_url, onLoad, onError) => {
      const texture = new Texture();
      texture.addEventListener("dispose", () =>
        disposed.set(texture, (disposed.get(texture) ?? 0) + 1)
      );
      requests.push({
        texture,
        resolve: () => onLoad(texture),
        reject: () => onError(new Error("failed"))
      });
      return texture;
    }
  });
  return { session, requests, changes, errors, disposed };
}

test("saved mask has a single stable replaceable URL and a transparent initial texture", () => {
  assert.equal(DEFAULT_MASK_URL, "/masks/flame-envelope.png");
  const { session, changes } = harness();
  assert.ok(session.placeholder instanceof DataTexture);
  assert.ok(session.placeholder.image.data);
  assert.deepEqual([...session.placeholder.image.data], [255, 255, 255, 0]);
  session.setSource(DEFAULT_MASK_URL);
  assert.equal(changes.at(-1)?.status, "loading");
  assert.equal(changes.at(-1)?.texture, session.placeholder);
  session.destroy();
});

test("mask load sets alpha-safe filtering and publishes exactly the resolved texture", () => {
  const { session, requests, changes } = harness();
  session.setSource(DEFAULT_MASK_URL);
  requests[0].resolve();
  const texture = requests[0].texture;
  assert.equal(changes.at(-1)?.texture, texture);
  assert.equal(changes.at(-1)?.status, "ready");
  assert.equal(texture.flipY, true);
  assert.equal(texture.colorSpace, NoColorSpace);
  assert.equal(texture.minFilter, LinearFilter);
  assert.equal(texture.magFilter, LinearFilter);
  assert.equal(texture.wrapS, ClampToEdgeWrapping);
  assert.equal(texture.wrapT, ClampToEdgeWrapping);
  assert.equal(texture.generateMipmaps, false);
  session.destroy();
});

test("late old success and error cannot replace a newer mask or publish failures", () => {
  const { session, requests, changes, errors, disposed } = harness();
  session.setSource("/masks/a.png");
  session.setSource("/masks/b.png");
  requests[1].resolve();
  requests[0].resolve();
  requests[0].reject();
  assert.equal(changes.at(-1)?.texture, requests[1].texture);
  assert.equal(errors.length, 0);
  assert.equal(disposed.get(requests[0].texture), 1);
  session.setSource("/masks/c.png");
  assert.equal(disposed.get(requests[1].texture), 1);
  assert.equal(changes.at(-1)?.texture, session.placeholder);
  session.destroy();
});

test("load failures stay transparent, are explicit, and recover on the next successful image", () => {
  const { session, requests, changes, errors, disposed } = harness();
  session.setSource("/masks/missing.png");
  requests[0].reject();
  assert.equal(changes.at(-1)?.status, "error");
  assert.equal(changes.at(-1)?.texture, session.placeholder);
  assert.equal(errors.length, 1);
  assert.equal(disposed.get(requests[0].texture), 1);
  session.setSource("blob:http://localhost/test");
  requests[1].resolve();
  assert.equal(changes.at(-1)?.status, "ready");
  session.destroy();
});

test("destroy disposes pending and active textures once and ignores all later callbacks", () => {
  const { session, requests, changes, errors, disposed } = harness();
  session.setSource("/masks/a.png");
  requests[0].resolve();
  session.setSource("/masks/b.png");
  session.destroy();
  const count = changes.length;
  requests[1].resolve();
  requests[1].reject();
  session.destroy();
  session.setSource("/masks/c.png");
  assert.equal(changes.length, count);
  assert.equal(requests.length, 2);
  assert.equal(errors.length, 0);
  assert.equal(disposed.get(requests[0].texture), 1);
  assert.equal(disposed.get(requests[1].texture), 1);
});

test("synchronous loader errors also fail closed", () => {
  let error = "";
  const session = createMaskTextureSession({
    onChange: () => {},
    onError: (message) => {
      error = message;
    },
    load: () => {
      throw new Error("loader");
    }
  });
  session.setSource(DEFAULT_MASK_URL);
  assert.match(error, /mask image/i);
  session.destroy();
});
