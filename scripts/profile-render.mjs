// Hardware-backed, deterministic render comparisons and GPU-completed timings.
// Source serving and QA injection are confined to this process.
import { chromium } from 'playwright';
import { validateBenchmarkMode, benchmarkLabels, benchmarkSideOrder, summarizeBenchmark } from './profile-bench.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1];
};
const root = resolve(option('candidate', '.'));
const baselineRoot = resolve(option('baseline', root));
const baselineRef = option('baseline-ref', null);
const width = Number(option('width', '960'));
const height = Number(option('height', String(width * 9 / 16)));
const mode = option('mode', 'compare');
const out = resolve(option('out', 'artifacts/optimization'));
const blocks = Number(option('blocks', '4'));
const batch = Number(option('batch', '24'));
const sequence = Number(option('sequence', '8'));
const maxQueuedFrames = Number(option('max-queued-frames', '1'));
const cooldownMs = Number(option('cooldown-ms', '1000'));
const check = args.includes('--check');
const saveImages = args.includes('--images');
const motion = Number(option('motion', '1'));
const pointer = JSON.parse(option('pointer', '[0,0]'));
const poster = args.includes('--poster');
const disableBaselineRoofAngles = args.includes('--disable-baseline-roof-angles');
const disableBaselinePrimaryGuide = args.includes('--disable-baseline-primary-guide');
const candidateOnly = args.includes('--candidate-only');
if (!Number.isFinite(motion) || motion < 0 || motion > 1 || !Array.isArray(pointer) || pointer.length !== 2 || pointer.some(n => !Number.isFinite(n) || Math.abs(n) > 1)) throw Error('Motion must be in [0,1] and pointer must contain two values in [-1,1]');
const maxDifference = Number(option('max-difference', '2'));
const maxRMS = Number(option('max-rms', '.05'));
const budget = Number(option('budget-ms', 'Infinity'));
const times = JSON.parse(option('times', '[1.5,11,14,20,24,35,58,91,110,129.3,144,150.1,156.6,160,169.9,180,195,215,235,249,270,281,286]'));
validateBenchmarkMode({mode,candidateOnly,disableBaselineRoofAngles});
if(candidateOnly&&disableBaselinePrimaryGuide)throw Error('--candidate-only cannot disable a baseline primary guide');
if(!Array.isArray(times)||times.length===0||times.some(t=>!Number.isFinite(t)||t<0)) throw Error('Times must be a nonempty array of finite nonnegative numbers');
if (![width, height, blocks, batch, sequence].every(n => Number.isInteger(n) && n > 0)) throw Error('Positive integer dimensions/counts required');
if(!Number.isInteger(maxQueuedFrames)||maxQueuedFrames<1||!Number.isFinite(cooldownMs)||cooldownMs<0) throw Error('Use positive integer max-queued-frames and nonnegative cooldown-ms');
await mkdir(out, { recursive: true });
const injection = `
window.__profile = {
  configure(width,height,motion,pointer,poster,cooldownMs,disableRoofAngles=false,disablePrimaryGuide=false) {
    this.cooldownMs=cooldownMs;
    state.started=!poster;state.offline=true;state.motion=motion;state.pointer=[...pointer];state.smoothPointer=[...pointer];
    getMusic=(t,dt)=>score.musicAt(t);
    world.width=width;world.height=height;
    secondaryLayers.resize(width,height);compositor.resize(width,height);
    if(disableRoofAngles){
      if(typeof roofAngleCache==='undefined')throw Error('Baseline has no roof angle cache to disable');
      roofAngleCache.allowed=false;
    }
    if(disablePrimaryGuide){
      if(typeof primaryGuide==='undefined')throw Error('Baseline has no primary guide to disable');
      primaryGuide.enabled=false;
    }
  },
  reset(){compositor.historyReady=false;compositor.lastTime=-100;compositor.lastScene=-1;},
  async drain(){
    const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();const began=performance.now();
    try {
      for(;;){
        const status=gl.clientWaitSync(fence,0,0);
        if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)break;
        if(status===gl.WAIT_FAILED||performance.now()-began>30000)throw Error('GPU completion fence failed');
        await new Promise(r=>setTimeout(r,0));
      }
    } finally {gl.deleteSync(fence);}
  },
  async frame(t){
    render(performance.now(),t);await this.drain();
    if(this.cooldownMs>0)await new Promise(r=>setTimeout(r,this.cooldownMs));
  },
  get gl(){return gl;},
  features(){return {
    noiseCacheEnabled:typeof noiseCache!=='undefined'&&Boolean(noiseCache.enabled),
    noiseCacheValidity:typeof noiseCache!=='undefined'?(noiseCache.validity??null):null,
    cloudVolumeEnabled:typeof cloudVolume!=='undefined'&&Boolean(cloudVolume.enabled),
    cloudVolumeValid:typeof cloudVolume!=='undefined'&&Boolean(cloudVolume.valid),
    cloudVolumeValidity:typeof cloudVolume!=='undefined'?(cloudVolume.validity??null):null,
    primaryGuideEnabled:typeof primaryGuide!=='undefined'&&Boolean(primaryGuide.enabled),
    primaryGuideValid:typeof primaryGuide!=='undefined'&&Boolean(primaryGuide.valid),
    roofAngleCacheEnabled:typeof roofAngleCache!=='undefined'&&Boolean(roofAngleCache.enabled),
    roofAngleCacheAllowed:typeof roofAngleCache!=='undefined'&&Boolean(roofAngleCache.allowed),
    roofAngleCacheValid:typeof roofAngleCache!=='undefined'&&Boolean(roofAngleCache.valid)
  };},
  capture(){
    const previous=gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const read=target=>{gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);const p=new Uint8Array(world.width*world.height*4);gl.readPixels(0,0,world.width,world.height,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
    const image=read(compositor.history[1-compositor.historyIndex]);
    const base=read(compositor.depthCopy);
    gl.bindFramebuffer(gl.FRAMEBUFFER,previous);
    const encode=p=>{let s='';for(let i=0;i<p.length;i+=8192)s+=String.fromCharCode(...p.subarray(i,i+8192));return btoa(s);};
    return {image:encode(image),base:encode(base),glError:gl.getError()};
  },
  async timing(start,count,maxQueuedFrames,cooldownMs){
    const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)throw Error('Hardware GPU timer unavailable');
    const drain=()=>this.drain();
    await drain();const began=performance.now(),chunks=[];let gpu=0,submit=0,disjoint=false,deliberateWait=0;
    for(let offset=0;offset<count;offset+=maxQueuedFrames){
      const q=gl.createQuery(),queued=Math.min(maxQueuedFrames,count-offset),submitted=performance.now();
      gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
      for(let i=0;i<queued;i++)render(performance.now(),start+(offset+i)/60);
      gl.endQuery(ext.TIME_ELAPSED_EXT);submit+=performance.now()-submitted;
      await drain();
      while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))await new Promise(r=>setTimeout(r,0));
      const elapsed=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gpu+=elapsed;
      chunks.push({time:start+offset/60,frames:queued,gpuMs:elapsed/queued});
      disjoint=disjoint||gl.getParameter(ext.GPU_DISJOINT_EXT);gl.deleteQuery(q);
      // Pause outside the GPU query so desktop breathing room is not counted
      // as shader work. Bound queue depth before submitting the next chunk.
      if(offset+queued<count&&cooldownMs>0){
        const waiting=performance.now();await new Promise(r=>setTimeout(r,cooldownMs));
        deliberateWait+=performance.now()-waiting;
      }
    }
    return {gpuMs:gpu/count,wallMs:(performance.now()-began)/count,submitMs:submit/count,deliberateWaitMs:deliberateWait/count,chunks,disjoint,glError:gl.getError()};
  }
};`;

