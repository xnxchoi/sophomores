"""Offline comparison of normalized post-n3 snapshots. No live collector."""

import hashlib
import json
import re
import sys

OLD_MANIFEST = "fd49dc0b6e905eefaa336b8a58a97479b20cd91ac3ad876d34c84c45f9b4c6c5"
OLD_LABEL = "review-update-5a7e4598"
V4 = "333e3ce75cf84cc66e19477468e1cb8bad3e5269cecc7072cf1c7029f139c570"
STEPS = ("u0", "u1", "u2", "u3", "n1", "n2", "n3")
BRIDGES = {
    "sophomores-review-ingress": ("br-sph-ing13", "172.29.13.0/24", True, "nginx"),
    "sophomores-review-db13": ("br-sph-db13", "172.29.14.0/24", True, "pg"),
    "sophomores-review-egress13": ("br-sph-egr13", "172.29.15.0/24", False, None),
}


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def digest(value):
    return isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value)


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def fingerprint(value):
    return hashlib.sha256(encoded(value)).hexdigest()


def string_map(value):
    return isinstance(value, dict) and all(
        isinstance(key, str) and isinstance(item, str) for key, item in value.items()
    )


def verify_networks(networks, pins):
    require(set(networks) == set(BRIDGES), "bridge inventory differs")
    ids = set()
    for name, (bridge, subnet, internal, service) in BRIDGES.items():
        net = networks[name]
        require(
            set(net) == {"id", "driver", "internal", "ipv6", "subnets", "labels", "options", "members"}
            and digest(net["id"])
            and net["id"] not in ids
            and net["driver"] == "bridge"
            and net["internal"] is internal
            and net["ipv6"] is False
            and net["subnets"] == [subnet]
            and string_map(net["labels"])
            and string_map(net["options"])
            and net["labels"].get("co.sophomores.release") == OLD_LABEL
            and net["options"].get("com.docker.network.bridge.name") == bridge
            and net["members"] == ([pins[service]] if service else []),
            "bridge identity, shape or membership differs",
        )
        ids.add(net["id"])


def verify(reference, observed, reference_sha, new_manifest):
    require(digest(reference_sha) and fingerprint(reference) == reference_sha,
            "reference digest differs")
    require(digest(new_manifest) and new_manifest != OLD_MANIFEST, "invalid new manifest")
    require(set(reference) == {"manifest", "old_tokens", "pins", "pin_generations", "v4", "networks", "evidence"},
            "reference fields differ")
    require(reference["manifest"] == OLD_MANIFEST, "wrong old manifest")
    require(set(reference["old_tokens"]) == {s + suffix for s in STEPS for suffix in ("", ".started")}
            and all(map(digest, reference["old_tokens"].values())), "wrong completed prefix")
    pins = reference["pins"]
    require(set(pins) == {"nginx", "pg", "prev"} and all(map(digest, pins.values()))
            and len(set(pins.values())) == 3, "invalid service pins")
    require(reference["pin_generations"] == {"nginx": ["0001"], "pg": ["0001"]},
            "unexpected pin generation history")
    v4 = reference["v4"]
    require(set(v4) == {"hash", "device_inode"} and v4["hash"] == V4
            and re.fullmatch(r"[0-9]+:[1-9][0-9]*", v4["device_inode"]), "invalid v4 identity")
    evidence = reference["evidence"]
    require(set(evidence) == {"nginx_routes", "nginx_other_vhosts", "nginx_attachments", "pg_attachments",
                              "pg_mounts", "preview_origin"}
            and all(map(digest, evidence.values())), "missing route or service evidence")
    verify_networks(reference["networks"], pins)
    require(set(observed) == {"state", "new_manifest", "active_tokens", "candidates", "inflight",
                              "unexpected_intents", "active_marker"}, "observation fields differ")
    require(observed["new_manifest"] == new_manifest and observed["active_marker"] is False,
            "wrong destination or already active")
    for key in ("active_tokens", "candidates", "inflight", "unexpected_intents"):
        require(observed[key] == [], "replayed token, candidate, job or intent found")
    require(encoded(observed["state"]) == encoded(reference), "post-n3 state drift")
    return {"result": "offline-comparison-only", "old_manifest": OLD_MANIFEST,
            "new_manifest": new_manifest, "reference_sha256": reference_sha,
            "observation_sha256": fingerprint(observed)}


def unique_pairs(pairs):
    out = {}
    for key, value in pairs:
        require(key not in out, "duplicate JSON key")
        out[key] = value
    return out


def reject_constant(_):
    raise ValueError("nonfinite JSON")


def main(paths):
    try:
        ref, obs, ref_sha, manifest = paths
        with open(ref, encoding="utf-8") as file:
            reference = json.load(file, object_pairs_hook=unique_pairs, parse_constant=reject_constant)
        with open(obs, encoding="utf-8") as file:
            observed = json.load(file, object_pairs_hook=unique_pairs, parse_constant=reject_constant)
        print(encoded(verify(reference, observed, ref_sha, manifest)).decode())
    except (OSError, ValueError, AttributeError, KeyError, TypeError):
        print("STOP: invalid or changed carried state", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
