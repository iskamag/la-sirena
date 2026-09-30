// CPU-only contract check: compare effective draw state through the independent
// command recorder, including every casting branch and consecutive post passes.
// GPU shader correctness and image equivalence are checked separately.
import assert from 'node:assert/strict';
import { SecondaryLayers } from '../newlayers.js';
import { Compositor } from '../post.js';
import { recordingGL } from './native-gl.mjs';
function run(fast) {
 const gl=recordingGL(640,360),layers=new SecondaryLayers(gl),post=new Compositor(gl);
 post.resize(640,360);layers.resize(640,360); let queries=0;
 for(const name of ['getParameter','isEnabled']){const orig=gl[name];gl[name]=(...args)=>{queries++;return orig(...args);};}
 for(let scene=0;scene<=10;scene++)for(const catRole of ['none','runner','sentinel','swimmer'])for(const poster of [0,1])for(const eventAge of [-1,1,10,18]){
  const frame={time:scene+eventAge*.001,scene,shot:1,local:.5,energy:[.5,.6,.7,.8],beat:.8,motion:1,pointer:[.1,.2],poster,density:1,event:[0,eventAge,1,.1],audio:[.8,.8,.6,.3],seed:2,catRole,catsEnabled:true};
  post.begin();frame.depthTexture=post.captureDepth();frame.depthScale=40;
  if(fast)layers.renderForCompositor(frame);else layers.render(frame);
  post.finish(frame);
 }
 return{commands:gl.commands,queries};
}
function drawState(commands){
 let program,vao,active=33984,framebuffer,viewport,depthMask=true,blendFunc,blendEq;
 const textures={},uniforms={},enabled=new Set(),sources={},attached={},result=[];
 const value=x=>x?.resource??x;
 for(const c of commands){const a=c.args.map(value);
  if(c.op==='shaderSource')sources[a[0]]=a[1];
  if(c.op==='attachShader')(attached[a[0]]??=[]).push(a[1]);
  if(c.op==='useProgram')program=a[0];if(c.op==='bindVertexArray')vao=a[0];if(c.op==='activeTexture')active=a[0];if(c.op==='bindTexture')textures[active]=a[1];
  if(c.op==='bindFramebuffer')framebuffer=a[1];if(c.op==='viewport')viewport=a;
  if(c.op==='enable')enabled.add(a[0]);if(c.op==='disable')enabled.delete(a[0]);if(c.op==='depthMask')depthMask=a[0];
  if(c.op==='blendFuncSeparate')blendFunc=a;if(c.op==='blendEquation')blendEq=[a[0],a[0]];if(c.op==='blendEquationSeparate')blendEq=a;
  if(c.op.startsWith('uniform'))(uniforms[c.args[0].uniform]??={})[c.args[0].name]=c.args.slice(1);
  if(c.op.startsWith('drawArrays')){
   const source=(attached[program]??[]).map(id=>sources[id]).join('\n');
   const samplers=[...source.matchAll(/uniform sampler2D (\w+);/g)].map(m=>m[1]);
   const usedTextures=Object.fromEntries(samplers.map(name=>[name,textures[33984+(uniforms[program]?.[name]?.[0]??0)]]));
   result.push({op:c.op,args:a,program,vao,framebuffer,viewport,enabled:[...enabled].sort(),depthMask:enabled.has(2929)?depthMask:null,blendFunc:enabled.has(3042)?blendFunc:null,blendEq:enabled.has(3042)?blendEq:null,uniforms:uniforms[program],usedTextures});
   result[result.length-1]=structuredClone(result[result.length-1]);
  }
 }
 return result;
}
const slow=run(false),fast=run(true),slowDraw=drawState(slow.commands),fastDraw=drawState(fast.commands);
assert.deepEqual(fastDraw,slowDraw);
assert.equal(fast.queries,0);
console.log(JSON.stringify({frames:352,equivalentDraws:fastDraw.length,slowQueries:slow.queries,fastQueries:fast.queries,removedCommands:slow.commands.length-fast.commands.length}));
// Standalone calls must restore non-default caller state too.
const gl=recordingGL(640,360),layers=new SecondaryLayers(gl),program=gl.createProgram(),vao=gl.createVertexArray(),texture=gl.createTexture();
gl.useProgram(program);gl.bindVertexArray(vao);gl.enable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.depthMask(true);gl.blendFuncSeparate(gl.ONE,gl.SRC_ALPHA,gl.ZERO,gl.ONE);gl.blendEquationSeparate(32778,32779);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0+3);
const params=[gl.CURRENT_PROGRAM,gl.VERTEX_ARRAY_BINDING,gl.DEPTH_WRITEMASK,gl.BLEND_SRC_RGB,gl.BLEND_DST_RGB,gl.BLEND_SRC_ALPHA,gl.BLEND_DST_ALPHA,gl.BLEND_EQUATION_RGB,gl.BLEND_EQUATION_ALPHA,gl.ACTIVE_TEXTURE];
const before=params.map(p=>gl.getParameter(p));layers.render({scene:3});assert.deepEqual(params.map(p=>gl.getParameter(p)),before);for(const cap of [gl.BLEND,gl.DEPTH_TEST,gl.CULL_FACE])assert(gl.isEnabled(cap));gl.activeTexture(gl.TEXTURE4);assert.equal(gl.getParameter(gl.TEXTURE_BINDING_2D),texture);
console.log('Standalone non-default state restoration passed.');
