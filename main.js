import { NoiseCache } from './noise-cache.js';
import { flowBoundValidity } from './flow-bounds.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { SecondaryLayers } from './newlayers.js';
import { Compositor } from './post.js';
import { chapterSpecs, createFilmScore } from './newscore.js';
import { drawFilmGraphics } from './graphics.js';

const $ = (id) => document.getElementById(id);
const audio = $('audio');
const world = $('world');
const film = $('film');
const ink = film.getContext('2d', { alpha: true });
const params = new URLSearchParams(location.search);
const previewMode = params.has('preview');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const qualities = [{ name: 'HQ', scale: 1, max: 1920 }, { name: 'ULTRA', scale: 1.4, max: 2560 }, { name: 'ECO', scale: .65, max: 1100 }];
const state = { ready: false, started: false, playing: false, quality: 0, pointer: [0, 0], smoothPointer: [0, 0], motion: reducedMotion.matches ? .2 : 1, width: innerWidth, height: innerHeight, scene: -1, lastTime: 0, lastActive: performance.now(), energy: [0, 0, 0, 0], record: null, recordStart: 0, previewTime: 0 };
let analysis, score, chapters = [], audioContext, analyser, audioSource, audioDestination, frequencyData, recorder, gl, program, locations, fullVAO, secondaryLayers, compositor, noiseCache, lastFrame = 0, fps = 60, toastTimer;
const resources = [];
let exportResolution = null;

