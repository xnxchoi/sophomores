"""Local fixture collector. Never connects to Docker, systemd, or the VPS."""

import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import time
import uuid
from contextlib import ExitStack

_spec = importlib.util.spec_from_file_location(
    "carried_state", Path(__file__).with_name("carried-state.py")
)
state = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(state)

MAX_BYTES = 256 * 1024
REPORT_KEYS = {"networks", "evidence", "candidates", "inflight"}


def read_file(path):
    flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK
    with os.fdopen(os.open(path, flags), "rb") as file:
        before = os.fstat(file.fileno())
        state.require(stat.S_ISREG(before.st_mode) and before.st_size <= MAX_BYTES,
                      "missing or invalid fixture file")
        data = file.read(MAX_BYTES + 1)
        after = os.fstat(file.fileno())
        state.require(len(data) <= MAX_BYTES and len(data) == before.st_size
                      and (before.st_size, before.st_mtime_ns, before.st_ctime_ns)
                      == (after.st_size, after.st_mtime_ns, after.st_ctime_ns),
                      "fixture file changed during read")
        return data, after


def names(path):
    state.require(path.is_dir() and not path.is_symlink(), "invalid fixture directory")
    return sorted(entry.name for entry in path.iterdir())


def sha(path):
    return hashlib.sha256(read_file(path)[0]).hexdigest()


def intent_hashes(path):
    entries = names(path)
    state.require(entries == ["n2-intent", "n3-intent"], "unexpected old intent inventory")
    hashes = {}
    for name in entries:
        data, _ = read_file(path / name)
        state.require(bool(data.strip()), "empty old intent")
        hashes[name] = hashlib.sha256(data).hexdigest()
    return hashes


def normalized(root):
    old, new = root / "old", root / "new"
    # A deliberately separate fixture layout; this is not an adapter to live UOPS paths.
    state.require(set(names(old)) == {"tokens", "pins", "intents", "transfer.sha256", "v4"}
                  and set(names(new)) == {"tokens", "intents", "transfer.sha256"},
                  "unexpected local fixture inventory")
    pin_files = names(old / "pins")
    state.require(pin_files == ["nginx-id.0001", "pg-id.0001", "prev-app-id"],
                  "unexpected service pin history")
    report = json.loads(read_file(root / "runtime-fixture.json")[0],
                        object_pairs_hook=state.unique_pairs, parse_constant=state.reject_constant)
    state.require(isinstance(report, dict) and set(report) == REPORT_KEYS,
                  "runtime fixture incomplete")
    v4, v4_stat = read_file(old / "v4")
    return {
        "state": {
            "manifest": sha(old / "transfer.sha256"),
            "old_tokens": {n: sha(old / "tokens" / n) for n in names(old / "tokens")},
            "pins": {
                service: read_file(old / "pins" / filename)[0].decode("ascii").removesuffix("\n")
                for service, filename in zip(("nginx", "pg", "prev"), pin_files)
            },
            "pin_generations": {"nginx": ["0001"], "pg": ["0001"]},
            "v4": {"hash": hashlib.sha256(v4).hexdigest(),
                   "device_inode": f"{v4_stat.st_dev}:{v4_stat.st_ino}"},
            "networks": report["networks"],
            "evidence": report["evidence"],
        },
        "new_manifest": sha(new / "transfer.sha256"),
        "active_tokens": names(new / "tokens"),
        "candidates": report["candidates"],
        "inflight": report["inflight"],
        "unexpected_intents": names(new / "intents"),
        "active_marker": False,  # Extra entries in new/, including any marker, are rejected above.
    }


def acquire(stack, path):
    fd = os.open(path, os.O_RDWR | os.O_NOFOLLOW | os.O_NONBLOCK)
    stack.callback(os.close, fd)
    info = os.fstat(fd)
    state.require(stat.S_ISREG(info.st_mode), "invalid fixture lock")
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    return path, info


def assert_lock_paths(locks):
    for path, info in locks:
        current = path.lstat()
        state.require(stat.S_ISREG(current.st_mode) and os.path.samestat(info, current),
                      "fixture lock path changed")


def collect_fixture(root, reference, approval_sha, new_manifest, *,
                    scan=normalized, clock=time.monotonic_ns, max_age_ns=5_000_000_000):
    """Return comparison evidence, never an import or activation receipt."""
    state.require(root.is_dir() and not root.is_symlink(), "invalid local fixture root")
    state.require(read_file(root / "fixture-only")[0] == b"carried-state-fixture-v1\n",
                  "not a local fixture")
    state.require(set(reference) == {"snapshot", "old_intent_sha256"}
                  and state.digest(approval_sha) and state.fingerprint(reference) == approval_sha,
                  "reference digest differs")
    expected = reference["old_intent_sha256"]
    state.require(set(expected) == {"n2-intent", "n3-intent"}
                  and all(map(state.digest, expected.values())), "invalid intent reference")
    snapshot = reference["snapshot"]
    reference_sha = state.fingerprint(snapshot)
    with ExitStack() as stack:
        locks = [acquire(stack, root / name) for name in ("preview.lock", "tls.lock")]
        state.require(not os.path.samestat(locks[0][1], locks[1][1]), "locks alias")
        assert_lock_paths(locks)
        attempt = uuid.uuid4().hex
        started = clock()
        for _ in range(2):
            assert_lock_paths(locks)
            current = scan(root)
            state.require(intent_hashes(root / "old/intents") == expected,
                          "historical intent bytes differ")
            comparison = state.verify(snapshot, current, reference_sha, new_manifest)
            assert_lock_paths(locks)
        state.require(0 <= clock() - started <= max_age_ns, "fixture observation expired")
        return {**comparison, "attempt": attempt, "approval_sha256": approval_sha,
                "result": "offline-collector-fixture-only"}
