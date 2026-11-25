# Copies their chunks verbatim into ./chunks, then applies the recorded changes (VENDOR-CHANGES.md). Each change must
# match exactly once, or the script stops.
import json, os, shutil, sys
SRC = "/Users/seanschoi/orca/workspaces/sphmrs/visible-coordinator-20261118/.tmp/stripe-press-teardown-20261124/src/js/"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "chunks")
CHUNKS = json.load(open(os.path.join(HERE, "chunks.json")))
files = CHUNKS + ["turbopack-2_04ewhudzrza.js"]
for f in files: shutil.copyfile(SRC + f, os.path.join(OUT, f))
CHANGES = [
    # 1. Textures: no KTX2 conversion; the manifest's own .jpg/.png paths load through the plain image loader.
    ("0bl3vphd9w8zl.js", 'function o(e){return e.replace(/\\.(jpg|jpeg|png)$/i,".ktx2")}', 'function o(e){return e}'),
    # 2. Textures: a texture "name" that is already a path ("/...") is used as that path, so our products can name
    #    their own files without entries in the manifest.
    ("0bl3vphd9w8zl.js", 'let i=n.get(e);if(null==i){', 'let i=n.get(e)??("string"==typeof e&&e.startsWith("/")?e:null);if(null==i){'),
    # 7. Catalogue (module 67168): when the page sets globalThis.__SPBOOKS (our books, in their built shape) and
    #    __SPFEATURED (how many lead the list as featured), the scene's book list and featured/shelf indices are ours.
    ("3aodgiaju4hkl.js", 'd=h.j.books.filter(e=>e.isFeatured).length+ +!!u,', 'd=globalThis.__SPBOOKS?globalThis.__SPFEATURED:h.j.books.filter(e=>e.isFeatured).length+ +!!u,'),
    ("3aodgiaju4hkl.js", 'w=u?[...H.slice(0,2),', 'w=globalThis.__SPBOOKS?globalThis.__SPBOOKS:u?[...H.slice(0,2),'),
    #    ...and their social-card check (every book must have a share image of theirs) is skipped for our books.
    ("3aodgiaju4hkl.js", 'i=new Map,w.forEach(e=>{let g=W[e.id];if(null===g)return;', 'i=new Map,w.forEach(e=>{let g=W[e.id];if(null===g||globalThis.__SPBOOKS)return;'),
    # 9. Spine-row order (module 50016, `ec`): theirs moves the last floor((n-2J-1)/2) books to the front so the last
    #    featured book (J) sits mid-row, which only works with n >= 2J+1 books. As a rotation that puts J at
    #    floor((n-1)/2) for any n: identical order to theirs when n >= 2J+1, and still mid-row with fewer books.
    ("12s2cqzsl56ip.js", 'ec=(t=a.I.length,o=Array.from({length:r=Math.max(0,Math.floor((t-(n=a.J)-1-n)/2))},(e,n)=>t-r+n),i=Array.from({length:t},(e,t)=>t).filter(e=>!o.includes(e)),[...o,...i])',
     'ec=(t=a.I.length,n=a.J,r=((n-Math.floor((t-1)/2))%t+t)%t,Array.from({length:t},(e,o)=>(o+r)%t))'),
]
for f, old, new in CHANGES:
    p = os.path.join(OUT, f); s = open(p).read(); n = s.count(old)
    if n != 1: raise SystemExit(f"{f}: expected 1 match, found {n}: {old[:60]}")
    open(p, "w").write(s.replace(old, new))
# 4-6. Asset paths: their press logo (default page print) -> our blank; their model path -> our rest copy of the
#      owner's model; the shared texture paths in the manifest -> our neutral maps.
import re
for f in files:
    p = os.path.join(OUT, f); s = open(p).read()
    s = s.replace('"/images/presslogo.png"', '"/assets/three/book/shared/blank.png"')
    s = s.replace('"/3d/book.glb"', '"/assets/three/book/book-rest.glb"')
    s = re.sub(r'"/images/covers/shared/([a-z_]+)\.(?:jpg|png)"', r'"/assets/three/book/shared/\1.png"', s)
    open(p, "w").write(s)
# 3. Runtime: their globals are renamed (TURBOPACK* -> SPTURBOPACK*) so their runtime never meets Next's own.
import re
for f in files:
    p = os.path.join(OUT, f); s = open(p).read()
    open(p, "w").write(re.sub(r"\bTURBOPACK", "SPTURBOPACK", s))
print("patched", len(CHANGES) + 3, "changes into", len(files), "files")
