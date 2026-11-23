"""Private, single-host wallet runner. No timer is installed by this command."""
import contextlib
import errno
import fcntl
import json
import os
import signal
import stat
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path


STATE = Path("/var/lib/sphmrs/wallet-catch-up")
ROOT = Path(__file__).resolve().parents[1]
CADENCE = 60
TIMEOUT = 45


@contextlib.contextmanager
def host_lock(directory):
    metadata = directory.lstat()
    if not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid != os.getuid() or metadata.st_mode & 0o077:
        raise ValueError("Expected private runner state directory")
    fd = os.open(directory / "runner.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600)
    try:
        metadata = os.fstat(fd)
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.getuid() or metadata.st_nlink != 1 or metadata.st_mode & 0o077:
            raise ValueError("Expected private runner lock file")
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            if error.errno not in (errno.EACCES, errno.EAGAIN):
                raise
            yield None
        else:
            # Close, never unlock or unlink. The worker inherits this open
            # description and keeps custody if the supervisor is killed.
            yield fd
    finally:
        os.close(fd)


def reserve_tick(fd, now):
    raw = os.pread(fd, 64, 0)
    if raw and (not raw.isdigit() or len(raw) > 15):
        raise ValueError("Runner tick marker is unreadable")
    if raw and now < int(raw) + CADENCE:
        return False
    stamp = str(now).encode("ascii")
    if os.pwrite(fd, stamp, 0) != len(stamp):
        raise OSError("Could not reserve wallet tick")
    os.ftruncate(fd, len(stamp))
    os.fsync(fd)
    return True


def kill_group(pid):
    try:
        os.killpg(pid, signal.SIGKILL)
        return True
    except ProcessLookupError:
        return False


def worker_receipt(raw):
    value = json.loads(raw)
    if value["outcome"] not in ("success", "stale-job-recovery") or type(value["backlog"]) is not bool:
        raise ValueError("Invalid wallet receipt")
    result = {"outcome": value["outcome"], "backlog": value["backlog"], "counts": None}
    for key in ("checkpointAt", "lastCompletedSweepAt"):
        date = value[key]
        instant = datetime.fromisoformat(date.replace("Z", "+00:00")) if date is not None else None
        if instant is not None and instant.tzinfo is None:
            raise ValueError("Invalid receipt time")
        result[key] = instant.astimezone(timezone.utc).isoformat() if instant is not None else None
    if value["outcome"] == "success":
        counts = value["counts"]
        integers = ("inspected", "moved", "held", "conflicts")
        if any(type(counts[key]) is not int or not 0 <= counts[key] <= 20 for key in integers) or type(counts["cycleComplete"]) is not bool:
            raise ValueError("Invalid receipt counts")
        result["counts"] = {key: counts[key] for key in (*integers, "cycleComplete")}
    return result


def run_worker(command, fd, timeout=TIMEOUT):
    env = {**os.environ, "SPHMRS_WALLET_LOCK_FD": str(fd), "NODE_ENV": "production", "DISABLE_PAYLOAD_HMR": "true"}
    # Store transient output in an anonymous file rather than logging it. The
    # child is fixed trusted code and the only accepted output is a tiny receipt.
    with tempfile.TemporaryFile() as output:
        child = subprocess.Popen(command, cwd=ROOT, stdin=subprocess.DEVNULL, stdout=output,
                                 stderr=subprocess.DEVNULL, pass_fds=(fd,), start_new_session=True, env=env)
        try:
            code = child.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            return {"outcome": "timeout"}
        finally:
            leftover = kill_group(child.pid)
            child.wait(timeout=3)
        if code or leftover:
            return {"outcome": "failure"}
        output.seek(0)
        raw = output.read(2049)
    try:
        if len(raw) > 2048:
            raise ValueError("Oversize receipt")
        return worker_receipt(raw)
    except (AttributeError, KeyError, TypeError, ValueError):
        return {"outcome": "failure"}


def alerts(state, now):
    found = []
    last = state.get("lastScheduledSuccess") or state.get("firstObserved")
    if last is not None and now - last >= 120:
        found.append("scheduled-tick-missed")
    progress = [stamp for stamp in (state.get("checkpointEpoch"), state.get("backlogSince")) if stamp is not None]
    if state.get("backlog") and progress and now - max(progress) >= 3600:
        found.append("checkpoint-stalled")
    if state.get("conflictTicks", 0) >= 3:
        found.append("repeated-conflicts")
    if state.get("lastOutcome") in ("failure", "timeout"):
        found.append("runner-unconfirmed")
    return found


def persist(path, state):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as handle:
        tmp = Path(handle.name)
        try:
            json.dump(state, handle)
            handle.flush()
            os.fsync(handle.fileno())
            os.replace(tmp, path)
        finally:
            tmp.unlink(missing_ok=True)


def observe(state, result, mode, now):
    updated = {**state, "lastOutcome": result["outcome"], "firstObserved": state.get("firstObserved", now)}
    if result["outcome"] in ("success", "stale-job-recovery"):
        seen = result["checkpointAt"]
        updated.update(checkpointEpoch=int(datetime.fromisoformat(seen).timestamp()) if seen else None,
                       lastCompletedSweepAt=result["lastCompletedSweepAt"], backlog=result["backlog"],
                       backlogSince=(state.get("backlogSince") or now) if result["backlog"] else None)
    if result["outcome"] == "success":
        updated["lastSuccess"] = now
        if mode == "scheduled":
            updated["lastScheduledSuccess"] = now
        updated["conflictTicks"] = state.get("conflictTicks", 0) + 1 if result["counts"]["conflicts"] else 0
    return updated


def read_health(path):
    try:
        with path.open() as handle:
            value = json.loads(handle.read(4097))
    except FileNotFoundError:
        return {}
    if not isinstance(value, dict):
        raise ValueError("Invalid wallet health state")
    return value


def main(mode):
    started = time.monotonic()
    now = int(time.time())
    path = STATE / "health.json"
    if mode == "health":
        state = read_health(path)
        problems = alerts(state, now) if state else ["scheduled-tick-unobserved"]
        print(json.dumps({"outcome": "health", "alerts": problems, "lastSuccess": state.get("lastSuccess"),
                          "lastCompletedSweepAt": state.get("lastCompletedSweepAt")}))
        return 1 if problems else 0
    if mode not in ("scheduled", "manual") or not os.environ.get("SPHMRS_WALLET_RELEASE"):
        raise ValueError("Runner requires mode and release")
    release = os.environ["SPHMRS_WALLET_RELEASE"]
    if len(release) != 40 or any(c not in "0123456789abcdef" for c in release):
        raise ValueError("Runner release must be an immutable git SHA")
    with host_lock(STATE) as fd:
        if fd is None:
            result = {"outcome": "overlap-skip"}
        elif not reserve_tick(fd, now):
            result = {"outcome": "cadence-skip"}
        else:
            state = read_health(path)
            # A killed worker can process a page without acknowledging. Mark
            # state before launch; do not replace last success until verified.
            persist(path, {**state, "firstObserved": state.get("firstObserved", now), "lastOutcome": "failure"})
            result = run_worker(["node", "--max-old-space-size=1024", "--import", "tsx", str(ROOT / "scripts/wallet-catch-up-tick.ts")], fd)
            state = observe(state, result, mode, int(time.time()))
            persist(path, state)
            result["alerts"] = alerts(state, int(time.time()))
            result["lastSuccess"] = state.get("lastSuccess")
            checkpoint = state.get("checkpointEpoch")
            result["checkpointAgeSeconds"] = max(0, int(time.time()) - checkpoint) if checkpoint is not None else None
    print(json.dumps({**result, "mode": mode, "release": release, "elapsedMs": round((time.monotonic() - started) * 1000)}))
    return 1 if result["outcome"] in ("failure", "timeout") else 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1] if len(sys.argv) == 2 else "invalid"))
    except Exception:
        print('{"outcome":"failure","alerts":["runner-unconfirmed"]}')
        sys.exit(1)