function timecode(t) { const s = Math.max(0, Math.floor(t || 0)); return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`; }
const clamp = (x, min = 0, max = 1) => Math.max(min, Math.min(max, x));
function lowerIndex(items, t, key = null) { let lo = 0, hi = items.length; while (lo < hi) { const mid = (lo + hi) >> 1; if ((key ? items[mid][key] : items[mid]) <= t) lo = mid + 1; else hi = mid; } return Math.max(0, lo - 1); }
function notify(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2800); }
function fail(message) { $('error-message').textContent = message; $('error').hidden = false; }

function createRenderer() {
  gl = world.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) throw new Error('This film needs WebGL 2. Open it in a recent Chrome, Firefox, Edge, or Safari browser.');
  const compile = (source, type) => {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(`Could not compile the visual engine: ${log}`); }
    resources.push(shader); return shader;
  };
  program = gl.createProgram(); gl.attachShader(program, compile(vertexShader, gl.VERTEX_SHADER)); gl.attachShader(program, compile(fragmentShader, gl.FRAGMENT_SHADER)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  fullVAO=gl.createVertexArray();gl.bindVertexArray(fullVAO);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  locations = Object.fromEntries(['resolution', 'time', 'scene', 'local', 'energy', 'beat', 'motion', 'pointer', 'seed', 'poster','shot','density','event','audio','flowBoundValid','noiseCache','noiseCacheValid'].map((name) => [name, gl.getUniformLocation(program, `u_${name}`)]));
  secondaryLayers=new SecondaryLayers(gl);compositor=new Compositor(gl);noiseCache=new NoiseCache(gl);
  resize();
}

function resize() {
  state.width = exportResolution?.width ?? innerWidth; state.height = exportResolution?.height ?? innerHeight;
  const quality = qualities[state.quality];
  const scale = Math.min(devicePixelRatio, 1.4) * quality.scale;
  const ratio = Math.min(scale, quality.max / innerWidth);
  world.width = exportResolution?.width ?? Math.max(1, Math.round(innerWidth * ratio)); world.height = exportResolution?.height ?? Math.max(1, Math.round(innerHeight * ratio));
  const inkScale = exportResolution ? 1 : Math.min(devicePixelRatio, 2);
  film.width = Math.round(state.width * inkScale); film.height = Math.round(state.height * inkScale);
  ink.setTransform(inkScale, 0, 0, inkScale, 0, 0);
  if (gl) gl.viewport(0, 0, world.width, world.height);
  secondaryLayers?.resize(world.width,world.height);compositor?.resize(world.width,world.height);
  if (state.record && state.record.canvas) { /* Capture dimensions stay fixed during a recording. */ }
}

function setupChapters() {
  score = createFilmScore(analysis); chapters = score.chapters;
  $('chapter-track').replaceChildren(); $('chapter-list').replaceChildren();
  for (const chapter of chapters) {
    const button = document.createElement('button'); button.className = 'chapter-segment'; button.style.flex = `${chapter.end - chapter.time}`; button.setAttribute('aria-label', `Jump to ${chapter.name}, ${timecode(chapter.time)}`); button.title = `${String(chapter.index + 1).padStart(2, '0')} — ${chapter.name}`; button.innerHTML = `<span>${String(chapter.index + 1).padStart(2, '0')}</span>`; button.addEventListener('click', () => jump(chapter.time)); $('chapter-track').append(button);
    const item = document.createElement('button'); item.className = 'chapter-item'; item.innerHTML = `<span class="chapter-number">${String(chapter.index + 1).padStart(2, '0')}</span><span class="chapter-name">${chapter.name}<small>${chapter.line}</small></span><span class="chapter-time">${timecode(chapter.time)}</span>`; item.addEventListener('click', () => { jump(chapter.time); toggleChapters(false); }); $('chapter-list').append(item);
  }
  $('total').textContent = timecode(analysis.duration); $('duration-label').textContent = timecode(analysis.duration); $('seek').max = analysis.duration;
}

async function load() {
  try {
    createRenderer();
    const response = await fetch('/track-analysis.json'); if (!response.ok) throw new Error('The audio analysis could not be loaded. Run npm run audio:prepare, then reload.');
    analysis = await response.json(); setupChapters();
    await new Promise((resolve, reject) => { if (audio.readyState >= 2) resolve(); else { audio.addEventListener('loadeddata', resolve, { once: true }); audio.addEventListener('error', () => reject(new Error('The music could not be loaded. Run npm run audio:prepare, then reload.')), { once: true }); audio.load(); } });
    state.ready = true; $('enter').disabled = false; $('enter-label').textContent = 'ENTER THE TRANSMISSION'; $('enter-detail').textContent = `${timecode(analysis.duration)} · Headphones recommended`;
    if (previewMode) { document.body.classList.add('preview-mode', 'started'); state.started = true; state.previewTime = Number(params.get('t') || 0); }
  } catch (error) { console.error(error); fail(error.message); }
}

async function connectAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createMediaElementSource(audio); analyser = audioContext.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .68;
    audioDestination = audioContext.createMediaStreamDestination(); audioSource.connect(analyser); analyser.connect(audioContext.destination); analyser.connect(audioDestination); frequencyData = new Uint8Array(analyser.frequencyBinCount);
  }
  if (audioContext.state === 'suspended') await audioContext.resume();
}

async function play() {
  if (!state.ready) return;
  try {
    const firstEntry = !state.started;
    await connectAudio(); if (audio.currentTime >= analysis.duration - .05) audio.currentTime = 0;
    await audio.play(); state.started = true; document.querySelector('.landing').inert = true; document.body.classList.add('started'); if (firstEntry) $('play').focus({ preventScroll: true }); activity();
  } catch (error) { notify(`Playback couldn't start: ${error.message}`); }
}
function setPlaying(playing) {
  state.playing = playing; document.body.classList.toggle('playing', playing);
  $('play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  $('play').innerHTML = playing ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>';
  if (!playing) document.body.classList.remove('ui-hidden');
}
function togglePlay() { if (!state.ready) return; if (state.playing) audio.pause(); else play(); }
function jump(time) { if (!state.ready) return; audio.currentTime = clamp(time, 0, analysis.duration); if (!state.started) play(); activity(); }
function activity() { state.lastActive = performance.now(); document.body.classList.remove('ui-hidden'); }
function toggleChapters(force) { const open = force ?? !$('chapters').classList.contains('open'); $('chapters').classList.toggle('open', open); $('chapters').inert = !open; $('chapters-button').setAttribute('aria-expanded', String(open)); activity(); }
function mute() { audio.muted = !audio.muted; document.body.classList.toggle('muted', audio.muted); $('sound-label').textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON'; $('sound-toggle').setAttribute('aria-label', audio.muted ? 'Unmute audio' : 'Mute audio'); activity(); }
async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('app').requestFullscreen(); } catch { notify('Fullscreen is unavailable in this browser.'); } activity(); }
function quality() { state.quality = (state.quality + 1) % qualities.length; $('quality').textContent = qualities[state.quality].name; $('quality').setAttribute('aria-label', `Render quality: ${qualities[state.quality].name}`); resize(); notify(`${qualities[state.quality].name} render quality`); }

