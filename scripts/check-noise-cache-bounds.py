import argparse,json,math
from pathlib import Path
# Conservative interval scan: all normalized ray directions, all modes, pointer
# [-1,1], motion[0,1], clamped temple age[0,20.415], time[0,170.125].
# Expand the intervals for float32 age/coefficient/normalization/camera rounding.
T=170.126;transport=T*.14+20.416*2.35
R=1.00001;camera_x=1.58001
volume_x=camera_x+47.5*R;volume_z=47.5*R
sheet_x=camera_x+53*R;sheet_z=53*R
add=lambda a,b:(a[0]+b[0],a[1]+b[1])
scale=lambda a,k:(a[0]*k,a[1]*k) if k>=0 else(a[1]*k,a[0]*k)
V=lambda x,y:[x,y]
def transformed(v,k):
 # Preserve correlation through the full linear transform by corner evaluation.
 corners=[((.8*x-.6*y)*k,(.6*x+.8*y)*k) for x in v[0] for y in v[1]]
 return [[min(q[i] for q in corners),max(q[i] for q in corners)] for i in range(2)]
def octave_inputs(name,v):
 out=[]
 for octave in range(3):
  out.append(dict(name=name,octave=octave,bounds=v))
  if octave==0:v=transformed(v,2.1)
  elif octave==1:v=transformed(v,2.2)
 return out
# Volume ray endpoints plus advection. ro.x <=1.58, ro.z=-5.
weather=V(scale(add((-volume_x,volume_x),(0,transport*.4)),.054),scale(add((-5-volume_z,-5+volume_z),(0,transport*2.2)),.054))
wx=V(add(tuple(weather[0]),(0,T*.015)),add(tuple(weather[1]),(4.2,4.2)))
wy=V(add(scale(tuple(weather[0]),.93),(8.1,8.1)),add(scale(tuple(weather[1]),.93),(-T*.012,0)))
cloud=V(add(scale(tuple(weather[0]),2.8),scale((-.451,.501),3.2)),add(scale(tuple(weather[1]),2.8),scale((-.451,.501),3.2)))
# Near sheet distance is clamped to[10,53]; independent directions cover all views.
sheet=V(add(scale((-sheet_x,sheet_x),.092),(0,transport*.062)),add(scale((-5-sheet_z,-5+sheet_z),.092),(0,transport*.095)))
cx=V(add(scale(tuple(sheet[0]),1.4),(2.7,2.7)),add(scale(tuple(sheet[1]),1.4),(0,T*.014)))
cy=V(add(scale(tuple(sheet[0]),1.37),(9.4,9.4)),add(scale(tuple(sheet[1]),1.37),(-T*.010,0)))
macro=V(add(scale(tuple(sheet[0]),2.75),scale((-.461,.491),3.8)),add(scale(tuple(sheet[1]),2.75),scale((-.461,.491),3.8)))
fine=V(add(scale(tuple(sheet[0]),18),scale((-.461,.491),6)),add(scale(tuple(sheet[1]),18),scale((-.461,.491),6)))
items=[]
for name,v in [('volume-warp-x',wx),('volume-warp-y',wy),('volume-cloud',cloud),('sheet-curl-x',cx),('sheet-curl-y',cy),('sheet-macro',macro)]:items+=octave_inputs(name,v)
items.append(dict(name='sheet-fine',octave=0,bounds=fine))
lo=min(min(x[0] for x in e['bounds']) for e in items);hi=max(max(x[1] for x in e['bounds']) for e in items)
report=dict(method='Conservative certified-frame coordinate intervals; all camera modes and ray directions; time/age/ray/camera float32 pads; fbm ranges padded .001',certifiedTime=[0,170.125],certifiedAgeMaximum=20.415,proofTimeMaximum=T,proofAgeMaximum=20.416,rayComponentMaximum=R,cameraXMaximum=camera_x,transportMaximum=transport,minimumInput=lo,maximumInput=hi,minimumCell=int(math.floor(lo)),maximumCell=int(math.floor(hi)),grid=[-256,255],items=items)
parser=argparse.ArgumentParser();parser.add_argument('--output');args=parser.parse_args()
print(json.dumps(report,indent=2))
if args.output:Path(args.output).write_text(json.dumps(report,indent=2))
assert lo>-256 and hi<256
