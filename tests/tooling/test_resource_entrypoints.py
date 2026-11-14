import re
"""Heavy public entrypoints must not silently bypass the resource supervisor."""

import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class ResourceEntrypointTests(unittest.TestCase):
    def test_local_heavy_commands_have_supervised_entrypoints(self):
        scripts = json.loads((ROOT / "package.json").read_text())["scripts"]
        for name in ("dev", "build:guarded", "typecheck:guarded", "test:guarded"):
            with self.subTest(command=name):
                self.assertTrue(scripts[name].startswith("python3 scripts/resource-guard.py "))
                self.assertTrue(" --log " in scripts[name], "Missing bounded log")
                self.assertTrue(" --timeout " in scripts[name], "Missing finite timeout")

    def test_entrypoints_preserve_supervisor_heap_environment(self):
        scripts = json.loads((ROOT / "package.json").read_text())["scripts"]
        for name in ("dev", "build:guarded"):
            self.assertFalse("NODE_OPTIONS=" in scripts[name], "Do not replace a stricter inherited cap")

    def test_preview_heap_stays_inside_aggregate_guard(self):
        command = json.loads((ROOT / "package.json").read_text())["scripts"]["dev"]
        self.assertTrue("--node-old-space-mib 3072" in command)
        cap = re.search(r"--max-gib (\d+(?:\.\d+)?)", command)
        self.assertIsNotNone(cap, "Missing aggregate memory cap")
        self.assertLessEqual(float(cap.group(1)), 6, "Dev preview must stay within the 6 GiB dev/build default")

    def test_unit_runner_preserves_heap_environment_and_serializes_workers(self):
        source = (ROOT / "tests/run-unit.mjs").read_text()
        self.assertFalse('"--max-old-space-size=' in source, "Do not override the inherited heap cap")
        self.assertTrue('"--test-concurrency=1"' in source, "Workers must run serially")

    def test_ticket_identity_assertions_only_format_booleans(self):
        source = (ROOT / "tests/tickets/ticket-selection-dom.test.tsx").read_text()
        self.assertFalse('assert.equal(document.querySelector("main"), main' in source,
                         "Compare DOM identity as a boolean, never format the DOM")
        self.assertFalse("assert.equal(document.getElementById(count.id), count" in source,
                         "Compare DOM identity as a boolean, never format the DOM")


if __name__ == "__main__":
    unittest.main()
