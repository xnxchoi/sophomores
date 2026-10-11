import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).parents[1] / "deployment/ops/verify-hideaway-archives.py"
spec = importlib.util.spec_from_file_location("archive_verifier", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def archive(entries):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode="w") as tar:
        for name, kind, data in entries:
            entry = tarfile.TarInfo(name)
            if kind == "file":
                entry.size = len(data)
                tar.addfile(entry, io.BytesIO(data))
            else:
                entry.type = kind
                if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                    entry.linkname = data
                tar.addfile(entry)
    out.seek(0)
    return out


class ArchiveTests(unittest.TestCase):
    def test_hash_and_inventory_match(self):
        data = b"fixture"
        entries, captured = module.scan_tar(archive([("root", tarfile.DIRTYPE, ""), ("root/a", "file", data)]))
        expected = [{"path": "root", "type": "directory", "mode": 493},
                    {"path": "root/a", "type": "file", "mode": 384, "size": 7, "sha256": hashlib.sha256(data).hexdigest()}]
        self.assertEqual(module.compare_inventory(entries, expected, expected)["files"], 1)
        self.assertEqual(captured, {})

    def test_reject_unsafe_paths(self):
        for name in ("/etc/key", "../key", "root/../key", "root//key"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                module.scan_tar(archive([(name, "file", b"secret")]))

    def test_reject_devices_and_duplicate_paths(self):
        for entries in ([("device", tarfile.CHRTYPE, "")], [("a", "file", b"1"), ("./a", "file", b"2")]):
            with self.assertRaises(ValueError):
                module.scan_tar(archive(entries))

    def test_cert_symlink_not_dereferenced(self):
        entries, _ = module.scan_tar(archive([("recovery/etc/letsencrypt/live/site/key.pem", tarfile.SYMTYPE, "../../archive/site/key1.pem")]))
        self.assertEqual(entries["recovery/etc/letsencrypt/live/site/key.pem"]["type"], "symlink")

    def test_only_known_absolute_hook_link_allowed(self):
        module.scan_tar(archive([("recovery/etc/letsencrypt/renewal-hooks/deploy/20-hideaway-nginx", tarfile.SYMTYPE, "/usr/local/bin/certbot-reload-nginx")]))
        for link in ("/etc/passwd", "../../../../../../escape"):
            with self.assertRaises(ValueError):
                module.scan_tar(archive([("recovery/link", tarfile.SYMTYPE, link)]))

    def test_inventory_json_is_only_captured_content(self):
        data = json.dumps([]).encode()
        _, captured = module.scan_tar(archive([("./media-before.json", "file", data), ("secret", "file", b"private")]), {"media-before.json"})
        self.assertEqual(captured, {"media-before.json": []})

    def test_inventory_mismatch_fails(self):
        for before, after in (([], [{}]), ([{"path": "missing", "type": "file", "size": 1, "sha256": "0" * 64}],) * 2):
            with self.assertRaises(ValueError):
                module.compare_inventory({}, before, after)

    def test_resource_limits(self):
        with self.assertRaises(ValueError):
            module.scan_tar(archive([("a", "file", b"123")]), max_bytes=2)

    def test_missing_required_inventory_fails(self):
        with self.assertRaises(ValueError):
            module.scan_tar(archive([]), {"media-before.json"})

    def test_manifest_exact_allowlist(self):
        manifest = {"version": 1, "state": "complete", "files": [{"name": name, "bytes": 1, "sha256": "a" * 64} for name in module.ARTIFACTS]}
        self.assertEqual(len(module.validate_manifest(manifest)), 6)
        manifest["files"][0]["name"] = "../escape"
        with self.assertRaises(ValueError):
            module.validate_manifest(manifest)

    def test_failed_proof_write_has_no_success_filename(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            with patch.object(module.json, "dump", side_effect=OSError):
                with self.assertRaises(OSError):
                    module.publish_proof(path, {"version": 1})
            self.assertFalse((path / "archive-proof.json").exists())
            self.assertFalse((path / "archive-proof.json.partial").exists())


@unittest.skipUnless(all(shutil.which(command) for command in ("age", "age-keygen", "zstd")), "age and zstd required")
class EncryptedIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.identity = self.directory / "key"
        subprocess.run(["age-keygen", "-o", str(self.identity)], check=True, capture_output=True)
        recipient = subprocess.check_output(["age-keygen", "-y", str(self.identity)], text=True).strip()
        media = b"safe fixture bytes"
        inventory = [{"path": "root/a", "type": "file", "size": len(media), "sha256": hashlib.sha256(media).hexdigest(), "mode": 384}]
        config = archive([(name, "file", json.dumps(inventory).encode()) for name in ("media-before.json", "media-after.json")]).getvalue()
        payloads = {"config.tar.zst.age": config, "media.tar.zst.age": archive([("root/a", "file", media)]).getvalue(), "nginx-image.tar.zst.age": archive([("manifest.json", "file", b"[]")]).getvalue()}
        files = []
        for name in module.ARTIFACTS:
            payload = payloads.get(name, b"unused fixture")
            if name in payloads:
                payload = subprocess.run(["zstd", "-q", "-c"], input=payload, check=True, capture_output=True).stdout
            encrypted = subprocess.run(["age", "-r", recipient], input=payload, check=True, capture_output=True).stdout
            (self.directory / name).write_bytes(encrypted)
            files.append({"name": name, "bytes": len(encrypted), "sha256": hashlib.sha256(encrypted).hexdigest()})
        (self.directory / "manifest.json").write_text(json.dumps({"version": 1, "state": "complete", "files": files}))

    def test_full_streaming_verification_and_exclusive_proof(self):
        args = ["verify", str(self.directory), str(self.identity)]
        with patch.object(sys, "argv", args), patch("builtins.print"):
            self.assertEqual(module.main(), 0)
            self.assertEqual(module.main(), 1)
        proof = json.loads((self.directory / "archive-proof.json").read_text())
        self.assertEqual(proof["media"]["files"], 1)
        self.assertEqual(proof["ciphertext_artifacts_authenticated"], 6)
        self.assertEqual((self.directory / "archive-proof.json").stat().st_mode & 0o777, 0o600)

    def test_corrupt_ciphertext_rejected_before_parsing(self):
        (self.directory / "database.dump.age").write_bytes(b"corrupt")
        with patch.object(module, "encrypted_tar") as parse:
            with self.assertRaises(ValueError):
                module.verify(self.directory, self.identity)
            parse.assert_not_called()

    def test_age_authentication_required_even_with_matching_hash(self):
        path = self.directory / "database.dump.age"
        data = path.read_bytes()[:-10]
        path.write_bytes(data)
        manifest = json.loads((self.directory / "manifest.json").read_text())
        for entry in manifest["files"]:
            if entry["name"] == path.name:
                entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        (self.directory / "manifest.json").write_text(json.dumps(manifest))
        with patch.object(module, "encrypted_tar") as parse:
            with self.assertRaises(ValueError):
                module.verify(self.directory, self.identity)
            parse.assert_not_called()

    def test_authenticated_non_zstd_payload_rejected(self):
        with module.regular_file(self.directory / "database.dump.age") as file:
            with self.assertRaises(tarfile.ReadError):
                module.encrypted_tar(file, self.identity)


if __name__ == "__main__":
    unittest.main()
