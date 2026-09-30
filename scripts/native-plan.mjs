import { flowBoundValidity } from '../flow-bounds.js';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { vertexShader, fragmentShader, templeMotionMetrics } from '../shaders.js';
import { SecondaryLayers } from '../newlayers.js';
import { Compositor } from '../post.js';
import { createFilmScore } from '../newscore.js';
import { recordingGL } from './native-gl.mjs';
import { filmSVG } from './native-graphics.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((value,index,all) => value.startsWith('--') ? [[value.slice(2),all[index+1]?.startsWith('--') ? true : all[index+1] ?? true]] : []));
const width=Number(args.width||480),height=Number(args.height||270);
const output=resolve(args.output||'artifacts/native-qa/trace.jsonl');
const analysis=JSON.parse(await readFile('public/track-analysis.json','utf8'));
const score=createFilmScore(analysis);
const hash=source=>createHash('sha256').update(source).digest('hex');
await mkdir(dirname(output),{recursive:true});

// Cue/role checks run in pure JS even when browser launch is unavailable.
function assertFrame(time,scene=null){
  const result=score.at(time,scene===null?{}:{scene});
  for(const values of Object.values(result.frame).filter(Array.isArray))for(const value of values)assert.ok(Number.isFinite(value),`Finite score vector at${time}`);
  assert.deepEqual(score.at(time,scene===null?{}:{scene}),result,'Score is seek deterministic');
  return result.frame;
}
const {rupture,sentinel,arcade,arcadeEnd,reentry,swimmerEnter,swimmerExit}=score.cues;
assert.equal(assertFrame(sentinel-.001).catCount,0);
assert.equal(assertFrame(sentinel+.001).catRole,'sentinel');
assert.equal(assertFrame(rupture-.001).catRole,'sentinel');
assert.equal(assertFrame(rupture).catCount,0,'Sentinel gone exactly on rupture');
assert.equal(assertFrame(rupture+.3).scene,3);
assert.equal(assertFrame(rupture-1).event[2],0);
assert.equal(assertFrame(rupture+4.8).event[2],1);
assert.equal(assertFrame(169).event[2],1,'Sky remains open after seek');
const templeEnd=score.chapters[3].end;
assert.equal(assertFrame(templeEnd-.001).scene,3,'LS04 remains until its musical cut');
assert.equal(assertFrame(templeEnd).scene,4,'LS05 begins exactly on its musical cut');
assert.equal(templeMotionMetrics.chapterCutTime,templeEnd,'Motion audit uses the production chapter end');
assert.equal(templeMotionMetrics.ruptureTime,rupture,'Motion audit uses the production rupture cue');
assert.equal(assertFrame(arcade+.001).catRole,'runner');
assert.equal(assertFrame(arcade+3.999).catCount,1);
assert.equal(assertFrame(arcade+4).catCount,0,'Runner exits exactly after four seconds');
assert.equal(assertFrame(arcadeEnd+.001).catCount,0);
assert.ok(Number.isFinite(swimmerEnter)&&Number.isFinite(swimmerExit)&&swimmerEnter<swimmerExit,'Finale swimming interval is defined');
assert.equal(swimmerEnter,analysis.orders.find(order=>order.order===78).time,'Swimming begins at its musical entrance');
assert.equal(swimmerExit,analysis.orders.find(order=>order.order===83).time,'Swimming resolves at its musical exit');
assert.ok(swimmerExit<analysis.duration-5.3,'Swimmer resolves before the closing title');
const castingWindows=[
  {role:'sentinel',scene:3,start:sentinel,end:rupture},
  {role:'runner',scene:10,start:arcade,end:arcade+4},
  {role:'swimmer',scene:6,start:swimmerEnter,end:swimmerExit},
];
function assertCasting(time){
  const frame=assertFrame(time),casting=castingWindows.find(window=>time>=window.start&&time<window.end);
  assert.equal(frame.catRole,casting?.role??'none',`Only an intended cat role at${time}`);
  assert.equal(frame.catCount,casting?1:0,`One performer within its intended interval at${time}`);
  assert.equal(frame.catsEnabled,Boolean(casting),`Casting enablement matches role at${time}`);
  if(casting)assert.equal(frame.scene,casting.scene,`Performer belongs to its intended world at${time}`);
  return frame;
}
for(const {start,end} of castingWindows)for(const time of [start-.001,start,start+.001,end-.001,end,end+.001])assertCasting(time);
assert.equal(score.at(swimmerEnter+.2,{poster:true}).frame.catCount,0,'Poster does not cast a finale performer');
const ls03Start=score.chapters[2].time,ls03End=score.chapters[2].end;
let lastDrive=-1,lastProgress=-1;
for(let time=ls03Start;time<ls03End;time+=.5){
  const frame=assertFrame(time);assert.equal(frame.scene,2);assert.equal(frame.catCount,0,'LS03 has no cats');
  assert.ok(frame.event[2]>=lastDrive&&frame.event[3]>=lastProgress,'LS03 acceleration/progress advances through its passage');
  assert.ok(frame.event[2]>=0&&frame.event[2]<=1&&frame.event[3]>=0&&frame.event[3]<=1,'LS03 drivers remain bounded');
  [lastDrive,lastProgress]=[frame.event[2],frame.event[3]];
}
assert.equal(assertFrame(ls03Start).event[3],0,'LS03 starts at its entrance');
assert.ok(assertFrame(ls03End-.001).event[3]>.99,'LS03 reaches its exit rather than restarting');
const ls03DriveSpan=assertFrame(ls03End-2).event[2]-assertFrame(ls03Start+2).event[2];
assert.ok(ls03DriveSpan>.5,'LS03 has a substantial progressive acceleration envelope');
for(let time=136.2;time<170;time+=.5)assert.equal(assertFrame(time).scene,3,'Temple event has continuous architecture');
let catSamples=0,totalSamples=0;
for(let time=0;time<analysis.duration;time+=.25){catSamples+=assertCasting(time).catCount;totalSamples++;}
// LS03 is intentionally allowed to evolve. Verify its casting/score behavior,
// not equality to old shader blocks. Casting windows are checked independently
// of how much of the film they occupy; the finale can sustain a swimming role.
const verification={cues:score.cues,castingWindows,secondaryCatTimeFraction:catSamples/totalSamples,ls03CatFree:true,ls03ProgressiveDrive:true,ls03DriveSpan,seekDeterministic:true,templeMotion:templeMotionMetrics};
await writeFile(resolve(dirname(output),'source-report.json'),JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify({sourceChecks:verification}));
if(args['source-only'])process.exit(0);

