import json,subprocess,numpy as np
from pathlib import Path
f=np.float32;rng=np.random.default_rng(851223)
# CPU float32 weather-domain diagnostic, not a replay of GPU pixels/hash codegen.

fract=lambda x:x-np.floor(x)
def hash(p):
 p=fract(p*np.array([123.34,456.21],dtype='f4'));q=np.sum(p*(p+f(45.32)),axis=1);p=p+q[:,None];return fract(p[:,0]*p[:,1])
def noise(p):
 i=np.floor(p);q=fract(p);q=q*q*(f(3)-f(2)*q)
 # Original mix ordering; NumPy operation lowering differs from GPU compilation.
 mix=lambda a,b,t:a*(f(1)-t)+b*t
 return mix(mix(hash(i),hash(i+np.array([1,0],dtype='f4')),q[:,0]),mix(hash(i+np.array([0,1],dtype='f4')),hash(i+np.array([1,1],dtype='f4')),q[:,0]),q[:,1])
def fbm(p):
 v=f(.55)*noise(p)
 def rotate(p,k):return np.stack([(f(.8)*p[:,0]-f(.6)*p[:,1])*f(k),(f(.6)*p[:,0]+f(.8)*p[:,1])*f(k)],axis=1)
 p=rotate(p,2.1);v=v+f(.27)*noise(p);p=rotate(p,2.2);return v+f(.13)*noise(p)

def mix(a,b,t):return a*(1-t)+b*t
def smooth(a,b,v):
 q=np.clip((v-a)/(b-a),0,1);return q*q*(3-2*q)
def normalize(v):return v/np.linalg.norm(v,axis=-1,keepdims=True)
def camera(fr,pixels):
 t=fr['time'];op=fr['event'][2];beat=fr['beat'];mode=int(fr['shot'])%4
 ro=np.array([.28*np.sin(t*.11),-.35,-5]);ta=np.array([0,.6,1]);lens=1.55
 if mode==1:ro[1]=-1.2;ta[1]=.35;lens=1.4
 if mode==2:ro[0]=1.15;ta[0]=-.25;ta[1]=.15;lens=1.65
 if mode==3:ro[1]=.15;ta[1]=1.45;lens=1.3
 ro[1]+=op*.35;ta[1]+=op*.86;pan=op*.34*np.sin(max(fr['event'][1],0)*.29);ro[0]+=pan;ta[0]+=pan;lens-=.04*beat+.11*op
 fw=normalize(ta-ro);right=normalize(np.cross(fw,[0,1,0]));up=np.cross(right,fw)
 uv=(pixels-[1920,1080])/2160;uv*=1-.038*beat
 if int(fr['seed'])%3==2:
  a=.016*beat;uv=np.stack([np.cos(a)*uv[:,0]+np.sin(a)*uv[:,1],-np.sin(a)*uv[:,0]+np.cos(a)*uv[:,1]],axis=1)
 return ro.astype('f4'),normalize(uv[:,0,None]*right+uv[:,1,None]*up+fw*lens).astype('f4')
def volume(fr,pixels):
 ro,rd=camera(fr,pixels);t=fr['time'];op=fr['event'][2];storm=smooth(6.805,8,fr['event'][1]);transport=t*.14+max(fr['event'][1],0)*2.35
 sun=np.maximum(rd@normalize(np.array([-.24,.20,1],dtype='f4')),0)**28
 c=np.zeros((len(rd),3),dtype='f4');trans=np.ones(len(rd),dtype='f4')
 for i in range(12):
  p=ro+rd*f(9+i*3.5);p[:,2]+=f(transport*2.2);p[:,0]+=f(transport*.4);weather=p[:,[0,2]]*f(.054)
  warp=np.stack([fbm(weather+np.array([t*.015,4.2],dtype='f4')),fbm(weather*f(.93)+np.array([8.1,-t*.012],dtype='f4'))],axis=1)-f(.45)
  cloud=fbm(weather*f(2.8)+warp*f(3.2));body=smooth(.34,.65,cloud)*np.exp(-np.abs(p[:,1]-(5.8+1.8*np.sin(p[:,2]*.035)))*.19)*(.060+.095*op)
  edge=smooth(.43,.65,cloud)-smooth(.64,.77,cloud);cold=mix(np.array([.040,.056,.13]),np.array([.26,.33,.47]),cloud[:,None]);lit=mix(cold,np.array([.79,.39,.15]),(sun*.75+edge*.28)[:,None]);lit+=np.array([.023,.19,.24])*storm*edge[:,None]*.44
  c+=lit*(body*trans*1.95)[:,None];trans*=1-body
 return c
rows=[]
# 4608 randomly sampled 4K pixel centers per frame, including all bilinear phases.
pixels=np.stack([rng.integers(0,3840,4608)+.5,rng.integers(0,2160,4608)+.5],axis=1)
q=pixels/2-.5;lo=np.floor(q);fraction=q-lo
frames=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{createFilmScore}from'./newscore.js';import{readFileSync}from'node:fs';const score=createFilmScore(JSON.parse(readFileSync('public/track-analysis.json')));console.log(JSON.stringify([144,150,156,160,165,169].map(t=>score.at(t,{scene:3}).frame)));"],text=True))
for fr in frames:
 exact=volume(fr,pixels);approx=np.zeros_like(exact)
 for dx,dy in [(0,0),(1,0),(0,1),(1,1)]:
  sample=(np.clip(lo+[dx,dy],[0,0],[1919,1079])+.5)*2
  weights=(fraction[:,0] if dx else 1-fraction[:,0])*(fraction[:,1] if dy else 1-fraction[:,1])
  approx+=volume(fr,sample).astype('f2').astype('f4')*weights[:,None]
 error=approx-exact
 rows.append(dict(time=fr['time'],samples=len(pixels),maxLinear=float(abs(error).max()),rmsLinear=float(np.sqrt(np.mean(error*error))),p99Linear=float(np.quantile(abs(error),.99)),indicativeFilmByteAtSlope2=float(abs(error).max()*2*255)))
print(json.dumps(dict(method='CPU NumPy float32 noise and production camera, random 4K pixels, RGBA16F half-resolution bilinear reconstruction. Distant radiance only; excludes geometry visibility, near-sheet attenuation and luminance floor. Not GPU equality or image-quality proof.',results=rows),indent=2))
