# Owner, 25 Nov ("let's do b for now"): a load-ready copy of his book.glb until he re-exports it at rest. Reads
# public/assets/three/book/book.glb and writes assets/book-rest.glb:
#   1. the root node's saved pose (tilt + z 7.86) is cleared; their code poses the book itself;
#   2. every cover bone goes back to its bind pose (from the skins' inverse bind matrices), since their code takes the
#      loaded bone rotation as the closed cover (3fe65 `pressBindQuat`);
#   3. `crash` (the outer spine strip) is named `spine`, the name their code looks up (3fe65 `X`).
# Units already match theirs (cover thickness 3.38 vs their 3.374 reference), so nothing is rescaled.
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
nodes[root].pop("matrix", None)                                                    # 1
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
for n in nodes:                                                                    # 3
    if n.get("name") == "crash": n["name"] = "spine"
js = json.dumps(j, separators=(",", ":")).encode(); js += b" " * ((4 - len(js) % 4) % 4)
open(OUT, "wb").write(b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + len(rest)) + struct.pack("<I", len(js)) + b"JSON" + js + rest)
print("wrote", OUT, "bones reset:", len(skin["joints"]))
