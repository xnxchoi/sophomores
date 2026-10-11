import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const script = resolve('deployment/ops/restore-hideaway-local.sh');
const names = ['database.dump.age', 'globals.sql.age', 'source-evidence.txt.age', 'media.tar.zst.age', 'config.tar.zst.age', 'nginx-image.tar.zst.age'];
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hideaway-restore-test-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, '20261011T010105Z'), bin = join(root, 'bin'), key = join(root, 'key');
  mkdirSync(dir, { mode: 0o700 }); mkdirSync(bin);
  writeFileSync(key, 'test-only', { mode: 0o600 });
  const files = names.map(name => {
    const data = Buffer.from('fixture'); writeFileSync(join(dir, name), data);
    return { name, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  });
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({version: 1, state: 'complete', files}));
  const mock = (name, body) => writeFileSync(join(bin, name), '#!/bin/bash\n' + body, { mode: 0o700 });
  mock('age', 'printf fixture; [[ ${AUTH_FAIL:-0} != 1 ]]');
  mock('docker', 'printf "%s\\n" "$*" >>"$DOCKER_LOG"; exit 99');
  mock('fdesetup', 'printf "FileVault is Off.\\n"');
  return { dir, key, root, mock, run(stage, extra = {}) { return spawnSync('bash', [script, stage, dir, key], {encoding: 'utf8', env: {...process.env, PATH: `${bin}:${process.env.PATH}`, DOCKER_LOG: join(root,'docker.log'), ...extra}}); } };
}
function lifecycle(f) {
  const records = 'pgcrypto|1.3\nplpgsql|1.0\n' + Array.from({length:158},(_,i)=>`public.table_${i}|${i}`).join('\n')+'\n';
  const source = join(f.root, 'fake-source'); writeFileSync(source, records);
  f.mock('age', `case "\${@: -1}" in *source-evidence*) cat '${source}' ;; *) printf fixture ;; esac`);
  f.mock('fdesetup', 'printf "FileVault is On.\\n"');
  const dockerScript=join(f.root,'docker.mjs');
  writeFileSync(dockerScript, `import {writeFileSync,readFileSync,appendFileSync} from 'node:fs';
const a=process.argv.slice(2); appendFileSync(process.env.DOCKER_LOG,JSON.stringify(a)+'\\n');
if(a[0]!=='--host'||a[1]!=='unix:///var/run/docker.sock')process.exit(98);
const args=a.slice(2),id='a'.repeat(64), image=process.env.TEST_IMAGE_ID || 'sha256:c0eb29927f0e8590eac49c9d5bf9c5ebf87f4e6e7273e0a9270218e6b73795ee';
const ref='postgres@sha256:15b46a9c5a6b361eb4c0ce8d689365bf49fbf6802e615dce4e5e2326b3213e15';
const state=${JSON.stringify(join(f.root,'state.json'))};
if(args[0]==='image') console.log(JSON.stringify([{Id:image,Os:process.env.MISSING_PLATFORM?'':'linux',Architecture:process.env.MISSING_PLATFORM?'':'amd64',RepoDigests:[ref]}]));
else if(args[0]==='run') {
  writeFileSync(args[args.indexOf('--cidfile')+1],id);
  const owner=args[args.indexOf('--label')+1].split('=')[1];
  const mounts=args.flatMap((v,i)=>v==='--mount'?[args[i+1]]:[]).map(v=>{
    const p=Object.fromEntries(v.split(',').map(x=>x.split('=')));
    return {Source:p.src,Destination:p.dst,RW:!v.includes('readonly')};});
  writeFileSync(state,JSON.stringify([{Id:id,Image:image,Config:{Image:ref,Labels:{'co.sophomores.restore':owner}},HostConfig:{NetworkMode:'none',PortBindings:{}},Mounts:mounts}]));
  if(process.env.RUN_FAIL)process.exit(97);
  console.log(id);
} else if(args[0]==='inspect') {
  if(args.includes('--format'))console.log('false');
  else {const c=JSON.parse(readFileSync(state));if(process.env.BAD_OWNER)c[0].Config.Labels['co.sophomores.restore']='bad';if(process.env.BAD_REF)c[0].Config.Image='postgres:latest';console.log(JSON.stringify(c));}
} else if(args[0]==='exec') {
  process.stdin.resume();
  if(args.includes('psql'))console.log(${JSON.stringify(records)});
  if(args.includes('pg_restore') && process.env.RESTORE_FAIL)process.exit(96);
} else if(!['stop','rm'].includes(args[0]))process.exit(95);
`);
  f.mock('docker', `exec '${process.execPath}' '${dockerScript}' "$@"`);
}
test('rejects corrupt ciphertext before creating state or invoking Docker', t => {
  const f = fixture(t); writeFileSync(join(f.dir, names[0]), 'corrupt');
  assert.notEqual(f.run('validate').status, 0);
  assert.equal(existsSync(join(f.dir, '.restore-journal')), false);
  assert.equal(existsSync(join(f.root, 'docker.log')), false);
});
test('rejects late authentication failure even when age emitted plaintext', t => {
  const f = fixture(t); const result = f.run('validate', {AUTH_FAIL:'1'});
  assert.notEqual(result.status, 0); assert.match(result.stderr, /authentication/i);
  assert.equal(existsSync(join(f.dir, '.restore-journal')), false);
});
test('validation authenticates all six artifacts without restoring or extracting', t => {
  const f = fixture(t); assert.equal(f.run('validate').status, 0);
  assert.equal(existsSync(join(f.dir,'.restore-journal','validate.done')), true);
  assert.equal(existsSync(join(f.root,'docker.log')), false);
  assert.equal(existsSync(join(f.dir,'.restore')), false);
});
test('start refuses disabled FileVault and leaves no plaintext scratch', t => {
  const f = fixture(t); assert.equal(f.run('validate').status, 0);
  const result = f.run('start'); assert.notEqual(result.status,0); assert.match(result.stderr,/FileVault/);
  assert.equal(existsSync(join(f.dir,'.restore')),false);
});
test('an attempted mutation is never automatically replayed', t => {
  const f = fixture(t); assert.equal(f.run('validate').status,0);
  writeFileSync(join(f.dir,'.restore-journal','start.started'), 'attempted');
  assert.match(f.run('start').stderr,/attempted/);
});
test('unsafe identity permissions fail before decryption', t => {
  const f = fixture(t); const unsafe = join(f.root,'unsafe'); writeFileSync(unsafe,'test',{mode:0o644});
  const result=spawnSync('bash',[script,'validate',f.dir,unsafe],{encoding:'utf8'}); assert.notEqual(result.status,0);
});
test('implementation pins local daemon, image and isolated restore flags', () => {
  const source=readFileSync(script,'utf8');
  for(const flag of ['unix:///var/run/docker.sock','--network none','--pull never','--platform linux/amd64','--memory 512m','--cpus 1','--pids-limit 128','--no-owner --no-privileges --no-tablespaces','--exit-on-error --single-transaction']) assert.ok(source.includes(flag),flag);
  assert.ok(!source.includes('docker system prune'));
});
test('mocked bounded lifecycle verifies metadata then removes only owned scratch', t => {
  const f=fixture(t); lifecycle(f);
  for(const stage of ['validate','start','database','verify','cleanup']) {
    const result=f.run(stage); assert.equal(result.status,0,result.stderr);
  }
  const evidence=JSON.parse(readFileSync(join(f.dir,'restore-evidence.json')));
  assert.equal(evidence.table_count,158); assert.equal(evidence.application_verified,false);
  assert.equal(existsSync(join(f.dir,'.restore')),false);
  assert.ok(existsSync(join(f.dir,'database.dump.age'))); assert.ok(existsSync(f.key));
  const calls=readFileSync(join(f.root,'docker.log'),'utf8');
  assert.ok(!calls.includes('POSTGRES_PASSWORD=')); assert.ok(!calls.includes('globals.sql'));
});
test('cleanup refuses an otherwise matching container with wrong ownership', t => {
  const f=fixture(t); lifecycle(f); assert.equal(f.run('validate').status,0); assert.equal(f.run('start').status,0);
  assert.notEqual(f.run('cleanup',{BAD_OWNER:'1'}).status,0);
  assert.equal(existsSync(join(f.dir,'.restore')),true);
  assert.ok(!readFileSync(join(f.root,'docker.log'),'utf8').includes('"stop"'));
});
test('late container-start failure leaves captured ID and cannot replay', t => {
  const f=fixture(t); lifecycle(f); assert.equal(f.run('validate').status,0);
  assert.notEqual(f.run('start',{RUN_FAIL:'1'}).status,0);
  assert.ok(existsSync(join(f.dir,'.restore-journal','container.id')));
  assert.match(f.run('start').stderr,/attempted/);
  assert.equal(f.run('cleanup').status,0);
});
test('restore failure cannot mark success or replay a possibly applied transaction', t => {
  const f=fixture(t); lifecycle(f); assert.equal(f.run('validate').status,0); assert.equal(f.run('start').status,0);
  assert.notEqual(f.run('database',{RESTORE_FAIL:'1'}).status,0);
  assert.equal(existsSync(join(f.dir,'.restore-journal','database.done')),false);
  assert.match(f.run('database').stderr,/attempted/);
  rmSync(f.key); rmSync(join(f.dir,'database.dump.age'));
  assert.equal(f.run('cleanup').status,0,'cleanup must not require ciphertext or the age identity');
});
test('Python optimization cannot bypass manifest assertions', t => {
  const f=fixture(t); writeFileSync(join(f.dir,'database.dump.age'),'corrupt');
  assert.notEqual(f.run('validate',{PYTHONOPTIMIZE:'1'}).status,0);
  assert.equal(existsSync(join(f.dir,'.restore-journal')),false);
});
test('containerd platform manifest ID is accepted only for the pinned image reference', t => {
  const f=fixture(t); lifecycle(f);
  const env={TEST_IMAGE_ID:'sha256:15b46a9c5a6b361eb4c0ce8d689365bf49fbf6802e615dce4e5e2326b3213e15'};
  for(const stage of ['validate','start','database','verify']) {
    const result=f.run(stage,env); assert.equal(result.status,0,result.stderr);
  }
  assert.notEqual(f.run('cleanup',{...env,BAD_REF:'1'}).status,0);
  assert.equal(f.run('cleanup',env).status,0);
});
test('unknown runtime identity is rejected before container creation', t => {
  const f=fixture(t); lifecycle(f); assert.equal(f.run('validate').status,0);
  assert.notEqual(f.run('start',{TEST_IMAGE_ID:'sha256:'+'b'.repeat(64)}).status,0);
  assert.equal(existsSync(join(f.dir,'.restore')),false);
});
test('platform identity needs complete local linux amd64 metadata', t => {
  const f=fixture(t); lifecycle(f); assert.equal(f.run('validate').status,0);
  const env={TEST_IMAGE_ID:'sha256:15b46a9c5a6b361eb4c0ce8d689365bf49fbf6802e615dce4e5e2326b3213e15'};
  assert.notEqual(f.run('start',{...env,MISSING_PLATFORM:'1'}).status,0);
  assert.equal(existsSync(join(f.dir,'.restore')),false);
  const result=f.run('start',env); assert.equal(result.status,0,result.stderr);
  assert.equal(f.run('cleanup',env).status,0);
});
