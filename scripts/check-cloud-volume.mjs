// CPU-only lifecycle and source checks; this does not submit GPU work.
import assert from 'node:assert/strict';
import { CloudVolume, cloudVolumeMinimumHeight } from '../cloud-volume.js';
import { fragmentShader,cloudVolumeFragment } from '../shaders.js';
import { recordingGL } from './native-gl.mjs';
const loop=fragmentShader.slice(fragmentShader.indexOf('    float transmittance=1.0;',fragmentShader.indexOf('vec3 templeClouds')),fragmentShader.indexOf('    }\n    // A nearby folded',fragmentShader.indexOf('vec3 templeClouds')));
assert(cloudVolumeFragment.includes(loop),'Distant volume preserves every layer and survivor expression');
assert(cloudVolumeFragment.includes('gl_FragCoord.xy*u_resolution/u_volumeResolution'),'Odd dimensions preserve the full-resolution aspect');
for(const failure of ['no-api','unsupported','float-linear','extension','compile','link','attachment','draw',null]) {
 const gl=recordingGL(2561,1441);gl.NO_ERROR=0;gl.RGBA32F=34836;
 if(failure!=='no-api')gl.getExtension=name=>{if(failure==='extension')throw Error('No extension');return failure==='unsupported'||(failure==='float-linear'&&name==='OES_texture_float_linear')?null:{};};
 gl.getShaderParameter=()=>failure!=='compile';gl.getProgramParameter=()=>failure!=='link';gl.getError=()=>failure==='draw'?1282:0;
 gl.checkFramebufferStatus=()=>failure==='attachment'?36054:gl.FRAMEBUFFER_COMPLETE;
 const cache=new CloudVolume(gl),program=gl.createProgram(),locations={cloudVolume:gl.getUniformLocation(program,'u_cloudVolume'),cloudVolumeValid:gl.getUniformLocation(program,'u_cloudVolumeValid')};
 const frame={scene:3,time:160,motion:1,beat:0,pointer:[0,0],event:[0,0,1,0],audio:[0,0,0,0],energy:[0,0,0,0],local:0,seed:0,poster:0,shot:0,density:1};
 const vao=gl.createVertexArray(),noise={bind(){}};
 cache.render(frame,2561,1441,vao,noise);cache.bind(locations,frame);
 const last=()=>gl.commands.filter(c=>c.op==='uniform1f'&&c.args[0].name==='u_cloudVolumeValid').at(-1)?.args[1];
 assert.equal(last(),failure===null?1:0);
 assert(gl.commands.some(c=>c.op==='texImage2D'&&c.args[3]===1&&c.args[4]===1),'Complete fallback texture on every failure path');
 if(failure===null){
  const upload=gl.commands.find(c=>c.op==='texImage2D'&&c.args[3]===1281&&c.args[4]===721);
  assert.equal(upload.args[2],gl.RGBA32F);assert.equal(upload.args[7],gl.FLOAT);
  assert.equal(cache.width,1281);assert.equal(cache.height,721);assert.deepEqual(gl.commands.filter(c=>c.op==='viewport').at(-1).args,[0,0,2561,1441]);}
 const before=gl.commands.filter(c=>c.op==='drawArrays').length;
 cache.render({...frame,scene:1},2561,1441,vao,noise);cache.bind(locations,{scene:1});assert.equal(last(),0);
 assert.equal(gl.commands.filter(c=>c.op==='drawArrays').length,before,'Other worlds do not render cloud volume');
 cache.dispose();
}
console.log('Cloud volume source, fallback, odd-size, scene isolation, and draw failure checks passed.');

// Resolution eligibility switches the actual draw and validity flag, not only
// allocation size. Reentering low resolution after a high-resolution frame
// must bind the original-loop fallback rather than reuse stale radiance.
{
 const gl=recordingGL(2560,1440);gl.NO_ERROR=0;gl.RGBA32F=34836;
 gl.getExtension=()=>({});gl.getError=()=>0;
 const cache=new CloudVolume(gl),program=gl.createProgram(),vao=gl.createVertexArray();
 const locations={cloudVolume:gl.getUniformLocation(program,'u_cloudVolume'),cloudVolumeValid:gl.getUniformLocation(program,'u_cloudVolumeValid')};
 const frame={scene:3,time:160,motion:1,beat:0,pointer:[0,0],event:[0,0,1,0],audio:[0,0,0,0],energy:[0,0,0,0],local:0,seed:0,poster:0,shot:0,density:1};
 const noise={bind(){}};
 cache.render(frame,2560,cloudVolumeMinimumHeight-1,vao,noise);cache.bind(locations,frame);
 assert.equal(cache.valid,false);assert.equal(gl.commands.filter(c=>c.op==='drawArrays').length,0);
 assert.equal(gl.getParameter(gl.TEXTURE_BINDING_2D),cache.fallback);
 cache.render(frame,2560,cloudVolumeMinimumHeight,vao,noise);cache.bind(locations,frame);
 assert.equal(cache.valid,true);assert.equal(gl.commands.filter(c=>c.op==='drawArrays').length,1);
 assert.equal(gl.getParameter(gl.TEXTURE_BINDING_2D),cache.texture);
 assert.equal(cache.width,1280);assert.equal(cache.height,720);
 cache.render(frame,2560,cloudVolumeMinimumHeight-1,vao,noise);cache.bind(locations,frame);
 assert.equal(cache.valid,false);assert.equal(gl.commands.filter(c=>c.op==='drawArrays').length,1);
 assert.equal(gl.getParameter(gl.TEXTURE_BINDING_2D),cache.fallback);
 const owned=[cache.fallback,cache.texture,cache.framebuffer,cache.program].filter(Boolean);cache.dispose();
 for(const resource of owned)assert.equal(gl.commands.filter(c=>c.op.startsWith('delete')&&c.args[0]?.resource===resource.resource).length,1);
}
console.log('RGBA32F/float-linear capability, 1439/1440 eligibility, stale-frame fallback and resource release checks passed.');
