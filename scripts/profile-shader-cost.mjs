// Static compiler diagnostics, separate from GPU timing and image equivalence.
// Mesa 26.2 uses ps,asm,stats; see radeonsi/gfx/si_gfx_screen.c.
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createFilmScore } from '../newscore.js';
import { flowBoundValidity } from '../flow-bounds.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
const option = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const hash = text => createHash('sha256').update(text).digest('hex');
if (argv.includes('--help')) {
  console.log(`Usage: node scripts/profile-shader-cost.mjs [--revisions HEAD,other-commit] [--time 35] [--scene 1] [--out artifacts/shader-cost] [--no-inline] [--specialize] [--amd-debug ps,asm,stats]
Compiles and draws one 320x180 frame per revision on Chromium's ANGLE/OpenGL GPU path.
Writes full Mesa ISA logs, translated GLSL, and a small report.json; reports static costs, not timings.
Mesa 26.2+ radeonsi uses AMD_DEBUG=ps,asm,stats. Older drivers may need other --amd-debug flags.
--specialize makes scene dispatch constant for compiler-cost comparison only.
--no-inline disables Mesa's uniform-value specialization using radeonsi_inline_uniforms=false.
Requires local Chromium, Playwright, and a driver that emits RadeonSI assembly/stats.`);
  process.exit(0);
}

function parseMainPrograms(raw) {
  const text = raw.replace(/^.*?\[err\] /gm, '').replaceAll('\\t', '\t');
  const parts = [];
  for (const block of text.split('SHADER KEY\n').slice(1)) {
    const match = block.match(/Pixel Shader:\n([\s\S]*?)\*\*\* SHADER STATS \*\*\*\n([\s\S]*?)\*{5,}/);
    if (!match) continue;
    const sourceKey = block.match(/source_blake3 = (\{[^}]+\})/)?.[1];
    const inlineUniforms = block.match(/opt.inline_uniforms = ([^\n]+)/)?.[1];
    const stats = Object.fromEntries([...match[2].matchAll(/([A-Za-z][A-Za-z ]*): (\d+)/g)].map(([, key, value]) => [key.trim(), Number(value)]));
    const opcodes = {};
    for (const opcode of match[1].matchAll(/^\s*((?:s|v|buffer|flat|image|ds)_[a-zA-Z0-9_]+|exp)\s/gm)) opcodes[opcode[1]] = (opcodes[opcode[1]] ?? 0) + 1;
    const count = expression => Object.entries(opcodes).filter(([key]) => expression.test(key)).reduce((sum, [, value]) => sum + value, 0);
    parts.push({ sourceKey, inlineUniforms, stats, instructions: { total: count(/./), sin: count(/sin/), cos: count(/cos/), sqrt: count(/sqrt/), branches: count(/branch/), vectorALU: count(/^v_/), scalar: count(/^s_/), execMask: count(/exec/), fma: count(/fma|fmacc/) }, opcodes });
  }
  // Startup/compositor programs are smaller. Keep all variants sharing the
  // source key of the largest fragment program, including uniform-specialized ones.
  const largest = parts.reduce((best, part) => !best || part.stats['Code Size'] > best.stats['Code Size'] ? part : best, null);
  return largest ? parts.filter(part => part.sourceKey === largest.sourceKey) : [];
}

