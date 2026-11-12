# T002-A handback — design candidate

## Identity and disposition

- Assignment: SPH-T002-A-20261113-01; task `task_6cd2b114a5e2`.
- Candidate, not blocked; review checkpoint. No application or provider acceptance.
- Baseline/HEAD before candidate commit: `38f9dfe173c3cce51ff34fa4297c1245ae64a337`, the main commit adding this assignment.
- Branch: `codex/t002-a-20261113`.
- Worktree: `/Users/seanschoi/orca/workspaces/sphmrs/t002-a-20261113`.
- Initial tracked/untracked status: clean. Orca supplied `xnxchoi/t002-a-20261113`; initial branch rename failed with “Operation not permitted”, then the explicitly scoped sandbox-approved rename succeeded.
- Changed files: [model.md](model.md) and this handback only. Existing [spec.md](spec.md) unchanged.
- Model covers every T002 reframe/answer plus U1–U3, launch cases, and a separately dispatchable fail-closed fake-store/fake-issuer P2 slice.

## Diff identity

Model-only staged diff SHA-256: `a5e002b82856e18b640f658b07b1ea1cf58609cd86d8d7221361f0a3cb266610` (41,459 bytes).

Hash input is the exact stdout bytes of `rtk proxy git diff --cached HEAD -- docs/qa/t002-a-20261113/model.md` before this candidate commit, against the baseline above. It intentionally excludes this self-describing handback to avoid a self-referential hash. The final candidate commit identifies both files; the worker-done message supplies its commit and full committed-diff SHA-256.

## Checks and actual output

Standard-library preliminary checker (model only; handback not yet written):

```text
PRECHECK files=1 local_links=26 anchors=12 source_ranges=40 errors=0
```

Final checker below scans both changed Markdown files, ignoring fenced code, resolves relative local links and GitHub-style heading fragments, bounds every cited source range, checks the file allowlist, and verifies no node_modules symlink/environment was created. It does not verify document semantics, run application tests or validate external links.

<!-- CHECKER-BEGIN -->
```python
from pathlib import Path
from urllib.parse import unquote
import re
import subprocess
root = Path.cwd()
owned = root / "docs/qa/t002-a-20261113"
files = [owned / "model.md", owned / "handback.md"]
errors = []
links = fragments = ranges = 0

def prose(text):
    return re.sub(r"^```[^\n]*\n.*?^```[^\n]*$", "", text, flags=re.M | re.S)

def anchors(text):
    counts, result = {}, set()
    for title in re.findall(r"^#{1,6}\s+(.+?)\s*#*$", prose(text), re.M):
        title = re.sub(r"[`*_]", "", title).lower()
        slug = "".join(c for c in title if c.isalnum() or c in " -_").replace(" ", "-")
        n = counts.get(slug, 0)
        counts[slug] = n + 1
        result.add(slug + (f"-{n}" if n else ""))
    return result

for file in files:
    text = prose(file.read_text())
    for _, target in re.findall(r"\[([^\]]+)\]\(([^)]+)\)", text):
        if re.match(r"^[a-z]+:", target):
            continue
        path, sep, fragment = unquote(target).partition("#")
        dest = (file.parent / path).resolve() if path else file
        links += 1
        if not dest.is_file():
            errors.append(f"missing link: {target}")
        elif sep:
            fragments += 1
            if fragment not in anchors(dest.read_text()):
                errors.append(f"missing anchor: {target}")
    for name, first, last in re.findall(r"`(src/[^`:]+):(\d+)(?:-(\d+))?`", text):
        dest = root / name
        first, last = int(first), int(last or first)
        ranges += 1
        if not dest.is_file() or not 1 <= first <= last <= len(dest.read_text().splitlines()):
            errors.append(f"invalid range: {name}:{first}-{last}")
status = subprocess.run(["rtk", "proxy", "git", "status", "--porcelain=v1", "-uall"],
                        capture_output=True, text=True, check=True).stdout
changed = [line[3:] for line in status.splitlines()]
allowed = {str(file.relative_to(root)) for file in files}
if set(changed) != allowed:
    errors.append(f"unexpected changed paths: {changed}")
if (root / "node_modules").exists() or (root / "node_modules").is_symlink():
    errors.append("unexpected node_modules")
print(f"CHECK files={len(files)} local_links={links} anchors={fragments} source_ranges={ranges} errors={len(errors)}")
print(f"SCOPE changed_files={len(changed)} allowlist={'PASS' if set(changed) == allowed else 'FAIL'} node_modules=absent")
for error in errors:
    print(error)
raise SystemExit(bool(errors))
```
<!-- CHECKER-END -->

Actual final output:

```text
CHECK files=2 local_links=29 anchors=13 source_ranges=40 errors=0
SCOPE changed_files=2 allowlist=PASS node_modules=absent
```

Decision-row inventory: `R01` through `R17` and `U1` through `U3` all appear once in the reconciliation table (20 rows).

Additional actual checks:

```text
NODE_MODULES_EXISTS=False
NODE_MODULES_SYMLINK=False
```

`rtk git diff --check` and `rtk git diff --cached --check`: both exited 0 with empty stdout after final staging. No Node/test/build/typecheck/preview, database, Docker, provider, RPC, email, dependency install/audit, schema generation or migration was run. Runtime/coverage requirements belong to the later P2 assignment, not this design-only acceptance. No agent-started workloads or services remain; no subagents were used. Machine RAM/headroom was not sampled because no guarded or heavy workload was started.

## Failures, limitations and final review

- Fast-context lookup was attempted first and returned `Error [AUTH_ERROR]: HTTP 401`; used read-only direct source inspection instead. No provider-credential repair or retries.
- Early shell outputs were replaced with opaque compression markers; reread the required content in bounded chunks and subsequently normal output. No acceptance relies on an unread marker.
- Patch tooling initially wrote this worker's model at worktree root despite an absolute owned path; immediately moved that newly created file into its owned directory before staging. No unrelated file changed, and the final allowlist check includes no root artifact.
- Semantic self-review is not independent specialist or owner review. Final pass retained all U1–U3 holds, did not infer activation means refundable, and made already-holder bundle collisions/past-event behavior explicit no-effects policy holds. The coordinator performs independent review per shared rules; no UI changed, so browser/Santa UI acceptance does not apply.
- Link and source-range checks prove location/range validity, not policy truth, database races, legal enforceability, actual issuance or device behavior. All source findings are static baseline evidence.

## Open owner decisions that block this P2 slice

None for the exact isolated fail-closed kernel in [the dispatch contract](model.md#p2-dispatch-contract--isolated-accounttokenallocation-kernel). Unselected already-holder bundle, late-activation and after-activation-return policy branches must remain unchanged-state holds, with synthetic alternatives clearly not product acceptance. They block enabling those production paths, not this local slice. No page/copy, custody, event-lock, hardware or legal/provider selection is requested to execute this bounded contract.

## Unmet criteria / next actor

No known unmet design acceptance criterion after the final checker passes. Coordinator reviews the candidate and may separately dispatch the written P2 kernel; schema/migration, production wiring, dependencies, providers, actual DB/device/UI and deployment remain outside this assignment. Do not interpret this handback or its local checks as approval for those phases.
