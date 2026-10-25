import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

OPERATION = Path(__file__).resolve().parents[3] / ".deployment/operations/preview-warp-20261025"
spec = importlib.util.spec_from_file_location("activation", OPERATION / "activate.py")
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)


class ProvenanceGuard(unittest.TestCase):
    def validate(self, mutation=None, archive=None, image=None):
        provenance = {
            "release": "preview-warp-20261025",
            "commit": "a" * 40,
            "sourceFingerprint": "b" * 64,
            "imageArchiveSha256": "c" * 64,
            "imageId": "sha256:" + "d" * 64,
        }
        if mutation:
            provenance = {**provenance, **mutation}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "source-provenance.json").write_text(json.dumps(provenance))
            (root / "image-config-id").write_text(image or "sha256:" + "d" * 64)
            (root / "image.sha256").write_text(archive or "c" * 64 + "  image.tar\n")
            with patch.object(a, "ROOT", root):
                a.validate_provenance()

    def test_exact_frozen_build_is_accepted(self):
        self.validate()

    def test_invalid_or_wrong_release_identity_is_rejected(self):
        for mutation in ({"commit": "HEAD"}, {"release": "old"}, {"sourceFingerprint": ""}, {"imageId": "tag:latest"}):
            with self.subTest(mutation=mutation), self.assertRaises(a.GuardFailure):
                self.validate(mutation)

    def test_archive_or_image_substitution_is_rejected(self):
        with self.assertRaisesRegex(a.GuardFailure, "source-archive-binding"):
            self.validate(archive="f" * 64 + "  image.tar\n")
        with self.assertRaisesRegex(a.GuardFailure, "source-image-binding"):
            self.validate(image="sha256:" + "f" * 64)


if __name__ == "__main__":
    unittest.main()
