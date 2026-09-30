// CPU-only source, eligibility and resource-contract checks.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PrimaryGuide, primaryGuideEligible, primaryGuideMinimumHeight } from '../primary-guide.js';
import { vertexShader, fragmentShader, cloudVolumeFragment } from '../shaders.js';
import { primaryWorldFragment, primaryGuideFragment, createPrimaryWorld } from '../primary-shaders.js';
import { recordingGL } from './native-gl.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
// Frozen production sources and GPU-tested flow guide candidate 65628ba.
assert.equal(hash(fragmentShader),'a31920e663dba1a881e97204a014e837cd5167dbf0d478ba369e432ef648bb2e');
assert.equal(hash(cloudVolumeFragment),'5b388d9b4fddc09da651d7cccd43a124c6ebca2544fb42774f441d459f61bf1b');
assert.equal(hash(primaryWorldFragment),'2751ef15176f20913e1185ecc2717887cebd6360f943e957e9dde8f763c9ab8a');
assert.equal(hash(primaryGuideFragment),'2a586ac8d0d8246a4310f494df46a6ce16024d9ea92d3de5d1b7155937e247c1');
assert(primaryGuideFragment.includes('gl_FragCoord.xy*u_resolution/u_primaryGuideResolution'));
assert(primaryGuideFragment.includes('for(int i=0;i<76;i++)'));
assert(primaryGuideFragment.includes('if(i>=60&&scene!=1) break;'));
assert(primaryGuideFragment.includes('if(scene==1) d=abs(d);'));
assert(primaryGuideFragment.includes('scene==1?.0013:.00075'));
assert(primaryGuideFragment.includes('scene==1||windowGuideClear'));
assert(primaryGuideFragment.includes('guideRay(uv,int(u_scene+.5))'));
const frame={scene:3,time:160,motion:1,beat:0,pointer:[0,0],event:[23.9,10.29,1,0],audio:[0,0,0,0],energy:[0,0,0,0],local:.7,seed:0,poster:0,shot:0,density:1};
const flowFrame={...frame,scene:1,time:35};
assert(primaryGuideEligible(flowFrame,1440));
assert(primaryGuideEligible({...flowFrame,time:58},2160));
for(const change of [{time:34.020-1e-8},{time:81.655},{scene:2},{poster:1},{shot:Infinity},{seed:NaN},{motion:NaN},{beat:1.01},{pointer:[0,1.01]},{density:-.01}])assert(!primaryGuideEligible({...flowFrame,...change},2160));
assert(primaryGuideEligible(frame,1440));assert(primaryGuideEligible({...frame,time:156.515},1440));
assert(primaryGuideEligible({...frame,time:151,event:[14.9,1.29,.1776171875,0]},1440));
assert(primaryGuideEligible({...frame,time:152,event:[15.9,2.29,.4648775674,0]},2160));
assert(!primaryGuideEligible({...frame,time:150.99999},2160));
assert(!primaryGuideEligible(frame,1439));assert.equal(primaryGuideMinimumHeight,1440);
for(const change of [{scene:1},{time:151-1e-8},{time:170.126},{event:[0,0,0,0]},{event:[NaN,0,1,0]},{motion:1.01},{beat:-.01},{pointer:[1.01,0]},{poster:1},{density:NaN},{density:1.01},{shot:Infinity}])assert(!primaryGuideEligible({...frame,...change},2160));
function mock(failure){
 const gl=recordingGL(2561,1441);gl.NO_ERROR=0;gl.RGBA32F=34836;
 if(failure!=='no-api')gl.getExtension=()=>{if(failure==='extension')throw Error('No extension');return failure==='unsupported'?null:{};};
 gl.getShaderParameter=()=>failure!=='compile';gl.getProgramParameter=()=>failure!=='link';gl.getError=()=>failure==='draw'?1282:0;
 gl.checkFramebufferStatus=()=>failure==='attachment'?36054:gl.FRAMEBUFFER_COMPLETE;
 return gl;
}
for(const failure of ['no-api','unsupported','extension','compile','link','attachment','draw',null]){
 const gl=mock(failure),cache=new PrimaryGuide(gl),program=gl.createProgram(),vao=gl.createVertexArray(),noise={bind(){}};
 const locations={primaryGuide:gl.getUniformLocation(program,'u_primaryGuide'),primaryGuideValid:gl.getUniformLocation(program,'u_primaryGuideValid')};
 cache.render(frame,2561,1441,vao,noise);cache.bind(locations,frame);
 const last=()=>gl.commands.filter(c=>c.op==='uniform1f'&&c.args[0].name==='u_primaryGuideValid').at(-1)?.args[1];
 assert.equal(cache.valid,failure===null);assert.equal(last(),failure===null?1:0);
 assert(gl.commands.some(c=>c.op==='texImage2D'&&c.args[3]===1&&c.args[4]===1));
 if(failure===null){
  const upload=gl.commands.find(c=>c.op==='texImage2D'&&c.args[3]===641&&c.args[4]===361);
  assert.equal(upload.args[2],gl.RGBA32F);assert.equal(upload.args[7],gl.FLOAT);
  assert.equal(cache.width,641);assert.equal(cache.height,361);
  const draws=gl.commands.filter(c=>c.op==='drawArrays').length;
  for(const [next,height]of [[{...frame,time:136.1,event:[0,0,0,0]},1441],[frame,1439],[{...frame,scene:1},1441]]){
   cache.render(next,2561,height,vao,noise);cache.bind(locations,next);assert.equal(cache.valid,false);assert.equal(last(),0);
   assert.equal(gl.commands.filter(c=>c.op==='drawArrays').length,draws,'Ineligible frames cannot submit guide work or reuse stale validity');
  }
  cache.render(flowFrame,2561,1441,vao,noise);cache.bind(locations,flowFrame);
  assert.equal(cache.valid,true);assert.equal(last(),1);
  assert.equal(gl.commands.filter(c=>c.op==='uniform1f'&&c.args[0].name==='u_flowBoundValid').at(-1)?.args[1],1);
  cache.render({...flowFrame,time:81.655},2561,1441,vao,noise);cache.bind(locations,{...flowFrame,time:81.655});assert.equal(cache.valid,false);assert.equal(last(),0);
  cache.render(frame,2561,1441,vao,noise);assert.equal(cache.valid,true);
  const beforePortrait=gl.commands.filter(c=>c.op==='drawArrays').length;
  cache.render(frame,1440,2560,vao,noise);cache.bind(locations,frame);
  assert.equal(cache.valid,false);assert.equal(last(),0);
  assert.equal(gl.commands.filter(c=>c.op==='drawArrays').length,beforePortrait,'Portrait transition selects the original pipeline without stale guide work');
 }
 const owned=[cache.fallback,cache.texture,cache.framebuffer,cache.program].filter(Boolean);cache.dispose();
 for(const resource of owned)assert.equal(gl.commands.filter(c=>c.op.startsWith('delete')&&c.args[0]?.resource===resource.resource).length,1);
}
for(const failure of [null,'compile','link','attribute-api']){
 const gl=mock(failure);
 if(failure!=='attribute-api')gl.bindAttribLocation=(...args)=>gl.commands.push({op:'bindAttribLocation',args});
 const world=createPrimaryWorld(gl,vertexShader,3,['time','primaryGuide','primaryGuideValid']);
 assert.equal(Boolean(world),failure===null);
 const shaders=gl.commands.filter(c=>c.op==='createShader').map(c=>c.result);
 for(const shader of shaders)assert.equal(gl.commands.filter(c=>c.op==='deleteShader'&&c.args[0].resource===shader).length,1);
 if(world){
  const attribute=gl.commands.findIndex(c=>c.op==='bindAttribLocation'),link=gl.commands.findIndex(c=>c.op==='linkProgram');
  assert(attribute<link);assert.equal(gl.commands[attribute].args[1],3);
  assert.equal(world.locations.time.uniform,world.program.resource);gl.deleteProgram(world.program);
 }
 const programs=gl.commands.filter(c=>c.op==='createProgram').map(c=>c.result);
 for(const program of programs)assert.equal(gl.commands.filter(c=>c.op==='deleteProgram'&&c.args[0].resource===program).length,1);
}
console.log('Frozen candidate world/cloud/guide source hashes, opened/high-resolution eligibility, stale validity, capability/draw fallback, compatible attribute binding and resource cleanup passed.');
