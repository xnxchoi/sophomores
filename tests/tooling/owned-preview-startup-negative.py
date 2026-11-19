"""Run against the reviewed standalone build under scripts/resource-guard.py."""
import os
from pathlib import Path
import socket
import subprocess
import tempfile

root = Path.cwd()
entry = (root / ".next/standalone/server.js").resolve(strict=True)
uri = ("postgresql://preview_owner@localhost/sphmrs_owner_preview"
       "?host=%2Ftmp%2Fsphmrs-owner-preview-6lse30ag%2Fsocket&port=55439")
with tempfile.TemporaryDirectory() as home:
    for admission, origin, expected in (
        (None, "http://localhost:3000", "Owned preview socket requires explicit launcher admission."),
        ("1", "https://example.invalid", "Owned preview socket admission requires only http://localhost:3000 origins."),
    ):
        with socket.socket() as reserve:
            reserve.bind(("127.0.0.1", 0))
            port = reserve.getsockname()[1]
        env = {
            "PATH": os.environ["PATH"], "HOME": home,
            "NODE_OPTIONS": os.environ["NODE_OPTIONS"],
            "NODE_ENV": "production", "HOSTNAME": "127.0.0.1", "PORT": str(port),
            "MEMBER_AUTH_MODE": "local", "PHONE_VERIFICATION_MODE": "local",
            "PHONE_VERIFICATION_TRANSPORT": "fixture", "MEMBER_AUTH_ORIGIN": origin,
            "PHONE_VERIFICATION_ORIGIN": origin, "NEXT_PUBLIC_SERVER_URL": origin,
            "DATABASE_URI": uri, "PHONE_VERIFICATION_DATABASE_URL": uri,
        }
        if admission is not None:
            env["SPHMRS_LOCAL_PREVIEW_SOCKET_ADMITTED"] = admission
        result = subprocess.run(["node", str(entry)], cwd=home, env=env,
                                capture_output=True, text=True, timeout=20, check=False)
        if result.returncode != 1 or expected not in result.stderr:
            raise SystemExit("Unexpected startup result; expected the owned-preview configuration refusal.")
        print("Standalone refused invalid owned-preview profile.")
