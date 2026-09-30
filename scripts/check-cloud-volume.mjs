// CPU-only lifecycle and source checks; this does not submit GPU work.
import assert from 'node:assert/strict';
import { CloudVolume } from '../cloud-volume.js';
import { fragmentShader,cloudVolumeFragment } from '../shaders.js';
import { recordingGL } from './native-gl.mjs';
const loop=fragmentShader.slice(fragmentShader.indexOf('    float transmittance=1.0;',fragmentShader.indexOf('vec3 templeClouds')),fragmentShader.indexOf('    }\n    // A nearby folded',fragmentShader.indexOf('vec3 templeClouds')));
assert(cloudVolumeFragment.includes(loop),'Distant volume preserves every layer and survivor expression');
assert(cloudVolumeFragment.includes('gl_FragCoord.xy*u_resolution/u_volumeResolution'),'Odd dimensions preserve the full-resolution aspect');
for(const failure of ['no-api','unsupported','extension','compile','link','attachment','draw',null]) {
 const gl=recordingGL(641,361);gl.NO_ERROR=0;gl.RGBA16F=34842;gl.HALF_FLOAT=5131;
 if(failure!=='no-api')gl.getExtension=()=>{if(failure==='extension')throw Error('No extension');return failure==='unsupported'?null:{};};
 gl.getShaderParameter=()=>failure!=='compile';gl.getProgramParameter=()=>failure!=='link';gl.getError=()=>failure==='draw'?1282:0;
 gl.checkFramebufferStatus=()=>failure==='attachment'?36054:gl.FRAMEBUFFER_COMPLETE;
 const cache=new CloudVolume(gl),program=gl.createProgram(),locations={cloudVolume:gl.getUniformLocation(program,'u_cloudVolume'),cloudVolumeValid:gl.getUniformLocation(program,'u_cloudVolumeValid')};
 const frame={scene:3,time:160,motion:1,beat:0,pointer:[0,0],event:[0,0,1,0],audio:[0,0,0,0],energy:[0,0,0,0],local:0,seed:0,poster:0,shot:0,density:1};
 const vao=gl.createVertexArray(),noise={bind(){}};
 cache.render(frame,641,361,vao,noise);cache.bind(locations,frame);
 const last=()=>gl.commands.filter(c=>c.op==='uniform1f'&&c.args[0].name==='u_cloudVolumeValid').at(-1)?.args[1];
 assert.equal(last(),failure===null?1:0);
 assert(gl.commands.some(c=>c.op==='texImage2D'&&c.args[3]===1&&c.args[4]===1),'Complete fallback texture on every failure path');
 if(failure===null){assert.equal(cache.width,321);assert.equal(cache.height,181);assert.deepEqual(gl.commands.filter(c=>c.op==='viewport').at(-1).args,[0,0,641,361]);}
 const before=gl.commands.filter(c=>c.op==='drawArrays').length;
 cache.render({...frame,scene:1},641,361,vao,noise);cache.bind(locations,{scene:1});assert.equal(last(),0);
 assert.equal(gl.commands.filter(c=>c.op==='drawArrays').length,before,'Other worlds do not render cloud volume');
 cache.dispose();
}
console.log('Cloud volume source, fallback, odd-size, scene isolation, and draw failure checks passed.');