function getMusic(t, dt) {
  if (!score || !state.started) return {energy:[.22,.3,.16,.22],beat:.2,order:0,row:0,phrase:0,onset:0,kick:0,impact:0,pulsePhase:0,beatIndex:0};
  const music=score.musicAt(t),targets=music.energy;
  for(let i=0;i<4;i++){const speed=targets[i]>state.energy[i]?24:8;state.energy[i]+=(targets[i]-state.energy[i])*(1-Math.exp(-dt*speed));}
  return {...music,energy:state.energy};
}

function drawGraphic(t,chapter,music,frame){
  drawFilmGraphics(ink,{t,chapter,music,frame,analysis,width:state.width,height:state.height,started:state.started,motion:state.motion});
}

function render(now = performance.now(), forcedTime = null) {
  if (state.offline && forcedTime === null) return;
  const dt = Math.min(.1, Math.max(.001, (now - lastFrame) / 1000 || .016)); lastFrame = now; fps += (1/dt - fps) * .035;
  if (gl && program && secondaryLayers && compositor) {
    const t = forcedTime ?? (previewMode ? state.previewTime : state.started ? audio.currentTime : 10 + now * .00028);
    const chapter = analysis ? chapters[lowerIndex(chapters, state.started ? t : 0, 'time')] : { ...chapterSpecs[0], index: 0, time: 0, end: 27 };
    const music = getMusic(t,dt);
    const local = state.started ? clamp((t-chapter.time)/(chapter.end-chapter.time)) : .35;
    state.smoothPointer.forEach((value,i) => state.smoothPointer[i] += (state.pointer[i]-value)*Math.min(1,dt*2));
    const scored=score?.at(t,{poster:!state.started,motion:state.motion,pointer:state.smoothPointer,scene:state.forcedWorld});
    const frame=scored?.frame??{time:t,scene:9,shot:0,local,energy:music.energy,beat:music.beat,motion:state.motion,pointer:state.smoothPointer,poster:1,density:.56,cutAge:10,event:[0,-1,0,0],audio:[0,0,0,0],catRole:'none',catsEnabled:false,catCount:0,seed:2};
    frame.energy=music.energy;
    const scene=frame.scene;
    compositor.begin();
    gl.useProgram(program);gl.bindVertexArray(fullVAO);noiseCache.bind(locations,frame);
    gl.uniform2f(locations.resolution,world.width,world.height); gl.uniform1f(locations.time,t); gl.uniform1f(locations.scene,scene); gl.uniform1f(locations.local,frame.local); gl.uniform4fv(locations.energy,music.energy); gl.uniform1f(locations.beat,frame.beat); gl.uniform1f(locations.motion,state.motion); gl.uniform2fv(locations.pointer,state.smoothPointer); gl.uniform1f(locations.seed,frame.seed); gl.uniform1f(locations.poster,frame.poster);gl.uniform1f(locations.shot,frame.shot);gl.uniform1f(locations.density,frame.density);gl.uniform1f(locations.flowBoundValid,flowBoundValidity({time:t,scene,motion:state.motion,beat:frame.beat,pointer:state.smoothPointer}));gl.uniform4fv(locations.event,frame.event);gl.uniform4fv(locations.audio,frame.audio); gl.drawArrays(gl.TRIANGLES,0,3);
    frame.depthTexture=compositor.captureDepth();frame.depthScale=40;
    secondaryLayers.renderForCompositor(frame);compositor.finish(frame);
    state.world=scene;state.shot=frame.shot;state.event=frame.event;state.catRole=frame.catRole;state.catCount=frame.catCount;
    drawGraphic(t,chapter,music,frame);
    if (state.record) {
      const ctx=state.record.context; ctx.drawImage(world,0,0,state.record.canvas.width,state.record.canvas.height); ctx.drawImage(film,0,0,state.record.canvas.width,state.record.canvas.height);
      $('record-time').textContent=timecode((now-state.recordStart)/1000);
    }
    if (state.scene !== chapter.index) { state.scene = chapter.index; $('current-act').textContent=`${String(chapter.index+1).padStart(2,'0')} — ${chapter.name.toUpperCase()}`; document.querySelectorAll('.chapter-segment,.chapter-item').forEach((button) => { const children=Array.from(button.parentElement.children); button.classList.toggle('active',children.indexOf(button) === chapter.index); }); }
    $('elapsed').textContent=timecode(state.started?t:0); $('seek').value=state.started?t:0; $('seek').style.setProperty('--progress', `${state.started ? 100*t/(analysis?.duration||289) : 0}%`);
    if (state.playing && now-state.lastActive>3000 && !$('chapters').classList.contains('open') && !state.record) document.body.classList.add('ui-hidden');
    state.lastTime=t;
  }
  if (forcedTime === null) requestAnimationFrame(render);
}

