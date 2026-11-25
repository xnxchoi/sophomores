#!/usr/bin/env python3
"""Sampling watchdog, NOT a kernel memory quota. Very fast allocations can outrun it.

Only wrap finite, trusted local commands. macOS footprint includes compressed pages.
Logs are disk-backed, checked every 250ms; bursts can exceed the configured limit
before detection. Receipt and log paths must be in a trusted, private directory.
"""
import argparse
import contextlib
import ctypes
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import signal
import subprocess
import sys
import tempfile
import time

GIB = 1024**3
LIGHT_MAX_BYTES = 4 * GIB
WARNING_LIGHT_MIN_AVAILABLE = 12 * GIB
ROOT = Path(__file__).resolve().parent.parent
PROBE_TIMEOUT = 2.0


def probe(_label, command):
    return subprocess.check_output(command, text=True, timeout=PROBE_TIMEOUT)


class SamplingStopped(Exception):
    def __init__(self, reason, code):
        self.reason = reason
        self.code = code


class ProbeSamples:
    """Keep one bounded record per label, phase and attempt, never command or output."""
    def __init__(self):
        self.samples = {}

    def run(self, phase, label, command, *, before_retry=None):
        started = time.monotonic()
        attempt, limit = 1, PROBE_TIMEOUT
        while True:
            attempt_start = time.monotonic()
            outcome = 'error'
            try:
                result = subprocess.check_output(command, text=True, timeout=limit)
                outcome = 'ok'
                return result
            except subprocess.TimeoutExpired:
                outcome = 'timeout'
                if phase != 'live' or attempt != 1 or before_retry is None:
                    raise
                limit_for_retry = min(PROBE_TIMEOUT, before_retry(), started + 2 * PROBE_TIMEOUT - time.monotonic())
                if limit_for_retry <= 0:
                    raise
            finally:
                key = f'{phase}:{label}:{attempt}'
                prior = self.samples.get(key, {})
                elapsed = round(time.monotonic() - attempt_start, 3)
                self.samples[key] = {
                    'label': label, 'phase': phase, 'attempt': attempt,
                    'elapsed_seconds': elapsed,
                    'limit_seconds': limit, 'outcome': outcome,
                    'timeouts': prior.get('timeouts', 0) + (outcome == 'timeout'),
                    'last_timeout_elapsed_seconds': elapsed if outcome == 'timeout' else prior.get('last_timeout_elapsed_seconds'),
                    'last_timeout_limit_seconds': limit if outcome == 'timeout' else prior.get('last_timeout_limit_seconds'),
                }
            attempt, limit = 2, limit_for_retry


def parse_vm_stat(value):
    size = int(re.search(r'page size of (\d+) bytes', value)[1])
    return size * sum(int(re.search(r'Pages ' + name + r':\s+(\d+)', value)[1])
                      for name in ('free', 'inactive', 'speculative'))


def available_memory(run_probe=probe, light=False):
    if sys.platform == 'darwin':
        # Kernel pressure level: normal=1, warning=2, critical=4.
        level = int(run_probe('memory_pressure', ['sysctl', '-n', 'kern.memorystatus_vm_pressure_level']).strip())
        if level == 1:
            return parse_vm_stat(run_probe('available_memory', ['vm_stat']))
        # Owner, 2026-11-24: 'Allow light runs at WARNING'. A light run (cap <= 4 GiB) may
        # continue at WARNING while at least 12 GiB is available; builds and CRITICAL stop.
        if level == 2 and light:
            available = parse_vm_stat(run_probe('available_memory', ['vm_stat']))
            return available if available >= WARNING_LIGHT_MIN_AVAILABLE else 0
        return 0
    if sys.platform.startswith('linux'):
        value = Path('/proc/meminfo').read_text()
        return int(re.search(r'^MemAvailable:\s+(\d+)', value, re.M)[1]) * 1024
    raise RuntimeError('unsupported platform')


