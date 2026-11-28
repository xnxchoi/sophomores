# Review-copy checkpoint

This packet preserves the offline v13 work. It is not a release selection,
build approval, activation receipt, or VPS runbook. Do not execute the
historical rehearsal script on a host or on the VPS. The shell tests source
only specific functions from it and stub their external operations.

From the repository root, use these fixture paths with the focused tests
under `tests/deployment/`. Run tests through `scripts/resource-guard.py`.

| Tests | Input relative to `.tmp/review-copy-prep-20261120/` |
| --- | --- |
| `build`, `umask` | `packet-v13-6e269092-umask/build-v13.sh` |
| `carried-state` | `packet-v13-6e269092-admission/carried-state.py` |
| `carried-collector` | `packet-v13-6e269092-admission/carried-collector.py` |
| `mail`, `schema`, `status`, `status-input`, `u3` | `packet-v13-6e269092-admission/review-update.v13.sh` |
| `ipv6` | Absolute path to `packet-v13/` |
| `r15b`, `smtp-fence` | `packet-v13/rehearse-v13.sh` |
| `recovery` (historical v4 recovery) | `packet-v13/proposals/status-gate-candidate/review-update.v13.sh` |

The schema fixture also requires local PostgreSQL tools; it starts an isolated
socket-only disposable database. The archival build wrapper is pinned to
`6e269092` and intentionally rejects a different `origin/main`; these focused
fixtures do not run the build. The preserved Packet A packaging inputs keep
that historical wrapper self-contained without including images or credentials.

For each Python suite, the focused checks include both invocation modes,
under the resource guard:

```sh
python3 -I tests/deployment/review-copy-v13-carried-state.test.py
python3 -I tests/deployment/review-copy-v13-carried-collector.test.py
python3 -I tests/deployment/review-copy-v13-carried-state.test.py .tmp/review-copy-prep-20261120/packet-v13-6e269092-admission/carried-state.py
python3 -I tests/deployment/review-copy-v13-carried-collector.test.py .tmp/review-copy-prep-20261120/packet-v13-6e269092-admission/carried-collector.py
```

The reviewed offline collector remains a fixture. A trusted reference, live
read-only adapters, stale-operator fencing, and interruption-safe publication
under both locks are not implemented. Old VPS tokens remain historical, and
R15b remains unproven. No deployment permission carries forward.