let times;
if(args.times)times=String(args.times).split(',').map(Number);
else if(args.fps){const fps=Number(args.fps),start=Number(args.start||0),end=Number(args.end||analysis.duration);times=Array.from({length:Math.ceil((end-start)*fps)},(_,i)=>start+i/fps);}
else times=[144,149.65,150.1,152,156.65,195,198.1];
const scoreOptions={motion:Number(args.motion??1)};
if(args.scene!==undefined)scoreOptions.scene=Number(args.scene);
const gl=recordingGL(width,height);
const shader=(type,source)=>{const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);return result;};
const program=gl.createProgram(),v=shader(gl.VERTEX_SHADER,vertexShader),f=shader(gl.FRAGMENT_SHADER,fragmentShader);
gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
const vao=gl.createVertexArray();gl.bindVertexArray(vao);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const attribute=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
const uniforms=[...fragmentShader.matchAll(/uniform\s+(\w+)\s+(u_\w+)\s*;/g)].map(([,type,name])=>({type,name:name.slice(2),location:gl.getUniformLocation(program,name)}));
const layers=new SecondaryLayers(gl),post=new Compositor(gl);layers.resize(width,height);post.resize(width,height);
const sourceHashes=Object.fromEntries(await Promise.all(['shaders.js','flow-bounds.js','newlayers.js','post.js','newscore.js','choreography.js','graphics.js','scripts/native-graphics.mjs','scripts/native-overlay.py'].map(async file=>[file,hash(await readFile(file))])));
const file=await open(output,'w');
await file.write(JSON.stringify({type:'init',width,height,sourceHashes,commands:gl.commands})+'\n');
for(const time of times){
  gl.commands=[];
  const descriptor=score.at(time,scoreOptions),{frame}=descriptor;
  const overlay=args['no-overlay']?null:filmSVG(analysis,descriptor,width,height);
  post.begin();gl.useProgram(program);gl.bindVertexArray(vao);
  const values={...frame,resolution:[width,height],flowBoundValid:flowBoundValidity(frame)};
  for(const {type,name,location} of uniforms){
    const value=values[name];assert.notEqual(value,undefined,`Native frame supplies u_${name}`);
    if(type==='float')gl.uniform1f(location,Number(value));
    else if(type==='vec2')gl.uniform2fv(location,value);
    else if(type==='vec4')gl.uniform4fv(location,value);
    else throw Error(`Unimplemented base uniform type:${type}`);
  }
  gl.drawArrays(gl.TRIANGLES,0,3);
  frame.depthTexture=post.captureDepth();frame.depthScale=40;layers.renderForCompositor(frame);post.finish(frame);
  const {depthTexture,...state}=frame;
  await file.write(JSON.stringify({type:'frame',time,name:`frame-${time.toFixed(3)}.png`,capture:!args['no-png'],state,overlay,commands:gl.commands})+'\n');
}
await file.close();
console.log(JSON.stringify({trace:output,frames:times.length,width,height,cues:{rupture,reentry,arcade,arcadeEnd}}));
