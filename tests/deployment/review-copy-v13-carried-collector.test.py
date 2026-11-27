"""Exercise the offline collector against temporary fixture directories."""

import fcntl
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sys

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("collector", Path(sys.argv.pop(1)))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)
state = collector.state


def digest(data):
    return hashlib.sha256(data).hexdigest()


class CollectorTest(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.root = Path(scratch.name)
        for child in ("old/pins", "old/tokens", "old/intents", "new/tokens", "new/intents"):
            (self.root / child).mkdir(parents=True)
        for name in ("preview.lock", "tls.lock"):
            (self.root / name).touch()
        intent_digests = {}
        for name in ("n2-intent", "n3-intent"):
            data = f"historical fixture {name}\n".encode()
            (self.root / "old/intents" / name).write_bytes(data)
            intent_digests[name] = digest(data)
        (self.root / "fixture-only").write_bytes(b"carried-state-fixture-v1\n")
        (self.root / "old/transfer.sha256").write_bytes(b"old fixture manifest\n")
        (self.root / "new/transfer.sha256").write_bytes(b"new fixture manifest\n")
        v4 = self.root / "old/v4"
        v4.write_bytes(b"historical fixture route\n")
        identity = v4.stat()
        tokens = {}
        for step in state.STEPS:
            for suffix in ("", ".started"):
                name = step + suffix
                (self.root / "old/tokens" / name).write_bytes(name.encode())
                tokens[name] = digest(name.encode())
        pins = {"nginx": "1" * 64, "pg": "2" * 64, "prev": "3" * 64}
        for service, name in zip(pins, ("nginx-id.0001", "pg-id.0001", "prev-app-id")):
            (self.root / "old/pins" / name).write_text(pins[service] + "\n")
        networks = {
            name: {
                "id": str(i) * 64, "driver": "bridge", "internal": internal,
                "ipv6": False, "subnets": [subnet], "members": [pins[service]] if service else [],
                "labels": {"co.sophomores.release": state.OLD_LABEL},
                "options": {"com.docker.network.bridge.name": bridge},
            }
            for i, (name, (bridge, subnet, internal, service)) in enumerate(state.BRIDGES.items(), 4)
        }
        evidence = dict.fromkeys(
            ("nginx_routes", "nginx_other_vhosts", "nginx_attachments", "pg_attachments",
             "pg_mounts", "preview_origin"), "8" * 64
        )
        report = {"networks": networks, "evidence": evidence, "candidates": [], "inflight": []}
        (self.root / "runtime-fixture.json").write_text(json.dumps(report))
        snapshot = {
            "manifest": digest(b"old fixture manifest\n"), "old_tokens": tokens,
            "pins": pins, "pin_generations": {"nginx": ["0001"], "pg": ["0001"]},
            "v4": {"hash": digest(b"historical fixture route\n"),
                   "device_inode": f"{identity.st_dev}:{identity.st_ino}"},
            "networks": networks, "evidence": evidence,
        }
        self.reference = {"snapshot": snapshot, "old_intent_sha256": intent_digests}
        self.reference_sha = state.fingerprint(self.reference)
        self.manifest = digest(b"new fixture manifest\n")
        for name, value in (("OLD_MANIFEST", snapshot["manifest"]),
                            ("V4", snapshot["v4"]["hash"])):
            patcher = patch.object(state, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def collect(self, **kwargs):
        return collector.collect_fixture(self.root, self.reference, self.reference_sha,
                                         self.manifest, **kwargs)

    def test_attempt_identity_and_both_locks_held_during_each_scan(self):
        scans = []

        def scan(root):
            for name in ("preview.lock", "tls.lock"):
                with (root / name).open() as handle:
                    with self.assertRaises(BlockingIOError):
                        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            scans.append(root)
            return collector.normalized(root)

        first, second = self.collect(scan=scan), self.collect(scan=scan)
        self.assertEqual(first["result"], "offline-collector-fixture-only")
        self.assertNotEqual(first["attempt"], second["attempt"])
        self.assertEqual(scans, [self.root] * 4)

    def test_lock_contention_releases_first_lock(self):
        with (self.root / "tls.lock").open() as handle:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                self.collect()
        with (self.root / "preview.lock").open() as handle:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_replaced_lock_rejected_even_if_old_fd_is_locked(self):
        def scan(root):
            (root / "tls.lock").rename(root / "replaced.lock")
            (root / "tls.lock").touch()
            return collector.normalized(root)

        with self.assertRaisesRegex(ValueError, "lock path changed"):
            self.collect(scan=scan)

    def test_replayed_token_between_scans_prevents_result(self):
        def scan(root):
            result = collector.normalized(root)
            (root / "new/tokens/u2").touch()
            return result

        with self.assertRaisesRegex(ValueError, "replayed token"):
            self.collect(scan=scan)

    def test_expired_attempt_and_wrong_reference_rejected(self):
        clock = iter((0, 6_000_000_000))
        with self.assertRaisesRegex(ValueError, "expired"):
            self.collect(clock=lambda: next(clock))
        self.reference_sha = "0" * 64
        with self.assertRaisesRegex(ValueError, "reference digest"):
            self.collect()

    def test_missing_inventory_is_not_assumed_empty(self):
        (self.root / "new/intents").rmdir()
        with self.assertRaisesRegex(ValueError, "inventory"):
            self.collect()

    def test_changed_empty_missing_and_symlinked_intent_fail(self):
        intent = self.root / "old/intents/n2-intent"
        intent.write_bytes(b"replacement\n")
        with self.assertRaisesRegex(ValueError, "intent bytes differ"):
            self.collect()
        intent.write_bytes(b"")
        with self.assertRaisesRegex(ValueError, "empty old intent"):
            self.collect()
        intent.unlink()
        with self.assertRaisesRegex(ValueError, "intent inventory"):
            self.collect()
        intent.symlink_to(intent.with_name("n3-intent"))
        with self.assertRaises(OSError):
            self.collect()

if __name__ == "__main__":
    unittest.main()
