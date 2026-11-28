#!/bin/bash
# Real disposable PostgreSQL; route side effects and the app-read receipt are synthetic.
set -euo pipefail
helper=${1:?candidate helper required}
scratch=$(mktemp -d /tmp/sph-schema.XXXXXX)
cleanup() {
  if [ -s "$scratch/data/postmaster.pid" ]; then pg_ctl -D "$scratch/data" -w -t 10 stop -m immediate >/dev/null; fi
  rm -r -- "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP
initdb -D "$scratch/data" -A trust --no-locale >/dev/null
pg_ctl -D "$scratch/data" -l "$scratch/postgres.log" -o "-h '' -k $scratch -p 5432" -w -t 15 start >/dev/null
export PGHOST=$scratch PGPORT=5432 PGDATABASE=postgres
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGOPTIONS PGUSER
psql -X -q -v ON_ERROR_STOP=1 -c 'CREATE DATABASE sophomores_review'
export PGDATABASE=sophomores_review
db() { psql -X -q -At -v ON_ERROR_STOP=1 "$@"; }
source <(sed -n '/^EXPECTED_MIGRATIONS=/p; /^BIZ_NUM_MIGRATION=/p; /^schema_is_locked() {/,/^do_u3() {/p; /^back_to_v4() {/,/^# After the route is on v4/p' "$helper" | sed '/^do_u3() {/d; /^# After the route is on v4/d')
db -c 'CREATE TABLE public.payload_migrations (name text, batch numeric); CREATE TABLE public.business_info (business_registration_number text); INSERT INTO public.business_info VALUES ($$synthetic-registration$$);'
db -c 'CREATE TABLE public.commerce_admissions (id integer primary key); CREATE TABLE public.commerce_key_grant_intents (entitlement_id integer);'
fk=commerce_key_grant_intents_entitlement_id_commerce_admissions_i
db -c "ALTER TABLE public.commerce_key_grant_intents ADD CONSTRAINT \"$fk\" FOREIGN KEY (entitlement_id) REFERENCES public.commerce_admissions (id) ON DELETE SET NULL ON UPDATE NO ACTION;"
for name in $EXPECTED_MIGRATIONS; do db -c "INSERT INTO public.payload_migrations VALUES ('$name',1)"; done
git show 6e269092ba04229caf0b55cfb7d28baeef1c4d35:src/payload/migrations/20261127_100000_business_info_biz_num.ts > "$scratch/migration.ts"
up=$(rg -F 'RENAME COLUMN "business_registration_number" TO "biz_num"' "$scratch/migration.ts")
down=$(rg -F 'RENAME COLUMN "biz_num" TO "business_registration_number"' "$scratch/migration.ts")
schema_query() { db -c "$1"; }
UOPS=$scratch/ops PREVIEW_LOCK=$scratch/preview.lock TLS_LOCK=$scratch/tls.lock
mkdir "$UOPS"
hash=$(printf '%064d' 1)
fixture_cid=$(printf '%064d' 2)
printf '%s\n' "$hash" > "$UOPS/route-prev"
PREV8=d4ff8d7d V4_SHA=$hash
schema_proof_key() { printf 'fixture-key\n'; }
schema_proof_file() { [ -f "$1" ] && [ "$(cat "$1")" = "$2" ]; }
hash_of() { shasum -a 256 < "$1" | cut -d' ' -f1; }
vhost_state() { printf '%s\n' "$route"; }
prev_cid() { echo "$fixture_cid"; }
prev_ready() { [ "$ready" = yes ]; }
identity_in() { echo "$hash"; }
cands_down() { [ "$fenced" = yes ]; }
schema_maintenance_current() { [ "${fixture_maintenance:-yes}" = yes ]; }
write_window() { echo write >> "$scratch/actions"; }
reload_checked() { echo reload >> "$scratch/actions"; }
prove_origin() { printf '%s\n' prove >> "$scratch/actions"; }

# Actual kernel locks in the production order, inherited on the designated FDs.
exec 8>"$PREVIEW_LOCK" 9>"$TLS_LOCK"
python3 -I -c 'import fcntl; fcntl.flock(8, fcntl.LOCK_EX|fcntl.LOCK_NB); fcntl.flock(9, fcntl.LOCK_EX|fcntl.LOCK_NB)'
python3 -I - "$PREVIEW_LOCK" "$TLS_LOCK" <<'PY'
import errno, fcntl, sys
for path in sys.argv[1:]:
    with open(path) as fd:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as e:
            if e.errno not in (errno.EAGAIN, errno.EACCES):
                raise
        else:
            raise SystemExit('expected competing lock to refuse')
PY
REVIEW_LOCKS_HELD=1
schema_is_locked
[ "$(schema_state)" = 32 ]
echo 'PASS exact baseline 32 under both locks'
if rg -q "select 'entitlement_fk='" "$helper"; then
  db -c "ALTER TABLE public.commerce_key_grant_intents RENAME CONSTRAINT \"$fk\" TO unexpected_fk;"
  if schema_state; then exit 1; fi
  db -c "ALTER TABLE public.commerce_key_grant_intents RENAME CONSTRAINT unexpected_fk TO \"$fk\";"
  db -c 'ALTER TABLE public.commerce_key_grant_intents ADD CONSTRAINT duplicate_fk FOREIGN KEY (entitlement_id) REFERENCES public.commerce_admissions (id);'
  if schema_state; then exit 1; fi
  db -c 'ALTER TABLE public.commerce_key_grant_intents DROP CONSTRAINT duplicate_fk;'
  echo 'PASS renamed and additional entitlement FKs rejected'
fi
db -c 'INSERT INTO public.payload_migrations VALUES (NULL,NULL)'
if schema_state; then exit 1; fi
db -c 'DELETE FROM public.payload_migrations WHERE name IS NULL'
echo 'PASS extra null ledger entry rejected'

refuse_v4() {
  local route=$1 ready=$2 fenced=$3 rc=0
  : > "$scratch/actions"
  back_to_v4 >/dev/null || rc=$?
  [ "$rc" = 2 ] && [ ! -s "$scratch/actions" ] || exit 1
}
printf '%s\n' started > "$UOPS/schema-up.intent"
printf '%s\n' fixture-key > "$UOPS/schema-maintenance.proven"
# Simulate a crash after the atomic database transaction, before any filesystem success marker.
db -c "BEGIN; $up INSERT INTO public.payload_migrations VALUES ('$BIZ_NUM_MIGRATION',2); COMMIT;"
[ "$(schema_state)" = 33 ]
[ ! -e "$UOPS/schema-up.proven" ]
if schema_route_ready v5; then exit 1; fi
for route in v4 v5 torn; do refuse_v4 "$route" yes yes; done
echo 'PASS committed up without token blocks both routes; no recovery write or reload'
[ "$(db -c 'SELECT biz_num FROM public.business_info')" = synthetic-registration ]
printf '%s\n' fixture-key > "$UOPS/schema-up.proven"
schema_route_ready v5
db -c "INSERT INTO public.payload_migrations VALUES ('$BIZ_NUM_MIGRATION',2)"
if schema_state; then exit 1; fi
db -c "DELETE FROM public.payload_migrations WHERE name='$BIZ_NUM_MIGRATION'; INSERT INTO public.payload_migrations VALUES ('$BIZ_NUM_MIGRATION',2);"
echo 'PASS ambiguous ledger refuses classification'

printf '%s\n' started > "$UOPS/schema-down.intent"
if schema_route_ready v5; then exit 1; fi
db -c "BEGIN; $down DELETE FROM public.payload_migrations WHERE name='$BIZ_NUM_MIGRATION'; COMMIT;"
[ "$(schema_state)" = 32 ]
[ "$(db -c 'SELECT business_registration_number FROM public.business_info')" = synthetic-registration ]
refuse_v4 v5 yes yes
echo 'PASS committed down without old-app proof leaves route untouched'
printf 'fixture-key %s %s %s\n' "$fixture_cid" "$hash" "$(hash_of "$UOPS/schema-down.intent")" > "$UOPS/schema-down-and-old-read.proven"
refuse_v4 v5 no yes
refuse_v4 v5 yes no
fixture_maintenance=no refuse_v4 v5 yes yes
route=torn ready=yes fenced=yes
: > "$scratch/actions"
back_to_v4 >/dev/null
[ "$(cat "$scratch/actions")" = $'write\nreload\nprove' ]
echo 'PASS exact down, synthetic old-app proof and fenced C1 allow verified v4 restore'
