#!/bin/bash
# Root-only, online capture. Never stops containers; never overwrites or retries a run.
# Usage: backup-hideaway.sh init RUN_ID RECIPIENT_FILE
#        backup-hideaway.sh {db|media|config|finalize|check} RUN_ID
# RUN_ID: YYYYMMDDTHHMMSSZ. age recipient file: exactly one native public recipient.
# A failed stage is deliberately unreplayable: inspect it, then start a NEW run.
set -Eeuo pipefail
umask 077
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH
fail() { printf '%s\n' "$1" >&2; exit 1; }
(( EUID == 0 )) || fail 'Root required.'
[[ $# -ge 2 && $# -le 3 ]] || fail 'Usage: STAGE RUN_ID [RECIPIENT_FILE]'
stage=$1 id=$2
[[ $id =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || fail 'Invalid run ID.'
case "$stage" in init|db|media|config|finalize|check) ;; *) fail 'Invalid stage.' ;; esac
[[ $stage == init && $# == 3 || $stage != init && $# == 2 ]] || fail 'Invalid arguments.'
base=/var/lib/hideaway-backups
run=$base/$id
scratch=$run/private-scratch
source=/home/deploy/thehideaway
media_paths=(var/lib/docker/volumes/theestate_payload_assets_media/_data
  var/lib/docker/volumes/theestate_payload_media/_data
  var/lib/docker/volumes/theestate_payload_track_media/_data
  var/lib/docker/volumes/theestate_payload_users/_data opt/thehideaway/assets)

# The helper never prints source filenames or secret metadata.
meta() {
python3 -I - "$@" <<'PY'
import hashlib, json, os, stat, sys
from datetime import datetime, timezone
from pathlib import Path
mode, *args = sys.argv[1:]
def save(path, value):
    with open(path, 'x') as f:
        json.dump(value, f, sort_keys=True); f.flush(); os.fsync(f.fileno())
def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()
if mode == 'private':
    p = Path(args[0]); s = p.lstat()
    assert stat.S_ISDIR(s.st_mode) and s.st_uid == os.geteuid() and stat.S_IMODE(s.st_mode) == 0o700
elif mode == 'inventory':
    output, *roots = args; entries = []
    def visit(path):
        s = os.lstat(path); item = {'path': path.lstrip('/'), 'mode': stat.S_IMODE(s.st_mode)}
        if stat.S_ISLNK(s.st_mode): item.update(type='symlink', target=os.readlink(path))
        elif stat.S_ISDIR(s.st_mode):
            item['type'] = 'directory'; entries.append(item)
            for name in sorted(os.listdir(path)): visit(os.path.join(path, name))
            return
        elif stat.S_ISREG(s.st_mode):
            h = hashlib.sha256()
            with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as f:
                before = os.fstat(f.fileno())
                assert (s.st_dev, s.st_ino) == (before.st_dev, before.st_ino)
                for block in iter(lambda: f.read(1024 * 1024), b''): h.update(block)
                after = os.fstat(f.fileno())
            assert (before.st_size, before.st_mtime_ns, before.st_ctime_ns) == (after.st_size, after.st_mtime_ns, after.st_ctime_ns)
            item.update(type='file', size=after.st_size, sha256=h.hexdigest())
        else: raise RuntimeError('Unsupported media entry type')
        entries.append(item)
    for root in roots:
        assert not os.path.islink(root) and os.path.isdir(root); visit(root)
    save(output, entries)
elif mode == 'identity':
    raw, output = args
    data = json.load(open(raw))
    assert len(data) == 3
    save(output, [{'id': c['Id'], 'started': c['State']['StartedAt']} for c in data])
elif mode == 'manifest':
    directory = Path(args[0]); files = sorted(directory.glob('*.age'))
    assert len(files) == 6 and not list(directory.glob('*.partial'))
    save(directory/'manifest.json.partial', {
        'version': 1, 'state': 'complete', 'started': (directory/'started').read_text().strip(),
        'ended': datetime.now(timezone.utc).isoformat(),
        'consistency': 'online-db-consistent-media-best-effort-not-coordinated-point-in-time',
        'source_counts': 'separate read-only observation; may differ from dump',
        'files': [{'name': p.name, 'bytes': p.stat().st_size, 'sha256': digest(p)} for p in files]})
elif mode == 'check':
    directory = Path(args[0]); manifest = json.load(open(directory/'manifest.json'))
    assert manifest['state'] == 'complete' and len(manifest['files']) == 6
    expected = {'database.dump.age','globals.sql.age','source-evidence.txt.age','media.tar.zst.age','config.tar.zst.age','nginx-image.tar.zst.age'}
    assert {f['name'] for f in manifest['files']} == expected
    assert not list(directory.glob('*.partial'))
    for f in manifest['files']:
        p = directory/f['name']; assert p.is_file() and not p.is_symlink()
        assert p.stat().st_size == f['bytes'] and digest(p) == f['sha256']
    print('Verified: 6 ciphertext artifacts; hashes and sizes match.')
else: raise RuntimeError('Invalid metadata operation')
PY
}

[[ ! -L $base ]] || fail 'Unsafe backup directory.'
if [[ ! -d $base ]]; then
  [[ $stage == init ]] || fail 'Run not initialized.'
  mkdir -m 700 "$base"
fi
meta private "$base" 2>/dev/null || fail 'Backup directory must be root-owned mode 0700.'
[[ ! -L $base/.lock ]] || fail 'Unsafe lock.'
exec 9>"$base/.lock"
flock -n 9 || fail 'Another capture is active.'

if [[ $stage == init ]]; then
  [[ ! -e $run && ! -L $run ]] || fail 'Run already exists; never overwritten.'
  [[ -f $3 && ! -L $3 ]] || fail 'Recipient file missing or unsafe.'
  recipient=$(cat -- "$3")
  [[ $recipient =~ ^age1[023456789acdefghjklmnpqrstuvwxyz]{58}$ ]] || fail 'Invalid native age recipient.'
  # Validate the checksum with age before any source capture.
  printf '' | age -r "$recipient" >/dev/null 2>&1 || fail 'Invalid age recipient.'
  mkdir -m 700 "$run" "$scratch"
  printf '%s\n' "$recipient" >"$run/recipient.txt"
  date -u +%Y-%m-%dT%H:%M:%SZ >"$run/started"
else
  meta private "$run" 2>/dev/null || fail 'Run missing or unsafe.'
  recipient=$(cat "$run/recipient.txt")
  [[ $recipient =~ ^age1[023456789acdefghjklmnpqrstuvwxyz]{58}$ ]] || fail 'Stored recipient invalid.'
fi
if [[ $stage == check ]]; then
  [[ -f $run/finalize.done ]] || fail 'Finalization incomplete.'
  [[ ! -e $scratch && ! -L $scratch ]] || fail 'Private scratch cleanup incomplete.'
  meta check "$run" 2>/dev/null || fail 'Incomplete or corrupt capture.'
  exit 0
fi
meta private "$scratch" 2>/dev/null || fail 'Private scratch missing or unsafe.'
need() { [[ -f $run/$1.done ]] || fail 'Prerequisite stage incomplete.'; }
case "$stage" in db) need init ;; media) need db ;; config) need media ;; finalize) need config ;; esac
[[ ! -e $run/$stage.started && ! -e $run/$stage.done ]] || fail 'Stage already attempted; inspect and use a new run.'
(set -C; printf '%s\n' "$stage" >"$run/$stage.started")
trap 'printf "Capture failed; run is incomplete. No automatic retry.\n" >&2' ERR
encrypt() { age -r "$recipient" 2>/dev/null; }
publish() {
  [[ -s $run/$1.partial && ! -e $run/$1 && ! -L $run/$1 ]]
  mv -n -- "$run/$1.partial" "$run/$1"
  [[ ! -e $run/$1.partial ]]
}
runtime() {
  docker inspect payload postgres nginx >"$scratch/$1.raw.json" 2>/dev/null
  meta identity "$scratch/$1.raw.json" "$scratch/$1.identity.json" 2>/dev/null
}
case "$stage" in
init)
  runtime before
  ;;
