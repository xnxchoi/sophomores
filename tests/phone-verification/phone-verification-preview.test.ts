import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyLocalPreviewFonts, localPreviewArguments } from '../../scripts/phone-verification-preview';
test('local preview binds only loopback and never inherits Node env-file arguments', () => {
  const args = localPreviewArguments('/owned/preview', 'http://127.0.0.1:3217');
  assert.deepEqual(args, ['dev', '/owned/preview', '--hostname', '127.0.0.1', '--port', '3217', '--webpack']);
  assert.throws(() => localPreviewArguments('/owned/preview', 'https://sophomores.co'), /local/);
  assert.throws(() => localPreviewArguments('/owned/preview', 'http://localhost:3217'), /127/);
});

test('snapshot repairs only relocated font paths without changing the source font module', async () => {
  const root = await mkdtemp(join(tmpdir(), 'phone-preview-fonts-'));
  try {
    const directory = join(root, 'snapshot');
    await mkdir(directory);
    await mkdir(join(root, 'public/fonts/HA'), { recursive: true });
    await writeFile(join(root, 'public/fonts/HA/H-A-Reg.woff2'), 'fixture');
    const source = 'export const font = localFont({ src: "public/assets/fonts/HA/H-A-Reg.woff2" });';
    await writeFile(join(root, 'fonts.ts'), source);
    await copyLocalPreviewFonts(root, directory);
    assert.equal(await readFile(join(root, 'fonts.ts'), 'utf8'), source);
    assert.equal(await readFile(join(directory, 'fonts.ts'), 'utf8'), source.replace('public/assets/fonts/', 'public/fonts/'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('snapshot preserves font references when their original assets exist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'phone-preview-fonts-'));
  try {
    const directory = join(root, 'snapshot');
    await mkdir(directory);
    await mkdir(join(root, 'public/assets/fonts/HA'), { recursive: true });
    await writeFile(join(root, 'public/assets/fonts/HA/H-A-Reg.woff2'), 'fixture');
    const source = 'export const font = localFont({ src: "./public/assets/fonts/HA/H-A-Reg.woff2" });';
    await writeFile(join(root, 'fonts.ts'), source);
    await copyLocalPreviewFonts(root, directory);
    assert.equal(await readFile(join(directory, 'fonts.ts'), 'utf8'), source);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('snapshot never substitutes a different font for an unavailable asset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'phone-preview-fonts-'));
  try {
    const directory = join(root, 'snapshot');
    await mkdir(directory);
    const source = "export const font = localFont({ src: './public/assets/fonts/missing.woff2' });";
    await writeFile(join(root, 'fonts.ts'), source);
    await copyLocalPreviewFonts(root, directory);
    assert.equal(await readFile(join(directory, 'fonts.ts'), 'utf8'), source);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
