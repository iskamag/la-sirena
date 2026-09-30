// Independent rotated-octahedron support and numerical rejection checks.
import assert from 'node:assert/strict';
const k=.57735027, f=Math.fround;
const rotate=(v,a,i,j,round=x=>x)=>{const c=round(Math.cos(round(a))),s=round(Math.sin(round(a))),x=v[i],y=v[j];v[i]=round(round(c*x)+round(s*y));v[j]=round(round(-s*x)+round(c*y));return v;};
function field(p,side,z,h,satellite,round=x=>x){
 const center=satellite?[side*(2.75-.29*h),-.69,z+2.26]:[side*(3.90+.42*h),.91+1.10*h,z+.34*(h-.5)];
 const q=p.map((x,i)=>round(round(x)-round(center[i])));
 rotate(q,satellite?-side*.24:side*(.15+.14*h),0,1,round);rotate(q,satellite?.16:(h-.5)*.43,1,2,round);
 const scales=satellite?[.55,1.15+.40*h,.81]:[2.16,4.15+1.2*h,3.56];
 const a=q.map((x,i)=>Math.abs(round(x/round(scales[i]))));
 let d=round(round(round(round(round(a[0]+a[1])+a[2])-1)*round(k))*round(satellite?.55:2.16));
 if(!satellite)d=Math.max(d,round(-round(p[1])-round(1.93)));
 return d;
}
function lower(p,side,z,satellite,round=x=>x){
 const center=satellite?[side*2.605,-.69,z+2.26]:[side*4.11,1.46,z];
 const uncertainty=satellite?[.147,.002,.002]:[.212,.552,.172],support=satellite?[.55,1.55,.81]:[2.16,5.35,3.56];
 const a=p.map((x,i)=>round(Math.max(round(Math.abs(round(round(x)-round(center[i])))-round(uncertainty[i])),0)/round(support[i])));
 let d=round(round(round(Math.max(...a)-1)*round(k))*round(satellite?.55:2.16));
 if(!satellite)d=Math.max(d,round(-round(p[1])-round(1.93)));
 return round(d-round(.01));
}
// A weighted-L1 unit ball is the convex hull of its six axial vertices.
// Inverse rotations preserve their support, so checking each vertex bounds
// every point of the ball independently of any sampled march.
for(let n=0;n<=10000;n++)for(const side of [-1,1])for(const satellite of [false,true]){
 const h=n/10000,scales=satellite?[.55,1.15+.40*h,.81]:[2.16,4.15+1.2*h,3.56],support=satellite?[.55,1.55,.81]:[2.16,5.35,3.56];
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const vertex=[0,0,0];vertex[axis]=sign*scales[axis];
  rotate(vertex,satellite?-.16:-(h-.5)*.43,1,2);rotate(vertex,satellite?side*.24:-side*(.15+.14*h),0,1);
  vertex.forEach((x,i)=>assert(Math.abs(x)<=support[i]+1e-12));
 }
}
let seed=39279;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};let minimumGap=Infinity;
for(let n=0;n<1000000;n++){
 const p=[(random()*2-1)*1024,(random()*2-1)*1024,(random()*2-1)*1024],side=random()<.5?-1:1,h=random(),z=(Math.floor((p[2]+3.7)/7.4)+(n%3-1))*7.4;
 // Alternate full coordinate-domain and near-body/surface samples.
 if(n%2){p[0]=side*(2.5+random()*2);p[1]=-2+random()*5;}
 for(const satellite of [false,true]){
  const exact=field(p,side,z,h,satellite),bound=lower(p,side,z,satellite);assert(bound<=exact);
  const rounded=field(p,side,z,h,satellite,f),roundedBound=lower(p,side,z,satellite,f);
  assert(roundedBound<=rounded,`Unsafe f32 bound at sample ${n}`);minimumGap=Math.min(minimumGap,rounded-roundedBound);
 }
}
console.log(JSON.stringify({supportSamples:10001,domainSamples:1000000,fieldComparisons:2000000,minimumRoundedGap:minimumGap,scope:'binary64 and f32-rounded arithmetic; actual driver trig/compiler still GPU-unverified'}));