async function serve(directory, ref) {
  const cache = new Map();
  const get = async name => {
    if (!cache.has(name)) cache.set(name, ref ? execFileSync('git', ['show', `${ref}:${name}`], { cwd: directory, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }) : await readFile(resolve(directory, name)));
    return cache.get(name);
  };
  const sources = {};
  for (const name of ['main.js','shaders.js','newlayers.js','post.js','graphics.js','newscore.js','choreography.js','public/track-analysis.json']) {
    sources[name] = createHash('sha256').update(await get(name)).digest('hex');
  }
  for (const name of ['flow-bounds.js','shell-bound.js','roof-cache.js','noise-cache.js','roof-angle-cache.js','cloud-volume.js','primary-guide.js','primary-shaders.js','cathedral-miss-certificate.js','window-guide.js']) {
    try { sources[name] = createHash('sha256').update(await get(name)).digest('hex'); }
    catch(error) { if ((await get('main.js')).toString().includes(`'./${name}'`)) throw error; }
  }
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://local').pathname).slice(1) || 'index.html';
      if (path.split('/').includes('..')) throw Error('Invalid path');
      let data;
      try { data = await get(path); } catch { data = await get(`public/${path}`); }
      if (path === 'main.js') data = Buffer.concat([data, Buffer.from(injection)]);
      const type = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.json') ? 'application/json' : path.endsWith('.html') ? 'text/html' : path.endsWith('.ogg') ? 'audio/ogg' : path.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream';
      res.setHeader('Content-Type', type);res.end(data);
    } catch { res.writeHead(404);res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, sources, url: `http://127.0.0.1:${server.address().port}` };
}

