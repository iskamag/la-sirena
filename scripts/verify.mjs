import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const baseURL = process.env.APP_URL || 'http://localhost:5173';
const out = resolve(process.env.QA_OUT_DIR || 'artifacts/qa');
await mkdir(out, { recursive: true });
const report = { baseURL, checks: [], worlds: [], browserErrors: [], failedRequests: [] };
const check = (name, detail) => { report.checks.push({ name, detail }); console.log(`PASS ${name}${detail ? `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--enable-webgl', ...(process.env.QA_HARDWARE ? ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']), '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
context.setDefaultTimeout(20000);
if (process.env.QA_MEDIA_DEBUG) await context.addInitScript(() => {
  window.__qaMedia = { recorders: [], audio: [] };
  const NativeRecorder = window.MediaRecorder;
  window.MediaRecorder = class extends NativeRecorder {
    constructor(stream, options) {
      super(stream, options);
      const debug = { createdAt: performance.now(), mimeType: this.mimeType, tracks: stream.getTracks().map(track => ({ kind: track.kind, readyState: track.readyState, muted: track.muted, settings: track.getSettings() })), events: [] };
      window.__qaMedia.recorders.push(debug);
      for (const name of ['start', 'pause', 'resume', 'stop', 'error', 'dataavailable']) this.addEventListener(name, event => debug.events.push({ event: name, elapsedMS: performance.now() - debug.createdAt, state: this.state, bytes: event.data?.size, error: event.error?.message }));
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const audio = document.querySelector('audio');
    for (const name of ['play', 'pause', 'playing', 'ended', 'seeking', 'seeked']) audio.addEventListener(name, () => window.__qaMedia.audio.push({ event: name, now: performance.now(), time: audio.currentTime, paused: audio.paused, ended: audio.ended }));
  });
});
const watch = (page) => {
  page.on('pageerror', error => report.browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.browserErrors.push(message.text()); });
  page.on('requestfailed', request => {
    // Media source range requests are deliberately aborted on seeks / navigation.
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') report.failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
};
const ready = async (page, path = '/') => {
  await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__film?.ready, null, { timeout: 60000 });
  assert.equal(await page.locator('#error').isVisible(), false, 'No error overlay');
};
let pointer = 100;
const click = async (page, selector) => {
  await page.mouse.move(pointer++ % 200 + 20, 100);
  await page.locator(selector).click();
};
const seek = async (page, time) => {
  await page.locator('#seek').evaluate((input, t) => { input.value = t; input.dispatchEvent(new Event('input', { bubbles: true })); }, time);
  await page.waitForFunction(t => Math.abs(window.__film.state.time - t) < .3, time);
};

