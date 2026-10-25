#!/usr/bin/env python3
"""Read-only archive proof; no extraction, app start, or coordinated snapshot claim."""
import argparse
from contextlib import ExitStack
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
import stat
import subprocess
import sys
import tarfile
from typing import Any, BinaryIO, Iterable

ARTIFACTS = frozenset({
    "database.dump.age", "globals.sql.age", "source-evidence.txt.age",
    "media.tar.zst.age", "config.tar.zst.age", "nginx-image.tar.zst.age",
})
CHUNK = 1024 * 1024
HOOK = "recovery/etc/letsencrypt/renewal-hooks/deploy/20-hideaway-nginx"


def require(condition: Any) -> None:
    if not condition:
        raise ValueError("Archive verification failed")


def safe_name(name: str) -> str:
    while name.startswith("./"):
        name = name[2:]
    name = name.rstrip("/")
    require(name and not name.startswith("/") and "\x00" not in name)
    require(all(part not in ("", ".", "..") for part in name.split("/")))
    return name


def link_target(name: str, target: str, hard: bool = False) -> None:
    require(target and "\x00" not in target)
    if target.startswith("/"):
        require(not hard and name == HOOK and target == "/usr/local/bin/certbot-reload-nginx")
        return
    resolved = posixpath.normpath(posixpath.join("" if hard else posixpath.dirname(name), target))
    require(resolved != ".." and not resolved.startswith("../"))