def accounted_bytes(rss, footprint):
    return max(rss, footprint)


# Local SDK sys/resource.h rusage_info_v2: UUID followed by 18 uint64 fields.
# ri_phys_footprint is uint64 index 7 after UUID (resident size is index 6).
class RusageV2(ctypes.Structure):
    _fields_ = [('uuid', ctypes.c_uint8 * 16), ('values', ctypes.c_uint64 * 18)]


class FootprintReadError(ProcessLookupError):
    def __init__(self, pid, error_number, syscall_return):
        super().__init__(error_number, 'proc_pid_rusage failed')
        self.pid = pid
        self.syscall_return = syscall_return


def footprint_reader():
    if sys.platform != 'darwin':
        return lambda pid: 0
    library = ctypes.CDLL('/usr/lib/libproc.dylib', use_errno=True)
    function = library.proc_pid_rusage
    function.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
    function.restype = ctypes.c_int

    def read(pid):
        info = RusageV2()
        ctypes.set_errno(0)
        result = function(pid, 2, ctypes.byref(info))
        error_number = ctypes.get_errno()
        if result != 0:
            raise FootprintReadError(pid, error_number, result)
        return info.values[7]
    return read


def process_snapshot(run_probe=probe):
    # Identity includes start time to prevent killing a recycled PID.
    result = {}
    for line in run_probe('process_table', ['ps', '-axo', 'pid=,ppid=,pgid=,rss=,stat=,lstart=']).splitlines():
        fields = line.split(None, 5)
        if len(fields) != 6:
            raise RuntimeError('invalid process accounting')
        pid, parent, group, rss = map(int, fields[:4])
        result[pid] = (parent, group, rss * 1024, fields[4], fields[5])
    if not result:
        raise RuntimeError('empty process accounting')
    return result


def node_options(value, cap=1536):
    flags = shlex.split(value)
    result, caps, index = [], [], 0
    while index < len(flags):
        flag = flags[index]
        if re.match(r'^--max[-_]old[-_]space[-_]size(?:=|$)', flag):
            if '=' in flag:
                number = flag.split('=', 1)[1]
            else:
                index += 1
                number = flags[index] if index < len(flags) else ''
            caps.append(int(number))
        else:
            result.append(flag)
        index += 1
    cap = min([cap] + caps)
    if cap <= 0:
        raise ValueError('invalid Node heap cap')
    # NODE_OPTIONS accepts double-quoted arguments, not shell single quotes.
    return ' '.join(json.dumps(flag) if re.search(r'[\s"\\]', flag) else flag
                    for flag in result + ['--max-old-space-size=' + str(cap)])


