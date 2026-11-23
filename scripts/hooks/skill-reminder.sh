#!/usr/bin/env bash
# DRAFT hook script (not installed). One script, three modes:
#   domain   PreToolUse Edit|Write: once per session per domain, remind which skills to load
#   log      PostToolUse Skill: append the loaded skill to .tmp/skills-used/<session>.log
#   packet   PreToolUse Bash on orca orchestration send/reply/worker_done: remind the "Skills used:" line
# Reads hook JSON on stdin; prints hook JSON or nothing. Never blocks.
set -u
mode="${1:-}"
in="$(cat)"
sid="$(printf '%s' "$in" | jq -r '.session_id // "nosession"')"
cwd="$(printf '%s' "$in" | jq -r '.cwd // empty')"; [ -n "$cwd" ] || cwd="$PWD"
logdir="$cwd/.tmp/skills-used"
mark="${TMPDIR:-/tmp}/sphmrs-skill-reminder-$sid"

emit() { # $1 event, $2 text
  jq -n --arg e "$1" --arg t "$2" '{hookSpecificOutput:{hookEventName:$e, additionalContext:$t}}'
}

case "$mode" in
  domain)
    f="$(printf '%s' "$in" | jq -r '.tool_input.file_path // empty')"
    case "$f" in
      */src/lib/member-auth/*|*/src/lib/phone-verification/*|*/src/lib/auth/*|*/src/lib/commerce/*|*/src/lib/tickets/*|*/src/lib/invitation/*|*/src/app/api/*|*/src/app/\(auth\)/*|*/src/app/\(site\)/tickets/payment/*|*/src/app/\(site\)/shop/*|*/src/app/\(site\)/account/*|*/src/payload/collections/commerce-*|*/src/payload/collections/orders*)
        d=security
        t="Security-sensitive path. Before editing, load ecc:security-review. If this page or handler shows personal data, apply the personal-data checklist (ROUTING.md): Cache-Control private,no-store; persisted-pageshow hide + session re-check; clear client copies on sign-out/switch; no personal data in URLs; CSRF + cookie flags; deterministic tests of our reaction. Reviewers fail a packet missing any item." ;;
      */messages/en.json|*/messages/ko.json)
        d=catalogue
        t="Copy catalogue. Load sphmrs-catalogue-copy-pass and ux-writing first. ko mirrors en structure with \"\"; never translate or overwrite Korean without an owner request; never ecc:i18n-sync." ;;
      */src/components/*|*/src/app/\(site\)/*|*/src/hideaway/*)
        d=ui
        t="UI path. Load better-ui, ecc:make-interfaces-feel-better and ecc:frontend-design-direction (motion: ecc:motion-foundations; copy: ux-writing). Owner overrides win: Hideaway design, Arc for primitives/forms only, Tailwind-only, full motion (drop reduced-motion branches), colour hold, no mono." ;;
      */src/payload/*)
        d=payload
        t="Payload path. Load payload (migrations: also ecc:database-migrations). Payload-native first; land with test:database-proofs:guarded." ;;
      *) exit 0 ;;
    esac
    grep -qx "$d" "$mark" 2>/dev/null && exit 0
    echo "$d" >> "$mark"
    # Record the reminder too, so reviewers see "reminded but not loaded" directly.
    mkdir -p "$logdir" && printf '%s\treminded:%s\n' "$(date -u +%FT%TZ)" "$d" >> "$logdir/$sid.log"
    emit PreToolUse "$t" ;;
  log)
    s="$(printf '%s' "$in" | jq -r '.tool_input.skill // empty')"
    [ -n "$s" ] || exit 0
    mkdir -p "$logdir" && printf '%s\t%s\n' "$(date -u +%FT%TZ)" "$s" >> "$logdir/$sid.log" ;;
  packet)
    c="$(printf '%s' "$in" | jq -r '.tool_input.command // empty')"
    printf '%s' "$c" | grep -qE 'orca orchestration (send|reply|ask)|worker_done' || exit 0
    printf '%s' "$c" | grep -q 'Skills used:' && exit 0
    used="$(cut -f2 "$logdir/$sid.log" 2>/dev/null | grep -v '^reminded:' | sort -u | paste -sd, - | sed 's/,/, /g')"
    emit PreToolUse "Packet without a 'Skills used:' line. Add: Skills used: ${used:-none recorded} (log: .tmp/skills-used/$sid.log). Reviewers check it against the log."
    ;;
esac
exit 0
