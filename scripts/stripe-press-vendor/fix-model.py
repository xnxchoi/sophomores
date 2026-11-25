# Owner, 25 Nov ("let's do b for now"): a load-ready copy of his book.glb until he re-exports it at rest. Reads
# public/assets/three/book/book.glb and writes public/assets/three/book/book-rest.glb:
#   1. the root node keeps the model's own offset (z 7.86) and loses only the saved runtime tilt (their code rotates the
#      root but never moves it, and the skinned cover renders from its bind matrices, not the root);
#   2. every cover bone goes back to its bind pose (from the skins' inverse bind matrices), since their code takes the
#      loaded bone rotation as the closed cover (3fe65 `pressBindQuat`);
#   3. pages2 (the host of their code-built page stack) goes back to rest (no rotation, its own 1.0059 Y/Z scale), loses
#      the array-valued pressLookInsideHostRestQuat extra, and drops the page stack baked in at export (unnamed node 27).
# Units already match theirs (cover thickness 3.38 vs their 3.374 reference). Diagnosis: .tmp/stripe-notes/page-block-diagnosis.md.
import json, struct, sys
SRC = "/Users/seanschoi/orca/workspaces/sphmrs/ui-commerce/.tmp/cart-wt/public/assets/three/book/book.glb"
OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/book-rest.glb"
b = open(SRC, "rb").read(); clen = struct.unpack("<I", b[12:16])[0]; j = json.loads(b[20:20 + clen]); rest = b[20 + clen:]
binlen = struct.unpack("<I", rest[:4])[0]; BIN = rest[8:8 + binlen]

def floats(acc):
    a = j["accessors"][acc]; bv = j["bufferViews"][a["bufferView"]]; off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    n = a["count"] * 16; return list(struct.unpack_from("<%df" % n, BIN, off))
def col(m): return [[m[c * 4 + r] for c in range(4)] for r in range(4)]          # column-major list -> rows
def flat(R): return [R[r][c] for c in range(4) for r in range(4)]                  # rows -> column-major list
def mul(A, B): return [[sum(A[r][k] * B[k][c] for k in range(4)) for c in range(4)] for r in range(4)]
def inv(A):
    M = [row[:] + [1.0 if i == r else 0.0 for i in range(4)] for r, row in enumerate(A)]
    for c in range(4):
        p = max(range(c, 4), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]; d = M[c][c]
        M[c] = [x / d for x in M[c]]
        for r in range(4):
            if r != c: f = M[r][c]; M[r] = [x - f * y for x, y in zip(M[r], M[c])]
    return [row[4:] for row in M]
I = [[1.0 if r == c else 0.0 for c in range(4)] for r in range(4)]
local = lambda n: col(j["nodes"][n]["matrix"]) if "matrix" in j["nodes"][n] else I

nodes = j["nodes"]; root = next(i for i, n in enumerate(nodes) if n.get("name") == "book")
T = nodes[root]["matrix"][12:15]                                                    # 1: keep the model's own offset,
nodes[root]["matrix"] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, T[0], T[1], T[2], 1]  #    drop only the runtime tilt
parent = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
def world(n):
    m = local(n)
    while n in parent: n = parent[n]; m = mul(local(n), m)
    return m
skin = j["skins"][0]; ibm = floats(skin["inverseBindMatrices"])                   # 2
other = floats(j["skins"][1]["inverseBindMatrices"])
assert max(abs(x - y) for x, y in zip(ibm, other)) < 1e-4, "the two skins bind differently"
bind = {jt: inv(col(ibm[k * 16:(k + 1) * 16])) for k, jt in enumerate(skin["joints"])}  # joint world at bind
for jt in skin["joints"]:                                                          # parents first (chains are ordered)
    p = parent[jt]; pw = bind.get(p) or world(p)
    nodes[jt]["matrix"] = flat(mul(inv(pw), bind[jt]))
byname = {n.get("name"): n for n in nodes}                                          # 3: page blocks back to rest
p2 = byname["pages2"]                                                              #    (pages1 is hidden by their code)
S = (p2["matrix"][4] ** 2 + p2["matrix"][5] ** 2 + p2["matrix"][6] ** 2) ** 0.5      # 1.0059, the model's own Y/Z scale
p2.update(translation=p2.pop("matrix")[12:15], scale=[1, S, S])                    # rest = identity (extras.pressBindQuat)
p2["extras"].pop("pressLookInsideHostRestQuat", None)                               # an array defeats 45610 Q()
baked = next(c for c in p2["children"] if "name" not in nodes[c])                   # node 27: exported runtime stack
p2["children"].remove(baked)
# 4. (25 Nov, the featured book sat ~80 px low) Their scene centres the book on the hero card by the bounding box of all
#    its meshes (04ud:19674-19700), so every part must be at rest:
#    - pages1 rests closed at its own recorded bind rotation (extras.pressBindQuat: 180° about X, the mirrored block),
#      not the ~76° open pose saved at export;
#    - crash and innerspine lose the thickness scale baked into X (their recorded bind X scale is 1), and crash sits with
#      Empty at its z again (the export carried the runtime's thickness shift);
#    - every node drops the runtime values written into extras at export (bind quaternions and scales, a serialized
#      edge-art texture): their code records these itself on first load and must not find stale ones.
p1 = byname["pages1"]; m1 = p1.pop("matrix")
S1 = (m1[4] ** 2 + m1[5] ** 2 + m1[6] ** 2) ** 0.5
q = [float(x) for x in p1["extras"]["pressBindQuat"]]; qn = sum(x * x for x in q) ** 0.5
p1.update(translation=m1[12:15], rotation=[x / qn for x in q], scale=[-1, -S1, -S1])
empty_z = byname["Empty"]["matrix"][14]
for name in ("crash", "innerspine"):
    n = byname[name]; m = n.pop("matrix")
    n.update(translation=[m[12], m[13], empty_z if name == "crash" else m[14]], rotation=[0.7071067811865476, 0, 0, 0.7071067811865476])
for n in nodes: n.pop("extras", None)
js =json.dumps(j, separators=(",", ":")).encode(); js += b" " * ((4 - len(js) % 4) % 4)
open(OUT, "wb").write(b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + len(rest)) + struct.pack("<I", len(js)) + b"JSON" + js + rest)
print("wrote", OUT, "bones reset:", len(skin["joints"]), "removed child", baked)
