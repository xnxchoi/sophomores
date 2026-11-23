#!/usr/bin/env bash
# Project hook (.claude/settings.json). One script, three modes:
#   domain   PreToolUse Edit|Write: once per session per area, remind which skills to load
#   log      PostToolUse Skill: append the loaded skill to .tmp/skills-used/<session>.log
#   packet   PreToolUse Bash on orca orchestration send/reply/ask: remind the "Skills used:" line
# Reads hook JSON on stdin; prints hook JSON or nothing. Never blocks.
#
# Writes go only to <project>/.tmp/skills-used/. The project root comes from
# CLAUDE_PROJECT_DIR (or git), never from the hook input; the session id must
# match [A-Za-z0-9-]+ before it is used in a file name.
set -u
mode="${1:-}"
in="$(cat)"

root="${CLAUDE_PROJECT_DIR:-}"
[ -n "$root" ] && [ -d "$root" ] || root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[ -n "$root" ] && [ -d "$root" ] || exit 0
logdir="$root/.tmp/skills-used"

sid="$(printf '%s' "$in" | jq -r '.session_id // empty' 2>/dev/null)"
case "$sid" in
  "" | *[!A-Za-z0-9-]*) sid="" ;;
esac

# Create the log directory only as real directories inside the project; refuse symlinks.
ensure_logdir() {
  [ -n "$sid" ] || return 1
  [ -L "$root/.tmp" ] && return 1
  [ -L "$logdir" ] && return 1
  mkdir -p "$logdir" 2>/dev/null || return 1
  [ -d "$logdir" ] && [ ! -L "$logdir" ]
}

# A log file may be read only when the session id is valid and no part of the path
# (.tmp, the log directory, the file) is a symlink: the same checks as for writes.
safe_read() { # $1 file name
  [ -n "$sid" ] || return 1
  [ -L "$root/.tmp" ] && return 1
  [ -L "$logdir" ] && return 1
  [ -L "$logdir/$1" ] && return 1
  [ -f "$logdir/$1" ]
}

# Append one line to a file in the log directory; never through a symlink.
append() { # $1 file name, $2 line
  ensure_logdir || return 0
  [ -L "$logdir/$1" ] && return 0
  printf '%s\n' "$2" >> "$logdir/$1"
}

emit() { # $1 event, $2 text
  jq -n --arg e "$1" --arg t "$2" '{hookSpecificOutput:{hookEventName:$e, additionalContext:$t}}'
}

case "$mode" in
  domain)
    f="$(printf '%s' "$in" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
    case "$f" in
      */src/lib/member-auth/*|*/src/lib/phone-verification/*|*/src/lib/auth/*|*/src/lib/commerce/*|*/src/lib/tickets/*|*/src/lib/invitation/*|*/src/app/api/*|*/src/app/\(auth\)/*|*/src/app/\(site\)/tickets/payment/*|*/src/app/\(site\)/shop/*|*/src/app/\(site\)/account/*|*/src/payload/collections/commerce-*|*/src/payload/collections/orders*)
        d=security
        t="Security-sensitive path. Routing (agent-authored process): load ecc:security-review. Owner baseline, 23 Nov (AGENTS.md, \"Personal-data baseline\"): if the change exposes personal data or alters its lifecycle, also load sphmrs-personal-data-pages and build in its checklist: Cache-Control private,no-store; persisted-pageshow hide + session re-check; clear client copies on sign-out/switch; no personal data in URLs; CSRF + cookie flags; deterministic tests of our reaction." ;;
      */messages/en.json|*/messages/ko.json)
        d=catalogue
        t="Copy catalogue. Routing (agent-authored process): load sphmrs-catalogue-copy-pass and ux-writing first; agent note: do not use ecc:i18n-sync. Owner rules (AGENTS.md, \"Canonical UI copy and Korean authoring policy\"): ko mirrors en structure with \"\" for new keys; never translate or overwrite Korean without an owner request." ;;
      */src/components/*|*/src/app/\(site\)/*|*/src/hideaway/*)
        d=ui
        t="UI path. Routing (agent-authored process): load better-ui, ecc:make-interfaces-feel-better and ecc:frontend-design-direction (motion: ecc:motion-foundations; copy: ux-writing). Owner rules (AGENTS.md): The Hideaway is the design default; Arc for primitives and forms only; Tailwind-only styling; full motion, no reduced-motion branches. Owner, colours on hold (plan, 14-16 Nov). Owner, 21 Nov, verbatim: 'Didn't I tell you guys to, like, don't fucking use mono as a default anywhere besides the places that I explicitly tell you to?' So: no mono as a default; mono only where he names it." ;;
      */src/payload/*)
        d=payload
        t="Payload path. Routing (agent-authored process): load payload (migrations: also ecc:database-migrations). Owner rule (AGENTS.md, \"Database: Payload-native first\"): no quick-tweak direct edits on Payload data. Agent note, a recommendation and not a gate: commerce, auth, wallet and NFC landings also run test:database-proofs:guarded; tests never block progress (AGENTS.md, ADR-0015)." ;;
      *) exit 0 ;;
    esac
    # Once per session per area. Without a valid session id, remind every time and log nothing.
    if [ -n "$sid" ]; then
      safe_read ".reminded-$sid" && grep -qx "$d" "$logdir/.reminded-$sid" 2>/dev/null && exit 0
      append ".reminded-$sid" "$d"
      # Record the reminder too, so reviewers see "reminded but not loaded" directly.
      append "$sid.log" "$(date -u +%FT%TZ)	reminded:$d"
    fi
    emit PreToolUse "$t" ;;
  log)
    s="$(printf '%s' "$in" | jq -r '.tool_input.skill // empty' 2>/dev/null)"
    [ -n "$s" ] || exit 0
    # Skill names are logged as data: one line, tabs and newlines replaced.
    s="$(printf '%s' "$s" | tr '\t\n\r' '   ' | cut -c1-200)"
    append "$sid.log" "$(date -u +%FT%TZ)	$s" ;;
  packet)
    c="$(printf '%s' "$in" | jq -r '.tool_input.command // empty' 2>/dev/null)"
    printf '%s' "$c" | grep -qE 'orca orchestration (send|reply|ask)|worker_done' || exit 0
    printf '%s' "$c" | grep -q 'Skills used:' && exit 0
    used=""
    safe_read "$sid.log" && used="$(cut -f2 "$logdir/$sid.log" 2>/dev/null | grep -v '^reminded:' | sort -u | paste -sd, - | sed 's/,/, /g')"
    emit PreToolUse "Process note (agent-authored): end the packet with a 'Skills used:' line. Add: Skills used: ${used:-none recorded}${sid:+ (log: .tmp/skills-used/$sid.log)}. A missing line is a note for reviewers, not a FAIL."
    ;;
esac
exit 0