if (argv.includes('--child')) {
  const { chromium } = await import('playwright');
  const sourceFile = option('source'), output = option('result');
  const time = Number(option('time', 35)), scene = Number(option('scene', 1));
  const { vertexShader, fragmentShader: dynamicFragment } = await import(pathToFileURL(sourceFile));
  const fragmentShader = argv.includes('--specialize') ? dynamicFragment.replace('int scene=int(floor(u_scene+.5));', `int scene=${scene};`) : dynamicFragment;
  if (argv.includes('--specialize') && fragmentShader === dynamicFragment) throw Error('Could not find scene dispatch to specialize.');
  const analysis = JSON.parse(await readFile(resolve(root, 'public/track-analysis.json'), 'utf8'));
  const frame = createFilmScore(analysis).at(time, { scene }).frame;
  frame.flowBoundValid = flowBoundValidity({...frame,motion:1,pointer:[0,0]});
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-gpu-shader-disk-cache', '--enable-logging=stderr'] });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
    await page.setContent('<canvas width="320" height="180"></canvas>');
    const result = await page.evaluate(({ vertexShader, fragmentShader, frame }) => {
      const gl = document.querySelector('canvas').getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
      if (!gl) throw Error('WebGL 2 is unavailable.');
      const program = gl.createProgram(), translated = [], debug = gl.getExtension('WEBGL_debug_shaders');
      for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]]) {
        const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
        gl.attachShader(program, shader); translated.push(debug?.getTranslatedShaderSource(shader) ?? null);
      }
      gl.bindAttribLocation(program, 0, 'a_position'); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const uniforms = { resolution: [320, 180], time: frame.time, scene: frame.scene, local: frame.local, energy: frame.energy, beat: frame.beat, motion: 1, pointer: [0, 0], seed: frame.seed, poster: 0, shot: frame.shot, density: frame.density, event: frame.event, audio: frame.audio, flowBoundValid:frame.flowBoundValid };
      for (const [name, value] of Object.entries(uniforms)) {
        const location = gl.getUniformLocation(program, `u_${name}`); if (location === null) continue;
        if (Array.isArray(value)) { if (value.length === 2) gl.uniform2fv(location, value); else gl.uniform4fv(location, value); }
        else gl.uniform1f(location, value);
      }
      gl.viewport(0, 0, 320, 180); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish();
      const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return { renderer: gl.getParameter(rendererInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER), glError: gl.getError(), translated };
    }, { vertexShader, fragmentShader, frame });
    if (result.glError) throw Error(`GL error ${result.glError}`);
    await writeFile(output, JSON.stringify({ time, scene, flowBoundValid:frame.flowBoundValid, sourceSha256: hash(fragmentShader), ...result }));
  } finally { await browser.close(); }
  process.exit(0);
}

const time = Number(option('time', 35)), scene = Number(option('scene', 1));
if (!Number.isFinite(time) || time < 0 || !Number.isInteger(scene) || scene < 0 || scene > 10) throw Error('Use a nonnegative time and an integer scene from 0 through 10.');
const out = resolve(option('out', 'artifacts/shader-cost')), revisions = option('revisions', 'HEAD').split(',').filter(Boolean);
await mkdir(out, { recursive: true });
const report = { method: 'One-frame static RadeonSI compiler diagnostics via Chromium ANGLE/OpenGL. Includes initial and uniform-specialized shader variants. Static opcode counts do not measure executed instructions, branch divergence, GPU timings or image equivalence.', time, scene, amdDebug: option('amd-debug', 'ps,asm,stats'), uniformInlining: !argv.includes('--no-inline'), specializedScene: argv.includes('--specialize') ? scene : null, revisions: [] };
for (const [index, revision] of revisions.entries()) {
  const commit = execFileSync('git', ['rev-parse', '--verify', `${revision}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
  const source = execFileSync('git', ['show', `${commit}:shaders.js`], { cwd: root, encoding: 'utf8' });
  const prefix = resolve(out, `${index}-${commit.slice(0, 12)}`), sourceFile = `${prefix}-source.mjs`, resultFile = `${prefix}-result.json`, logFile = `${prefix}.log`;
  await writeFile(sourceFile, source);
  const log = await open(logFile, 'w');
  try {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--child', '--source', sourceFile, '--result', resultFile, '--time', String(time), '--scene', String(scene), ...(argv.includes('--specialize') ? ['--specialize'] : [])], { cwd: root, env: { ...process.env, DEBUG: 'pw:browser', DEBUG_COLORS: '0', AMD_DEBUG: report.amdDebug, MESA_SHADER_CACHE_DISABLE: 'true', ...(report.uniformInlining ? {} : { radeonsi_inline_uniforms: 'false' }) }, stdio: ['ignore', log.fd, log.fd] });
    await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => code === 0 ? resolve() : reject(Error(`Compiler diagnostic exited ${code}; see ${logFile}`))); });
  } finally { await log.close(); }
  const { translated, ...result } = JSON.parse(await readFile(resultFile, 'utf8'));
  if (translated[0]) await writeFile(`${prefix}.vert`, translated[0]);
  if (translated[1]) await writeFile(`${prefix}.frag`, translated[1]);
  const variants = parseMainPrograms(await readFile(logFile, 'utf8'));
  const item = { revision, commit, ...result, logFile, variants };
  report.revisions.push(item);
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  if (!variants.length) throw Error(`No RadeonSI stats found; inspect ${logFile} and choose driver-appropriate --amd-debug flags.`);
  console.log(JSON.stringify({ revision, renderer: result.renderer, variants: variants.map(({ inlineUniforms, stats, instructions }) => ({ inlineUniforms, stats, instructions })) }));
}
console.log(`Saved ${resolve(out, 'report.json')}`);