db)
  docker exec postgres sh -ec '
    : "${POSTGRES_PASSWORD:?}" "${POSTGRES_USER:?}" "${POSTGRES_DB:?}"
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc
  ' 2>/dev/null | encrypt >"$run/database.dump.age.partial"
  publish database.dump.age
  docker exec postgres sh -ec '
    : "${POSTGRES_PASSWORD:?}" "${POSTGRES_USER:?}"
    export PGPASSWORD="$POSTGRES_PASSWORD"
    exec pg_dumpall -U "$POSTGRES_USER" --globals-only
  ' 2>/dev/null | encrypt >"$run/globals.sql.age.partial"
  publish globals.sql.age
  docker exec -i postgres sh -ec '
    : "${POSTGRES_PASSWORD:?}" "${POSTGRES_USER:?}" "${POSTGRES_DB:?}"
    export PGPASSWORD="$POSTGRES_PASSWORD" PGOPTIONS="-c default_transaction_read_only=on"
    exec psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1
  ' 2>/dev/null <<'SQL' | encrypt >"$run/source-evidence.txt.age.partial"
SELECT 'OBSERVATION: separate from pg_dump snapshot; counts may drift';
SELECT version();
SELECT extname, extversion FROM pg_extension ORDER BY extname;
SELECT format('SELECT %L, count(*) FROM %I.%I;', schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename
\gexec
SQL
  publish source-evidence.txt.age
  ;;
media)
  roots=(); for path in "${media_paths[@]}"; do roots+=("/$path"); done
  meta inventory "$scratch/media-before.json" "${roots[@]}" 2>/dev/null
  tar --acls --xattrs --numeric-owner -C / -cf - -- "${media_paths[@]}" 2>/dev/null |
    zstd -T1 -q -c | encrypt >"$run/media.tar.zst.age.partial"
  meta inventory "$scratch/media-after.json" "${roots[@]}" 2>/dev/null
  cmp -s "$scratch/media-before.json" "$scratch/media-after.json" || fail 'Media changed during capture; run incomplete.'
  publish media.tar.zst.age
  ;;