try {
  const page = await context.newPage(); watch(page);
  await ready(page);
  const analysisResponse = await context.request.get(`${baseURL}/track-analysis.json`);
  assert.equal(analysisResponse.status(), 200);
  const analysis = await analysisResponse.json();
  assert.ok(analysis.duration > 280 && analysis.duration < 300, 'Full song duration');
  const sha = createHash('sha256').update(await readFile('song.mod')).digest('hex');
  assert.equal(analysis.sourceSHA256, sha, 'Analysis belongs to song.mod');
  for (const file of ['music.ogg', 'music.mp3', 'font.css']) {
    const response = await context.request.get(`${baseURL}/${file}`);
    assert.equal(response.status(), 200, `${file} available`);
    assert.ok((await response.body()).length > (file.endsWith('css') ? 20 : 100000), `${file} is populated`);
  }
  const audioDuration = await page.locator('#audio').evaluate(audio => audio.duration);
  assert.ok(Math.abs(audioDuration - analysis.duration) < .25);
  check('Full source track and browser audio available', { duration: audioDuration, analysis: analysis.duration, sourceSHA256: sha });
  const chapters = await page.evaluate(() => window.__film.chapters);
  assert.equal(chapters.length, 7);
  if (!process.env.QA_VISUALS_ONLY) {
  const landingLayout = await page.evaluate(() => {
    const landing = document.querySelector('.landing').getBoundingClientRect();
    const transport = document.querySelector('.transport').getBoundingClientRect();
    return { landingBottom: landing.bottom, transportTop: transport.top };
  });
  assert.ok(landingLayout.landingBottom < landingLayout.transportTop, 'Landing copy clears desktop transport');
  check('Desktop landing content clears playback controls', landingLayout);
  await page.screenshot({ path: `${out}/landing-desktop.png` });

  await click(page, '#enter');
  await page.waitForFunction(() => window.__film.state.playing && window.__film.state.time > .4);
  check('Entry starts audio and advances the song');
  await page.keyboard.press('m');
  assert.equal(await page.locator('#audio').evaluate(audio => audio.muted), true, 'Mute shortcut works after clicking Enter');
  await page.keyboard.press('m');
  await page.keyboard.press('c');
  await page.waitForFunction(() => document.getElementById('chapters').classList.contains('open'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#chapters-button').getAttribute('aria-expanded'), 'false');
  await page.keyboard.press('f');
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.keyboard.press('f');
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !window.__film.state.playing);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__film.state.playing);
  check('Playback, mute, chapters, and fullscreen shortcuts work after entry');
  await click(page, '#play');
  await page.waitForFunction(() => !window.__film.state.playing);
  const pausedAt = await page.evaluate(() => window.__film.state.time);
  await page.waitForTimeout(350);
  assert.ok(Math.abs(await page.evaluate(() => window.__film.state.time) - pausedAt) < .05);
  check('Pause stops audio clock');

  for (let i = 0; i < chapters.length; i++) {
    await seek(page, chapters[i].time + 1);
    await page.waitForFunction(i => window.__film.state.scene === i, i);
    assert.ok((await page.locator('#current-act').textContent()).toLowerCase().includes(chapters[i].name.toLowerCase()));
  }
  check('Range seeking selects all seven chapters', chapters.map(c => ({ name: c.name, time: c.time })));

  await click(page, '#chapters-button');
  assert.equal(await page.locator('#chapters-button').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#chapters').evaluate(panel => panel.inert), false);
  await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('chapters')).opacity) > .99);
  await page.screenshot({ path: `${out}/chapters-desktop.png` });
  await click(page, '.chapter-item:nth-child(3)');
  assert.equal(await page.locator('#chapters-button').getAttribute('aria-expanded'), 'false');
  assert.ok(Math.abs(await page.evaluate(() => window.__film.state.time) - chapters[2].time) < .3);
  check('Chapter panel opens, jumps, and closes');

  await click(page, '#sound-toggle');
  assert.equal(await page.locator('#audio').evaluate(audio => audio.muted), true);
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-label'), 'Unmute audio');
  await click(page, '#sound-toggle');
  assert.equal(await page.locator('#audio').evaluate(audio => audio.muted), false);
  check('Mute and unmute');

  const qualityWidths = {};
  for (const name of ['ULTRA', 'ECO', 'HQ']) {
    await click(page, '#quality');
    assert.equal(await page.locator('#quality').textContent(), name);
    qualityWidths[name] = await page.locator('#world').evaluate(canvas => canvas.width);
  }
  assert.ok(qualityWidths.ULTRA > qualityWidths.HQ && qualityWidths.HQ > qualityWidths.ECO);
  check('Quality cycles and changes render resolution', qualityWidths);

  // Near-end playback exercises natural ended, then replay from the beginning.
  await seek(page, audioDuration - .55);
  await click(page, '#play');
  await page.waitForFunction(() => document.getElementById('audio').ended && !window.__film.state.playing, null, { timeout: 10000 });
  await page.screenshot({ path: `${out}/end-card.png` });
  await click(page, '#play');
  await page.waitForFunction(() => window.__film.state.playing && window.__film.state.time > .2 && window.__film.state.time < 2);
  await click(page, '#play');
  check('Natural ending and replay reset');

  await seek(page, chapters[2].time + 8);
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.keyboard.press('r');
  await page.waitForFunction(() => !document.getElementById('record-status').hidden);
  await page.waitForTimeout(3000);
  await page.keyboard.press('r');
  const download = await downloadPromise;
  const clip = `${out}/capture.webm`;
  await download.saveAs(clip);
  if (process.env.QA_MEDIA_DEBUG) report.captureDebug = await page.evaluate(() => window.__qaMedia);
  const media = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', clip], { encoding: 'utf8' }));
  assert.ok(media.streams.some(stream => stream.codec_type === 'video' && stream.width > 0 && stream.height > 0), 'Video track in export');
  assert.ok(media.streams.some(stream => stream.codec_type === 'audio' && Number(stream.sample_rate) > 0), 'Audio track in export');
  const packets = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_packets', '-show_entries', 'packet=pts_time,duration_time', '-of', 'json', clip], { encoding: 'utf8' })).packets;
  const duration = Math.max(...packets.map(p => Number(p.pts_time || 0) + Number(p.duration_time || 0)));
  assert.ok(duration >= 2, 'Export has useful duration');
  const audioStats = spawnSync('ffmpeg', ['-hide_banner', '-i', clip, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  assert.equal(audioStats.status, 0, 'Recording audio decodes');
  const meanVolume = Number(audioStats.stderr.match(/mean_volume: ([-\d.]+) dB/)?.[1]);
  assert.ok(Number.isFinite(meanVolume) && meanVolume > -70, 'Recording audio contains the song');
  report.recording = { path: clip, duration, meanVolumeDB: meanVolume, streams: media.streams.map(s => ({ type: s.codec_type, codec: s.codec_name, width: s.width, height: s.height, sampleRate: s.sample_rate })) };
  check('Recording shortcut exports valid WebM picture and sound', report.recording);
  await page.evaluate(() => window.__film.pause());
  await click(page, '.wordmark');
  assert.equal(await page.locator('.landing').evaluate(landing => landing.inert), false);
  assert.equal(await page.evaluate(() => document.body.classList.contains('started')), false);
  assert.equal(await page.evaluate(() => window.__film.state.time), 0);
  check('Wordmark returns to an interactive landing');
  }
  await page.close();

  if (!process.env.QA_CONTROLS_ONLY) {
  const visual = await context.newPage(); watch(visual);
  await ready(visual, '/?preview=1');
  for (let i = 0; i < chapters.length; i++) {
    // The climax also cuts to previous worlds. Choose its original sculpture here.
    const t = chapters[i].time + (chapters[i].end - chapters[i].time) * (i === 5 ? .31 : .43);
    await visual.waitForFunction(() => window.__film?.ready);
    const stats = await visual.evaluate(t => {
      window.__film.frame(t);
      const canvas = document.getElementById('world');
      const gl = canvas.getContext('webgl2');
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0, sum = 0, bright = 0, hash = 2166136261;
      for (let n = 0; n < pixels.length; n += 64) {
        const luminance = pixels[n] * .2126 + pixels[n + 1] * .7152 + pixels[n + 2] * .0722;
        sum += luminance; if (luminance > 8) lit++; if (luminance > 120) bright++;
        hash = Math.imul(hash ^ pixels[n], 16777619) >>> 0;
      }
      const count = Math.ceil(pixels.length / 64);
      return { averageLuminance: sum / count, litFraction: lit / count, brightFraction: bright / count, hash, glError: gl.getError(), scene: window.__film.state.scene };
    }, t);
    assert.equal(stats.glError, 0, `${chapters[i].name} has no GL error`);
    assert.equal(stats.scene, i);
    assert.ok(stats.averageLuminance > 4 && stats.litFraction > .1, `${chapters[i].name} renders a nonblack world`);
    const screenshot = `${out}/world-${i + 1}.png`;
    await visual.screenshot({ path: screenshot });
    report.worlds.push({ name: chapters[i].name, time: t, screenshot, ...stats });
  }
  assert.equal(new Set(report.worlds.map(world => world.hash)).size, 7, 'Seven visually distinct worlds');
  check('All seven worlds render distinct nonblack pixels without GL errors');
  if (process.env.QA_OPENING_REVIEW) {
    for (const time of [1, 4, 8, 12, 18, 25, 32, 38, 46, 58]) {
      await visual.evaluate(time => window.__film.frame(time), time);
      await visual.screenshot({ path: `${out}/opening-${time}.png` });
    }
    check('Opening composition review frames captured');
  }
  if (process.env.QA_SHADOW_REVIEW) {
    report.shadowReview = { desktop: [], portrait: [], worlds: [] };
    for (const time of [.6, 1.5, 3.8, 7, 11, 15, 18, 22, 29, 32, 36, 38, 41, 46, 49, 52, 58]) {
      await visual.evaluate(time => window.__film.frame(time), time);
      const screenshot = `${out}/shadow-desktop-${time}.png`;
      await visual.screenshot({ path: screenshot });
      report.shadowReview.desktop.push({ time, screenshot, ...await visual.evaluate(() => ({ world: window.__film.state.world, shot: window.__film.state.shot })) });
    }
    // Force each world so later callback cuts cannot conceal an unreviewed shader.
    for (let world = 0; world < 10; world++) {
      const time = world === 9 ? 1.5 : [12, 46, 102, 152, 194, 239, 278, 7, 14][world];
      const detail = await visual.evaluate(({ time, world }) => {
        window.__film.frame(time, world);
        const gl = document.getElementById('world').getContext('webgl2');
        return { actualWorld: window.__film.state.world, glError: gl.getError() };
      }, { time, world });
      assert.equal(detail.actualWorld, world);
      assert.equal(detail.glError, 0);
      const screenshot = `${out}/shadow-world-${world}.png`;
      await visual.screenshot({ path: screenshot });
      report.shadowReview.worlds.push({ time, world, screenshot, ...detail });
    }
    await visual.evaluate(() => window.__film.frame(1.5));
    check('First-minute shadow composition and all ten worlds captured for visual review');
  }
  if (process.env.QA_EVENT_REVIEW) {
    report.eventReview = { desktop: [], portrait: [] };
    const times = [.7, 4, 10, 20, 30, 45, 58, 90, 110, 140, 144, 149.4, 149.710, 150, 151.2, 153.7, 156.515, 160, 168, 193.4, 194.1, 196, 198.1, 201, 205, 239, 275];
    for (const time of times) {
      const state = await visual.evaluate(time => { window.__film.frame(time); return window.__film.state; }, time);
      if (time >= 140 && time <= 168) assert.equal(state.world, 3, 'Temple transformation stays in one world');
      const screenshot = `${out}/event-desktop-${time}.png`;
      await visual.screenshot({ path: screenshot });
      report.eventReview.desktop.push({ time, screenshot, state });
    }
    check('Musical trigger before/after frames and rare cat-role windows captured');
  }
  await visual.close();

  const mobile = await context.newPage(); watch(mobile);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await ready(mobile);
  const layout = await mobile.evaluate(() => {
    const elements = ['.masthead', '.landing', '#enter', '.transport', '.controls-row'];
    return elements.map(selector => { const box = document.querySelector(selector).getBoundingClientRect(); return { selector, x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; });
  });
  for (const box of layout) assert.ok(box.x >= -.5 && box.right <= 390.5 && box.y >= -.5 && box.bottom <= 844.5, `Mobile ${box.selector} fits viewport`);
  await mobile.screenshot({ path: `${out}/landing-mobile.png` });
  await click(mobile, '#enter');
  await mobile.waitForFunction(() => window.__film.state.playing);
  await click(mobile, '#play');
  await click(mobile, '#chapters-button');
  await mobile.waitForFunction(() => Number(getComputedStyle(document.getElementById('chapters')).opacity) > .99);
  const mobilePanel = await mobile.locator('#chapters').boundingBox();
  assert.ok(mobilePanel.x >= 0 && mobilePanel.x + mobilePanel.width <= 390 && mobilePanel.y >= 0 && mobilePanel.y + mobilePanel.height <= 844);
  await mobile.screenshot({ path: `${out}/chapters-mobile.png` });
  await click(mobile, '.chapter-item:nth-child(5)');
  await mobile.waitForFunction(() => window.__film.state.scene === 4);
  await mobile.screenshot({ path: `${out}/film-mobile.png` });
  if (process.env.QA_OPENING_REVIEW) {
    await ready(mobile, '/?preview=1&t=1.5');
    await mobile.evaluate(() => window.__film.frame(1.5));
    await mobile.screenshot({ path: `${out}/opening-cat-mobile.png` });
  }
  if (process.env.QA_SHADOW_REVIEW) {
    await ready(mobile, '/?preview=1');
    for (const time of [1.5, 3.8, 11, 22, 29, 38, 49, 58]) {
      await mobile.evaluate(time => window.__film.frame(time), time);
      const screenshot = `${out}/shadow-portrait-${time}.png`;
      await mobile.screenshot({ path: screenshot });
      report.shadowReview.portrait.push({ time, screenshot, ...await mobile.evaluate(() => ({ world: window.__film.state.world, shot: window.__film.state.shot })) });
    }
    assert.equal(await mobile.evaluate(() => innerWidth), 390);
    assert.equal(await mobile.evaluate(() => innerHeight), 844);
    check('Shadow composition captured at actual 390 × 844 portrait viewport');
  }
  if (process.env.QA_EVENT_REVIEW) {
    await ready(mobile, '/?preview=1');
    for (const time of [.7, 20, 90, 149.4, 151.2, 160, 194.1, 198.1, 205]) {
      const state = await mobile.evaluate(time => { window.__film.frame(time); return window.__film.state; }, time);
      const screenshot = `${out}/event-portrait-${time}.png`;
      await mobile.screenshot({ path: screenshot });
      report.eventReview.portrait.push({ time, screenshot, state });
    }
    check('Trigger transformations and arcade route captured at actual 390 × 844 viewport');
  }
  check('Mobile landing, transport, chapter navigation fit 390 × 844', layout);
  await mobile.close();

  const softContext = await browser.newContext({ viewport: { width: 960, height: 540 }, reducedMotion: 'reduce' });
  const soft = await softContext.newPage(); watch(soft);
  await ready(soft, '/?preview=1&t=240');
  assert.equal(await soft.evaluate(() => window.__film.state.motion), .2);
  await soft.screenshot({ path: `${out}/reduced-motion.png` });
  check('Reduced-motion preference softens procedural movement');
  await softContext.close();
  }

  if (process.env.QA_CAPTURE_SMOKE) {
    const capture = await context.newPage(); watch(capture);
    await ready(capture);
    await click(capture, '#enter');
    await capture.waitForFunction(() => window.__film.state.playing && window.__film.state.time > .2);
    const captureTime = Number(process.env.QA_CAPTURE_TIME || 0);
    if (captureTime > 0) {
      await capture.evaluate(time => { window.__film.pause(); window.__film.seek(time); }, captureTime);
      await capture.waitForFunction(time => Math.abs(window.__film.state.time - time) < .3, captureTime);
    }
    const downloadPromise = capture.waitForEvent('download', { timeout: 30000 });
    await capture.evaluate(() => window.__film.record());
    await capture.waitForFunction(() => !document.getElementById('record-status').hidden);
    await capture.waitForTimeout(8000);
    await capture.evaluate(() => window.__film.stopRecording());
    const download = await downloadPromise;
    const clip = `${out}/presentation-capture.webm`;
    await download.saveAs(clip);
    const media = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', clip], { encoding: 'utf8' }));
    assert.ok(media.streams.some(s => s.codec_type === 'video' && s.width > 0));
    assert.ok(media.streams.some(s => s.codec_type === 'audio' && Number(s.sample_rate) > 0));
    const audioStats = spawnSync('ffmpeg', ['-hide_banner', '-i', clip, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
    assert.equal(audioStats.status, 0);
    const meanVolumeDB = Number(audioStats.stderr.match(/mean_volume: ([-\d.]+) dB/)?.[1]);
    assert.ok(Number.isFinite(meanVolumeDB) && meanVolumeDB > -70, 'Captured song is audible');
    const decoded = execFileSync('ffmpeg', ['-v', 'error', '-ss', '1', '-i', clip, '-frames:v', '1', '-vf', 'scale=64:36', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
    assert.equal(decoded.length, 64 * 36 * 3);
    const averageRGB = decoded.reduce((sum, value) => sum + value, 0) / decoded.length;
    assert.ok(averageRGB > 3, 'Final presented canvas survives recording and decoding');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', clip, '-vf', 'fps=2,scale=320:-1,tile=4x4', '-frames:v', '1', `${out}/presentation-motion.png`]);
    report.presentationCapture = { path: clip, startingSongTime: captureTime, meanVolumeDB, decodedFrameAverageRGB: averageRGB, motionSheet: `${out}/presentation-motion.png`, streams: media.streams.map(s => ({ type: s.codec_type, codec: s.codec_name, width: s.width, height: s.height, sampleRate: s.sample_rate })) };
    check('Final presentation records visible moving picture and audible song', report.presentationCapture);
    await capture.close();
  }

  if (process.env.QA_FPS_SMOKE) {
    const live = await context.newPage(); watch(live);
    await ready(live);
    await click(live, '#enter');
    await live.waitForFunction(() => window.__film.state.playing);
    report.performance = await live.evaluate(async ({ shadowReview, eventReview }) => {
      const windows = [];
      const tests = eventReview ? [{ world: 3, time: 148 }, { world: 10, time: 194 }] : shadowReview ? [{ world: 9 }, { world: 2 }] : [{ world: null }];
      for (const test of tests) {
      const world = test.world;
      if (test.time !== undefined) window.__film.seek(test.time);
      if (world !== null) window.__film.frame(document.getElementById('audio').currentTime, world);
      const startingSongTime = document.getElementById('audio').currentTime;
      const timestamps = [];
      let running = true;
      const sample = now => { timestamps.push(now); if (running) requestAnimationFrame(sample); };
      requestAnimationFrame(sample);
      await new Promise(resolve => setTimeout(resolve, shadowReview || eventReview ? 10000 : 20000));
      running = false;
      const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]);
      const sorted = [...intervals].sort((a, b) => a - b);
      const gl = document.getElementById('world').getContext('webgl2');
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      windows.push({
        forcedWorld: world,
        actualWorld: window.__film.state.world,
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        width: document.getElementById('world').width,
        height: document.getElementById('world').height,
        songTime: document.getElementById('audio').currentTime,
        audioAdvanced: document.getElementById('audio').currentTime - startingSongTime,
        meanFPS: intervals.length * 1000 / (timestamps.at(-1) - timestamps[0]),
        medianFrameMS: sorted[Math.floor(sorted.length * .5)],
        p95FrameMS: sorted[Math.floor(sorted.length * .95)],
        framesOver25MS: intervals.filter(value => value > 25).length,
        measuredFrames: intervals.length,
        glError: gl.getError(),
      });
      }
      return { windows };
    }, { shadowReview: !!process.env.QA_SHADOW_REVIEW, eventReview: !!process.env.QA_EVENT_REVIEW });
    for (const window of report.performance.windows) {
      assert.equal(window.glError, 0);
      if (window.forcedWorld !== null) assert.equal(window.actualWorld, window.forcedWorld);
      assert.ok(window.audioAdvanced > (process.env.QA_SHADOW_REVIEW || process.env.QA_EVENT_REVIEW ? 8 : 18), 'Audio advances during realtime rendering');
    }
    check('Twenty-second realtime rendering performance measured', report.performance);
    await live.close();
  }

  assert.deepEqual(report.browserErrors, [], 'No JavaScript / console errors');
  assert.deepEqual(report.failedRequests, [], 'No failed browser network requests');
  check('No browser JavaScript errors or failed requests');
} catch (error) {
  report.failure = error.stack;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await writeFile(`${out}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
