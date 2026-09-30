// CPU-only periodic support-box and source checks.
import assert from 'node:assert/strict';
import { primaryWorldFragment as fragmentShader, primaryGuideFragment } from '../primary-shaders.js';
import { windowGuideGLSL } from '../window-guide.js';
function slab(a,v,c,e,interval){if(v===0)return Math.abs(a-c)<=e;const t0=(-e-(a-c))/v,t1=(e-(a-c))/v;interval[0]=Math.max(interval[0],Math.min(t0,t1));interval[1]=Math.min(interval[1],Math.max(t0,t1));return interval[0]<=interval[1];}
export function windowClearCPU(ro,rd,scale,travel,lens,width,height){
 const gw=Math.ceil(width/4),gh=Math.ceil(height/4),tube=32*.5*Math.hypot(width/gw,height/gh)/(height*lens)*Math.max(1,scale),pad=tube+.006+.0002;
 const a=[ro[0]*scale,ro[1],ro[2]+travel],v=[rd[0]*scale,rd[1],rd[2]];
 for(const side of [-1,1]){const interval=[.05,32];if(!slab(a[0],v[0],side*2.2,.024+pad,interval)||!slab(a[1],v[1],.27,.594+pad,interval))continue;
 const z=interval.map(t=>a[2]+v[2]*t),first=Math.ceil((Math.min(...z)-.594-pad)/4.2),last=Math.floor((Math.max(...z)+.594+pad)/4.2);if(first<=last)return false;}
 return true;
}
let seed=219334;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<100000;i++){const lo=-200+400*random(),hi=lo+32*random(),extent=.594+random()*.2;const exact=Math.ceil((lo-extent)/4.2)<=Math.floor((hi+extent)/4.2);let loop=false;for(let row=Math.floor((lo-extent)/4.2)-1;row<=Math.ceil((hi+extent)/4.2)+1;row++)if(lo<=row*4.2+extent&&hi>=row*4.2-extent)loop=true;assert.equal(exact,loop);}
assert(!fragmentShader.includes('bool windowGuideClear('),'Support helper must remain guide-only');assert(primaryGuideFragment.includes(windowGuideGLSL));assert(primaryGuideFragment.includes('windowClear?1.0:0.0'));assert(fragmentShader.includes('if(packet.a<.5) return false;'));
// Actual camera and containing guide ray for both reported hidden pixels.
const time=136.1,beat=.7175,ro=[.28*Math.sin(time*.11),-.35,-5],ta=[0,.60,1],lens=1.55-.04*beat,scale=1+.06*beat;
const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const fw=norm(ta.map((v,i)=>v-ro[i])),right=norm(cross(fw,[0,1,0])),up=cross(right,fw),uv=[(54-1280)/1440,(850-720)/1440].map(v=>v*(1-.038*beat)),angle=.016*beat,rotated=[Math.cos(angle)*uv[0]+Math.sin(angle)*uv[1],-Math.sin(angle)*uv[0]+Math.cos(angle)*uv[1]],rd=norm(fw.map((v,i)=>v*lens+right[i]*rotated[0]+up[i]*rotated[1]));
assert.equal(windowClearCPU(ro,rd,scale,time*.5,lens,2560,1440),false,'Containing guide footprint of both136.1 hidden spokes must fall back');
console.log('100k periodic interval checks, guide-only source, and known136.1 spoke footprint fallback passed.');
