#!/bin/bash
# Build and save the two v13 images (runtime, runner) on the coordinator's build slot only (heavy: two buildx builds under
# emulation). The Packet A packaging recipe is reused; this exact source and dependency delta need fresh review. review-pg is not rebuilt.
#   bash build-v13.sh --check     (light: re-checks the pinned SHA; builds nothing)
#   bash build-v13.sh             (heavy: builds, checks the built images, saves the tars, writes the artifact table)
# Writes only inside packet-v13/: context/, artifacts/<2 tars>, evidence/*. Never pushes; tags only sophomores:review-<short>-*.
# pins.env (written when Maintenance's main SHA exists): SOURCE_SHA=<40 hex>, BASELINE_SHA=d4ff8d7d…, MIGRATION_COUNT=33.
set -euo pipefail
K=$(cd "$(dirname "$0")" && pwd)
V6=$K/../packet-888b97f2
REPO=$(git -C "$K" rev-parse --show-toplevel)
GUARD=$K/../../../scripts/resource-guard.py
SHA=$(sed -n 's/^SOURCE_SHA=//p' "$K/pins.env"); SHORT=${SHA:0:8}
BASE=$(sed -n 's/^BASELINE_SHA=//p' "$K/pins.env")
KEY_SCRIPTS="key-grant-tick.ts key-grant-alert.ts key-grant-rpc-check.ts key-grant-reconcile-one.ts key-grant-queue-read.ts"
# The 13 source paths in the reviewed Packet A context.
CONTEXT_PATHS=(
  cssVariables.ts fonts.ts messages next.config.ts package.json patches pnpm-lock.yaml
  pnpm-workspace.yaml postcss.config.mjs public scripts src tsconfig.json
)

extract_context() (
  # git archive emits portable modes; do not let the caller's umask strip access.
  umask 022
  git -C "$REPO" archive "$SHA" -- "${CONTEXT_PATHS[@]}" | tar -x -C "$1"
)
[[ $SHA =~ ^[0-9a-f]{40}$ ]] && [[ $BASE =~ ^[0-9a-f]{40}$ ]] || { echo "STOP: pins.env needs full 40-hex SOURCE_SHA and BASELINE_SHA"; exit 1; }