def scan_tar(
    stream: BinaryIO, capture: Iterable[str] = frozenset(), max_bytes: int = 2 * 1024**3,
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Return in-memory metadata only. Captured JSON is explicitly allowlisted."""
    entries, captured, total = {}, {}, 0
    with tarfile.open(fileobj=stream, mode="r|") as archive:
        for member in archive:
            if member.name in (".", "./") and member.isdir():
                continue
            name = safe_name(member.name)
            require(name not in entries and len(entries) < 100000)
            total += member.size
            require(0 <= member.size and total <= max_bytes)
            if member.isfile():
                require(not member.sparse)
                digest, payload = hashlib.sha256(), bytearray()
                if name in capture:
                    require(member.size <= 4 * CHUNK)
                with archive.extractfile(member) as file:
                    for block in iter(lambda: file.read(CHUNK), b""):
                        digest.update(block)
                        if name in capture:
                            payload.extend(block)
                item = {"type": "file", "size": member.size, "sha256": digest.hexdigest()}
                if name in capture:
                    captured[name] = json.loads(payload)
            elif member.isdir():
                item = {"type": "directory"}
            elif member.issym() or member.islnk():
                link_target(name, member.linkname, member.islnk())
                item = {"type": "hardlink" if member.islnk() else "symlink", "target": member.linkname}
            else:
                raise ValueError("Unsupported archive entry")
            entries[name] = item
    require(set(captured) == set(capture))
    return entries, captured


def compare_inventory(
    entries: dict[str, dict[str, Any]], before: Any, after: Any,
) -> dict[str, Any]:
    require(isinstance(before, list) and before == after)
    inventory = {}
    for item in before:
        require(isinstance(item, dict))
        name = safe_name(item["path"])
        require(name not in inventory)
        inventory[name] = {key: value for key, value in item.items() if key not in ("path", "mode")}
    require(entries == inventory)
    return {
        "entries": len(entries),
        "files": sum(item["type"] == "file" for item in entries.values()),
        "bytes": sum(item.get("size", 0) for item in entries.values()),
        "before_after_equal": True, "archive_inventory_equal": True,
    }


def validate_manifest(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    require(manifest.get("version") == 1 and manifest.get("state") == "complete")
    files = manifest.get("files")
    require(isinstance(files, list) and len(files) == 6)
    require({item["name"] for item in files} == ARTIFACTS)
    for item in files:
        require(type(item["bytes"]) is int and 0 < item["bytes"] < 20 * 1024**3)
        require(isinstance(item["sha256"], str) and re.fullmatch("[a-f0-9]{64}", item["sha256"]))
    return files


def regular_file(path: Path) -> BinaryIO:
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        require(stat.S_ISREG(os.fstat(descriptor).st_mode))
    except BaseException:
        os.close(descriptor)
        raise
    return os.fdopen(descriptor, "rb")


def authenticate(file: BinaryIO, expected: dict[str, Any], identity: Path) -> None:
    initial = os.fstat(file.fileno())
    require(initial.st_size == expected["bytes"])
    digest = hashlib.sha256()
    for block in iter(lambda: file.read(CHUNK), b""):
        digest.update(block)
    require(digest.hexdigest() == expected["sha256"])
    file.seek(0)
    result = subprocess.run(
        ["age", "-d", "-i", str(identity)], stdin=file,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
    )
    require(result.returncode == 0)
    final = os.fstat(file.fileno())
    require((initial.st_size, initial.st_mtime_ns, initial.st_ctime_ns) ==
            (final.st_size, final.st_mtime_ns, final.st_ctime_ns))
    file.seek(0)


def encrypted_tar(
    file: BinaryIO, identity: Path, capture: Iterable[str] = frozenset(),
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Drain and check both subprocesses, including errors after the tar terminator."""
    file.seek(0)
    age = subprocess.Popen(["age", "-d", "-i", str(identity)], stdin=file,
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    zstd = None
    try:
        zstd = subprocess.Popen(["zstd", "-q", "-d", "-c"], stdin=age.stdout,
                                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        age.stdout.close()
        result = scan_tar(zstd.stdout, capture)
        while zstd.stdout.read(CHUNK):
            pass
        require(zstd.wait() == 0 and age.wait() == 0)
        return result
    finally:
        for process in (zstd, age):
            if process is not None:
                if process.poll() is None:
                    process.terminate()
                process.wait()
                if process.stdout is not None:
                    process.stdout.close()


def verify(directory: Path, identity: Path) -> dict[str, Any]:
    require(not directory.is_symlink() and directory.is_dir())
    require(not identity.is_symlink() and identity.is_file())
    key_metadata = identity.stat()
    require(key_metadata.st_uid == os.getuid() and stat.S_IMODE(key_metadata.st_mode) == 0o600)
    metadata = directory.stat()
    require(metadata.st_uid == os.getuid() and stat.S_IMODE(metadata.st_mode) == 0o700)
    require(not list(directory.glob("*.partial")))
    with regular_file(directory / "manifest.json") as file:
        manifest = validate_manifest(json.load(file))
    with ExitStack() as stack:
        files = {entry["name"]: stack.enter_context(regular_file(directory / entry["name"])) for entry in manifest}
        # No plaintext parser runs until ALL ciphertext artifacts authenticate.
        for entry in manifest:
            authenticate(files[entry["name"]], entry, identity)
        config, captured = encrypted_tar(files["config.tar.zst.age"], identity, {"media-before.json", "media-after.json"})
        media, _ = encrypted_tar(files["media.tar.zst.age"], identity)
        image, _ = encrypted_tar(files["nginx-image.tar.zst.age"], identity)
        require("manifest.json" in image or "index.json" in image)
        media_proof = compare_inventory(media, captured["media-before.json"], captured["media-after.json"])
    return {
        "version": 1, "verified_at": datetime.now(timezone.utc).isoformat(),
        "ciphertext_artifacts_authenticated": len(manifest),
        "config_entries": len(config), "nginx_image_entries": len(image),
        "media": media_proof,
        "limitations": [
            "Online backup; database and media are not a coordinated point-in-time snapshot.",
            "No database media-reference, app startup, image-load, permissions, or full-system recovery proof.",
            "Config symlinks inspected, never dereferenced or extracted.",
        ],
    }


def publish_proof(directory: Path, proof: dict[str, Any]) -> None:
    temporary = directory / "archive-proof.json.partial"
    # Link publication is atomic and refuses any existing destination.
    with open(temporary, "x") as file:
        try:
            json.dump(proof, file, sort_keys=True, indent=2)
            file.flush()
            os.fsync(file.fileno())
            os.link(temporary, directory / "archive-proof.json")
        finally:
            temporary.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup_directory", type=Path)
    parser.add_argument("identity", type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    try:
        proof = verify(args.backup_directory, args.identity)
        publish_proof(args.backup_directory, proof)
        print(json.dumps(proof, sort_keys=True))
        return 0
    except Exception:
        # Tar/JSON/subprocess errors can contain customer filenames or secrets.
        print("Archive verification failed; no new success proof published.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
