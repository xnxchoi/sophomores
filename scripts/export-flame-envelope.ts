import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CENTER_FADE } from '../flame-backdrop/mask/profile';
import { ASSET_SIZE, createIllustratorSourceSvg, createMaskAssetSvg } from './flame-envelope-assets';

/** Rasterize with Chromium's SVG engine, matching the study rather than a different SVG rasterizer. */
async function exportMask() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const output = resolve(root, 'public/masks');
  const source = resolve(root, 'design/flame-envelope');
  await Promise.all([mkdir(output, { recursive: true }), mkdir(source, { recursive: true })]);
  const svg = createMaskAssetSvg();
  await writeFile(resolve(output, 'flame-envelope.svg'), svg);
  await writeFile(resolve(source, 'flame-envelope-illustrator.svg'), createIllustratorSourceSvg());
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  try {
    const page = await browser.newPage();
    const png = await page.evaluate(async ({ markup, width, height }: { markup: string; width: number; height: number }) => {
      const image = new Image();
      image.src = `data:image/svg+xml,${encodeURIComponent(markup)}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D mask export context unavailable.');
      context.drawImage(image, 0, 0, width, height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { markup: svg, ...ASSET_SIZE });
    const bytes = Buffer.from(png, 'base64');
    await writeFile(resolve(output, 'flame-envelope.png'), bytes);
    await writeFile(resolve(source, 'manifest.json'), `${JSON.stringify({
      dimensions: ASSET_SIZE,
      smoothingPercentHeight: CENTER_FADE.smoothing,
      centerFalloff: CENTER_FADE.exponent,
      centerLift: CENTER_FADE.centerLift,
      alpha: 'White RGB with transparent alpha; top-left image origin; shader stretches normalized image UVs.',
      rasterizer: `Chromium ${browser.version()}`,
      pngSha256: createHash('sha256').update(bytes).digest('hex'),
      svgSha256: createHash('sha256').update(svg).digest('hex')
    }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

exportMask().catch(error => {
  console.error('Mask export failed:', error);
  process.exitCode = 1;
});