async function startRecording() {
  if (state.record) { stopRecording(); return; }
  if (!state.ready) return;
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { notify('Video recording is unavailable in this browser.'); return; }
  try {
    await connectAudio();
    const capture = document.createElement('canvas'); capture.width=Math.min(1920, Math.round(innerWidth*devicePixelRatio/2)*2); capture.height=Math.round(capture.width*innerHeight/innerWidth/2)*2;
    const context=capture.getContext('2d',{alpha:false});
    context.drawImage(world,0,0,capture.width,capture.height);context.drawImage(film,0,0,capture.width,capture.height);
    const stream=capture.captureStream(30);
    for(const track of audioDestination.stream.getAudioTracks()) stream.addTrack(track.clone());
    const type=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find((type)=>MediaRecorder.isTypeSupported(type)); if(!type) throw new Error('No supported video encoder');
    recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:10000000,audioBitsPerSecond:192000});
    const chunks=[]; recorder.ondataavailable=(event)=>{if(event.data.size)chunks.push(event.data);};
    recorder.onstop=()=>{
      const blob=new Blob(chunks,{type}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`la-sirena-${timecode(state.recordFrom).replace(':','-')}.${type.includes('mp4')?'mp4':'webm'}`; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
      stream.getTracks().forEach((track)=>track.stop()); state.record=null; $('record-status').hidden=true; $('record').classList.remove('active'); $('record').setAttribute('aria-label','Record video from current position'); notify('Your film has been saved.');
    };
    recorder.onerror=(event)=>{console.error(event);notify('The recording stopped unexpectedly.');stopRecording();};
    state.record={canvas:capture,context,stream}; state.recordFrom=audio.currentTime; state.recordStart=performance.now();
    recorder.start(1000); $('record-status').hidden=false; $('record').classList.add('active'); $('record').setAttribute('aria-label','Stop recording and save video');
    if (audio.paused || audio.ended) await play(); notify('Recording picture + sound. Stop to save the film.');
  } catch(error){ console.error(error); state.record=null; notify(`Recording couldn't start: ${error.message}`); }
}
function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();}

$('enter').addEventListener('click',play); $('play').addEventListener('click',togglePlay); $('sound-toggle').addEventListener('click',mute); $('fullscreen').addEventListener('click',fullscreen); $('quality').addEventListener('click',quality); $('chapters-button').addEventListener('click',()=>toggleChapters()); $('close-chapters').addEventListener('click',()=>toggleChapters(false)); $('record').addEventListener('click',startRecording); $('stop-record').addEventListener('click',stopRecording); $('retry').addEventListener('click',()=>location.reload());
$('seek').addEventListener('input',(event)=>jump(Number(event.target.value)));
$('seek').addEventListener('pointermove',(event)=>{const rect=event.target.getBoundingClientRect();const fraction=clamp((event.clientX-rect.left)/rect.width);$('seek-tooltip').textContent=timecode(fraction*(analysis?.duration||289));$('seek-tooltip').style.left=`${fraction*100}%`;});
document.querySelector('.wordmark').addEventListener('click',(event)=>{event.preventDefault();if(state.started){audio.pause();audio.currentTime=0;state.started=false;document.querySelector('.landing').inert=false;document.body.classList.remove('started','ui-hidden');state.scene=-1;toggleChapters(false);stopRecording();}});
audio.addEventListener('play',()=>setPlaying(true)); audio.addEventListener('pause',()=>{setPlaying(false);if(recorder?.state==='recording')recorder.pause();}); audio.addEventListener('play',()=>{if(recorder?.state==='paused')recorder.resume();}); audio.addEventListener('ended',()=>{setPlaying(false);stopRecording();notify('Transmission complete. Press Space to return to the abyss.');});
audio.addEventListener('waiting',()=>{if(state.started)notify('Buffering the signal…');});
window.addEventListener('resize',resize); document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');resize();});
document.addEventListener('pointermove',(event)=>{activity();state.pointer=[event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2];});document.addEventListener('pointerdown',activity);document.addEventListener('focusin',activity);
document.addEventListener('keydown',(event)=>{
  if(event.target.matches('input')){if(event.key==='Escape')toggleChapters(false);return;}
  if(event.code==='Space' && event.target.matches('button,a'))return;
  if(['Space','ArrowLeft','ArrowRight','KeyF','KeyM','KeyC','KeyR','KeyV'].includes(event.code))event.preventDefault();
  if(event.code==='Space')togglePlay();if(event.code==='ArrowLeft')jump(audio.currentTime-5);if(event.code==='ArrowRight')jump(audio.currentTime+5);if(event.code==='KeyF')fullscreen();if(event.code==='KeyM')mute();if(event.code==='KeyC')toggleChapters();if(event.code==='KeyR')startRecording();if(event.code==='KeyV'){state.motion=state.motion<.5?1:.2;notify(state.motion<.5?'Motion softened':'Full motion');}if(event.key==='Escape')toggleChapters(false);activity();
});
reducedMotion.addEventListener('change',(event)=>{state.motion=event.matches?.2:1;});
world.addEventListener('webglcontextlost',(event)=>{event.preventDefault();audio.pause();fail('The graphics context was lost. Reload to reconnect the signal.');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing&&!state.record)audio.pause();});
$('app').addEventListener('dblclick',(event)=>{if(event.target.id==='app')fullscreen();});