config)
  config_paths=(home/deploy/thehideaway/compose.prod.yaml
    home/deploy/thehideaway/nginx home/deploy/thehideaway/scripts
    home/deploy/thehideaway/.env.production.enc home/deploy/thehideaway/.sops.yaml
    etc/age/keys.txt etc/letsencrypt usr/local/bin/certbot-reload-nginx
    var/lib/hideaway/current-tag var/lib/hideaway/previous-tag
    var/lib/sophomores-ops/tls-20261010)
  for path in "${config_paths[@]}"; do [[ -e /$path ]] || fail 'Required recovery input missing.'; done
  [[ -L /etc/letsencrypt/renewal-hooks/deploy/20-hideaway-nginx ]] || fail 'Renewal hook symlink missing.'
  # Capture exact recovery bytes into private scratch first, excluding live logs.
  mkdir -m 700 "$scratch/recovery"
  tar --acls --xattrs --numeric-owner -C / --exclude=home/deploy/thehideaway/nginx/logs -cf - -- "${config_paths[@]}" 2>/dev/null |
    tar --acls --xattrs --numeric-owner -C "$scratch/recovery" -xf - 2>/dev/null
  git -c safe.directory="$source" -C "$source" rev-parse HEAD >"$scratch/source-commit.txt" 2>/dev/null
  git -c safe.directory="$source" -C "$source" diff --no-ext-diff --no-textconv --binary HEAD -- compose.prod.yaml nginx scripts .sops.yaml >"$scratch/source-scoped.diff" 2>/dev/null
  docker inspect --format '{{.Image}}' payload postgres nginx >"$scratch/image-ids.txt" 2>/dev/null
  image_ids=()
  while IFS= read -r image_id; do
    [[ $image_id =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Unexpected image identity.'
    image_ids+=("$image_id")
  done <"$scratch/image-ids.txt"
  [[ ${#image_ids[@]} == 3 ]] || fail 'Missing runtime image identity.'
  docker image inspect "${image_ids[@]}" >"$scratch/image-inspect.json" 2>/dev/null
  # Nginx was built locally, so preserve it rather than assuming a registry copy.
  docker image save "${image_ids[2]}" 2>/dev/null |
    zstd -T1 -q -c | encrypt >"$run/nginx-image.tar.zst.age.partial"
  publish nginx-image.tar.zst.age
  runtime after
  cmp -s "$scratch/before.identity.json" "$scratch/after.identity.json" || fail 'Container identity changed; capture incomplete.'
  tar --acls --xattrs --numeric-owner -C "$scratch" -cf - . 2>/dev/null |
    zstd -T1 -q -c | encrypt >"$run/config.tar.zst.age.partial"
  publish config.tar.zst.age
  ;;
finalize)
  # A second identity check catches a restart between config and finalization.
  runtime final
  cmp -s "$scratch/before.identity.json" "$scratch/final.identity.json" || fail 'Container identity changed; capture incomplete.'
  meta manifest "$run" 2>/dev/null
  publish manifest.json
  meta check "$run" 2>/dev/null
  # Delete only this exact run-owned temporary plaintext, never any prior backup.
  [[ $scratch == "$base/$id/private-scratch" && ! -L $scratch ]]
  rm -rf --one-file-system -- "$scratch"
  ;;
esac
printf '%s\n' complete >"$run/$stage.done"
printf 'Stage %s complete.\n' "$stage"
