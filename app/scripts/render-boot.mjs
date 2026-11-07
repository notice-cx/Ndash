// Render docs/images/ndash-boot.webp, the README's animation of a TV booting into NdashOS and
// showing the demo dashboard. The dashboard is captured from this checkout's demo, like
// capture-docs.mjs: its own loopback server, a temporary data directory, a fixed date and every
// external request blocked. The scene is docs/images/src/boot.html.
// Needs a built app (npm run build), Playwright's Chromium, ImageMagick 7 (magick) and libwebp's
// img2webp.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const images = resolve(root, '../docs/images');
const scene = resolve(images, 'src/boot.html');
const sceneRender = resolve(images, 'src/boot.render.html');
// Beside the scene: Chromium reads a local page's images from its own folder tree.
const dashboard = resolve(images, 'src/boot.dashboard.png');
const output = resolve(images, 'ndash-boot.webp');
const width = Number(process.env.NDASH_BOOT_WIDTH || 1200);
const quality = Number(process.env.NDASH_BOOT_QUALITY || 85);
const port = Number(process.env.NDASH_DOCS_PORT || 3002);
assert(Number.isInteger(port) && port > 0 && port < 65536, 'Choose a valid documentation port.');
const origin = `http://127.0.0.1:${port}`;
const work = await mkdtemp(resolve(tmpdir(), 'ndash-boot-'));
const data = resolve(work, 'data');
const captureTime = new Date('2026-05-12T09:41:00Z');
const server = spawn(process.execPath, ['build/server/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    NDASH_HOST: '127.0.0.1',
    NDASH_ORIGIN: origin,
    NDASH_DATA_DIR: data,
    NDASH_EDITOR_KEY: randomBytes(32).toString('base64url'),
    NDASH_SECURE_COOKIES: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  assert.equal(result.status, 0, `${command} failed`);
};

// Motion at 25 frames a second; a still stretch is one frame shown for its whole length.
function frames(T) {
  const list = [];
  const still = (t, until) => list.push({ t, ms: Math.round((until - t) * 1000) });
  const motion = (from, until) => {
    for (let t = from; t < until - 1e-9; t += 0.04) list.push({ t, ms: 40 });
  };
  still(0, T.on);
  motion(T.on, T.splash);
  motion(T.splash, T.splash + 0.6);
  still(T.splash + 0.6, T.kiosk);
  still(T.kiosk, T.zoomIn);
  motion(T.zoomIn, T.zoomed);
  still(T.zoomed, T.zoomOut);
  motion(T.zoomOut, T.wide);
  still(T.wide, T.off);
  motion(T.off, T.off + 0.2);
  still(T.off + 0.2, T.end);
  return list;
}

let browser;
try {
  await new Promise((ready, reject) => {
    let log = '';
    const timeout = setTimeout(
      () => reject(new Error('Documentation server did not start. Build the app first.')),
      15_000,
    );
    server.stdout.on('data', (chunk) => {
      log += chunk;
      if (log.includes('Ndash is ready')) {
        clearTimeout(timeout);
        ready();
      }
    });
    server.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('exit', () => {
      clearTimeout(timeout);
      reject(new Error('Documentation server exited before startup.'));
    });
  });
  // The scene is a local page that loads local fonts, as docs/images/render.sh's pages do.
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    args: ['--allow-file-access-from-files'],
  });

  // The demo dashboard as the preview shows it, at twice its size so it stays sharp zoomed in.
  const app = await browser.newContext({
    viewport: { width: 1920, height: 1200 },
    deviceScaleFactor: 2,
    timezoneId: 'UTC',
    locale: 'en-US',
    reducedMotion: 'reduce',
  });
  const blocked = [];
  await app.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === origin) await route.continue();
    else {
      blocked.push(route.request().url());
      await route.abort('blockedbyclient');
    }
  });
  const page = await app.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(captureTime);
  await page.goto(`${origin}/demo`);
  await expect(page.locator('.dashboard')).toHaveAttribute('data-theme', 'graphite');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page
    .getByRole('dialog')
    .locator('.dashboard')
    .screenshot({ path: dashboard, animations: 'disabled', scale: 'device' });
  assert.deepEqual(errors, [], `The demo raised errors: ${errors.join('; ')}`);
  await app.close();

  // The scene, one screenshot per frame.
  const html = (await readFile(scene, 'utf8')).replaceAll('@DASHBOARD@', 'boot.dashboard.png');
  await writeFile(sceneRender, html);
  const stage = await browser.newContext({ viewport: { width: 1536, height: 768 }, offline: true });
  const view = await stage.newPage();
  await view.goto(pathToFileURL(sceneRender).href);
  await view.waitForFunction(() => [...document.images].every((image) => image.complete));
  const broken = await view.evaluate(async () => {
    await document.fonts.ready;
    return [...document.images].filter((image) => !image.naturalWidth).map((image) => image.src);
  });
  assert.deepEqual(broken, [], `The scene could not load: ${broken.join(', ')}`);
  const T = await view.evaluate(() => window.TIMELINE);
  const list = frames(T);
  // Every frame a keyframe: as a delta, a still after a zoom keeps near-identical blocks of the
  // frame before it and shows them as steps in the dark gradients.
  const args = [
    '-loop',
    '0',
    '-kmax',
    '1',
    '-o',
    output,
    '-lossy',
    '-q',
    String(quality),
    '-m',
    '6',
  ];
  for (const [index, frame] of list.entries()) {
    await view.evaluate((t) => window.setFrame(t), frame.t);
    const shot = resolve(work, `frame-${String(index).padStart(3, '0')}.png`);
    await view.screenshot({ path: shot });
    run('magick', [shot, '-resize', `${width}x`, '-strip', shot]);
    args.push('-d', String(frame.ms), shot);
  }
  run('img2webp', args);
  const seconds = list.reduce((sum, frame) => sum + frame.ms, 0) / 1000;
  console.log(
    `Rendered ${output}: ${list.length} frames, ${seconds}s, ${width}px wide. Blocked ${blocked.length} external request(s).`,
  );
} finally {
  await browser?.close();
  server.kill();
  await rm(sceneRender, { force: true });
  await rm(dashboard, { force: true });
  if (!process.env.NDASH_BOOT_KEEP) await rm(work, { recursive: true, force: true });
  else console.log(`Kept the frames in ${work}`);
}