// Deterministic rendering hooks for visual QA and offline frame export.
window.__film = {
  get ready(){return state.ready;}, get state(){return{time:audio.currentTime,playing:state.playing,scene:state.scene,world:state.world,shot:state.shot,event:state.event,catRole:state.catRole,catCount:state.catCount,fps,width:world.width,height:world.height,motion:state.motion};},
  // Offline dimensions bypass the interactive quality cap, so a 4K export
  // shades all 4K pixels and draws the graphic layer at the same resolution.
  setExportResolution(width, height){
    if (!state.ready || !gl) throw new Error('The film renderer is not ready.');
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error('Export dimensions must be positive integers.');
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE), maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    if (width > maxTexture || height > maxTexture || width > maxViewport[0] || height > maxViewport[1]) throw new Error('Export dimensions exceed the GPU render limits.');
    exportResolution = {width, height}; state.offline = true; resize();
    if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) throw new Error('The GPU could not allocate the requested export resolution.');
    return {width:world.width, height:world.height};
  },
  get cues(){return score?.cues;},
  get chapters(){return chapters.map(({time,end,name,world})=>({time,end,name,world}));},
  seek:jump, play, pause:()=>audio.pause(), record:startRecording, stopRecording,
  frame(t,scene=null){state.started=true;state.forcedWorld=scene;document.body.classList.add('started','preview-mode');state.previewTime=t;render(performance.now(),t);return true;},
  pixels(){const data=new Uint8Array(4*world.width*world.height);gl.readPixels(0,0,world.width,world.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return{width:world.width,height:world.height,pixels:Array.from(data)};},
  snapshot(){render(performance.now(),state.lastTime);const canvas=document.createElement('canvas');canvas.width=world.width;canvas.height=world.height;const ctx=canvas.getContext('2d');ctx.drawImage(world,0,0,canvas.width,canvas.height);ctx.drawImage(film,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');},
  exportFrame(t, scene = null, format = 'image/png'){state.offline=true;state.started=true;state.forcedWorld=scene;state.previewTime=t;document.body.classList.add('started','preview-mode');const i=clamp(Math.floor(t*analysis.analysis.fps),0,analysis.analysis.bands.energy.length-1);const b=analysis.analysis.bands;state.energy=[b.bass[i],b.mid[i],b.treble[i],b.energy[i]];render(performance.now(),t);const canvas=document.createElement('canvas');canvas.width=world.width;canvas.height=world.height;const ctx=canvas.getContext('2d');ctx.drawImage(world,0,0,canvas.width,canvas.height);ctx.drawImage(film,0,0,canvas.width,canvas.height);return canvas.toDataURL(format,.97);},
};
load(); requestAnimationFrame(render);
