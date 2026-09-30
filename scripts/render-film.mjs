import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { once } from 'node:events';

// Frame-exact offline rendering. The audio clock drives both image and sound.
const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(`--${name}`); return index < 0 ? fallback : args[index + 1]; };
const start = Number(option('start', '0'));
const score = JSON.parse(await readFile(new URL('../public/track-analysis.json', import.meta.url)));
const duration = Math.min(Number(option('duration', String(score.duration - start))), score.duration - start);
const width = Number(option('width', '1280'));
const height = Number(option('height', String(Math.round(width * 9 / 16 / 2) * 2)));
const fps = Number(option('fps', '30'));
const crf = Number(option('crf', '20'));
const output = resolve(option('output', 'artifacts/la-sirena-rupture.mp4'));
const url = option('url', process.env.FILM_URL || 'http://localhost:5173');
if (!(duration > 0 && start >= 0 && fps > 0 && Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0)) throw new Error('Invalid render range or dimensions.');
await mkdir(dirname(output), { recursive: true });
const temp = output.replace(/\.mp4$/i, '') + '.silent.mp4';
const software = args.includes('--software');
const lossless = args.includes('--lossless');
const graphicsFlags = software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--enable-webgl', ...graphicsFlags, '--disable-background-timer-throttling'] });
let encoder;
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  let browserError;
  page.on('pageerror', (error) => { browserError = error; });
  await page.goto(`${url}/?preview=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__film?.ready);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({width,height}) => window.__film.setExportResolution(width,height), {width,height});
  encoder = spawn('ffmpeg', ['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec',lossless?'png':'mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf',String(crf),'-pix_fmt','yuv420p',temp], { stdio: ['pipe','inherit','inherit'] });
  let encodingError;
  encoder.on('error', (error) => { encodingError = error; });
  encoder.stdin.on('error', (error) => { encodingError = error; });
  const frames = Math.ceil(duration * fps);
  const began = Date.now();
  for (let frame = 0; frame < frames; frame++) {
    if (encodingError) throw encodingError;
    if (browserError) throw browserError;
    const image = await page.evaluate(({time,format}) => window.__film.exportFrame(time,null,format), {time:start + frame / fps,format:lossless?'image/png':'image/jpeg'});
    const bytes = Buffer.from(image.slice(image.indexOf(',') + 1), 'base64');
    if (!encoder.stdin.write(bytes)) await once(encoder.stdin, 'drain');
    if (frame % fps === 0) process.stdout.write(`\rRendering ${Math.floor(frame / fps)} / ${duration.toFixed(1)} seconds · ${((Date.now() - began) / 1000).toFixed(0)}s elapsed`);
  }
  const closed = once(encoder, 'close'); encoder.stdin.end();
  const [code] = await closed; if (code !== 0) throw new Error(`Frame encoder exited ${code}`);
  const mux = spawn('ffmpeg', ['-y','-hide_banner','-loglevel','error','-i',temp,'-ss',String(start),'-i',resolve('public/music.mp3'),'-map','0:v:0','-map','1:a:0','-t',String(duration),'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',output], { stdio: 'inherit' });
  const [muxCode] = await once(mux, 'close'); if (muxCode !== 0) throw new Error(`Audio mux exited ${muxCode}`);
  await unlink(temp); process.stdout.write(`\nSaved ${output} · ${((Date.now()-began)/1000).toFixed(1)}s render time\n`);
} finally { await browser.close(); if (encoder && encoder.exitCode === null) encoder.kill(); }
