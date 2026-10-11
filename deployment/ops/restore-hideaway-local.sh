#!/bin/bash
# Local, isolated database restore proof; never starts the application or restores roles.
# Usage: restore-hideaway-local.sh STAGE ABSOLUTE_BACKUP_DIR ABSOLUTE_AGE_IDENTITY
# Stages: validate, start, database, verify, cleanup. Failed mutations require inspection.
set -Eeuo pipefail
umask 077
fail() { printf '%s\n' "$1" >&2; exit 1; }
[[ $# == 3 ]] || fail 'Usage: STAGE ABSOLUTE_BACKUP_DIR ABSOLUTE_AGE_IDENTITY'
stage=$1 backup=$2 identity=$3
case "$stage" in validate|start|database|verify|cleanup) ;; *) fail 'Invalid stage.' ;; esac
[[ $backup == /* && $identity == /* ]] || fail 'Absolute paths required.'
[[ $backup != *','* && $backup != *$'\n'* && $backup != *$'\r'* ]] || fail 'Unsafe mount path.'
journal=$backup/.restore-journal scratch=$backup/.restore
image=postgres@sha256:15b46a9c5a6b361eb4c0ce8d689365bf49fbf6802e615dce4e5e2326b3213e15
image_id=sha256:c0eb29927f0e8590eac49c9d5bf9c5ebf87f4e6e7273e0a9270218e6b73795ee
# Registry-verified mapping: index sha256:96d56f7f57c6aacd1fcb908bc83b345ec5f83231ee486dd66a1baadce274db88
# selects this linux/amd64 manifest, whose config digest is image_id. The runtime
# pins the platform manifest directly. Classic Docker reports the config
# identity; Docker Desktop's containerd store may report the platform manifest.
platform_id=sha256:15b46a9c5a6b361eb4c0ce8d689365bf49fbf6802e615dce4e5e2326b3213e15
docker_local() { docker --host unix:///var/run/docker.sock "$@"; }
decrypt() { age --decrypt -i "$identity" "$backup/$1" 2>/dev/null; }

# Ciphertext hashes and authentication tags precede restore mutations. Cleanup is
# independent of backup integrity/key availability and verifies ownership instead.
# age may emit unauthenticated prefixes: the initial pass deliberately discards them.
python3 -I - "$backup" "$identity" "$stage" <<'PY' 2>/dev/null || fail 'Unsafe paths, permissions, or incomplete/corrupt manifest.'
import hashlib,json,os,stat,sys
from pathlib import Path
d,k=map(Path,sys.argv[1:3]); cleanup=sys.argv[3]=='cleanup'
paths=[(d,stat.S_ISDIR,0o700)] + ([] if cleanup else [(k,stat.S_ISREG,0o600)])
for p,kind,mode in paths:
    s=p.lstat(); assert kind(s.st_mode) and s.st_uid==os.getuid() and stat.S_IMODE(s.st_mode)==mode
    assert str(p)==os.path.realpath(p)
if not cleanup:
    m=d/'manifest.json'; assert m.is_file() and not m.is_symlink()
    v=json.loads(m.read_text()); assert v['version']==1 and v['state']=='complete'
    expected={'database.dump.age','globals.sql.age','source-evidence.txt.age','media.tar.zst.age','config.tar.zst.age','nginx-image.tar.zst.age'}
    assert len(v['files'])==6 and {f['name'] for f in v['files']}==expected
    for f in v['files']:
        p=d/f['name']; s=p.lstat(); assert stat.S_ISREG(s.st_mode) and s.st_size==f['bytes']
        h=hashlib.sha256()
        with p.open('rb') as stream:
            for b in iter(lambda:stream.read(1024*1024),b''): h.update(b)
        assert h.hexdigest()==f['sha256']
for name in ('.restore-journal','.restore'):
    p=d/name
    if p.exists() or p.is_symlink():
        s=p.lstat(); assert stat.S_ISDIR(s.st_mode) and s.st_uid==os.getuid() and stat.S_IMODE(s.st_mode)==0o700
        if name=='.restore-journal':
            for entry in p.iterdir(): assert entry.is_file() and not entry.is_symlink()
PY
if [[ $stage != cleanup ]]; then
  for artifact in database.dump.age globals.sql.age source-evidence.txt.age media.tar.zst.age config.tar.zst.age nginx-image.tar.zst.age; do
    decrypt "$artifact" >/dev/null || fail 'Ciphertext authentication failed; no restore attempted.'
  done
fi

mkdir "$backup/.restore-lock" 2>/dev/null || fail 'Restore operation already active or interrupted; inspect lock.'
trap 'rmdir "$backup/.restore-lock"' EXIT
trap 'printf "Stage failed; inspect private journal. Never automatically replay.\n" >&2' ERR
[[ -d $journal ]] || mkdir -m 700 "$journal"
[[ ! -e $journal/$stage.started && ! -e $journal/$stage.done ]] || fail 'Stage already attempted; inspect before proceeding.'
need() { [[ -f $journal/$1.done ]] || fail 'Prerequisite stage incomplete.'; }
mark() {
  python3 -I - "$journal/$1" "$2" <<'PY'
import os,sys
from pathlib import Path
p=Path(sys.argv[1])
with p.open('x') as f: f.write(sys.argv[2]+'\n'); f.flush(); os.fsync(f.fileno())
fd=os.open(p.parent,os.O_RDONLY); os.fsync(fd); os.close(fd)
PY
}
owned() {
  [[ -f $journal/container.id && -f $journal/owner ]] || fail 'Container identity not captured; inspect manually.'
  cid=$(cat "$journal/container.id") owner=$(cat "$journal/owner")
  [[ $cid =~ ^[a-f0-9]{64}$ && $owner =~ ^[a-f0-9]{32}$ ]] || fail 'Invalid captured container identity.'
  docker_local inspect "$cid" >"$journal/inspect.private.json" 2>/dev/null
  python3 -I - "$journal/inspect.private.json" "$cid" "$owner" "$scratch/data" "$image_id" "$platform_id" "$image" <<'PY' 2>/dev/null || fail 'Container ownership or isolation mismatch.'
import json,sys
p,cid,owner,data,config,manifest,ref=sys.argv[1:]; c,=json.load(open(p))
assert c['Id']==cid and c['Image'] in (config,manifest) and c['Config']['Image']==ref
assert c['Config']['Labels']['co.sophomores.restore']==owner
assert c['HostConfig']['NetworkMode']=='none' and not c['HostConfig'].get('PortBindings')
mounts=c['Mounts']; assert len(mounts)==2
assert any(m['Source']==data and m['Destination']=='/var/lib/postgresql' and m['RW'] for m in mounts)
assert any(m['Source']==data.rsplit('/',1)[0]+'/password' and m['Destination']=='/run/restore-password' and not m['RW'] for m in mounts)
PY
}
case "$stage" in
validate)
  mark validate.started authenticated
  # Authentication is not archive/media/application verification.
  mark validate.done 'six ciphertext hashes and complete age authentication passed'
  ;;
start)
  need validate
  fdesetup status 2>/dev/null | grep -qx 'FileVault is On.' || fail 'FileVault must be On before plaintext restore.'
  python3 -I - "$backup" <<'PY' 2>/dev/null || fail 'Backup must reside on the FileVault-protected macOS Data volume.'
import os,sys
assert os.stat(sys.argv[1]).st_dev==os.stat('/System/Volumes/Data').st_dev
PY
  [[ ! -e $scratch && ! -L $scratch ]] || fail 'Scratch already exists.'
  docker_local image inspect --platform linux/amd64 "$image" 2>/dev/null | \
    python3 -I -c 'import json,sys
c,=json.load(sys.stdin); config,manifest,ref=sys.argv[1:]
assert c["Id"] in (config,manifest) and ref in c["RepoDigests"]
assert c["Os"]=="linux" and c["Architecture"]=="amd64"
' "$image_id" "$platform_id" "$image" 2>/dev/null || fail 'Pinned PostgreSQL runtime image missing, incomplete, or different.'
  mark start.started attempted
  mkdir -m 700 "$scratch" "$scratch/data"
  python3 -I - "$journal" "$scratch" <<'PY'
import secrets,sys
from pathlib import Path
j,s=map(Path,sys.argv[1:]); owner=secrets.token_hex(16)
for p,value in [(j/'owner',owner),(j/'name','sophomores-restore-'+owner),(s/'password',secrets.token_hex(32))]:
    with p.open('x') as f: f.write(value+'\n')
PY
  name=$(cat "$journal/name") owner=$(cat "$journal/owner")
  # --cidfile is exclusive; failure after creation leaves evidence, not an automatic retry.
  docker_local run --detach --pull never --platform linux/amd64 --network none \
    --memory 512m --cpus 1 --pids-limit 128 --name "$name" \
    --label "co.sophomores.restore=$owner" --cidfile "$journal/container.id" \
    --mount "type=bind,src=$scratch/data,dst=/var/lib/postgresql" \
    --mount "type=bind,src=$scratch/password,dst=/run/restore-password,readonly" \
    -e POSTGRES_PASSWORD_FILE=/run/restore-password -e POSTGRES_DB=restore \
    "$image" -c shared_buffers=32MB -c max_connections=10 -c max_locks_per_transaction=256 \
    >"$journal/start.private.log" 2>&1
  owned
  ready=no
  for ((i=0;i<60;i++)); do
    if docker_local exec "$cid" pg_isready -U postgres -d restore >/dev/null 2>&1; then ready=yes; break; fi
    sleep 2
  done
  [[ $ready == yes ]] || fail 'PostgreSQL readiness timed out; inspect without replay.'
  mark start.done ready
  ;;
database)
  need start; owned
  mark database.started attempted
  # Listing only consumes the TOC. Drain the rest so age can check its final tag
  # instead of receiving SIGPIPE from an intentionally early-closing consumer.
  decrypt database.dump.age | docker_local exec -i "$cid" sh -c \
    'pg_restore --list; status=$?; cat >/dev/null; exit "$status"' \
    >"$journal/toc.private.txt" 2>"$journal/toc.private.log"
  decrypt database.dump.age | docker_local exec -i "$cid" pg_restore \
    --no-owner --no-privileges --no-tablespaces --exit-on-error --single-transaction \
    -U postgres -d restore >"$journal/restore.private.log" 2>&1
  mark database.done 'transactional logical restore completed; globals not restored'
  ;;
verify)
  need database; owned
  mark verify.started attempted
  decrypt source-evidence.txt.age >"$journal/source.private.txt"
  docker_local exec -i "$cid" psql -X -U postgres -d restore -At -v ON_ERROR_STOP=1 \
    >"$journal/restored.private.txt" 2>"$journal/verify.private.log" <<'SQL'
SELECT extname, extversion FROM pg_extension ORDER BY extname;
SELECT format('SELECT %L, count(*) FROM %I.%I;', schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename
\gexec
SQL
  python3 -I - "$journal" "$backup/restore-evidence.json" <<'PY'
import json,sys
from pathlib import Path
j,out=map(Path,sys.argv[1:])
def parse(path):
    tables={}; extensions={}
    for line in path.read_text().splitlines():
        parts=line.split('|')
        if len(parts)!=2: continue
        key,value=parts
        if '.' in key and value.isdigit(): tables[key]=int(value)
        elif key in ('plpgsql','pgcrypto'): extensions[key]=value
    return tables,extensions
src,se=parse(j/'source.private.txt'); dst,de=parse(j/'restored.private.txt')
missing=len(src.keys()-dst.keys()); extra=len(dst.keys()-src.keys())
drift=sum(src[k]!=dst[k] for k in src.keys() & dst.keys())
ok=bool(src) and len(dst)==158 and not missing and not extra and set(de)=={'plpgsql','pgcrypto'} and se==de
evidence={'scope':'isolated PostgreSQL logical restore only; no app, media, config or role restore',
 'table_count':len(dst),'source_observed_table_count':len(src),'missing_tables':missing,'extra_tables':extra,
 'tables_with_count_drift':drift,'extensions_match':se==de,'structural_check_passed':ok,
 'count_note':'source observation used a separate snapshot; differences require review',
 'ciphertext_hashes_and_authentication':'six artifacts passed','media_content_verified':False,'application_verified':False}
with out.open('x') as f: json.dump(evidence,f,sort_keys=True)
assert ok, 'Structure mismatch; inspect private evidence.'
assert drift==0, 'Observed count drift; inspect private evidence, do not silently accept.'
PY
  mark verify.done 'database metadata and observed counts match'
  ;;
cleanup)
  [[ -f $journal/start.started ]] || fail 'No attempted startup to clean.'
  owned
  mark cleanup.started attempted
  # The server must be stopped before deleting its files, but retain its container
  # until host cleanup succeeds so a failed deletion never loses ownership evidence.
  docker_local stop --time 60 "$cid" \
    >"$journal/stop.private.log" 2>&1 || fail 'Stop requires inspection; no data deleted.'
  docker_local inspect --format '{{.State.Running}}' "$cid" | grep -qx false || fail 'Container still running.'
  # macOS Docker bind mounts expose files as the local owner. Never follow symlinks.
  python3 -I - "$scratch" <<'PY'
import os,shutil,stat,sys
p=sys.argv[1]; s=os.lstat(p)
assert stat.S_ISDIR(s.st_mode) and s.st_uid==os.getuid() and stat.S_IMODE(s.st_mode)==0o700
assert p.endswith('/.restore') and os.path.realpath(p)==p
shutil.rmtree(p)
PY
  docker_local rm "$cid" >"$journal/cleanup.private.log" 2>&1
  python3 -I - "$backup/restore-cleanup-evidence.json" <<'PY'
import json,sys
with open(sys.argv[1],'x') as f:
    json.dump({'owned_container_removed':True,'plaintext_database_scratch_removed':True,
        'private_journal_retained':True,'note':'private metadata and diagnostic logs remain; not a full application restore'},f)
PY
  mark cleanup.done 'owned container and plaintext database scratch removed'
  ;;
esac
printf 'Stage %s complete. Scope: isolated database proof, not application recovery.\n' "$stage"