@contextlib.contextmanager
def checkout_lock(path):
    # Never unlink: replacing a locked inode would allow overlapping supervisors.
    with open(path, 'a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def default_lock_path():
    directory = Path(tempfile.gettempdir()) / ('sphmrs-resource-guard-' + str(os.getuid()))
    try:
        directory.mkdir(mode=0o700)
    except FileExistsError:
        pass
    status = directory.lstat()
    import stat
    if not stat.S_ISDIR(status.st_mode) or status.st_uid != os.getuid() or status.st_mode & 0o777 != 0o700:
        raise RuntimeError('unsafe guard lock directory')
    key = hashlib.sha256(os.fsencode(ROOT.resolve())).hexdigest()
    return directory / (key + '.lock')


def group_exists(group):
    try:
        os.killpg(group, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # Unknown is not proof of absence.


def owned_processes(table, owned, group):
    current = {pid: identity for pid, identity in owned.items()
               if pid in table and table[pid][4] == identity}
    for _ in range(len(table) + 1):
        additions = {pid: row[4] for pid, row in table.items()
                     if row[1] == group or row[0] in current}
        updated = {**current, **additions}
        if updated == current:
            break
        current = updated
    return current


def cleanup(owned, group, snapshot):
    remaining = owned
    uncertain = False
    for sig, duration in ((signal.SIGTERM, 1), (signal.SIGKILL, 1)):
        end = time.monotonic() + duration
        while True:
            try:
                table = snapshot()
                remaining = owned_processes(table, remaining, group)
                alive = {pid: identity for pid, identity in remaining.items()
                         if 'Z' not in table[pid][3]}
            except Exception:
                uncertain = True
                # Group is reserved by our still-unreaped child; kill only this group.
                try:
                    os.killpg(group, sig)
                except (ProcessLookupError, PermissionError):
                    pass
                time.sleep(max(0, end - time.monotonic()))
                # Probe failure must not skip the KILL escalation.
                break
            for pid in alive:
                try:
                    os.kill(pid, sig)
                except ProcessLookupError:
                    pass
                except PermissionError:
                    uncertain = True
            if not alive or time.monotonic() >= end:
                break
            time.sleep(.05)
    return sorted(remaining), uncertain


def supervise(command, log, *, lock_path=None, max_bytes=4*GIB, node_old_space_mib=1536,
              min_headroom=10*GIB, timeout=120, log_limit=20*1024**2,
              snapshot=process_snapshot, headroom=available_memory,
              memory_limit=None, deadline_seconds=None, output_limit=None):
    """Internal thresholds support small bounded tests; CLI enforces public floors."""
    lock_path = lock_path or default_lock_path()
    try:
        with checkout_lock(lock_path):
            quarantine = Path(str(lock_path) + '.quarantine.json')
            inflight = Path(str(lock_path) + '.inflight.json')
            if any(path.exists() or path.is_symlink() for path in (quarantine, inflight)):
                print('resource-guard: checkout quarantined or interrupted; manual process/identity review required: ' + str(lock_path), file=sys.stderr)
                return 75
            # Establish durable fail-closed state BEFORE launching anything. A killed
            # supervisor or failed quarantine write must not silently unlock work.
            probes = ProbeSamples()
            supervisor_start = process_snapshot(lambda label, command: probes.run('checkout', label, command))[os.getpid()][4]
            marker_fd = os.open(inflight, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(marker_fd, 'w') as handle:
                json.dump({'supervisor_pid': os.getpid(), 'created_ns': time.time_ns(),
                           'supervisor_start_identity': supervisor_start,
                           'log_prefix': str(log), 'manual_review_if_interrupted': True}, handle)
                handle.flush()
                os.fsync(handle.fileno())
            confirmed_clean = []
            result = monitor(command, Path(log), max_bytes if memory_limit is None else memory_limit,
                           min_headroom, timeout if deadline_seconds is None else deadline_seconds,
                           log_limit if output_limit is None else output_limit, snapshot, headroom, quarantine,
                           confirmed_clean, node_old_space_mib, probes)
            if confirmed_clean == [True]:
                inflight.unlink()
            return result
    except BlockingIOError:
        print('resource-guard: another guarded job owns this checkout', file=sys.stderr)
        return 75


def monitor(command, log, limit, floor, timeout, output_limit, snapshot, headroom, quarantine, confirmed_clean, node_old_space_mib, probes):
    reason, code, child, owned, peak, peak_count = 'accounting failure', 137, None, {}, 0, 0
    remaining, received, handlers = [], [], {}
    uncertain = False
    footprint_failure = None
    parent = os.getppid()
    start = time.monotonic()

    def check_stop():
        if received:
            raise SamplingStopped('signal ' + str(received[0]), 128 + received[0])
        if os.getppid() != parent:
            raise SamplingStopped('launcher parent disappeared', 137)
        remaining_time = start + timeout - time.monotonic()
        if remaining_time <= 0:
            raise SamplingStopped('timeout', 124)
        return remaining_time

    def sample(reader, default, phase, **options):
        if reader is not default:
            return reader()
        return reader(lambda label, cmd: probes.run(phase, label, cmd, before_retry=check_stop), **options)

    def read_processes(phase):
        return sample(snapshot, process_snapshot, phase)

    def read_headroom(phase):
        return sample(headroom, available_memory, phase, light=limit <= LIGHT_MAX_BYTES)

    # mkstemp uses O_EXCL and 0600. --log is a prefix, never an overwrite target.
    fd, actual = tempfile.mkstemp(prefix=log.name + '.', suffix='.log', dir=log.parent)
    log = Path(actual)
    print('resource-guard: log=' + str(log), file=sys.stderr, flush=True)
    try:
        read_processes('preflight')
        read_footprint = footprint_reader()
        if read_headroom('preflight') < floor:
            reason = 'insufficient system headroom'
            return code
        env = {**os.environ, 'NODE_OPTIONS': node_options(os.environ.get('NODE_OPTIONS', ''), cap=node_old_space_mib)}
        for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
            handlers[sig] = signal.signal(sig, lambda number, frame: received.append(number))
        with os.fdopen(fd, 'wb', buffering=0) as output:
            fd = None
            child = subprocess.Popen(command, stdout=output, stderr=output,
                                     stdin=subprocess.DEVNULL, env=env, start_new_session=True)
            next_headroom = 0
            while True:
                check_stop()
                now = time.monotonic()
                table = read_processes('live')
                owned = owned_processes(table, owned, child.pid)
                total = 0
                for pid in owned:
                    row = table[pid]
                    if 'Z' in row[3]:
                        continue
                    try:
                        total += accounted_bytes(row[2], read_footprint(pid))
                    except ProcessLookupError as error:
                        # A disappeared process is safe; a still-live unreadable one is not.
                        footprint_failure = {
                            'pid': pid, 'syscall': 'proc_pid_rusage',
                            'syscall_return': getattr(error, 'syscall_return', None),
                            'errno': error.errno,
                            'old_state': row[3], 'old_start_identity': row[4],
                            'latest_snapshot_available': False,
                        }
                        latest = read_processes('live')
                        current = latest.get(pid)
                        footprint_failure = {
                            **footprint_failure, 'latest_snapshot_available': True,
                            'latest_state': current[3] if current else None,
                            'latest_start_identity': current[4] if current else None,
                            'same_start_identity': bool(current and current[4] == row[4]),
                        }
                        if pid in latest and latest[pid][4] == row[4] and 'Z' not in latest[pid][3]:
                            raise RuntimeError('live process footprint unavailable')
                peak, peak_count = max(peak, total), max(peak_count, len(owned))
                live_children = [pid for pid in owned if pid != child.pid and 'Z' not in table[pid][3]]
                leader = table.get(child.pid)
                exited = leader is None or 'Z' in leader[3]
                if received:
                    reason, code = 'signal ' + str(received[0]), 128 + received[0]
                    break
                if os.getppid() != parent:
                    reason = 'launcher parent disappeared'
                    break
                if total > limit:
                    reason = 'owned memory limit exceeded'
                    break
                if output.tell() > output_limit:
                    reason = 'output limit exceeded'
                    break
                if time.monotonic() - start >= timeout:
                    reason, code = 'timeout', 124
                    break
                if now >= next_headroom:
                    if read_headroom('live') < floor:
                        reason = 'system headroom exhausted'
                        break
                    next_headroom = now + 1
                    check_stop()
                if exited:
                    if live_children:
                        reason = 'leader exited leaving children'
                    else:
                        reason = 'command exited'
                    break
                time.sleep(.25)
    except SamplingStopped as error:
        reason, code = error.reason, error.code
    except Exception as error:
        reason = 'supervisor failure: ' + type(error).__name__
        if isinstance(error, RuntimeError) and str(error) in {
            'unsupported platform', 'invalid process accounting',
            'empty process accounting', 'live process footprint unavailable',
        }:
            reason += ': ' + str(error)
    finally:
        if child is not None:
            remaining, uncertain = cleanup(owned, child.pid, lambda: read_processes('cleanup'))
            try:
                result = child.wait(timeout=2)
                if reason == 'command exited':
                    code = result if result >= 0 else 128 - result
            except subprocess.TimeoutExpired:
                remaining = sorted(set(remaining + [child.pid]))
            # Only now reap/check the reserved group. No kill after leader reaping.
            if not group_exists(child.pid):
                remaining = [pid for pid in remaining if pid != child.pid]
                for pid in remaining[:]:
                    try:
                        os.kill(pid, 0)
                    except ProcessLookupError:
                        remaining.remove(pid)
            elif not remaining:
                remaining = [child.pid]
            if (remaining or uncertain) and code == 0:
                reason, code = 'cleanup could not confirm termination', 137
            if remaining or uncertain:
                # Never auto-clear unknown descendants. A human must reconcile
                # PID + recorded start identities and escaped descendants first.
                state = {'reason': reason, 'cleanup_uncertain': uncertain,
                         'remaining_pids': remaining, 'owned_start_identities': owned,
                         'footprint_failure': footprint_failure,
                         'group': child.pid, 'log': str(log),
                         'manual_review_required': True}
                qfd = os.open(quarantine, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(qfd, 'w') as handle:
                    json.dump(state, handle)
        if fd is not None:
            os.close(fd)
        for sig, handler in handlers.items():
            signal.signal(sig, handler)
        receipt = {'reason': reason, 'exit_code': code, 'peak_bytes': peak,
                   'peak_process_count': peak_count, 'remaining_pids': remaining,
                   'footprint_failure': footprint_failure,
                   'probe_samples': probes.samples,
                   'cleanup_uncertain': uncertain,
                   'elapsed_seconds': round(time.monotonic() - start, 3),
                   'sampling_watchdog_not_kernel_quota': True}
        try:
            receipt_path = log.with_suffix(log.suffix + '.metrics.json')
            receipt_fd = os.open(receipt_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(receipt_fd, 'w') as handle:
                handle.write(json.dumps(receipt) + '\n')
        except OSError:
            print('resource-guard: could not write metrics receipt', file=sys.stderr)
        print('resource-guard: ' + reason + '; exit=' + str(code) + '; peak=' + str(peak) + ' bytes; remaining=' + str(remaining), file=sys.stderr)
        print('resource-guard: log=' + str(log) + '; receipt=' + str(log.with_suffix(log.suffix + '.metrics.json')), file=sys.stderr)
        confirmed_clean.append(not remaining and not uncertain)
    return code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--max-gib', type=float, default=4)
    parser.add_argument('--min-headroom-gib', type=float, default=10)
    parser.add_argument('--timeout', type=float, default=120)
    parser.add_argument('--log-mib', type=float, default=20)
    parser.add_argument('--node-old-space-mib', type=int, default=1536,
                        help='Node heap ceiling, 64..3072 MiB; inherited stricter caps are preserved')
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if not 64 <= args.node_old_space_mib <= 3072:
        parser.error('--node-old-space-mib must be between 64 and 3072')
    if not args.log.is_absolute() or not (0 < args.max_gib <= 15) or not (10 <= args.min_headroom_gib <= 1000000) or not (0 < args.timeout <= 3600) or not (0 < args.log_mib <= 100):
        parser.error('absolute --log required; max-gib (0,15], headroom >=10, timeout (0,3600], log-mib (0,100]')
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command:
        parser.error('command required after --')
    return supervise(command, args.log, max_bytes=int(args.max_gib*GIB), min_headroom=int(args.min_headroom_gib*GIB), timeout=args.timeout, log_limit=int(args.log_mib*1024**2), node_old_space_mib=args.node_old_space_mib)


if __name__ == '__main__':
    sys.exit(main())
