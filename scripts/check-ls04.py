#!/usr/bin/env python3
"""Bounded rendered LS04 regression: sustained motion/light until the cut.

Uses native-pass PNGs and their score descriptors. Coarse upper-image changes
suppress fine print grain; this detects a frozen image, not physical velocity.
Physical shard velocities are covered by steady-fall-layer-qa.json.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report',default='artifacts/native-ls04-finale/report.json')
parser.add_argument('--out')
args=parser.parse_args()
path=Path(args.report)
render=json.loads(path.read_text())
frames=render['frames']
cut=170.125
temple=[f for f in frames if 154<=f['time']<cut]
after=[f for f in frames if f['time']>=cut]
assert temple and after, 'Capture late LS04 and a frame after its cut'
assert all(f['glError']==0 for f in frames), 'Every actual pass draws GL0'
assert all(f['state']['scene']==3 and f['state']['catCount']==0 for f in temple)
assert after[0]['state']['scene']==4, 'LS05 replaces LS04 on its musical cut'
for source,expected in render['sourceHashes'].items():
    assert hashlib.sha256(Path(source).read_bytes()).hexdigest()==expected, f'Current source: {source}'
middle=[f['averageLuminance'] for f in temple if 158<=f['time']<=164.1]
late=[f for f in temple if f['time']>=167]
minimum=min(f['averageLuminance'] for f in temple)
brightness_ratio=min(f['averageLuminance'] for f in late)/float(np.median(middle))
assert minimum>=70, 'Opened temple retains a readable broad light field'
assert brightness_ratio>=.8, 'Late temple has no large luminance fade'

def image(frame):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',frame['path'],
        '-vf','scale=160:90:flags=area','-f','rawvideo','-pix_fmt','rgb24','-'])
    return np.frombuffer(raw,np.uint8).reshape(90,160,3).astype(float)

pairs=[]
for a,b in zip(temple,temple[1:]):
    delta=b['time']-a['time']
    if .02<delta<.05:
        difference=np.abs(image(a)-image(b))
        pairs.append({'time':a['time'],'deltaSeconds':delta,
            'coarseRGBmeanDifference':float(difference.mean()),
            'upperHalfRGBmeanDifference':float(difference[:45].mean())})
early_motion=[p['upperHalfRGBmeanDifference'] for p in pairs if 158<=p['time']<=164.1]
late_motion=[p['upperHalfRGBmeanDifference'] for p in pairs if p['time']>=167]
assert early_motion and len(late_motion)>=2, 'Sample both late33ms motion windows'
motion_ratio=min(late_motion)/float(np.median(early_motion))
assert min(late_motion)>1, 'Coarse sky/roof image continues moving'
assert motion_ratio>=.65, 'Late image changes remain comparable to steady earlier motion'
result={'passed':True,'scope':'Actual full-pass frame motion/luminance and score cut; physical velocities checked independently',
    'sourceHashes':render['sourceHashes'],'frames':len(frames),'width':render['width'],'height':render['height'],
    'minimumTempleAverageLuminance':minimum,'lateBrightnessRatio':brightness_ratio,
    'lateCoarseMotionRatio':motion_ratio,'pairs':pairs,'cutTime':cut,'glErrors':0}
output=Path(args.out) if args.out else path.with_name('steady-qa.json')
output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('sourceHashes','pairs')},indent=2))
