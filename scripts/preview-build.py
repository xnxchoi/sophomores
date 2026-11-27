#!/usr/bin/env python3
"""Produce a disposable local preview, never a deploy artifact."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
NEXT = ROOT / 'node_modules/next/dist/bin/next'
TSC = ROOT / 'node_modules/typescript/bin/tsc'
DIST = ROOT / '.next'
PROFILE = 'local-public-offline-build-v1'
PENDING = ROOT / '.deployment/preview-build-pending'

spec = importlib.util.spec_from_file_location('resource_guard', ROOT / 'scripts/resource-guard.py')
guard = importlib.util.module_from_spec(spec)
previous_bytecode_setting = sys.dont_write_bytecode
try:
    sys.dont_write_bytecode = True
    spec.loader.exec_module(guard)
finally:
    sys.dont_write_bytecode = previous_bytecode_setting


def digest(paths):
    return {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}


def git(*args):
    env = {key: value for key, value in os.environ.items() if not key.startswith('GIT_')}
    return subprocess.check_output(['git', *args], cwd=ROOT, env=env, text=True, timeout=10).strip()


def require_dedicated_inputs():
    if git('status', '--porcelain=v1', '--untracked-files=all'):
        raise RuntimeError('Preview build requires a clean worktree at a committed SHA')
    if any(os.path.lexists(ROOT / name) for name in ('.env', '.env.local', '.env.production', '.env.production.local')):
        raise RuntimeError('Use a dedicated checkout without Next production env files')
    harmless_ignored = {
        '.next/', 'node_modules/', 'next-env.d.ts', '.deployment/',
    }
    ignored = set(git('ls-files', '--others', '--ignored', '--exclude-standard', '--directory').splitlines())
    if ignored - harmless_ignored:
        raise RuntimeError('Dedicated preview checkout contains unexpected ignored files')
    if (PENDING.parent.is_symlink()
            or PENDING.parent.exists() and set(PENDING.parent.iterdir()) - {PENDING}):
        raise RuntimeError('Dedicated preview checkout contains other deployment output')
    if any((ROOT / name).is_symlink() for name in ('.next', 'node_modules', 'next-env.d.ts')):
        raise RuntimeError('Preview requires its own dependencies and generated files, not symlinks')


def source_identity(node, env):
    require_dedicated_inputs()
    return {
        'sha': git('rev-parse', 'HEAD'),
        'tree': git('rev-parse', 'HEAD^{tree}'),
        'node_version': subprocess.check_output([node, '--version'], text=True, timeout=5, env=env).strip(),
        'inputs': digest([ROOT / name for name in (
            'tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
            'node_modules/.modules.yaml', 'node_modules/.pnpm/lock.yaml',
            'node_modules/next/package.json', 'node_modules/typescript/package.json',
        )] + [NEXT, TSC]),
        'tools': {'next': str(NEXT.resolve(strict=True)), 'tsc': str(TSC.resolve(strict=True))},
    }


def route_types():
    types = sorted(path for path in (DIST / 'types').rglob('*') if path.is_file())
    if not (DIST / 'types/validator.ts').is_file() or not (DIST / 'types/routes.d.ts').is_file():
        raise RuntimeError('Next did not produce the expected route types')
    return digest([ROOT / 'next-env.d.ts', *types])


def preview_environment():
    # Retain only the caller's stricter heap ceiling, not arbitrary Node preload flags.
    heap = next(flag for flag in reversed(shlex.split(guard.node_options(
        os.environ.get('NODE_OPTIONS', ''), cap=3072))) if flag.startswith('--max-old-space-size='))
    return {
        'HOME': str(Path.home()), 'PATH': os.environ['PATH'], 'NODE_OPTIONS': heap,
        'CI': '1', 'NODE_ENV': 'production', 'NEXT_TELEMETRY_DISABLED': '1',
        'NEXT_PUBLIC_SERVER_URL': 'http://localhost:3000', 'PREVIEW_AUTH_MODE': 'public',
        'DATABASE_URI': 'postgresql://unused@127.0.0.1:1/preview_build_only',
        'PAYLOAD_SECRET': 'synthetic-local-preview-build-not-a-runtime-secret',
        'BETTER_AUTH_SECRET': 'synthetic-local-preview-auth-not-a-runtime-secret',
        'MEMBER_AUTH_MODE': 'disabled', 'PHONE_VERIFICATION_MODE': 'disabled',
        'PORTONE_PAYMENT_MODE': 'disabled',
    }


def build(run, node, identity, env, logs):
    next_cli = [node, '--no-deprecation', str(NEXT)]
    typecheck = [node, str(TSC), '--noEmit', '--incremental', 'false']
    evidence = {}
    def phase(name, command, cap, timeout):
        if source_identity(node, env) != identity:
            raise RuntimeError('Source or dependency identity changed')
        receipts = []
        result = run(command, logs / name, cap * guard.GIB, 10 * guard.GIB, timeout,
                     20 * 1024**2, guard.process_snapshot, guard.available_memory,
                     node_old_space_mib=3072, child_env=env, receipts=receipts)
        if result or len(receipts) != 1:
            raise RuntimeError(f'Preview phase {name} did not pass; see the guard log')
        receipt = json.loads(receipts[0].read_text())
        if receipt['exit_code'] != 0 or receipt['remaining_pids'] or receipt['cleanup_uncertain']:
            raise RuntimeError(f'Preview phase {name} has incomplete guard evidence')
        evidence[name] = str(receipts[0])

    phase('typegen', next_cli + ['typegen'], 4, 120)
    checked = route_types()
    phase('typecheck', typecheck, 4, 180)
    phase('compile', next_cli + ['build', '--experimental-build-mode', 'compile'], 8, 900)
    phase('generate', next_cli + ['build', '--experimental-build-mode', 'generate'], 8, 900)
    final_types = route_types()
    typecheck_phase = 'typecheck'
    if final_types != checked:
        typecheck_phase = 'typecheck-output'
        phase(typecheck_phase, typecheck, 4, 180)
    if source_identity(node, env) != identity or route_types() != final_types:
        raise RuntimeError('Source, dependencies, or route types changed after validation')
    for path in ('BUILD_ID', 'prerender-manifest.json', 'standalone/server.js'):
        if not (DIST / path).is_file():
            raise RuntimeError(f'Preview output is missing {path}')
    return {
        **identity, 'profile': PROFILE, 'node': node, 'phase_receipts': evidence,
        'profile_sha256': hashlib.sha256(json.dumps(env, sort_keys=True).encode()).hexdigest(),
        'typecheck_sha': identity['sha'], 'typecheck_receipt': evidence[typecheck_phase],
        'checked_route_types': final_types, 'next_in_build_typescript': 'skipped',
        'usable_for': 'local preview only',
    }


def main():
    if len(sys.argv) != 1 or Path.cwd().resolve() != ROOT:
        raise RuntimeError('Run pnpm build:preview:guarded from the dedicated checkout root')
    os.umask(0o077)
    evidence_base = Path(tempfile.mkdtemp(prefix='sphmrs-preview-build-'))
    launcher_pid = os.getppid()
    with guard.checkout_reservation(evidence_base / 'preview') as run:
        if os.path.lexists(DIST) or os.path.lexists(ROOT / 'next-env.d.ts'):
            raise RuntimeError('Dedicated preview checkout must start without .next or next-env.d.ts')
        node = shutil.which('node')
        if not node:
            raise RuntimeError('Project Node toolchain unavailable')
        node = str(Path(node).resolve(strict=True))
        env = preview_environment()
        identity = source_identity(node, env)
        # The pending marker lives outside .next because Next cleans that directory.
        PENDING.parent.mkdir(mode=0o700, exist_ok=True)
        with PENDING.open('x') as marker:
            marker.write(str(evidence_base) + '\n')
        print(f'Preview in progress; output is unusable until success. Logs: {evidence_base}', flush=True)
        try:
            result = build(run, node, identity, env, evidence_base)
            if os.getppid() != launcher_pid:
                raise RuntimeError('Preview launcher exited before publication')
            with (DIST / 'preview-build-receipt.json').open('x') as receipt:
                json.dump(result, receipt, indent=2)
            PENDING.unlink()
        except (Exception, KeyboardInterrupt):
            # Leave the pending marker; nothing from this failed run is admitted.
            # Keep partial evidence out of Next's default start directory.
            if DIST.is_dir() and not DIST.is_symlink():
                DIST.rename(PENDING.with_name('preview-build-failed-' + evidence_base.name))
            raise
        print(f'Local preview ready: Next in-build TypeScript skipped; standalone TypeScript passed at {identity["sha"]}.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError, subprocess.SubprocessError) as error:
        print(f'preview-build: {error}', file=sys.stderr)
        sys.exit(1)