function difference(a, b) {
  if (a.length !== b.length) throw Error('Image size mismatch');
  let changed = 0, squared = 0, maximum = 0, overTwo = 0;
  const channels = [0, 0, 0, 0];
  const alphaSamples = [];
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d) {
      changed++;channels[i % 4]++;
      if(i%4===3&&alphaSamples.length<16)alphaSamples.push({x:Math.floor(i/4)%width,yBottom:Math.floor(i/4/width),baseline:a[i],candidate:b[i]});
    }
    squared += d * d;maximum = Math.max(maximum, d);if (d > 2) overTwo++;
  }
  return { changed, maximum, rms: Math.sqrt(squared / a.length), fraction: changed / a.length, overTwo, channels, alphaSamples };
}
async function saveCapture(page, capture, path) {
  const png = await page.evaluate(({encoded,width,height}) => {
    const raw=atob(encoded),pixels=new Uint8ClampedArray(raw.length);
    // readPixels starts at the bottom; PNG canvases start at the top.
    for(let y=0;y<height;y++) for(let x=0;x<width*4;x++)
      pixels[y*width*4+x]=raw.charCodeAt((height-1-y)*width*4+x);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').putImageData(new ImageData(pixels,width,height),0,0);
    return canvas.toDataURL('image/png').split(',')[1];
  }, {encoded:capture.image,width,height});
  await writeFile(path,Buffer.from(png,'base64'));
}
const labels=benchmarkLabels(candidateOnly);
const servers=candidateOnly?[await serve(root,null)]:[await serve(baselineRoot,baselineRef),await serve(root,null)];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--disable-background-timer-throttling'] });
const report = { mode, width, height, motion, pointer, poster, driverOptions: {radeonsiInlineUniforms:process.env.radeonsi_inline_uniforms??null,amdDebug:process.env.AMD_DEBUG??null,mesaShaderCacheDisable:process.env.MESA_SHADER_CACHE_DISABLE??null}, candidateOnly, sides:labels.map((label,side)=>({side,label})), ...(candidateOnly?{}:{baseline: { root: baselineRoot, ref: baselineRef, sources: servers[0].sources }}), candidate: {root,sources:servers.at(-1).sources}, checks: {enabled:check,maxDifference,maxRMS,budget:Number.isFinite(budget)?budget:null}, results: [] };
try {
  const pages = [];
  report.scheduling = {maxQueuedFrames,cooldownMs,wallIncludesCooldown:true};
  for (const { url } of servers) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto(`${url}/?preview`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__film?.ready, null, { timeout: 60000 });
    await page.evaluate(async args => {await document.fonts.ready;window.__profile.configure(...args);}, [width,height,motion,pointer,poster,cooldownMs,pages.length===0&&disableBaselineRoofAngles,pages.length===0&&disableBaselinePrimaryGuide]);
    pages.push(page);
  }
  report.features = [];
  for (const page of pages) report.features.push(await page.evaluate(() => __profile.features()));
  report.renderer = await pages[0].evaluate(() => { const g=__profile.gl,e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER); });
  if (/swiftshader|llvmpipe/i.test(report.renderer)) throw Error(`Hardware GPU required: ${report.renderer}`);
  console.log(JSON.stringify({ mode, width, height, renderer: report.renderer }));
  for (const time of times) {
    const result = { time };
    for (const page of pages) await page.evaluate(async t => {
      await __profile.frame(t);
      if (__film.prepareScene && !await __film.prepareScene(__film.state.world)) throw Error('Scene specialization failed');
    },time);
    Object.assign(result,await pages.at(-1).evaluate(()=>({world:__film.state.world,shot:__film.state.shot,features:__profile.features()})));
    if (mode === 'compare') {
      for (const page of pages) await page.evaluate(() => __profile.reset());
      result.frames = [];
      for (let frame = -2; frame < sequence; frame++) {
        const t = time + frame / 60;
        const captures = [];
        for (const page of pages) captures.push(await page.evaluate(async({t,capture})=>{await __profile.frame(t);return capture?__profile.capture():null;}, {t,capture:frame>=0}));
        if (frame < 0) continue;
        if(saveImages&&frame===0) for(const side of [0,1])
          await saveCapture(pages[side],captures[side],resolve(out,`${time}-${side===0?'baseline':'candidate'}.png`));
        const metrics = { time: t, image: difference(Buffer.from(captures[0].image,'base64'),Buffer.from(captures[1].image,'base64')), base: difference(Buffer.from(captures[0].base,'base64'),Buffer.from(captures[1].base,'base64')), glErrors: captures.map(x=>x.glError) };
        result.frames.push(metrics);
      }
      console.log(JSON.stringify({time, maximum:Math.max(...result.frames.map(f=>f.image.maximum)), rms:Math.max(...result.frames.map(f=>f.image.rms)), depthChanges:Math.max(...result.frames.map(f=>f.base.channels[3]))}));
    } else if (mode === 'bench') {
      result.samples = [];
      for (let block = 0; block < blocks; block++) {
        for (const side of benchmarkSideOrder(block,pages.length)) {
          const page = pages[side];
          await page.evaluate(async t=>{__profile.reset();for(let i=0;i<4;i++)await __profile.frame(t+i/60);},time-4/60);
          result.samples.push({ side, label:labels[side], block, ...await page.evaluate(([t,n,q,c])=>__profile.timing(t,n,q,c),[time,batch,maxQueuedFrames,cooldownMs]) });
        }
      }
      result.summary=summarizeBenchmark(result.samples,labels,maxQueuedFrames);
      if(result.summary.length===2) result.gpuReductionPercent=100*(1-result.summary[1].gpuMs/result.summary[0].gpuMs);
      console.log(JSON.stringify({time, summary:result.summary, gpuReductionPercent:result.gpuReductionPercent}));
    } else throw Error('Mode must be compare or bench');
    report.results.push(result);
    await writeFile(resolve(out, `${mode}-${width}.json`),JSON.stringify(report,null,2));
  }
  if (check) {
    const failures = report.results.filter(result => mode === 'compare'
      ? result.frames.some(f => f.glErrors.some(Boolean) || f.base.channels[3] !== 0 || f.image.maximum > maxDifference || f.image.rms > maxRMS)
      : result.samples.some(s => s.disjoint || s.glError) || result.summary.at(-1).gpuMs > budget);
    if (failures.length) throw Error(`Render checks failed at ${failures.map(x=>x.time).join(', ')}; see ${out}`);
  }
} finally { await browser.close();for (const {server} of servers) server.close(); }