source_checks() {
  local want got registry package changes packaging p
  [ "$SHA" = 6e269092ba04229caf0b55cfb7d28baeef1c4d35 ] \
    && [ "$(git -C "$REPO" rev-parse origin/main)" = "$SHA" ] \
    && [ "$BASE" = d4ff8d7dae3810f5b42425862d5644b1582f04c4 ] \
    && [ "$(sed -n 's/^MIGRATION_COUNT=//p' "$K/pins.env")" = 33 ] \
    || { echo 'STOP: exact source, tracking ref or base pin mismatch'; return 1; }
  want=$(sed -n 's/^EXPECTED_MIGRATIONS="\(.*\)"$/\1/p' "$K/review-update.v13.sh") || return 1
  want=$(printf '%s %s\n' "$want" "$(sed -n 's/^BIZ_NUM_MIGRATION=//p' "$K/review-update.v13.sh")") || return 1
  got=$(git -C "$REPO" ls-tree --name-only "$SHA" src/payload/migrations/) || return 1
  registry=$(git -C "$REPO" show "$SHA:src/payload/migrations/index.ts") || return 1
  [ "$(sed -n 's#.*/\([0-9].*\)\.ts$#\1#p' <<<"$got" | paste -sd ' ' -)" = "$want" ] \
    && [ "$(sed -nE "s/^    name: '([^']*)',?$/\1/p" <<<"$registry" | paste -sd ' ' -)" = "$want" ] \
    && [ "$(wc -w <<<"$want" | tr -d ' ')" = 33 ] \
    || { echo 'STOP: exact 33-file and registered migration order not proven'; return 1; }
  changes=$(git -C "$REPO" diff --no-renames --name-status "$BASE" "$SHA" -- src/payload/migrations) || return 1
  [ "$changes" = "$(printf '%s\n' $'A\tsrc/payload/migrations/20261127_100000_business_info_biz_num.json' $'A\tsrc/payload/migrations/20261127_100000_business_info_biz_num.ts' $'M\tsrc/payload/migrations/index.ts')" ] \
    || { echo 'STOP: migration paths differ from the exact allowed delta'; return 1; }
  package=$(git -C "$REPO" show "$SHA:package.json") || return 1
  python3 -I -c 'import json,sys; p=json.load(sys.stdin); assert p["dependencies"]["payload"]=="3.94.2" and p["dependencies"]["next"]=="16.5.0-canary.35" and p["packageManager"].startswith("pnpm@12.16.1+")' <<<"$package" || return 1
  git -C "$REPO" grep -q -F TRUSTED_PROXY_LISTENER_ORIGIN "$SHA" -- src/lib/phone-verification/server/local-request.ts || return 1
  git -C "$REPO" grep -q -F STAFF_EXTRA_EMAILS "$SHA" -- src/payload/configuration.ts || return 1
  local rc=0
  git -C "$REPO" grep -q -E 'autoRun *:' "$SHA" -- src/payload.config.ts src/payload || rc=$?
  [ "$rc" = 1 ] || { echo 'STOP: autoRun matched or inspection failed'; return 1; }
  packaging=$(git -C "$REPO" show "$SHA:pnpm-workspace.yaml") || return 1
  grep -Fxq '  next-transition-router@0.2.11: patches/next-transition-router@0.2.11.patch' <<<"$packaging" \
    && grep -Fxq '  payload: patches/payload.patch' <<<"$packaging" || return 1
  packaging=$(git -C "$REPO" show "$SHA:deployment/Dockerfile") || return 1
  grep -Fxq 'RUN corepack install && pnpm install --frozen-lockfile' <<<"$packaging" \
    && grep -Fxq 'COPY patches/next-transition-router@0.2.11.patch ./patches/next-transition-router@0.2.11.patch' <<<"$packaging" \
    && git -C "$REPO" grep -q -F 'experimental: { globalNotFound: true },' "$SHA" -- next.config.ts || return 1
  [ "$(shasum -a 256 < "$V6/context/Dockerfile" | cut -d' ' -f1)" = 829364cb87608c74af5ed2ea80a7f0beb925392a15a238ef12152e43f3596279 ] \
    && [ "$(shasum -a 256 < "$V6/context/.dockerignore" | cut -d' ' -f1)" = a830319244d048a0d437fcfdfc618e8c2b3e892333ae0e143f0e369e545c36fe ] || return 1
  for p in "${CONTEXT_PATHS[@]}"; do
    git -C "$REPO" cat-file -e "$SHA:$p" || { echo "STOP: $p missing at $SHA"; return 1; }
  done
  echo "SOURCE-CHECKS-OK $SHORT (local origin/main exact; 33 exact migration files and registry names; new dependencies pinned; no autoRun match; no build)"
}
if [ "${1:-}" = --check ]; then source_checks; exit $?; fi
[ $# = 0 ] || { echo "usage: build-v13.sh [--check]"; exit 1; }
source_checks
[ "${V13_BUILD_GO:-}" = "$SHA" ] || { echo "STOP: separate heavy-slot go required for exact SHA"; exit 1; }
[ ! -e "$K/artifacts" ] || { echo "STOP: $K/artifacts exists; move it aside first (never overwrite saved tars)"; exit 1; }

# Packaging: the reviewed Packet A baseline, plus two explicit toolchain changes.
[ "$(shasum -a 256 < "$V6/context/Dockerfile" | cut -d' ' -f1)" = 829364cb87608c74af5ed2ea80a7f0beb925392a15a238ef12152e43f3596279 ] \
  && [ "$(shasum -a 256 < "$V6/context/.dockerignore" | cut -d' ' -f1)" = a830319244d048a0d437fcfdfc618e8c2b3e892333ae0e143f0e369e545c36fe ] \
  || { echo "STOP: Packet A packaging changed"; exit 1; }

# Only the pinned Git objects at CONTEXT_PATHS enter the source archive.
[ ! -e "$K/context" ] || mv "$K/context" "$K/context.prev.$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$K/context" "$K/evidence" "$K/artifacts"
extract_context "$K/context"
cp "$V6/context/Dockerfile" "$V6/context/.dockerignore" "$K/context/"
# Match the pinned source's deployment install: both patches are present and Corepack installs the exact pnpm spec.
python3 -I - "$K/context/Dockerfile" "$V6/context/Dockerfile" <<'PY'
import sys
from pathlib import Path

destination, baseline = map(Path, sys.argv[1:])
original = baseline.read_bytes()
anchor = b"COPY patches/payload.patch ./patches/payload.patch\nRUN pnpm install --frozen-lockfile\n"
assert original.count(anchor) == 1 and destination.read_bytes() == original, "Dockerfile anchor"
destination.write_bytes(original.replace(anchor, b"\n".join((
    b"COPY patches/payload.patch ./patches/payload.patch",
    b"COPY patches/next-transition-router@0.2.11.patch ./patches/next-transition-router@0.2.11.patch",
    b"RUN corepack install && pnpm install --frozen-lockfile",
    b"",
))))
PY
[ -f "$K/context/patches/next-transition-router@0.2.11.patch" ] || { echo "STOP: the router patch is missing from the context"; exit 1; }
git -C "$REPO" archive "$SHA" -- "${CONTEXT_PATHS[@]}" | shasum -a 256 | sed "s/ .*/  git-archive-$SHORT/" > "$K/evidence/source-archive.sha256"
(cd "$K/context" && shasum -a 256 Dockerfile .dockerignore) > "$K/evidence/packaging.sha256"
grep -q 'globalNotFound: true }' "$K/context/next.config.ts" || { echo "STOP: next.config.ts no longer has the line the Dockerfile's build-only edit expects"; exit 1; }
for f in $KEY_SCRIPTS; do [ -f "$K/context/scripts/$f" ] || { echo "STOP: scripts/$f missing from the context"; exit 1; }; done
for d in tests deployment; do [ ! -e "$K/context/$d" ] || { echo "STOP: context/$d present"; exit 1; }; done
[ -z "$(cd "$K/context" && find . \( -name '.env*' -o -name '*.pem' -o -name '*.p12' -o -name '*.key' \) -print | head -1)" ] || { echo "STOP: a secret-shaped file is in the context"; exit 1; }
echo "CONTEXT-OK (five key-grant scripts present; no tests/, deployment/ or secret-shaped files)"

# Two builds, one at a time, each guarded (client side) and capped inside the Docker VM (--memory 6g).
for target in runtime runner; do
  python3 "$GUARD" --max-gib 1 --timeout 3600 --log "$K/evidence/build-$target.log" -- \
    docker buildx build --platform linux/amd64 --target "$target" --build-arg SOURCE_SHA="$SHA" \
      --build-arg NEXT_PUBLIC_SERVER_URL=https://preview.sophomores.co --memory 6g --memory-swap 6g \
      --metadata-file "$K/evidence/$target-build.json" --progress plain -t "sophomores:review-$SHORT-$target" --load "$K/context"
done
APP_TAG=sophomores:review-$SHORT-runtime; RUN_TAG=sophomores:review-$SHORT-runner

# Checks on the built images (Auth items 1-3). Image content only: in-image ownership is real here, unlike bind mounts
# under Docker Desktop. Containers mirror kj-guard's shape: read-only root, /tmp tmpfs, no network, no capabilities.
lbl() { docker image inspect "$1" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'; }
for t in "$APP_TAG" "$RUN_TAG"; do
  [ "$(lbl "$t")" = "$SHA" ] || { echo "STOP: $t revision label is not $SHA"; exit 1; }
  [ "$(docker image inspect "$t" --format '{{.Config.User}}|{{.Config.WorkingDir}}')" = "node|/app" ] || { echo "STOP: $t user/workdir is not node|/app"; exit 1; }
done
registry_dir=$(mktemp -d "$K/evidence/runner-registry.XXXXXX")
registry_entry=$(cat <<'REGISTRY_ENTRY'
app=$1; shift
test -f "$app/package.json" && test -r "$app/package.json" &&
test -d "$app/src" && test -r "$app/src" && test -x "$app/src" &&
test -f "$app/src/payload/migrations/index.ts" && test -r "$app/src/payload/migrations/index.ts" ||
  { echo 'STOP: runner package.json or src is not accessible to the image user' >&2; exit 1; }
exec node "$@"
REGISTRY_ENTRY
)
python3 "$GUARD" --max-gib 1 --timeout 90 --log "$registry_dir/probe.log" -- \
  docker run --rm --pull=never --platform linux/amd64 --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges -e TSX_DISABLE_CACHE=1 --entrypoint sh "$RUN_TAG" \
  -c "$registry_entry" runner-registry /app --import tsx --input-type=module -e '
    import * as ns from "./src/payload/migrations/index.ts";
    const entries = ns.migrations ?? ns.default?.migrations;
    if (!Array.isArray(entries) || entries.some(x => typeof x.up !== "function" || typeof x.down !== "function" || !/^[a-z0-9_]+$/.test(x.name))) process.exit(1);
    console.log(entries.map(x => x.name).join(" "));
  ' || { echo 'STOP: built runner registry import failed'; exit 1; }
expected="$(sed -n 's/^EXPECTED_MIGRATIONS="\(.*\)"$/\1/p' "$K/review-update.v13.sh") $(sed -n 's/^BIZ_NUM_MIGRATION=//p' "$K/review-update.v13.sh")"
registry_logs=("$registry_dir"/probe.log.*.log)
[ "${#registry_logs[@]}" = 1 ] && [ -f "${registry_logs[0]}" ] && [ "$(cat "${registry_logs[0]}")" = "$expected" ] \
  || { echo 'STOP: built runner registry mismatch'; exit 1; }
box() { docker run --rm --pull=never --platform linux/amd64 --read-only --tmpfs /tmp:size=64m --network none --cap-drop ALL \
          --security-opt no-new-privileges --entrypoint sh "$@"; }
for who in "--user 1000:1000 --group-add 2001" "--user 2002:2001 -e HOME=/tmp"; do
  # shellcheck disable=SC2086
  out=$(box $who "$RUN_TAG" -c 'set -e; id -u; command -v sh >/dev/null; cd /app; node --import tsx -e 0; echo TSX-OK
    for f in '"$KEY_SCRIPTS"'; do test -r scripts/$f; done; echo SCRIPTS-OK
    test ! -e /app/tests; test ! -e /app/deployment; test -z "$(find /app -maxdepth 1 -name ".env*")"; echo ABSENT-OK') \
    || { echo "STOP: runner check failed as $who"; exit 1; }
  echo "runner as $who: $(tr '\n' ' ' <<<"$out")"
  case $who in *1000:1000*) grep -qx 1000 <<<"$out" ;; *) grep -qx 2002 <<<"$out" ;; esac || { echo "STOP: unexpected uid as $who"; exit 1; }
done
runtime_probe=$(cat <<'RUNTIME_PROBE'
set -e
id -u
cd "$1"
test -f server.js
test -n "$(grep -l PKPassPersonalizationFieldName .next/server/chunks/*.js | head -1)"
echo PASSKIT-BUNDLED
test -f public/wallet-pass/logo.png
test -f public/assets/three/book/book.glb
echo PUBLIC-OK
test ! -e tests
test -z "$(find . -maxdepth 1 -name ".env*")"
test ! -e /home/node/.config/sphmrs
echo ABSENT-OK
RUNTIME_PROBE
)
out=$(box --user 1000:1000 "$APP_TAG" -c "$runtime_probe" runtime-probe /app) \
  || { echo "STOP: runtime check failed"; exit 1; }
echo "runtime as 1000:1000: $(tr '\n' ' ' <<<"$out")"
grep -qx 1000 <<<"$out" || { echo "STOP: runtime uid is not 1000"; exit 1; }

# Save the two tars; read each config digest (the ID after `docker load` on the VPS) and label from the tar itself.
docker save -o "$K/artifacts/sophomores-review-$SHORT-runtime.tar" "$APP_TAG"
docker save -o "$K/artifacts/sophomores-review-$SHORT-runner.tar" "$RUN_TAG"
cfg() { python3 -I - "$1" <<'PY'
import hashlib, json, sys, tarfile
t = tarfile.open(sys.argv[1]); m = json.load(t.extractfile("manifest.json"))
assert len(m) == 1, "expected one image"
c = m[0]["Config"]; raw = t.extractfile(c).read()
d = "sha256:" + hashlib.sha256(raw).hexdigest()
assert d == "sha256:" + c.rsplit("/", 1)[-1].removesuffix(".json")
cj = json.loads(raw); lab = (cj.get("config") or {}).get("Labels") or {}
print(d, lab.get("org.opencontainers.image.revision", "MISSING"), cj.get("architecture"), (cj.get("config") or {}).get("User"))
PY
}
read -r APP_ID APP_LBL APP_ARCH APP_USER < <(cfg "$K/artifacts/sophomores-review-$SHORT-runtime.tar")
read -r RUNNER_ID RUN_LBL RUN_ARCH RUN_USER < <(cfg "$K/artifacts/sophomores-review-$SHORT-runner.tar")
[ "$APP_LBL" = "$SHA" ] && [ "$RUN_LBL" = "$SHA" ] && [ "$APP_ARCH|$RUN_ARCH" = "amd64|amd64" ] && [ "$APP_USER|$RUN_USER" = "node|node" ] \
  || { echo "STOP: tar config label/arch/user not as expected"; exit 1; }
(cd "$K/artifacts" && shasum -a 256 *.tar) > "$K/evidence/artifacts.sha256"
# Host files for the later key-job install (K2, its own go): recorded so K2 installs from this same commit. Not in the image.
git -C "$REPO" ls-tree -r "$SHA" deployment/ops | awk '$4 ~ /(key-grant|kj-guard)/ {print $3"  "$4}' > "$K/evidence/key-job-host-files.git-blob"
cat > "$K/evidence/image-pins.env" <<EOF
SOURCE_SHA=$SHA
APP_ID=$APP_ID
RUNNER_ID=$RUNNER_ID
REVISION_LABEL=$SHA
LOCAL_APP_ID=$(docker image inspect "$APP_TAG" --format '{{.Id}}')
LOCAL_RUNNER_ID=$(docker image inspect "$RUN_TAG" --format '{{.Id}}')
APP_BUILD_DIGEST=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1])).get("containerimage.digest",""))' "$K/evidence/runtime-build.json")
RUNNER_BUILD_DIGEST=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1])).get("containerimage.digest",""))' "$K/evidence/runner-build.json")
EOF
cat "$K/evidence/image-pins.env" "$K/evidence/artifacts.sha256"
echo "BUILT-AND-SAVED $SHORT (APP_ID/RUNNER_ID are the config digests K1 and u1 compare after docker load; LOCAL_* are this Mac's IDs)"
