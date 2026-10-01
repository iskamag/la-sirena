(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})(),Object.freeze({ruptureTime:149.71,reentryTime:156.515,chapterCutTime:170.125,openingDuration:4.8,windRate:2.35,baseDriftRate:.14,transportRate:2.49,volumeAdvection:Object.freeze([.996,5.478]),sheetAdvection:Object.freeze([.15438,.23655]),roofTravelRate:.5,openSkyMinimumLuminance:.145,billowLightRetention:.68}),Object.freeze({transit:Object.freeze({start:81.655,end:136.1,duration:54.445,initialSpeed:6.7,finalSpeed:23.2,speedPower:1.4,travelIntegralPower:2.4,travelIntegralGain:374.309375,phaseTimes:Object.freeze([81.655,95.265,108.875,122.485]),finalRevealTimes:Object.freeze([129.29,132.695])}),templeEntrance:Object.freeze({initialSpeed:14,settledSpeed:.5,timeConstant:2,stopEntranceAt:149.71}),ocean:Object.freeze({start:261.995,end:289.32,cameraHeight:1.2,lens:1.38,glideSpeed:.26,forwardDown:.015,phaseTimes:Object.freeze([268.8,272.205,275.605,282.41]),waterPlane:0,depthRange:40})});var e=`#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`,t=`#version 300 es
precision highp float;
precision highp sampler2D;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scene;
uniform float u_local;
uniform vec4 u_energy;
uniform float u_beat;
uniform float u_motion;
uniform vec2 u_pointer;
uniform float u_seed;
uniform float u_poster;
uniform float u_shot;
uniform float u_density;
uniform float u_flowBoundValid;
uniform sampler2D u_noiseCache;
uniform float u_noiseCacheValid;
uniform sampler2D u_cloudVolume;
uniform float u_cloudVolumeValid;
// chapter age, rupture age, rupture progress, arcade progress
uniform vec4 u_event;
// onset, kick, impact, musical pulse phase
uniform vec4 u_audio;

#define PI 3.14159265359
#define TAU 6.28318530718
float g_depth=40.0;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float hash3(vec3 p) {
    p = fract(p * .1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
}
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
    float f = .55 * noise(p);
    p = mat2(.8,.6,-.6,.8) * p * 2.1;
    f += .27 * noise(p);
    p = mat2(.8,.6,-.6,.8) * p * 2.2;
    return f + .13 * noise(p);
}
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c,-s,s,c); }
float box(vec3 p, vec3 b) { vec3 q = abs(p)-b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }
float torus(vec3 p, vec2 r) { return length(vec2(length(p.xy)-r.x,p.z))-r.y; }
float octahedron(vec3 p, float s) { p=abs(p); return (p.x+p.y+p.z-s)*.57735027; }
float smin(float a, float b, float k) { float h=clamp(.5+.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h); }
float pulse() { return u_beat * (.4 + .6 * u_motion); }
float motionTime() { return u_time * (.12 + .88 * u_motion); }
float onset() {return clamp(max(u_audio.x,u_audio.z),0.0,1.0);}
float kickImpulse() {return max(pulse(),u_audio.y*u_motion);}
float rupture() {return clamp(u_event.z,0.0,1.0);}

vec3 stars(vec2 uv, float drift) {
    vec3 c = vec3(0);
    for (int i=0; i<3; i++) {
        float layer=float(i);
        vec2 p=uv*(52.0+layer*43.0)+vec2(drift*(.3+layer*.2),layer*51.4);
        vec2 id=floor(p), f=fract(p)-.5;
        float h=hash(id+layer);
        f-=vec2(hash(id+3.1),hash(id+7.3))*.5-.25;
        float d=length(f);
        float light=smoothstep(.976,1.0,h)*(.0012/(d*d+.002));
        c += vec3(.30,.62,1.0)*light*(.35+layer*.2);
    }
    return c;
}

vec3 environment(vec3 r, int scene) {
    float sky=smoothstep(-.7,.8,r.y);
    vec3 c=mix(vec3(.008,.012,.025),vec3(.05,.10,.14),sky);
    float strip=pow(max(0.0,1.0-abs(r.y-.22)*2.5),7.0);
    float red=pow(max(0.0,dot(r,normalize(vec3(-1.0,.4,.4)))),6.0);
    float blue=pow(max(0.0,dot(r,normalize(vec3(1.0,.2,.6)))),6.0);
    c+=strip*vec3(.26,.65,.66)+red*vec3(1.4,.075,.025)+blue*vec3(.03,.47,1.2);
    c+=pow(max(0.0,dot(r,normalize(vec3(.0,1.0,.25)))),24.0)*vec3(2.5);
    if(scene==5) c=c.bgr*vec3(.65,1.2,.5)+red*vec3(.5,.95,.015);
    if(scene==3) c+=vec3(.2,.015,.36)*pow(max(r.z,0.0),5.0);
    if(scene==9) c=mix(c,vec3(.035,.016,.13),.28)+blue*vec3(.015,.25,.34)+red*vec3(.40,.17,.025);
    if(scene==8) c=mix(c,vec3(.04,.012,.025),.20)+blue*vec3(.04,.23,.38);
    return c;
}

float nautilus(vec3 p,float phase) {
    float t=motionTime();
    p.xz=rot(t*.18+phase)*p.xz;
    p.yz=rot(.28*sin(t*.17)+.32)*p.yz;
    p.xy=rot(.20*sin(p.z*1.8+t*.18))*p.xy;
    float a=atan(p.y,p.x), radial=length(p.xy);
    float major=.92+.14*cos(a*3.0+t*.22);
    float tube=.39+.075*sin(a*3.0-.8);
    float d=length(vec2(radial-major,p.z+.20*sin(a*3.0)))-tube;
    d += .017*sin(a*52.0+p.z*22.0)*(.5+.5*sin(a*3.0));
    float pearl=length(p-vec3(-.07,-.025,0.0))-(.30+.025*pulse()*u_motion*(1.0-u_poster));
    return min(d,pearl);
}

float variant() { return mod(floor(u_shot),4.0); }
float density() { return clamp(u_density,0.0,1.0); }
float capsule3(vec3 p,vec3 a,vec3 b,float radius) {
    vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    return length(pa-ba*h)-radius;
}
float octaWire(vec3 p,float size,float width) {
    p=abs(p);float face=(p.x+p.y+p.z-size)*.57735027;
    float seam=min(p.x,min(p.y,p.z));
    return length(vec2(face,seam))*.75-width;
}
float tidalFloor(vec3 p,float level) {
    float t=motionTime();
    float wave=.10*sin(p.x*1.5+p.z*1.1+t*.50)+.060*sin(p.z*2.8-p.x*1.9-t*.30);
    return (p.y-level-wave)*.67;
}

// A scale hierarchy of living chrome: hero, fragments, pearl satellites, tidal floor.
vec2 shellWorld(vec3 p,bool swarm) {
    float t=motionTime(), d=100.0, mat=0.0;
    if(!swarm) {d=nautilus(p,u_seed+u_shot*.37);}
    else {
        // Rotations preserve radius. The meridian center's radius is at most
        // sqrt(1.06^2+.20^2); adding tube (.465) and corrugation (.017)
        // gives <1.561. Round outward to keep the bound conservative.
        // Also cover the independently animated central pearl.
        float boundRadius=max(1.562,.375+.025*pulse()*u_motion*(1.0-u_poster));
        // The two tidal waves sum to at least -.16. This upper bound on the
        // eventual floor value can reject shells without evaluating either
        // wave early or changing the final material selection order.
        float floorUpper=density()>.01?(p.y+2.02)*.67+.0001:100.0;
        for(int i=0;i<4;i++) {
            float fi=float(i);
            vec3 center=vec3(0);float size=1.0;
            if(i==0) {center=vec3(-1.28,.48,-.25);size=.80;}
            if(i==1) {center=vec3(1.12,-.26,.35);size=.69;}
            if(i==2) {center=vec3(.06,-.94,1.15);size=.37;}
            if(i==3) {center=vec3(.20,1.18,-1.65);size=.49;}
            center.xy+=.13*vec2(sin(t*.43+fi),cos(t*.31+fi*1.7));
            vec3 q=(p-center)/size;
            // Skip only fields that cannot win the current minimum; retain
            // the original evaluation order and material tie behavior.
            if((length(q)-boundRadius)*size-.0001>=min(d,floorUpper)) continue;
            float candidate=nautilus(q,u_seed+fi*2.14+t*.13)*size;
            if(candidate<d) {d=candidate;mat=fi;}
        }
    }
    if(density()>.01) {
        vec3 center=vec3(-2.00,.68,-.70)+vec3(.12*sin(t*.45),.12*cos(t*.38),0);
        vec3 q=p-center;
        // Torus radius .56+.15 plus the maximum downward corrugation .007.
        if(length(q)-.717-.0001<d) {
            q.xz=rot(t*.35+.6)*q.xz;
            float fragment=torus(q,vec2(.56,.15));
            fragment=max(fragment,-q.y-.08);
            fragment+=.007*sin(atan(q.y,q.x)*36.0);
            if(fragment<d) {d=fragment;mat=4.0;}
        }
        for(int i=0;i<3;i++) {
            float fi=float(i);
            vec3 c=vec3(-1.75,-.86,1.20);
            float r=.21;
            if(i==1) {c=vec3(1.87,.91,-.70);r=.30;}
            if(i==2) {c=vec3(-1.09,1.35,-2.3);r=.16;}
            c+=vec3(.10*sin(t*.72+fi*2.0),.07*cos(t*.53+fi),.06*sin(t*.38+fi));
            float pearl=length(p-c)-r*(1.0+.12*pulse()*u_motion);
            if(pearl<d) {d=pearl;mat=5.0+fi;}
        }
        // Large partial arcs are distant ribs, never competing with the main shell.
        vec3 lace=p-vec3(-.20,.44,-2.9);
        lace.xy=rot(.30)*lace.xy;
        lace.z+=.14*sin(lace.x*1.3+t*.25);
        float a=atan(lace.y,lace.x);
        float rib=torus(lace,vec2(2.95+.16*sin(a*5.0+t*.24),.023));
        float rib2=torus(lace,vec2(3.12+.13*sin(a*5.0+t*.24),.012));
        if(min(rib,rib2)<d) {d=min(rib,rib2);mat=8.0;}
        float floorD=tidalFloor(p,-1.86);
        if(floorD<d) {d=floorD;mat=9.0;}
    }
    return vec2(d,mat);
}
float mapShell(vec3 p) {return shellWorld(p,false).x;}

// A quarter turn is used only by conservative bounds; surviving fields retain
// their original angle expressions and trigonometric evaluations.
vec2 flowQuarter(vec2 q,int i) {
    if(i==1) return vec2(-q.y,q.x);
    if(i==2) return -q;
    if(i==3) return vec2(q.y,-q.x);
    return q;
}
// Four luminous organisms, each braided from three independent strands, with cells and links.
vec2 mapFlow(vec3 p) {
    float t=motionTime(),best=100.0,material=0.0;
    float z=p.z,beat=pulse()*u_motion;
    float radii[4];float upper=100.0;
    bool bounded=u_flowBoundValid>.5;
    float a=z*.24+t*.16,b=z*.42+t*.20,c=z*.52,d=z*.47;
    vec2 qa=vec2(cos(a),sin(a)),qb=vec2(cos(b),sin(b));
    vec2 qc=vec2(cos(c),sin(c)),qd=vec2(cos(d),sin(d));
    const vec2 offsets[4]=vec2[4](vec2(1,0),vec2(-.89100659,.45399037),vec2(.58778548,-.80901682),vec2(-.15643486,.98768830));
    // Approximate centers are used only for rejection. A .0002 position
    // allowance covers validated float32 phase/addition errors in this domain.
    for(int i=0;i<4;i++) {
        vec2 angle=flowQuarter(qa,i),radial=flowQuarter(qb,i);
        float radius=1.14+.20*radial.y+.07*beat;
        vec2 center=vec2(angle.x*radius*1.33,angle.y*radius);
        vec2 offset=offsets[i];
        center+=.19*vec2(qc.y*offset.x+qc.x*offset.y,flowQuarter(qd,i).x);
        float r=length(p.xy-center);radii[i]=r;
        float candidate=(sqrt(r*r+.105*.105-r*.105)-.038-.006*beat)*.48+.0001+.0002*.48;
        upper=min(upper,candidate);
    }
    if(!bounded) upper=100.0;
    for(int i=0;i<4;i++) {
        float fi=float(i),phase=fi*TAU/4.0;
        float boundRadius=max(.233,max(.143+.006*beat,.106+.016*beat));
        if(bounded&&(radii[i]-boundRadius)*.48-.0001-.0002*.48>=min(best,upper)) continue;
        // Recompute the original center only for surviving groups. None of the
        // approximate trigonometry contributes to distance or material values.
        float angle=phase+z*.24+t*.16;
        float radius=1.14+.20*sin(z*.42+phase+t*.20)+.07*beat;
        vec2 center=vec2(cos(angle)*radius*1.33,sin(angle)*radius);
        center+=.19*vec2(sin(z*.52+phase*1.7),cos(z*.47+phase));
        vec2 body=p.xy-center;float r=length(body);
        if((r-boundRadius)*.48-.0001>=min(best,upper)) continue;
        bool detail=density()>.01;
        float cell=0.0,link=0.0,thread=0.0,cutoff=min(best,upper);
        if(detail) {
            float cellZ=mod(z+fi*.76+1.5,3.0)-1.5;
            cell=length(vec3(body,cellZ))-.106-.016*beat;
            float linkZ=mod(z+fi*.51+1.4,2.8)-1.4;
            link=length(vec2(length(body)-.18,linkZ))-.010;
            float helix=z*3.6+phase+t*.42;
            vec2 filament=body-.224*vec2(cos(helix),sin(helix));
            thread=(length(filament)-.009)*.48;
            cutoff=min(cutoff,min(cell*.48,min(link*.48,thread)));
        }
        // Look ahead at detail distances without choosing their materials yet.
        // The margin keeps potential strand/detail ties in the original order.
        if((r-(.143+.006*beat))*.48-.0001<cutoff) {
            for(int j=0;j<3;j++) {
                float fj=float(j),helix=z*2.35+fj*TAU/3.0+phase-t*.30;
                vec2 q=body-.105*vec2(cos(helix),sin(helix));
                float ribbon=(length(q)-.038-.006*beat)*.48;
                if(ribbon<best) {best=ribbon;material=fi;}
            }
        }
        if(detail) {
            if(cell*.48<best) {best=cell*.48;material=4.0+fi;}
            if(link*.48<best) {best=link*.48;material=8.0+fi;}
            if(thread<best) {best=thread;material=8.0+fi;}
        }
    }
    return vec2(best,material);
}

float transitProgress() {
    return u_time>=81.655&&u_time<136.100?clamp(u_local,0.0,1.0):0.0;
}
float transitPhase() {
    if(u_time<81.655||u_time>=136.100) return 0.0;
    return step(95.265,u_time)+step(108.875,u_time)+step(122.485,u_time);
}
float transitTravel() {
    float rate=.12+.88*u_motion;
    float distance=u_time*6.7;
    if(u_time>=81.655&&u_time<136.100) {
        float age=max(u_event.x,0.0),p=clamp(age/54.445,0.0,1.0);
        // The antiderivative of 6.7+16.5*p^1.4; no changing-rate times age.
        distance=81.655*6.7+6.7*age+374.309375*pow(p,2.4);
    }
    return distance*rate+.70*pulse()*u_motion;
}
float transitFloor() {return -1.94-.26*smoothstep(.18,.65,transitProgress());}
vec3 transitCoordinates(vec3 p) {
    p.z+=transitTravel();
    p.xy/=1.0+.06*pulse()*u_motion;
    p.xy=rot(.14*sin(p.z*.10)+.10*sin(motionTime()*.19))*p.xy;
    return p;
}
float mapTransit(vec3 p) {
    float t=motionTime(),mode=variant(),phase=transitPhase();
    p=transitCoordinates(p);
    vec3 q=p;q.z=mod(p.z+2.2,4.4)-2.2;
    float frame=max(box(q,vec3(2.55,1.8,.055)),-box(q,vec3(2.50,1.75,.6)))-.007;
    if(mode==1.0) {
        q.xy=rot(.785398)*q.xy;
        frame=max(box(q,vec3(2.01,2.01,.055)),-box(q,vec3(1.96,1.96,.6)))-.007;
    }
    if(mode==2.0) {
        vec2 h=abs(q.xy);
        float hexagon=max(h.x*.866025+h.y*.5,h.y)-1.83;
        frame=max(abs(hexagon)-.034,abs(q.z)-.050)-.008;
    }
    if(mode==3.0) {
        float triangle=max(q.y,max(dot(q.xy,vec2(.866025,-.5)),dot(q.xy,vec2(-.866025,-.5))))-1.28;
        frame=max(abs(triangle)-.038,abs(q.z)-.050)-.008;
    }
    vec3 r=p;r.xy=abs(r.xy)-vec2(2.51,1.76);
    float rails=length(r.xy)-.016;
    vec3 f=p;f.z=mod(p.z+.5,1.0)-.5;f.x=abs(f.x)-2.65;f.y=abs(f.y)-.95;
    float fins=box(f,vec3(.018,.045,.22));
    float detail=min(frame,min(rails,fins));
    if(phase==1.0) {
        // The enclosure peels away into two cropped overhead wings.
        vec3 wing=p;wing.z=mod(p.z+2.2,4.4)-2.2;
        wing.x=abs(wing.x)-2.75;wing.xy=rot(.30)*wing.xy;
        float spine=capsule3(wing,vec3(-.45,-1.55,0),vec3(.20,2.3,0),.031);
        float web=capsule3(wing,vec3(.20,2.3,0),vec3(-1.15,1.55,-1.6),.025);
        web=min(web,capsule3(wing,vec3(.20,2.3,0),vec3(-1.15,1.55,1.6),.025));
        detail=min(rails,min(spine,web));
        vec3 glyph=p;glyph.z=mod(p.z+3.4,6.8)-3.4;glyph.x=abs(glyph.x)-3.38;glyph.y-=.45;
        glyph.yz=rot(t*.21)*glyph.yz;
        detail=min(detail,octaWire(glyph,.67,.011));
    }
    if(phase>=2.0) {
        // Open alternating diagonal lattice: broad sky, unequal pylons, no enclosing gate.
        vec3 lattice=p;lattice.z=mod(p.z+2.2,4.4)-2.2;lattice.x=abs(lattice.x)-3.13;
        float a=capsule3(lattice,vec3(-.38,-1.92,-2.2),vec3(.52,2.30,2.2),.024);
        float b=capsule3(lattice,vec3(.52,2.30,-2.2),vec3(-.38,-1.92,2.2),.024);
        float mast=capsule3(lattice,vec3(0,-2.0,0),vec3(.29,2.80,0),.035);
        detail=min(rails,min(a,min(b,mast)));
        vec3 shard=p;shard.z=mod(p.z+4.4,8.8)-4.4;shard.x=abs(shard.x)-3.95;shard.y-=.21;
        shard.xz=rot(.30)*shard.xz;shard.y*=.65;
        detail=min(detail,octahedron(shard,.72)-.009);
        if(phase==3.0) {
            // Giant split triangles flash through foreground while the charged vista stays open.
            vec3 crown=p;crown.z=mod(p.z+4.4,8.8)-4.4;
            float triangle=max(crown.y,max(dot(crown.xy,vec2(.866025,-.5)),dot(crown.xy,vec2(-.866025,-.5))))-2.76;
            float trace=max(abs(triangle)-.027,abs(crown.z)-.047);
            trace=max(trace,.40-crown.y);
            detail=min(detail,trace);
            vec3 fin=p;fin.z=mod(p.z+1.1,2.2)-1.1;fin.x=abs(fin.x)-2.87;fin.y+=1.65;
            fin.xz=rot(.35)*fin.xz;
            detail=min(detail,box(fin,vec3(.035,.095,.44)));
        }
    }
    if(density()>.01) {
        if(phase==0.0) {
            vec3 ornament=p;ornament.z=mod(p.z+2.7,5.4)-2.7;
            ornament.x=abs(ornament.x)-1.88;ornament.y=abs(ornament.y)-1.13;
            ornament.xz=rot(.4)*ornament.xz;
            detail=min(detail,octahedron(ornament,.23)-.009);
            vec3 panel=p;panel.z=mod(p.z+1.2,2.4)-1.2;panel.x=abs(panel.x)-2.84;
            float outline=max(box(panel,vec3(.014,1.35,.73)),-box(panel,vec3(.09,1.31,.69)));
            detail=min(detail,outline);
        }
        detail=min(detail,p.y-transitFloor());
    }
    return detail;
}
vec3 transitSky(vec2 uv) {
    float phase=transitPhase(),t=motionTime();
    vec3 c=vec3(.003,.005,.015)+vec3(.025,.035,.18)*exp(-length(uv)*5.0);
    if(phase==1.0) {
        c=vec3(.008,.002,.027)+vec3(.17,.009,.13)*exp(-length(uv-vec2(.15,.12))*3.8);
        float current=uv.y-.14-.037*sin(uv.x*4.2+t*.20);
        c+=vec3(.15,.025,.21)*exp(-abs(current)*18.0);
        c+=stars(uv,-transitTravel()*.003)*.21;
    }
    if(phase>=2.0) {
        vec2 center=vec2(-.10,.095);
        float radial=length((uv-center)*vec2(.88,1.0));
        float corona=exp(-abs(radial-.23)*30.0);
        c=vec3(.006,.010,.025)+vec3(.22,.070,.008)*exp(-radial*3.0);
        c+=vec3(.38,.15,.024)*corona*.33;
        float horizon=exp(-abs(uv.y+.008)*38.0);
        c+=vec3(.055,.20,.21)*horizon;
        c+=stars(uv,-transitTravel()*.002)*.21;
        if(phase==3.0) {
            float reveal=smoothstep(129.290,132.695,u_time);
            c=mix(c,vec3(.006,.009,.029)+vec3(.12,.037,.19)*exp(-radial*2.1),.62);
            c+=vec3(.06,.52,.72)*corona*(.42+.45*reveal);
            float flare=exp(-abs(uv.x-center.x)*14.0)*exp(-abs(uv.y-center.y)*25.0);
            c+=vec3(.17,.42,.64)*flare*(.35+.75*reveal+.20*onset());
        }
    }
    return c;
}
float templeTravel() {
    float travel=motionTime()*.50;
    if(u_time>=136.100&&u_time<170.125) {
        float age=min(max(u_event.x,0.0),13.610);
        // Integrated entrance speed 14→.5, locked before the existing sky rupture.
        travel+=27.0*(1.0-exp(-age*.50))*u_motion;
    }
    return travel;
}

float templeRoofClustered(vec3 p,float cutoff) {
    float opening=rupture();
    // A conservative bound avoids expensive fragment evaluation below the vault.
    float bound=max(2.95-p.y,abs(p.x)-5.20);
    if(bound>.70) return bound;
    // This helper is called only at zero opening. All rounded plates lie
    // above y=3.252; preserve the earlier approximate return before this test.
    if((3.2519-p.y)*.72-.0001>=cutoff) return cutoff;
    float row=floor((p.z+1.575)/3.15),slab=100.0;
    // Both moving plates in a cell fit inside this loose axis-aligned box.
    // Use its L-infinity field to reject the cell before evaluating its hashes.
    // Inverse rotations give world-y support bounded by
    // 1.105*abs(sin(beta))+.050+1.525*abs(sin(gamma))+.018.
    // abs(beta)<=.88*opening and abs(gamma)<=.70*opening.
    float verticalSupport=min(1.903,.068+2.04*opening);
    vec3 clusterExtent=vec3(1.903+.82*opening,verticalSupport+1.80*opening,1.903+.575*opening);
    float clusterY=3.32+3.10*opening+.045*onset()*opening;
    // The plates move across cell boundaries, so sample the actual nearby pieces.
    for(int x=-1;x<=1;x++) for(int z=-1;z<=1;z++) {
        vec2 cell=vec2(float(x),row+float(z));
        vec3 clusterDelta=abs(p-vec3(cell.x*2.30,clusterY,cell.y*3.15))-clusterExtent;
        float clusterLower=max(clusterDelta.x,max(clusterDelta.y,clusterDelta.z))*.72;
        if(clusterLower-.0001>=min(slab,cutoff)) continue;
        for(int i=0;i<2;i++) {
            float side=float(i)*2.0-1.0,h=hash(cell+float(i)*19.71);
            vec3 center=vec3(cell.x*2.30,3.32,cell.y*3.15);
            center.x+=side*opening*(.54+.28*h);
            center.y+=opening*(1.30+3.6*h)+.045*onset()*opening;
            center.z+=(h-.5)*opening*1.15;
            vec3 q=p-center;
            // The rounded plate lies in a sphere of radius
            // length(vec3(1.105,.050,1.525))+.018 <1.903.
            // The clipping plane can only increase its field value.
            if((length(q)-1.903)*.72-.0001>=min(slab,cutoff)) continue;
            q.xz=rot(side*opening*(.16+.43*h))*q.xz;
            q.xy=rot(side*opening*(.26+.62*h))*q.xy;
            q.yz=rot((h-.5)*opening*1.4)*q.yz;
            float piece=box(q,vec3(1.105,.050,1.525))-.018;
            piece=max(piece,side*(q.x+.63*q.z)+.018+opening*.065);
            slab=min(slab,piece*.72);
        }
    }
    return slab;
}

float templeRoof(vec3 p,float cutoff) {
    // Preserve the original opened-roof expression graph.
    if(rupture()==0.0) return templeRoofClustered(p,cutoff);
    float opening=rupture();
    // A conservative bound avoids expensive fragment evaluation below the vault.
    float bound=max(2.95-p.y,abs(p.x)-5.20);
    if(bound>.70) return bound;
    // Coupling each plate's center height and rotated vertical support by h
    // gives minimum y >= 3.252-.0548*opening, including the rounded edge.
    if((3.2519-.055*opening-p.y)*.72-.0001>=cutoff) return cutoff;
    float row=floor((p.z+1.575)/3.15),slab=100.0;
    // The plates move across cell boundaries, so sample the actual nearby pieces.
    for(int x=-1;x<=1;x++) for(int z=-1;z<=1;z++) {
        vec2 cell=vec2(float(x),row+float(z));
        for(int i=0;i<2;i++) {
            float side=float(i)*2.0-1.0,h=hash(cell+float(i)*19.71);
            vec3 center=vec3(cell.x*2.30,3.32,cell.y*3.15);
            center.x+=side*opening*(.54+.28*h);
            center.y+=opening*(1.30+3.6*h)+.045*onset()*opening;
            center.z+=(h-.5)*opening*1.15;
            vec3 q=p-center;
            // The rounded plate lies in a sphere of radius
            // length(vec3(1.105,.050,1.525))+.018 <1.903.
            // The clipping plane can only increase its field value.
            if((length(q)-1.903)*.72-.0001>=min(slab,cutoff)) continue;
            q.xz=rot(side*opening*(.16+.43*h))*q.xz;
            q.xy=rot(side*opening*(.26+.62*h))*q.xy;
            q.yz=rot((h-.5)*opening*1.4)*q.yz;
            float piece=box(q,vec3(1.105,.050,1.525))-.018;
            piece=max(piece,side*(q.x+.63*q.z)+.018+opening*.065);
            slab=min(slab,piece*.72);
        }
    }
    return slab;
}

float mapCathedral(vec3 p) {
    p.z+=templeTravel();
    p.x*=1.0+.06*pulse()*u_motion;
    vec3 q=p; q.z=mod(p.z+2.1,4.2)-2.1;
    vec3 col=q; col.x=abs(col.x)-2.20; col.y+=.16;
    float flute=.017*cos(atan(col.z,col.x)*12.0+col.y*2.0);
    float pillar=max(length(col.xz)-.17-flute,abs(col.y)-1.52);
    vec3 foot=col;foot.y=abs(foot.y)-1.48;
    pillar=min(pillar,box(foot,vec3(.29,.085,.29)));
    float rings=length(vec2(length(col.xz)-.215,mod(col.y+.10,.38)-.19))-.041;
    rings=max(rings,abs(col.y)-1.52);
    float arch=length(vec2(length(vec2(q.x,q.y-.96))-2.20,q.z))-.095;
    float trim=length(vec2(length(vec2(q.x,q.y-.96))-2.045,q.z))-.032;
    arch=min(arch,trim);
    arch=max(arch,.95-q.y);
    vec3 rib=q; rib.x=abs(rib.x)-2.21;
    float side=box(rib,vec3(.075,2.95,.075));
    vec3 diamond=q-vec3(0,2.48,0); diamond.xz=rot(motionTime()*.12)*diamond.xz;
    float jewel=octahedron(diamond,.48);
    float floorD=p.y+1.7;
    float d=min(floorD,min(pillar,min(rings,min(arch,min(side,jewel)))));
    if(density()>.01) {
        vec3 window=vec3(q.z,q.y-.27,abs(p.x)-2.20);
        float rose=torus(window,vec2(.57,.024));
        rose=min(rose,torus(window,vec2(.33,.013)));
        float radius=length(window.xy),spokes=100.0;
        // The angular term cannot be less than -.013. Other maxima can
        // prove that no spoke is closer than the existing geometry.
        if(max(max(-.013,abs(radius-.38)-.18),abs(window.z)-.024)-.0001<min(d,rose)) {
            float angle=atan(window.y,window.x);
            spokes=max(abs(sin(angle*6.0))*radius*.6-.013,abs(radius-.38)-.18);
            spokes=max(spokes,abs(window.z)-.024);
        }
        d=min(d,min(rose,spokes));
        vec3 lantern=q-vec3(0,1.90,.35);
        lantern.xz=rot(motionTime()*.20)*lantern.xz;
        d=min(d,octaWire(lantern,.43,.009));
        vec3 crown=q-vec3(0,3.01,0);crown.y*=.65;
        d=min(d,octaWire(crown,.58,.012));
    }
    return min(d,templeRoof(p,d));
}

float mapAcid(vec3 p) {
    float t=motionTime();
    p/=1.0+.085*pulse()*u_motion;
    p.xz=rot(t*.23+.12*pulse()*u_motion)*p.xz;
    p.yz=rot(.13*sin(t*.32))*p.yz;
    p.xz=rot(.50*sin(p.y*1.5+t*.24))*p.xz;
    vec3 q=p/vec3(1.0,1.30,1.0);
    float d=length(q)-1.14;
    d+=.095*sin(q.x*6.0+t*.7)*sin(q.y*6.0-t*.36)*sin(q.z*6.0);
    float cavity1=length(q-vec3(.68,.13,.13))-.67;
    float cavity2=length(q-vec3(-.50,.60,.22))-.53;
    float cavity3=length(q-vec3(-.10,-.65,-.10))-.49;
    d=max(d,-min(cavity1,min(cavity2,cavity3)));
    float bead=length(q-vec3(.05,1.26,.05))-.23;
    return min(d,bead)*.70;
}

vec2 acidWorld(vec3 p) {
    float t=motionTime(),d=mapAcid(p),mat=0.0;
    if(density()>.01) {
        for(int i=0;i<3;i++) {
            float fi=float(i),a=t*.38+fi*TAU/3.0;
            vec3 center=vec3(cos(a)*1.84,sin(a*.74+fi)*.72,sin(a)*1.32);
            float pearl=length(p-center)-(.15+fi*.043);
            if(pearl<d) {d=pearl;mat=1.0+fi;}
            vec3 q=p-center;q.xy=rot(a*.6)*q.xy;
            float wing=torus(q,vec2(.36,.017));
            wing=max(wing,-q.y);
            if(wing<d) {d=wing;mat=4.0+fi;}
        }
        vec3 ribs=p-vec3(.16,-.10,-2.8);ribs.xy=rot(-.31)*ribs.xy;
        float a=atan(ribs.y,ribs.x);
        float rib=torus(ribs,vec2(2.76+.24*cos(a*5.0+t*.3),.022));
        if(rib<d) {d=rib;mat=8.0;}
        float floorD=tidalFloor(p,-2.10);
        if(floorD<d) {d=floorD;mat=9.0;}
    }
    return vec2(d,mat);
}

// A vertebral organism: connected bone, folded fins and glowing cellular junctions.
vec2 mapSpine(vec3 p) {
    float t=motionTime(),z=p.z;
    vec2 axis=vec2(.48*sin(z*.19+t*.16),-.86+.20*cos(z*.22+t*.10));
    vec3 q=vec3(p.xy-axis,mod(z+.88,1.76)-.88);
    q.xy=rot(.14*sin(z*.27+t*.10))*q.xy;
    float d=length(p.xy-axis)-.135,mat=0.0;
    float beat=.10*pulse()*u_motion;
    for(int i=0;i<2;i++) {
        float side=float(i)*2.0-1.0;
        vec3 joint=vec3(side*.74,.30,0);
        float rib=capsule3(q,vec3(0),joint,.059+beat*.10);
        rib=min(rib,capsule3(q,joint,vec3(side*1.57,1.24,-.28),.047));
        rib=min(rib,capsule3(q,joint,vec3(side*1.65,-.28,.31),.031));
        if(rib<d) {d=rib;mat=1.0;}
        vec3 leaf=q-vec3(side*1.02,.52,.02);
        leaf.xy=rot(side*.66)*leaf.xy;leaf.yz=rot(.30)*leaf.yz;
        leaf/=vec3(.88,.56,.34);
        float fin=octahedron(leaf,.81+beat)*.34;
        if(fin<d) {d=fin;mat=2.0;}
        float cell=length(q-joint)-(.11+.025*pulse()*u_motion);
        if(cell<d) {d=cell;mat=3.0;}
        if(density()>.01) {
            vec3 tip=q-vec3(side*1.57,1.24,-.28);
            float pearl=length(tip)-.08;
            if(pearl<d) {d=pearl;mat=3.0;}
            float cage=octaWire(tip,.20,.006);
            if(cage<d) {d=cage;mat=4.0;}
        }
    }
    if(density()>.01) {
        float web=abs(p.y+1.48+.08*sin(p.x*2.0+p.z*2.0+t*.2))-.013;
        web=max(web,abs(sin(p.x*2.4+sin(p.z*.3)))*.26-.017);
        if(web<d) {d=web;mat=4.0;}
    }
    return vec2(d*.68,mat);
}

// Eight physical triangular shards explode from an octahedral core and reassemble.
vec2 mapJewel(vec3 p) {
    float t=motionTime(), mode=variant();
    p.xz=rot(t*.28+mode*.44)*p.xz;
    p.yz=rot(t*.17)*p.yz;
    float breathe=.5+.5*sin(t*.75);
    float burst=(.14+.72*breathe+.70*pulse()*u_motion+.20*u_energy.x*u_motion);
    float size=1.34;
    float best=100.0, material=0.0;
    for(int i=0;i<8;i++) {
        float fi=float(i);
        vec3 signV=vec3(mod(fi,2.0)*2.0-1.0,mod(floor(fi*.5),2.0)*2.0-1.0,mod(floor(fi*.25),2.0)*2.0-1.0);
        vec3 center=signV*(size*.25+burst*.62);
        vec3 q=p-center;
        // For f=max(-v.x,-v.y,-v.z,sum(v)/sqrt(3)), |v|<=4*f.
        // Translation by size/4 lowers any face plane by at most size/4.
        // This scales the bound for the max-plane field at tetra corners.
        if(length(q)*.25-size*.25-.012-.0001>=best) continue;
        q.xz=rot(burst*.48*sin(fi*2.1+t*.22))*q.xz;
        q.xy=rot(burst*.43*cos(fi*1.7+t*.19))*q.xy;
        q*=signV;
        q+=size*.25;
        float tetra=max(max(-q.x,-q.y),max(-q.z,(q.x+q.y+q.z-size)*.57735027))-.012;
        if(tetra<best) {best=tetra;material=fi;}
    }
    // Small satellites establish foreground, depth and a second scale of motion.
    for(int i=0;i<5;i++) {
        float fi=float(i), a=fi*TAU/5.0+t*.36;
        vec3 center=vec3(cos(a)*2.2,sin(a*.7+fi)*1.50,sin(a)*1.60);
        vec3 q=p-center;
        // The octahedron field uses L1 norm; L2 is a rotation-invariant bound.
        if((length(q)-(.20+.07*breathe))*.57735027-.008-.0001>=best) continue;
        q.xz=rot(t*.7+fi)*q.xz;q.yz=rot(t*.4+fi)*q.yz;
        float shard=octahedron(q,.20+.07*breathe)-.008;
        if(shard<best) {best=shard;material=fi+8.0;}
    }
    if(density()>.01) {
        // octaWire >= .75*face-width, and L1 >= L2 before rotation.
        if((length(p)-(2.18+.20*pulse()*u_motion))*.57735027*.75-.010-.0001<best) {
            vec3 cage=p;cage.xz=rot(-t*.22+.3)*cage.xz;cage.yz=rot(.34)*cage.yz;
            float scaffolding=octaWire(cage,2.18+.20*pulse()*u_motion,.010);
            if(scaffolding<best) {best=scaffolding;material=14.0;}
        }
        for(int i=0;i<3;i++) {
            float fi=float(i),a=fi*TAU/3.0-t*.23;
            vec3 q=p-vec3(cos(a)*2.5,sin(a)*1.55,sin(a+fi)*.70);
            if((length(q)-.42)*.57735027*.75-.008-.0001>=best) continue;
            q.xy=rot(a)*q.xy;
            float wire=octaWire(q,.42,.008);
            if(wire<best) {best=wire;material=14.0;}
        }
    }
    float core=octahedron(p,.48+.10*pulse()*u_motion)-.025;
    if(core<best) {best=core;material=13.0;}
    return vec2(best,material);
}

float ellipsoid(vec3 p,vec3 r) {
    float k0=length(p/r),k1=length(p/(r*r));
    return k0*(k0-1.0)/max(k1,.0001);
}
void choose(inout vec2 result,float d,float material) {
    if(d<result.x) result=vec2(d,material);
}
float shadowShot() {return mod(floor(u_shot),8.0);}
float shadowProgress() {return fract(u_time*141.0/(60.0*8.0));}

// Sleek feline anatomy. The face has only small intermittent eye slits.
vec2 shadowModel(vec3 p,float phase) {
    float t=motionTime(),shot=shadowShot();
    float run=shot==2.0?1.0:0.0,leap=shot==5.0?1.0:0.0,crouch=shot==6.0?1.0:0.0;
    float bound=length(p-vec3(-.15,.02,0))-2.05;
    if(bound>.18) return vec2(bound,0.0);
    float headY=.52-.18*crouch+.06*leap-.10*run+.018*run*cos(t*6.7+phase)*u_motion;
    p.x/=1.0+.065*run*sin(t*6.7+phase)*u_motion;
    float breath=.012*sin(t*TAU*2.35+phase)*u_motion;
    float body=ellipsoid(p-vec3(-.06,.03-.11*crouch+breath,0),vec3(.86,.30+.008*pulse()*u_motion,.245));
    float haunch=ellipsoid(p-vec3(-.62,-.12-.08*crouch,0),vec3(.345,.39,.285));
    float shoulder=ellipsoid(p-vec3(.57,.075-.08*crouch-.045*run,0),vec3(.29,.33,.265));
    body=smin(body,haunch,.14);body=smin(body,shoulder,.13);
    body=smin(body,capsule3(p,vec3(.54,.17-.11*crouch,0),vec3(.89,headY-.10,.01),.174),.11);
    float jaw=.222-.040*smoothstep(.08,.24,headY-p.y);
    float head=ellipsoid(p-vec3(1.00,headY,0),vec3(.255,.240,jaw));
    head=smin(head,ellipsoid(p-vec3(1.155,headY-.089,.006),vec3(.095,.089,.115)),.055);
    body=smin(body,head,.08);
    vec2 result=vec2(body,0.0);
    // Two wedge ears are part of the silhouette, with no colored inner triangles.
    for(int i=0;i<2;i++) {
        float side=float(i)*2.0-1.0;
        vec3 ear=p-vec3(1.00+side*.037,headY+.218,side*.144);
        ear.xy=rot(-.12+.025*sin(t*.82+phase))*ear.xy;
        float triangle=max(max(abs(ear.x)*.91+ear.y*.65-.077,abs(ear.z)*.91+ear.y*.65-.077),-ear.y-.048);
        choose(result,triangle-.013,0.0);
        float gait=t*(2.6+run*4.1)+phase+float(i)*PI;
        float swing=sin(gait)*u_motion;
        float lift=max(sin(gait+.3),0.0)*(.16+.12*run)*u_motion;
        vec3 frontHip=vec3(.61,-.15-.08*crouch,side*.170);
        vec3 frontKnee=vec3(.70+.08*swing,-.56+.15*crouch+.18*leap,side*.15);
        vec3 frontFoot=vec3(.77+(.22+.16*run)*swing+.48*leap,-.98+.37*crouch+.60*leap+lift,side*.145);
        choose(result,capsule3(p,frontHip,frontKnee,.060),0.0);
        choose(result,capsule3(p,frontKnee,frontFoot,.042),0.0);
        choose(result,capsule3(p,frontFoot,frontFoot+vec3(.082,.018,0),.033),0.0);
        float hindSwing=sin(gait+1.6)*u_motion;
        float hindLift=max(sin(gait+1.9),0.0)*(.16+.12*run)*u_motion;
        vec3 hindHip=vec3(-.64,-.18-.07*crouch,side*.18);
        vec3 hindKnee=vec3(-.82+.095*hindSwing,-.56+.17*crouch+.17*leap,side*.16);
        vec3 hindFoot=vec3(-.64+(.22+.16*run)*hindSwing-.48*leap,-.98+.37*crouch+.61*leap+hindLift,side*.145);
        choose(result,capsule3(p,hindHip,hindKnee,.085),0.0);
        choose(result,capsule3(p,hindKnee,hindFoot,.043),0.0);
        choose(result,capsule3(p,hindFoot,hindFoot+vec3(.079,.019,0),.033),0.0);
        // Only the near-side anatomical slit is visible in the profile macros.
        vec3 eyeSide=p-vec3(1.095,headY+.037,side*.202);
        choose(result,ellipsoid(eyeSide,vec3(.045,.008,.012)),1.0);
    }
    // Long, continuously curved tail, gently hooked at its tip.
    vec3 previous=vec3(-.72,.03-.11*crouch,0);
    for(int i=0;i<7;i++) {
        float f=(float(i)+1.0)/7.0;
        float hook=smoothstep(.68,1.0,f);
        vec3 endpoint=vec3(-.72-1.04*f+.20*hook*hook,
                          .03-.11*crouch+.54*sin(f*1.42)+.12*hook+.07*sin(t*.75+phase)*f,
                          .09*sin(f*3.4+t*.47+phase)*f);
        if(leap>.5) endpoint.y-=.42*f;
        choose(result,capsule3(p,previous,endpoint,.064-.043*f),0.0);
        previous=endpoint;
    }
    return result;
}

float shadowScale(int index) {
    float shot=shadowShot();
    if(index==0) return shot==3.0?.83:shot==4.0?1.22:1.0;
    return index==1?.47:.33;
}
vec3 shadowCoordinates(vec3 p,int index) {
    float t=motionTime(),shot=shadowShot(),fi=float(index),size=shadowScale(index);
    vec3 center=vec3(.22,.07,0);
    float translation=(shadowProgress()-.5)*(shot==2.0?2.20:shot==5.0?.85:.65)*u_motion;
    if(shot==0.0||shot==2.0||shot==5.0) center.x+=translation;
    float yaw=.0,roll=.0;
    if(shot==1.0) {center=vec3(0);yaw=-.10;}
    if(shot==7.0) {center=vec3(0);yaw=.12;}
    if(shot==2.0) {center.y+=.09*sin(t*6.7)*u_motion;yaw=-.23;roll=.035*sin(t*6.7);}
    if(shot==3.0) {center.x+=.56*sin(t*.52);center.y=-.04;yaw=.10;}
    if(shot==4.0) {center=vec3(-1.58,-.10,2.1);yaw=-.12;}
    if(shot==5.0) {center.y=.35+.20*sin(t*.83)*u_motion;roll=-.10;yaw=.12;}
    if(shot==6.0) {center.y=-.24;yaw=.12;}
    if(index==1) {center=vec3(-1.72+.45*sin(t*.46+1.9),-.36,-2.40);yaw=PI;}
    if(index==2) {center=vec3(1.70+.43*sin(t*.39+4.0),.20,-3.5);yaw=.07;}
    if(shot==4.0&&index==1) {center=vec3(1.25,-.16,-3.1);yaw=0.0;}
    vec3 q=(p-center)/size;
    q.xy=rot(roll)*q.xy;q.xz=rot(yaw)*q.xz;
    return q;
}
vec2 shadowWorld(vec3 p) {
    if(u_shot>=8.0) return vec2(100.0,0.0);
    vec2 result=shadowModel(shadowCoordinates(p,0),0.0);
    result.x*=shadowScale(0);
    return result;
}

// An open circuit track: road islands, asymmetric hurdles, physical checkpoint bars.
vec2 circuitAxis(float z) {
    return vec2(1.55*sin(z*.065)+.40*sin(z*.19),.72*sin(z*.075)+.28*cos(z*.17));
}
vec2 arcadeWorld(vec3 p) {
    vec2 axis=circuitAxis(p.z);
    vec3 q=vec3(p.xy-axis,p.z);
    float cell=floor((p.z+3.6)/7.2),h=hash(vec2(cell,17.8));
    q.z=mod(p.z+3.6,7.2)-3.6;
    float road=box(q-vec3(0,-1.65,0),vec3(1.85,.072,3.31));
    float d=road,material=0.0;
    vec3 rail=q;rail.x=abs(rail.x)-1.90;
    float sideRail=box(rail-vec3(0,-1.49,0),vec3(.033,.040,3.37));
    if(sideRail<d) {d=sideRail;material=1.0;}
    // Each checkpoint is an open trapezoidal arch, with a moving signal square.
    float checkpoint=capsule3(q,vec3(-2.14,-1.48,0),vec3(-1.78,2.04,0),.026);
    checkpoint=min(checkpoint,capsule3(q,vec3(2.14,-1.48,0),vec3(1.78,2.04,0),.026));
    checkpoint=min(checkpoint,capsule3(q,vec3(-1.78,2.04,0),vec3(1.78,2.04,0),.026));
    if(checkpoint<d) {d=checkpoint;material=3.0;}
    vec3 signal=q-vec3(mix(-1.30,1.30,h),1.73,0);
    float square=max(box(signal,vec3(.22,.22,.030)),-box(signal,vec3(.176,.176,.07)));
    if(square<d) {d=square;material=4.0;}
    // Slalom islands sit to alternate sides; the middle route remains readable.
    vec3 hurdle=q-vec3((h>.5?1.0:-1.0)*1.04,-.95,2.16);
    float obstacle=box(hurdle,vec3(.49,.63,.25))-.025;
    if(obstacle<d) {d=obstacle;material=2.0;}
    vec3 cap=hurdle-vec3(0,.67,0);
    float light=box(cap,vec3(.48,.023,.26));
    if(light<d) {d=light;material=4.0;}
    // Unequal remote circuitry gives scale without enclosing the track in a tunnel.
    vec3 tower=q;float side=h>.5?1.0:-1.0;
    tower.x-=side*(4.2+h*2.0);tower.y-=.45+1.8*h;
    float towerD=box(tower,vec3(.54,.95+1.2*h,.66));
    if(towerD<d) {d=towerD;material=5.0;}
    vec3 header=tower-vec3(0,.95+1.2*h,0);
    float towerBeacon=box(header,vec3(.555,.025,.675));
    if(towerBeacon<d) {d=towerBeacon;material=6.0;}
    vec3 beacon=q-vec3(-side*3.25,1.85+h,1.1);
    beacon.xy=rot(.785398)*beacon.xy;
    float collect=max(box(beacon,vec3(.16,.16,.026)),-box(beacon,vec3(.116,.116,.07)));
    if(collect<d) {d=collect;material=4.0;}
    return vec2(d*.80,material);
}

// An open excavation of unequal crystal cliffs; the camera travels between them.
vec2 canyonWorld(vec3 p) {
    float t=motionTime();
    float d=p.y+1.86+.035*sin(p.x*2.2+p.z*.51+t*.20),material=0.0;
    float row=floor((p.z+3.7)/7.4);
    for(int sideIndex=0;sideIndex<2;sideIndex++) for(int adjacent=-1;adjacent<=1;adjacent++) {
        float side=float(sideIndex)*2.0-1.0,z=(row+float(adjacent))*7.4;
        // Rotated weighted-L1 support bounds over every h in [0,1].
        // Coordinate padding and distance slack round outward; survivors below
        // retain the original field arithmetic and material comparison order.
        vec3 cliffGap=max(abs(p-vec3(side*4.11,1.46,z))-vec3(.212,.552,.172),vec3(0));
        float cliffLower=max((max(max(cliffGap.x/2.16,cliffGap.y/5.35),cliffGap.z/3.56)-1.0)*.57735027*2.16,-p.y-1.93)-.01;
        vec3 satelliteGap=max(abs(p-vec3(side*2.605,-.69,z+2.26))-vec3(.147,.002,.002),vec3(0));
        float satelliteLower=(max(max(satelliteGap.x/.55,satelliteGap.y/1.55),satelliteGap.z/.81)-1.0)*.57735027*.55-.01;
        bool bounded=all(lessThanEqual(abs(p),vec3(1024)))&&abs(d)<=128.0;
        if(bounded&&cliffLower>=d&&satelliteLower>=d) continue;
        float h=hash(vec2(row+float(adjacent),float(sideIndex)*14.91+2.3));
        if(!bounded||cliffLower<d) {
        vec3 center=vec3(side*(3.90+.42*h),.91+1.10*h,z+.34*(h-.5));
        vec3 q=p-center;
        q.xy=rot(side*(.15+.14*h))*q.xy;q.yz=rot((h-.5)*.43)*q.yz;
        float cliff=octahedron(q/vec3(2.16,4.15+1.2*h,3.56),1.0)*2.16;
        cliff=max(cliff,-p.y-1.93);
        if(cliff<d) {d=cliff;material=1.0+float(sideIndex);}
        }
        if(!bounded||satelliteLower<d) {
        vec3 shard=p-vec3(side*(2.75-.29*h),-.69,z+2.26);
        shard.xy=rot(-side*.24)*shard.xy;shard.yz=rot(.16)*shard.yz;
        float satellite=octahedron(shard/vec3(.55,1.15+.40*h,.81),1.0)*.55;
        if(satellite<d) {d=satellite;material=3.0+float(sideIndex);}
        }
    }
    return vec2(d*.72,material);
}

float mapWorld(vec3 p, int scene) {
    if(scene==0) return mapShell(p);
    if(scene==1) return mapFlow(p).x;
    if(scene==2) return mapTransit(p);
    if(scene==3) return mapCathedral(p);
    if(scene==4) return mapJewel(p).x;
    if(scene==5) return acidWorld(p).x;
    if(scene==7) return shellWorld(p,true).x;
    if(scene==8) return mapSpine(p).x;
    if(scene==9) return u_shot==9.0?canyonWorld(p).x:shadowWorld(p).x;
    if(scene==10) return arcadeWorld(p).x;
    return mapAcid(p);
}
vec3 normalAt(vec3 p,int s) {
    vec2 e=vec2(.0015,-.0015);
    return normalize(e.xyy*mapWorld(p+e.xyy,s)+e.yyx*mapWorld(p+e.yyx,s)+e.yxy*mapWorld(p+e.yxy,s)+e.xxx*mapWorld(p+e.xxx,s));
}

float jewelEdge(vec3 p,float material) {
    if(material>=8.0) return .0;
    float t=motionTime(),mode=variant();
    p.xz=rot(t*.28+mode*.44)*p.xz;p.yz=rot(t*.17)*p.yz;
    float breathe=.5+.5*sin(t*.75);
    float burst=.14+.72*breathe+.70*pulse()*u_motion+.20*u_energy.x*u_motion;
    float size=1.34,fi=material;
    vec3 signV=vec3(mod(fi,2.0)*2.0-1.0,mod(floor(fi*.5),2.0)*2.0-1.0,mod(floor(fi*.25),2.0)*2.0-1.0);
    vec3 q=p-signV*(size*.25+burst*.62);
    q.xz=rot(burst*.48*sin(fi*2.1+t*.22))*q.xz;q.xy=rot(burst*.43*cos(fi*1.7+t*.19))*q.xy;
    q*=signV;q+=size*.25;
    vec4 plane=vec4(-q,(q.x+q.y+q.z-size)*.57735027);
    float hiA=max(plane.x,plane.y),loA=min(plane.x,plane.y),hiB=max(plane.z,plane.w),loB=min(plane.z,plane.w);
    float largest=max(hiA,hiB),second=max(min(hiA,hiB),max(loA,loB));
    return exp(-(largest-second)*95.0);
}

vec3 flowParticles(vec2 uv,vec3 ro,vec3 forward,vec3 right,vec3 up,float lens) {
    float t=motionTime();vec3 c=vec3(0);
    for(int i=0;i<44;i++) {
        float fi=float(i),h=hash(vec2(fi,6.7));
        float z=fract(h-t*.072)*18.0+.5;
        float phase=fi*2.399963;
        vec3 pos=vec3(sin((ro.z+z)*.41+phase)*2.2,cos((ro.z+z)*.33+phase)*1.7,ro.z+z);
        vec3 rel=pos-ro;float depth=dot(rel,forward);
        if(depth>.15) {
            vec2 screen=vec2(dot(rel,right),dot(rel,up))/depth*lens;
            vec2 d=uv-screen;
            float size=.003+.004/(1.0+depth*.4);
            // Outside this footprint each Gaussian/tail contribution is below
            // exp(-22). Across all 44 particles omitted radiance is <1.3e-8.
            // Keep the surviving expressions unchanged for deterministic hashes.
            if(abs(d.x)>22.0*size||abs(d.y)>22.0*(.007+.036/depth)) continue;
            float spark=exp(-dot(d,d)/(size*size));
            float tail=exp(-abs(d.x)/size)*exp(-abs(d.y)/(.007+.036/depth))*u_motion;
            vec3 color=mix(vec3(.05,.73,1.0),vec3(1.0,.08,.15),step(.73,h));
            c+=color*(spark*.50+tail*.15)/(1.0+depth*.08);
        }
    }
    return c;
}

vec3 waterSurface(vec3 p,vec3 reflected,int scene) {
    float t=motionTime();
    float vein=abs(sin(p.x*2.3+p.z*1.1+t*.30)+sin(p.z*3.7-p.x*1.2-t*.40));
    float caustic=exp(-vein*14.0);
    float glitter=pow(.5+.5*sin(p.z*22.0+sin(p.x*2.0)*3.0+t*.40),20.0);
    vec3 cold=scene==9?vec3(.07,.018,.15):scene==5?vec3(.045,.075,.01):vec3(.015,.16,.20);
    vec3 c=vec3(.002,.012,.023)+reflected*.17+cold*caustic*.44;
    c+=vec3(.20,.015,.04)*exp(-abs(p.x-.3)*2.0)*glitter*.21;
    c*=.63+.37*smoothstep(.0,3.0,abs(p.x-.2));
    return c;
}
// Directional colored-noise landscapes. The silhouettes remain a black absence.
vec3 ionSky(vec2 uv,float age) {
    float t=motionTime(),depth=0.0;
    vec3 c=vec3(.002,.004,.014);
    // Parallel luminous weather fronts have unequal depths and their own currents.
    for(int i=0;i<5;i++) {
        float fi=float(i),z=1.4+fi*1.15;
        vec2 p=uv*z+vec2(t*(.020+fi*.011),fi*2.17);
        float warp=fbm(p*2.3+vec2(t*.034,-t*.019));
        float front=p.y+.36*sin(p.x*1.8+fi*1.2)+.37*(warp-.5)-.13;
        float veil=exp(-abs(front)*(9.0+fi*4.0));
        float broken=smoothstep(.25,.63,noise(p*14.0+fi));
        vec3 tint=i==1||i==4?vec3(.47,.015,.18):vec3(.018,.37,.54);
        c+=tint*veil*(.38+.62*broken)/(1.0+fi*.40);
        depth+=veil*.16;
    }
    float boltY=.16*sin(uv.x*3.6+t*.20)+.023*noise(vec2(uv.x*64.0,floor(t*3.0)))-.065;
    float lightning=exp(-abs(uv.y-boltY)*620.0)*onset();
    c+=vec3(.52,.73,.93)*lightning*1.75;
    // A slowly revealing aperture anchors the weather, rather than uniform wallpaper.
    vec2 opening=uv-vec2(.24,.13);
    float aperture=exp(-dot(opening,opening)*11.0);
    c+=vec3(.035,.075,.15)*aperture*(.25+.75*smoothstep(0.0,12.0,age));
    return c*(1.0+.14*kickImpulse());
}
vec3 lightCanyon(vec2 uv,float age) {
    float t=motionTime();
    vec3 c=vec3(.011,.020,.044);
    c+=vec3(.045,.26,.28)*exp(-length(uv-vec2(.03,-.07))*3.2);
    c+=vec3(.36,.09,.026)*exp(-length(uv-vec2(-.25,.19))*3.0);
    vec2 weather=uv*3.4+vec2(t*.014,-t*.009);
    float drift=fbm(weather*2.1+vec2(0,t*.022));
    float veil=smoothstep(.35,.65,drift);
    c+=vec3(.038,.066,.09)*veil*(.45+.55*smoothstep(-.22,.20,uv.y));
    float flare=exp(-length((uv-vec2(.03,.05))*vec2(5.0,13.0)));
    c+=vec3(.24,.38,.32)*flare*(.7+.5*onset());
    return c;
}

vec3 spectralHorizon(vec2 uv,float age) {
    float t=motionTime();
    vec3 c=vec3(.009,.002,.017);
    c+=vec3(.12,.026,.10)*exp(-length(uv-vec2(.3,.18))*2.3);
    // Slow near-black dune sheets cut through broad flowing ribbons of light.
    for(int i=4;i>=0;i--) {
        float fi=float(i),z=1.4+fi*.72;
        float ridge=-.23+fi*.064+.032*sin(uv.x*(2.3+fi)+t*(.12+fi*.025)+fi);
        ridge+=.018*noise(vec2(uv.x*12.0+t*.08,fi*2.2));
        float mask=1.0-smoothstep(ridge-.005,ridge+.005,uv.y);
        vec3 dune=vec3(.002,.004,.013)*(1.0+fi*.60);
        float contour=exp(-abs(uv.y-ridge)*(125.0+fi*24.0));
        dune+=mix(vec3(.021,.27,.35),vec3(.31,.018,.13),fi/4.0)*contour*.72;
        c=mix(c,dune,mask);
        float stream=exp(-abs(uv.y-ridge-.055)*(42.0+fi*8.0));
        stream*=smoothstep(.3,.7,noise(vec2(uv.x*9.0+t*(.12+fi*.035),fi)));
        c+=vec3(.019,.20,.25)*stream/(1.0+fi*.3);
    }
    float sun=length(uv-vec2(-.19,.21));
    float orb=exp(-abs(sun-.102)*160.0);
    c+=vec3(.48,.065,.024)*orb*(.58+.42*onset());
    float texture=noise(uv*120.0+vec2(t*.04,0))-.5;
    return c+vec3(.01,.02,.025)*texture*.12;
}
vec3 shadowField(vec2 uv) {
    float age=max(u_event.x,0.0);
    uv=rot(.028*onset()*u_motion)*uv;
    uv*=1.0-.027*kickImpulse()*u_motion;
    float field=u_shot>=8.0?mod(floor(u_shot)-8.0,3.0):mod(floor(u_event.x/8.0),3.0);
    if(field<.5) return ionSky(uv,age);
    if(field<1.5) return lightCanyon(uv,age);
    return spectralHorizon(uv,age);
}

// Only temple cloud noise uses the optional hash lattice. Keep the original
// interpolation arithmetic and direct fallback; geometry noise is unchanged.
float templeNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    if(u_noiseCacheValid>1.5) {
        vec4 h=texelFetch(u_noiseCache,ivec2(i+vec2(256)),0);
        return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
    }
    if(u_noiseCacheValid>.5&&all(greaterThanEqual(i,vec2(-256)))&&all(lessThan(i,vec2(256)))) {
        vec4 h=texelFetch(u_noiseCache,ivec2(i+vec2(256)),0);
        return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
    }
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float templeFbm(vec2 p) {
    float f = .55 * templeNoise(p);
    p = mat2(.8,.6,-.6,.8) * p * 2.1;
    f += .27 * templeNoise(p);
    p = mat2(.8,.6,-.6,.8) * p * 2.2;
    return f + .13 * templeNoise(p);
}
// Clouds sit in the opened vault; translational parallax follows the viewing ray.
vec3 templeClouds(vec3 ro,vec3 rd) {
    float opened=rupture(),t=motionTime();
    float storm=smoothstep(6.805,8.0,u_event.y);
    vec3 c=vec3(.010,.016,.043);
    c+=vec3(.09,.035,.16)*pow(max(rd.y+.22,0.0),2.0);
    // Advection is linear from rupture to the chapter cut. A changing rate times
    // total age caused a transient speed spike followed by an apparent slowdown.
    float transport=t*.14+max(u_event.y,0.0)*2.35*u_motion;
    vec3 sunDir=normalize(vec3(-.24,.20,1.0));
    float sun=pow(max(dot(rd,sunDir),0.0),28.0);
    c+=vec3(.73,.26,.08)*sun*(.35+.65*opened);
    if(u_cloudVolumeValid>.5) {
        c+=texture(u_cloudVolume,gl_FragCoord.xy/u_resolution).rgb;
    } else {
    float transmittance=1.0;
    for(int i=0;i<12;i++) {
        float fi=float(i),distance=9.0+fi*3.5;
        vec3 p=ro+rd*distance;
        p.z+=transport*2.2;p.x+=transport*.4;
        vec2 weather=p.xz*.054;
        vec2 warp=vec2(templeFbm(weather+vec2(t*.015,4.2)),templeFbm(weather*.93+vec2(8.1,-t*.012)))-.45;
        float cloud=templeFbm(weather*2.8+warp*3.2);
        float body=smoothstep(.34,.65,cloud);
        float ceiling=exp(-abs(p.y-(5.8+1.8*sin(p.z*.035)))*.19);
        body*=ceiling*(.060+.095*opened);
        float edge=smoothstep(.43,.65,cloud)-smoothstep(.64,.77,cloud);
        vec3 cold=mix(vec3(.040,.056,.13),vec3(.26,.33,.47),cloud);
        vec3 lit=mix(cold,vec3(.79,.39,.15),sun*.75+edge*.28);
        lit+=vec3(.023,.19,.24)*storm*edge*.44;
        c+=lit*body*transmittance*1.95;
        transmittance*=1.0-body;
    }
    }
    // A nearby folded cloud sheet supplies crisp billows over the distant volume.
    float nearDistance=clamp((7.10-ro.y)/max(rd.y,.105),10.0,53.0);
    vec3 nearPoint=ro+rd*nearDistance;
    vec2 sheet=nearPoint.xz*.092+vec2(transport*.062,transport*.095);
    vec2 curl=vec2(templeFbm(sheet*1.4+vec2(2.7,t*.014)),templeFbm(sheet*1.37+vec2(9.4,-t*.010)))-.46;
    float macro=templeFbm(sheet*2.75+curl*3.8);
    float fine=templeNoise(sheet*18.0+curl*6.0);
    float cloudBank=smoothstep(.34,.65,macro);
    float cloudEdge=exp(-abs(macro-.51)*19.0);
    float lightFace=smoothstep(.41,.66,macro+.055*fine);
    vec3 billow=mix(vec3(.032,.039,.10),vec3(.32,.43,.58),lightFace);
    billow+=vec3(.72,.34,.09)*cloudEdge*(.32+.68*sun);
    billow+=vec3(.025,.19,.25)*storm*cloudEdge*.22;
    float upper=smoothstep(-.08,.36,rd.y);
    c=mix(c,c*.68+billow*(.72+.28*fine),cloudBank*upper*(.22+.60*opened));
    float bolt=pow(max(0.0,1.0-abs(rd.x+.05+.025*sin(rd.y*80.0))*220.0),3.0);
    c+=vec3(.15,.45,.70)*bolt*onset()*storm*.8;
    // Cloud shapes can darken locally; their steady radiance never fades on exit.
    float lightFloor=.045+.100*opened;
    float luminance=dot(c,vec3(.2126,.7152,.0722));
    c*=max(1.0,lightFloor/max(luminance,.001));
    return c;
}
vec3 arcadeSky(vec2 uv,vec3 ro,vec3 rd) {
    vec3 c=vec3(.004,.009,.026);
    float horizon=exp(-abs(rd.y+.09)*5.7);
    c+=vec3(.035,.14,.20)*horizon;
    c+=vec3(.074,.015,.093)*exp(-length(uv-vec2(-.15,.10))*3.4);
    float distance=43.0;
    vec3 p=ro+rd*distance;
    vec2 pixel=floor(p.xy*1.8)/1.8;
    float disc=length((pixel-vec2(circuitAxis(ro.z).x+.8,3.2))*vec2(.65,1.0));
    c+=vec3(.38,.025,.34)*(1.0-smoothstep(3.35,3.45,disc))*.45;
    c+=vec3(.10,.50,.65)*exp(-abs(disc-3.45)*9.0)*1.35;
    // Three cropped skyline layers sit beyond the course, with sparse beacon roofs.
    for(int i=2;i>=0;i--) {
        float fi=float(i),depth=34.0+fi*19.0;
        vec3 world=ro+rd*depth;
        vec2 route=circuitAxis(ro.z+depth);
        float cell=floor(world.x*.29),h=hash(vec2(cell,floor(world.z*.018)+fi*9.7));
        float height=-.5+floor(h*6.0)*.55;
        float flank=smoothstep(2.6,4.5,abs(world.x-route.x));
        float edge=world.y-route.y-height;
        float mass=(1.0-smoothstep(-.075,.075,edge))*flank;
        vec3 shade=vec3(.009,.018,.048)*(1.0+fi*.48);
        float seam=exp(-abs(fract(world.x*.29)-.5)*38.0);
        shade+=vec3(.022,.085,.13)*seam*.55;
        c=mix(c,shade,mass*.65);
        float roof=exp(-abs(edge)*19.0)*flank;
        float gate=step(.58,h);
        vec3 neon=fi==1.0?vec3(.44,.025,.26):vec3(.023,.27,.36);
        c+=neon*roof*gate/(1.0+fi*.42);
        float windows=pow(.5+.5*cos(world.y*7.2),34.0)*step(.74,hash(vec2(cell,floor(world.y*1.1))));
        c+=vec3(.027,.11,.18)*windows*mass*.24;
    }
    float rows=pow(.5+.5*cos(p.y*8.0),28.0);
    c*=.88+.12*rows;
    return c;
}

vec3 shadowSurface(vec3 p,vec3 n,vec3 rd,float material,vec3 backdrop) {
    int index=int(floor(material/100.0));float kind=mod(material,100.0);
    vec3 q=shadowCoordinates(p,index);
    float t=motionTime(),shot=shadowShot();
    float rim=pow(1.0-max(dot(n,-rd),0.0),3.3);
    float turbulence=fbm(q.xy*5.2+vec2(q.z*1.7+t*.065,-t*.10));
    float lightPatch=smoothstep(.39,.76,turbulence);
    vec3 cold=vec3(.017,.18,.25),violet=vec3(.19,.013,.15);
    vec3 color=vec3(.0007,.0004,.0015);
    color+=mix(cold,violet,smoothstep(.47,.66,turbulence))*pow(lightPatch,3.0)*.050;
    float contour=pow(rim,1.0)*(.15+.40*lightPatch);
    contour*=.40+.60*smoothstep(-.45,.7,dot(n,normalize(vec3(-.4,.9,1.0))));
    color+=mix(cold,violet,lightPatch)*contour;
    if(kind==1.0) {
        float signal=.5+.5*sin(t*.72+float(index)*2.1);
        float glimpse=smoothstep(.63,.95,signal);
        if(shot==1.0||shot==7.0) glimpse=.32+.58*smoothstep(.35,.90,signal);
        color=mix(vec3(.001,.001,.003),vec3(.09,.59,.62),glimpse*(.25+.75*pulse()));
    }
    if(shot==7.0) {
        float interference=smoothstep(.62,.83,fbm(q.xy*7.0+vec2(t*.17,-t*.07)));
        color=mix(color,backdrop*.67,interference*.78);
    }
    return color;
}

vec3 rayWorld(vec2 uv,int scene) {
    if(scene==0) uv-=vec2(.24*u_poster+.06*(1.0-u_poster),.005);
    if(scene==9&&u_shot<8.0) uv.x-=(shadowShot()==4.0?.10:.26)*smoothstep(.95,1.40,u_resolution.x/u_resolution.y);
    float t=motionTime();
    vec3 ro=vec3(0,0,5.1), ta=vec3(0);
    float lens=1.75;
    float mode=variant();
    if(scene!=0&&scene!=10) {
        float kick=pulse()*u_motion;
        uv*=1.0-.038*kick;
        if(mod(floor(u_seed),3.0)==2.0) uv=rot(.016*kick)*uv;
    }
    if(scene==0) {
        ro=vec3(.26*sin(t*.17),.20*cos(t*.19),5.50-.15*pulse());ta=vec3(0,-.02,0);lens=1.86;
        if(u_poster<.5) {
            if(mode==1.0) {ro=vec3(.50,.34,5.10);lens=1.75;}
            if(mode==2.0) {ro=vec3(-.80,-.28,6.15);lens=1.88;}
            if(mode==3.0) {ro=vec3(-.68,.50,4.90);lens=1.56;}
        }
    }
    if(scene==1) {
        uv=rot((mode==3.0?.48:.10)*sin(t*.18))*uv;
        ro=vec3(.14*sin(t*.21),.10*cos(t*.18),-t*1.75);
        ta=ro+vec3(.04*sin(t*.22),.01,1.0);lens=1.26;
        if(mode==1.0) {ro.x-=.40;ta=ro+vec3(.10,.03,1.0);lens=1.15;}
        if(mode==2.0) {ro.y+=.26;ta=ro+vec3(.10,-.11,1.0);lens=1.44;}
        if(mode==3.0) {ro.x+=.38;ta=ro+vec3(-.08,.04,1.0);lens=1.24;}
        lens-=.09*pulse()*u_motion;
    }
    if(scene==2) {
        float open=smoothstep(.18,.65,transitProgress()),age=max(u_event.x,0.0);
        float bank=(mode==1.0?.32:mode==3.0?-.20:.06)*sin(t*.27)+.18*open*sin(age*.23)*u_motion;
        uv=rot(bank)*uv;
        ro=vec3(.22*sin(t*.22)+.60*open*sin(age*.12),.17*cos(t*.17)+.20*open,0);
        ta=ro+vec3(.08*sin(t*.19)+.04*open*sin(age*.19),.05-.09*open,1);
        lens=1.10-.15*open-.05*pulse()*u_motion;
        if(mode==2.0) ro.xy+=vec2(.36,-.18);
    }
    if(scene==3) {
        ro=vec3(.28*sin(t*.11),-.35,-5.0);ta=vec3(0,.60,1.0);lens=1.55;
        if(mode==1.0) {ro.y=-1.20;ta.y=.35;lens=1.40;}
        if(mode==2.0) {ro.x=1.15;ta.x=-.25;ta.y=.15;lens=1.65;}
        if(mode==3.0) {ro.y=.15;ta.y=1.45;lens=1.30;}
        float opening=rupture();
        float rise=opening*u_motion;
        ro.y+=rise*.35;ta.y+=rise*.86;
        float sidePan=rise*.34*sin(max(u_event.y,0.0)*.29)*u_motion;
        ro.x+=sidePan;ta.x+=sidePan;
        lens-=.04*pulse()*u_motion+.11*rise;
    }
    if(scene==4) {
        ro=vec3(0,0,7.8);ta=vec3(0);lens=1.65;
        if(mode==1.0) {ro=vec3(1.3,.60,6.9);lens=1.55;}
        if(mode==2.0) {ro=vec3(-1.1,-.4,6.9);lens=1.48;}
        if(mode==3.0) {ro=vec3(.0,.7,8.6);lens=1.85;}
        ro.xy+=vec2(sin(t*.17),cos(t*.13))*.18;
        lens+=.08*pulse()*u_motion;
    }
    if(scene==5) {
        ro=vec3(.1*sin(t*.24),.05,5.3);lens=1.75;
        if(mode==1.0) {ro.x=.70;ro.y=.65;lens=1.5;}
        if(mode==2.0) {ro.y=-.60;ro.z=4.8;lens=1.42;}
        if(mode==3.0) {ro.x=-1.1;ro.z=5.8;lens=1.85;}
    }
    if(scene==7) {
        ro=vec3(.45*sin(t*.23),.20,7.25);ta=vec3(0,.08,0);lens=1.82;
        if(mode==1.0) {ro=vec3(-.95,.45,6.65);lens=1.78;}
        if(mode==2.0) {ro=vec3(1.05,-.25,7.5);lens=1.86;}
        if(mode==3.0) {ro=vec3(-.1,.95,6.8);lens=1.62;}
        lens+=.09*pulse()*u_motion;
    }
    if(scene==8) {
        ro=vec3(.24*sin(t*.24),.10,-t*2.35);ta=ro+vec3(.06,-.22,1.0);lens=1.32;
        if(mode==1.0) {ro.x+=.58;ta=ro+vec3(-.17,-.18,1.0);lens=1.47;}
        if(mode==2.0) {ro.y+=.55;ta=ro+vec3(.10,-.32,1.0);lens=1.24;}
        if(mode==3.0) {ro.y-=.25;ta=ro+vec3(-.08,.10,1.0);lens=1.36;}
        lens-=.075*pulse()*u_motion;
    }
    if(scene==9) {
        float shot=shadowShot(),aspect=u_resolution.x/u_resolution.y;
        float fit=clamp(aspect/(shot==2.0?1.12:.96),.34,1.0);
        float following=(shadowProgress()-.5)*(shot==2.0?2.20:shot==5.0?.85:.65)*(shot==2.0?.40:.55)*u_motion;
        ro=vec3(.05,.17,6.70);ta=vec3(.12,.05,0);lens=1.56*fit;
        if(shot==0.0) ta.x+=following;
        if(shot==1.0) {ro=vec3(1.03,.64,2.17);ta=vec3(1.06,.57,0);lens=1.50;}
        if(shot==2.0) {ro=vec3(.25,-.10,7.10);ta=vec3(.12+following,-.09,0);lens=1.57*fit;}
        if(shot==3.0) {ro=vec3(.17,.15,7.55);ta=vec3(-.10,.04,-.15);lens=1.55*fit;}
        if(shot==4.0) {ro=vec3(.0,.19,6.6);ta=vec3(.06,.09,.6);lens=1.45;}
        if(shot==5.0) {ro=vec3(.18,.10,7.05);ta=vec3(.12+following,.15,0);lens=1.52*fit;}
        if(shot==6.0) {ro=vec3(.24,-.16,7.05);ta=vec3(.02,-.20,0);lens=1.56*fit;}
        if(shot==7.0) {ro=vec3(.95,.65,2.30);ta=vec3(1.02,.60,.10);lens=1.55;}
        float portrait=1.0-smoothstep(.85,1.05,aspect);
        if(shot!=1.0&&shot!=4.0&&shot!=7.0) ta.y-=.22*portrait;
        lens*=1.0+.015*pulse()*u_motion;
        if(u_shot>=8.0) {ro=vec3(0,0,5);ta=vec3(0);lens=1.4;}
        if(u_shot==9.0) {
            float age=max(u_event.x,0.0)*(.12+.88*u_motion);
            ro=vec3(.26*sin(age*.25),-.18,-age*1.75);
            ta=ro+vec3(.075*sin(age*.19),.10,1.0);
            lens=1.25-.025*kickImpulse();
            uv=rot(.055*sin(age*.17)*u_motion)*uv;
        }
    }

    if(scene==10) {
        float age=max(u_event.x,0.0)*(.12+.88*u_motion);
        float progress=clamp(u_event.w,0.0,1.0);
        float z=age*5.40;
        vec2 route=circuitAxis(z),ahead=circuitAxis(z+4.0);
        float rise=.35+.85*sin(progress*TAU)*u_motion;
        float strafe=.36*sin(z*.11)*u_motion;
        ro=vec3(route+vec2(strafe,rise),z);
        ta=vec3(ahead+vec2(-.15*strafe,.18+.25*cos(progress*TAU)),z+4.0);
        float turn=circuitAxis(z+2.0).x-route.x;
        float bank=clamp(turn*.38,-.33,.33)*u_motion;
        // One complete rolling rise/dive, with level approaches before/after it.
        float trick=smoothstep(.30,.42,progress)*(1.0-smoothstep(.72,.84,progress));
        bank+=trick*.69*sin((progress-.30)*TAU/ .54)*u_motion;
        uv=rot(bank)*uv;
        lens=1.05-.035*kickImpulse();
    }

    ro.xy+=u_pointer*.09*u_motion;
    vec3 forward=normalize(ta-ro), right=normalize(cross(forward,vec3(0,1,0))), up=cross(right,forward);
    vec3 rd=normalize(right*uv.x+up*uv.y+forward*lens);
    vec3 bg=vec3(.004,.01,.025);
    bg+=vec3(.012,.055,.13)*exp(-2.4*length(uv-vec2(.45,.12)));
    bg+=vec3(.10,.009,.03)*exp(-4.0*length(uv-vec2(-.65,-.3)));
    if(scene==0||scene==7) {
        float mist=fbm(uv*3.0+vec2(t*.055,-t*.065));
        bg=vec3(.003,.012,.024)+vec3(.006,.040,.055)*mist;
        bg+=vec3(.13,.016,.03)*exp(-length(uv-vec2(-.45,.25))*4.0);
        bg+=vec3(.003,.11,.15)*exp(-length(uv-vec2(.56,-.30))*3.0);
        bg+=stars(uv,t*.04)*.24;
        float sweep=pow(max(0.0,1.0-abs(uv.x+.60*uv.y-.1)*.6),12.0);
        bg+=vec3(.010,.055,.085)*sweep;
    }
    if(scene==1) {
        bg=vec3(.001,.010,.025);
        bg+=vec3(.003,.065,.105)*exp(-length(uv-vec2(.10,.08))*2.0);
        bg+=vec3(.075,.012,.016)*exp(-length(uv-vec2(-.25,-.13))*3.0);
    }
    if(scene==2) bg=transitSky(uv);
    if(scene==4) {
        bg=vec3(.004,.006,.021)+vec3(.025,.035,.075)*exp(-length(uv)*2.0);
        bg+=vec3(.14,.025,.01)*exp(-length(uv-vec2(-.7,.35))*4.0);
        bg+=stars(uv,t*.025)*.28;
    }
    if(scene==3) {
        bg=vec3(.003,.005,.022)+vec3(.055,.020,.12)*exp(-length(uv)*2.0);
        vec2 end=uv-vec2(0,.10);float er=length(end),ea=atan(end.y,end.x);
        float rose=abs(er-.065-.018*cos(ea*8.0));
        bg+=vec3(.03,.42,.52)*exp(-rose*170.0)*.55;
        bg+=vec3(.27,.065,.01)*exp(-abs(er-.026)*240.0)*.40;
        bg+=vec3(.08,.035,.16)*exp(-er*23.0);
        bg+=vec3(.035,.14,.20)*pow(max(0.0,cos(ea*8.0)),26.0)*exp(-er*18.0)*.25;
    }
    if(scene==5) bg=vec3(.016,.007,.023)+vec3(.026,.045,.003)*exp(-length(uv)*2.5)+stars(uv,-t*.05)*.24;
    if(scene==8) {
        bg=vec3(.010,.004,.021)+vec3(.035,.050,.085)*exp(-length(uv)*2.5);
        bg+=vec3(.16,.018,.025)*exp(-length(uv-vec2(-.25,.05))*5.0);
    }
    if(scene==9) bg=shadowField(uv);
    if(scene==3) bg=mix(bg,templeClouds(ro,rd),.26+.74*rupture());
    if(scene==10) bg=arcadeSky(uv,ro,rd);

    float travel=.05,glow=0.0;
    vec3 p=ro;
    bool hit=false;
    for(int i=0;i<76;i++) {
        if(i>=60&&scene!=1&&scene!=8&&scene!=9&&scene!=10) break;
        p=ro+rd*travel;
        float d=mapWorld(p,scene);
        if(scene==1||scene==8) d=abs(d);
        glow+=(scene==1?.0013:.00075)/(.014+d*d);
        if(d<.0016*(1.0+travel*.06)) {hit=true;break;}
        travel+=max(d*.78,.003);
        if(travel>32.0) break;
    }
    vec3 c=bg;
    if(hit) {
        g_depth=min(travel,40.0);
        vec3 n=normalAt(p,scene), v=-rd;
        vec3 l=normalize(vec3(-.7,.8,1.0));
        float diff=max(dot(n,l),0.0);
        float rim=pow(1.0-max(dot(n,v),0.0),3.0);
        float spec=pow(max(dot(n,normalize(l+v)),0.0),72.0);
        if(scene!=0) spec*=1.0+.8*u_energy.z+.5*pulse();
        vec3 reflected=environment(reflect(rd,n),scene);
        float occ=clamp(mapWorld(p+n*.10,scene)/.10,.0,1.0);
        occ=.35+.65*occ;
        vec3 base=vec3(.09,.22,.27);
        float paint=.5+.5*sin(p.y*4.0+p.x*2.0+t*.22);
        if(scene==0||scene==7) {
            float material=shellWorld(p,scene==7).y;
            float a=atan(p.y,p.x);
            paint=.5+.5*sin(a*3.0+p.z*4.0);
            base=mix(vec3(.015,.32,.37),vec3(.46,.035,.009),smoothstep(.4,.8,paint));
            c=(base*(.13+.65*diff)+reflected*.8+spec*1.5)*occ;
            c+=rim*vec3(.08,.70,.90)*(.65+.35*u_energy.y);
            float lip=pow(.5+.5*sin(a*52.0+p.z*22.0),18.0);
            c+=lip*.035*vec3(.25,.8,1.0);
            if(material>=4.0&&material<8.0) {
                base=material==4.0?vec3(.72,.19,.035):material==5.0?vec3(.40,.14,.035):vec3(.04,.36,.46);
                c=(base*(.22+.62*diff)+reflected*.70+spec*1.4)*occ+rim*vec3(.06,.43,.50)*.48;
            }
            if(scene==7&&material<4.0) {
                base=material<1.0?vec3(.65,.055,.012):material<2.0?vec3(.012,.36,.43):material<3.0?vec3(.32,.26,.14):vec3(.08,.18,.32);
                c=(base*(.24+.55*diff)+reflected*.72+spec*1.4)*occ+rim*vec3(.04,.45,.59)*.55;
            }
            if(material==8.0) c=vec3(.03,.26,.33)*(.5+diff)+reflected*.12;
            if(material==9.0) c=waterSurface(p,reflected,scene);
        }
        if(scene==1) {
            float id=mapFlow(p).y,group=mod(id,4.0);
            base=group==0.0?vec3(.74,.045,.016):vec3(.015,.36,.49);
            c=base*(.30+.64*diff)+reflected*.28+spec*1.3+base*rim*.60;
            if(id>=4.0&&id<8.0) c=base*(.66+.5*diff)+reflected*.20+spec;
            if(id>=8.0) c=mix(base,vec3(.08,.43,.54),.5)*(.85+.45*diff);
            c*=1.0+.28*pulse();
        }
        if(scene==2) {
            float phase=transitPhase();
            vec3 q=transitCoordinates(p);
            float cycle=.5+.5*sin(floor(q.z/4.4)*1.7+u_seed);
            base=mix(vec3(.03,.83,1.0),vec3(1.0,.055,.018),smoothstep(.73,.85,cycle));
            if(phase==1.0) base=mix(vec3(.76,.025,.49),vec3(.05,.61,.77),step(.75,cycle));
            if(phase==2.0) base=mix(vec3(.96,.41,.033),vec3(.035,.58,.53),step(.77,cycle));
            if(phase==3.0) base=mix(vec3(.06,.71,1.0),vec3(.64,.035,.56),step(.78,cycle));
            c=base*(.45+1.25*rim+.30*diff)+reflected*.25+spec;
            c*=.6+.7*pulse();
            if(q.y<transitFloor()+.012) {
                c=waterSurface(p,reflected,2)+vec3(.003,.12,.19)*pow(.5+.5*cos(p.x*8.0),16.0)*.20;
                if(phase>=1.0) {
                    float trace=pow(.5+.5*cos(p.x*6.0+q.z*.15),24.0);
                    c+=base*trace*.16;
                }
            }
        }
        if(scene==3) {
            base=mix(vec3(.018,.18,.23),vec3(.24,.085,.025),smoothstep(.57,.78,paint));
            c=(base*(.2+.8*diff)+reflected*.42+spec)*occ;
            c+=rim*vec3(.01,.60,.95)*.45;
            if(p.y< -1.69) {
                vec2 g=abs(fract(vec2(p.x,p.z+templeTravel())*.46)-.5);
                float line=1.0-smoothstep(.005,.019,min(g.x,g.y));
                c=vec3(.006,.013,.035)+reflected*.10+line*vec3(.01,.25,.45);
                c+=vec3(.12,.01,.20)*exp(-abs(p.x)*1.5);
            }
            if(p.y>1.9) c+=vec3(.26,.11,.028)*.50;
            if(abs(p.x)>2.14&&p.y<1.2&&p.y>-.45) c+=vec3(.016,.26,.31)*.50;
        }
        if(scene==4) {
            float id=mapJewel(p).y;
            base=vec3(.012,.40,.51);
            if(id==4.0||id==5.0) base=vec3(.60,.016,.32);
            if(id==6.0) base=vec3(.30,.014,.54);
            if(id==7.0) base=vec3(.58,.29,.018);
            if(id>=8.0&&id<13.0) base=id==8.0?vec3(.48,.26,.025):vec3(.016,.32,.43);
            float edge=jewelEdge(p,id);
            c=(base*(.20+.65*diff)+reflected*.60+spec*1.65)*occ;
            c+=base*rim*.58;
            float engraving=pow(.5+.5*sin(p.x*45.0+p.y*32.0+p.z*37.0),24.0);
            c+=base*engraving*.11;
            if(id==13.0) c=vec3(.15,.70,1.0)*(.5+diff+rim*.5)+vec3(1.0)*spec*1.5;
            if(id==14.0) c=vec3(.065,.35,.44)*(.90+diff)+reflected*.22;
            c+=mix(base,vec3(.35,.76,.95),.40)*edge*(.72+.50*pulse());
        }
        if(scene==5) {
            base=mix(vec3(.29,.48,.005),vec3(.28,.008,.31),smoothstep(.3,.8,paint));
            c=(base*(.23+diff*.8)+reflected*.9+spec*1.9)*occ;
            c+=rim*vec3(.46,.80,.005)*(.8+.5*pulse());
            float bands=pow(.5+.5*sin(p.y*27.0+p.x*9.0+t*.5),28.0);
            c+=bands*vec3(.47,.06,.70)*.15;
            float material=acidWorld(p).y;
            if(material>0.0&&material<8.0) c=vec3(.35,.48,.024)*(.3+diff)+reflected*.65+spec+rim*vec3(.2,.7,.06)*.5;
            if(material==8.0) c=vec3(.12,.20,.06)*(.7+diff);
            if(material==9.0) c=waterSurface(p,reflected,5);
        }
        if(scene==8) {
            float material=mapSpine(p).y;
            base=material==2.0?vec3(.16,.23,.29):vec3(.08,.25,.32);
            c=base*(.25+.64*diff)+reflected*.71+spec*1.55+rim*vec3(.05,.52,.62)*.34;
            if(material==3.0) c=vec3(.94,.08,.024)*(.78+.5*diff)+spec*.75;
            if(material==4.0) c=vec3(.045,.35,.48)*(.70+diff)+spec*.25;
        }
        if(scene==3&&p.y>3.10) {
            vec2 cell=floor((p.xz+vec2(1.15,1.575))/vec2(2.3,3.15));
            float noisePlate=noise(p.xz*4.0+cell);
            c=vec3(.013,.024,.037)*(.3+.6*diff)+reflected*.14+spec*.33;
            vec2 seam=abs(fract((p.xz+vec2(1.15,1.575))/vec2(2.3,3.15))-.5);
            float edgeLine=exp(-abs(max(seam.x,seam.y)-.473)*80.0);
            c+=vec3(.035,.28,.34)*edgeLine*(.24+.60*rupture());
            c+=vec3(.46,.15,.023)*rim*(.11+.52*rupture());
            c+=vec3(.07,.16,.20)*noisePlate*.06;
        }
        if(scene==9) {
            c=shadowSurface(p,n,rd,shadowWorld(p).y,bg);
            if(u_shot==9.0) {
                float material=canyonWorld(p).y;
                vec3 cold=material==2.0||material==4.0?vec3(.042,.055,.14):vec3(.026,.095,.12);
                c=cold*(.19+.46*diff)+reflected*.17+spec*.42;
                c+=rim*vec3(.025,.39,.49)*(.25+.28*onset());
                float vein=exp(-abs(noise(p.yz*3.1+vec2(p.x*.67,0))-.5)*92.0);
                vein*=smoothstep(.40,.72,noise(p.xz*.93));
                c+=vec3(.020,.39,.38)*vein*(.20+.32*onset());
                if(material>=3.0) c=vec3(.24,.076,.018)*(.26+.54*diff)+reflected*.20+spec*.8+rim*vec3(.30,.11,.038)*.40;
                if(material==0.0) {
                    float flow=exp(-abs(p.x-.23*sin(p.z*.34+t*.23))*8.0);
                    float glint=pow(.5+.5*sin(p.z*13.0+sin(p.x*4.0)+t*.34),22.0);
                    c=vec3(.004,.009,.018)+reflected*.068+vec3(.01,.15,.21)*flow*(.18+.82*glint);
                }
            }
        }
        if(scene==10) {
            float material=arcadeWorld(p).y;
            vec2 route=circuitAxis(p.z);vec2 floorUV=vec2(p.x-route.x,p.z);
            float cells=min(abs(fract(floorUV.x*1.6)-.5),abs(fract(floorUV.y*1.6)-.5));
            float trace=exp(-cells*115.0);
            c=vec3(.014,.032,.044)*(.45+diff)+vec3(.055,.48,.37)*trace*.70;
            if(material==1.0) c=vec3(.56,2.30,.045)*(.96+.22*diff+.18*kickImpulse());
            if(material==2.0) {
                c=vec3(.20,.014,.12)*(.50+.70*diff)+reflected*.18+rim*vec3(.62,.020,.31)*.65;
                float stripe=step(.48,fract((p.x+p.y)*4.0));
                c+=vec3(.46,.032,.22)*stripe*.25;
            }
            if(material==3.0) c=vec3(.10,2.30,1.76)*(.84+.30*rim+.16*onset())+vec3(.30,.48,.36)*spec*.44;
            if(material==4.0) c=vec3(.78,2.60,.055)*(.82+.40*kickImpulse())+spec*.35;
            if(material==5.0) {
                vec2 panel=abs(fract(p.yz*1.2)-.5);
                float circuit=exp(-min(panel.x,panel.y)*90.0);
                c=vec3(.012,.026,.058)+vec3(.052,.34,.51)*circuit*1.03+rim*vec3(.07,.33,.44)*.42;
            }
            if(material==6.0) c=vec3(.085,1.38,2.0)*(.72+.22*onset())+spec*.22;
        }
        float fog=1.0-exp(-travel*(scene==1?.080:scene==2?.055:scene==8?.045:scene==9?(u_shot==9.0?.045:.006):scene==10?.022:.018));
        c=mix(c,bg,fog);
    }
    vec3 glowColor=scene==5?vec3(.27,.43,.006):scene==3?vec3(.04,.10,.30):scene==4?vec3(.09,.09,.25):scene==9?vec3(.10,.015,.13):scene==10?vec3(.040,.14,.09):vec3(.015,.15,.23);
    c+=glowColor*min(glow,2.0)*(scene==1?.45:scene==2?.46:scene==9?(u_shot==9.0?.15:.025):scene==10?.24:.23);
    if(scene==1) c+=flowParticles(uv,ro,forward,right,up,lens);
    if(scene==2) {
        float a=atan(uv.y,uv.x),r=length(uv);
        float sector=floor(a*48.0/TAU),f=fract(a*48.0/TAU);
        float line=exp(-abs(f-.5)*140.0);
        float h=hash(vec2(sector,mode));
        float dash=smoothstep(.25,.75,.5+.5*sin(r*13.0-transitTravel()*1.05+h*TAU));
        float speed=line*dash*smoothstep(.10,.55,r)*smoothstep(.35,.8,h);
        vec3 streak=transitPhase()==1.0?vec3(.74,.025,.51):transitPhase()==2.0?vec3(.95,.36,.026):mix(vec3(.01,.58,1.0),vec3(.93,.02,.17),step(.70,h));
        c+=streak*speed*(.35+.85*pulse());
        c*=1.0+.30*pulse();
    }
    return c;
}

float finaleProgress() {return u_time>=261.995?clamp(u_local,0.0,1.0):0.0;}
float finaleCue(float cue,float duration) {return u_time>=261.995?smoothstep(cue,cue+duration,u_time):0.0;}
vec3 oceanWave(vec2 xz) {
    float t=motionTime(),a=xz.x*.80+xz.y*.45+t*.85,b=xz.y*1.60-xz.x*.40-t*.63,c=xz.x*2.20+xz.y*.90+t*1.15;
    float amp=.012*(1.0+.20*kickImpulse()*u_motion);
    float h=.045*sin(a)+.020*sin(b)+amp*sin(c);
    float dx=.036*cos(a)-.008*cos(b)+amp*2.20*cos(c);
    float dz=.02025*cos(a)+.032*cos(b)+amp*.90*cos(c);
    return vec3(h,dx,dz);
}
vec3 finaleSky(vec2 uv,float horizon) {
    float t=motionTime(),progress=finaleProgress();
    float aurora=finaleCue(268.800,1.25),reveal=finaleCue(272.205,1.20);
    float convergence=u_time>=261.995?smoothstep(275.605,282.410,u_time):0.0;
    float closure=finaleCue(282.410,1.61);
    vec3 c=vec3(.004,.009,.029);
    c+=vec3(.10,.012,.067)*exp(-length(uv-vec2(0,.16))*2.9);
    c+=stars(uv,t*.01)*(.55+.30*reveal);
    float radius=.235-.026*reveal-.010*closure;
    radius+=u_energy.x*.007+.008*pulse()*u_motion;
    float sunX=.026*sin(t*.038)*(1.0-.7*convergence);
    vec2 sun=uv-vec2(sunX,horizon+radius+.012);
    float a=atan(sun.y,sun.x),r=length(sun);
    // Depth-separated aurora curtains rise behind the eclipse, then lean into the light.
    for(int i=0;i<4;i++) {
        float fi=float(i),ridge=.31+fi*.075;
        ridge+=.052*sin(uv.x*(3.4+fi*.7)+t*(.12+fi*.025)+fi*1.7);
        ridge+=.024*sin(uv.x*9.0-t*.14+fi);
        ridge=mix(ridge,horizon+.26+.42*abs(uv.x-sunX),convergence*.70);
        float d=uv.y-ridge;
        float folds=fbm(vec2(uv.x*9.0+t*.070+fi*2.0,uv.y*6.0-t*.06));
        float curtain=exp(-abs(d)*(22.0+fi*5.0))*(.28+.72*folds);
        float threads=pow(.5+.5*sin(uv.x*82.0+folds*12.0+t*.25),18.0);
        vec3 tint=i==2?vec3(.26,.045,.35):vec3(.028,.44,.38);
        c+=tint*curtain*aurora*(.54+.25*onset())/(1.0+fi*.18);
        c+=vec3(.06,.28,.32)*threads*curtain*aurora*.20;
    }
    float w=.004*sin(a*39.0+t*.4)+.004*sin(a*17.0-t*.21);
    float ring=abs(r-radius-w),corona=.010/(ring+.012);
    vec3 solar=mix(vec3(1.0,.13,.023),vec3(.64,.016,.30),.5+.5*sin(a*3.0+t*.16));
    solar=mix(solar,vec3(.76,.42,.10),reveal*.62);
    c+=solar*corona*(.28+.12*reveal);
    c+=solar*exp(-ring*130.0)*(.60+.15*pulse()+.15*reveal);
    float rays=pow(max(0.0,cos(a*12.0+.28*sin(t*.13))),16.0);
    c+=vec3(.075,.38,.50)*rays*exp(-abs(r-radius-.15)*8.0)*convergence*.50;
    float core=1.0-smoothstep(radius-.040,radius,r);
    c+=vec3(.82,.40,.092)*core*reveal*(.27+.32*closure);
    vec2 moonCenter=vec2(.052*reveal+.115*convergence,.014*reveal);
    float disc=1.0-smoothstep(radius-.013,radius-.003,length(sun-moonCenter));
    disc*=1.0-.56*convergence-.39*closure;
    c=mix(c,vec3(.003,.003,.014),disc);
    float fine=pow(max(0.0,sin(a*83.0+noise(vec2(a*6.0,t*.1))*5.0)),13.0);
    c+=solar*fine*exp(-abs(r-radius-.026)*70.0)*(.13+.10*reveal);
    // Unequal satellites move in toward the shared light, keeping a clear scale hierarchy.
    if(density()>.01&&uv.y>horizon) for(int i=0;i<3;i++) {
        float fi=float(i),size=.048/(1.0+fi*.62);
        vec2 center=i==0?vec2(-.43,.27):i==1?vec2(.43,.36):vec2(-.23,.48);
        center.x+=.018*sin(t*.11+fi*2.0);
        center=mix(center,vec2(sunX+(fi-1.0)*.09,horizon+.38+fi*.050),convergence*.62);
        vec2 point=(uv-center)/size;float rad=length(point);
        if(rad<1.0) {
            vec3 n=vec3(point,sqrt(max(0.0,1.0-dot(point,point))));
            float diffuse=max(dot(n,normalize(vec3(-.7,.6,1))),0.0);
            float spec=pow(max(dot(n,normalize(vec3(-.35,.4,1))),0.0),25.0);
            vec3 moon=vec3(.013,.07,.13)*(.3+diffuse)+vec3(.39,.10,.033)*pow(1.0-n.z,3.0)+spec*vec3(.20,.42,.47);
            c=mix(c,moon,1.0-smoothstep(.91,1.0,rad));
        }
        c+=vec3(.025,.18,.21)*exp(-abs(rad-1.02)*24.0)*(.20+.18*reveal);
        if(aurora>.01) {
            vec2 lead=uv-center;
            float filament=exp(-abs(lead.y-.042*sin(lead.x*13.0+t*.22+fi))*180.0)*exp(-abs(lead.x)*9.0);
            c+=vec3(.028,.23,.24)*filament*aurora*.26;
        }
    }
    float beam=exp(-abs(uv.x-sunX)*48.0)*exp(-abs(uv.y-horizon-.105)*4.5);
    c+=vec3(.12,.35,.44)*beam*convergence*(.16+.38*closure+.16*onset());
    c+=vec3(.055,.18,.20)*exp(-abs(uv.y-horizon)*100.0)*(.4+.6*reveal);
    return c;
}
vec3 ocean(vec2 uv) {
    float t=motionTime(),age=max(u_event.x,0.0)*(.12+.88*u_motion);
    vec3 ro=vec3(.12*sin(age*.20),1.20,age*.26);
    vec3 forward=normalize(vec3(.012*sin(age*.15),-.015,1.0));
    vec3 right=normalize(cross(forward,vec3(0,1,0))),up=cross(right,forward);
    float lens=1.38,horizon=-forward.y*lens/max(up.y,.001);
    vec3 rd=normalize(right*uv.x+up*uv.y+forward*lens);
    vec3 c=finaleSky(uv,horizon);
    if(rd.y<-.001) {
        float distance=min(180.0,-ro.y/rd.y);
        for(int i=0;i<4;i++) {
            vec3 p=ro+rd*distance,wave=oceanWave(p.xz);
            float derivative=rd.y-wave.y*rd.x-wave.z*rd.z;
            float delta=(p.y-wave.x)/(abs(derivative)<.001?-.001:derivative);
            distance=clamp(distance-delta,.1,180.0);
        }
        vec3 p=ro+rd*distance,wave=oceanWave(p.xz);
        vec3 n=normalize(vec3(-wave.y,1.0,-wave.z));
        g_depth=min(distance,40.0);
        vec3 reflected=reflect(rd,n);
        float depth=max(dot(reflected,forward),.025);
        vec2 skyUV=vec2(dot(reflected,right),dot(reflected,up))/depth*lens;
        vec3 reflection=finaleSky(skyUV,horizon);
        float fresnel=pow(1.0-max(dot(n,-rd),0.0),3.0);
        float caustic=exp(-abs(sin(p.x*1.7+p.z*.4+t*.22)+sin(p.z*1.7-p.x*.8-t*.17))*12.0);
        float detail=fbm(p.xz*.62+vec2(t*.06,0));
        float glitter=pow(.5+.5*sin(p.z*14.0+detail*8.0+sin(p.x*2.2)),24.0);
        float foam=pow(.5+.5*sin(p.z*1.60+detail*5.0+sin(p.x*.91)*2.0),22.0);
        foam*=smoothstep(.35,.73,noise(p.xz*.72));
        vec3 water=vec3(.002,.019,.037)+vec3(.007,.11,.13)*caustic*.42;
        water+=reflection*(.14+.53*fresnel);
        water+=vec3(.025,.29,.34)*glitter*(.20+.40*detail+.22*kickImpulse());
        water+=vec3(.023,.28,.27)*foam*(.21+.13*onset());
        float nearField=1.0-smoothstep(12.0,35.0,distance);
        water+=vec3(.014,.10,.13)*pow(abs(wave.y)+abs(wave.z),.7)*nearField;
        float fog=1.0-exp(-distance*.022);
        vec3 horizonColor=vec3(.016,.055,.08)+vec3(.016,.048,.047)*finaleCue(272.205,1.2);
        c=mix(water,horizonColor,fog*.64);
    }
    c+=vec3(.010,.18,.21)*exp(-abs(uv.y-horizon)*130.0)*(.38+.36*finaleCue(268.800,1.25));
    return c;
}

void main() {
    vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/u_resolution.y;
    int scene=int(floor(u_scene+.5));
    vec3 color;
    if(scene==6) color=ocean(uv);
    else color=rayWorld(uv,scene);
    // Gentle film finish preserves blacks and the brightest metallic highlights.
    color=max(color,vec3(0));
    color=1.0-exp(-color*1.35);
    color=pow(color,vec3(.92));
    float vignette=1.0-.22*smoothstep(.3,1.25,length(uv));
    color*=vignette;
    float grain=(hash(gl_FragCoord.xy+fract(u_time)*107.0)-.5)*.007;
    color+=grain*(.4+.6*sqrt(max(color.r,max(color.g,color.b))));
    fragColor=vec4(clamp(color,0.0,1.0),clamp(g_depth/40.0,0.0,1.0));
}
`,n=t.indexOf(`    float transmittance=1.0;`,t.indexOf(`vec3 templeClouds`)),r=t.indexOf(`    }
    // A nearby folded`,n),i=t.slice(n,r),a=t.indexOf(`vec3 rayWorld(vec2 uv,int scene) {`),o=t.indexOf(`    vec3 bg=`,a),s=t.slice(0,a)+`
uniform vec2 u_volumeResolution;
vec3 distantVolume(vec3 ro,vec3 rd) {
    float opened=rupture(),t=motionTime();
    float storm=smoothstep(6.805,8.0,u_event.y);
    float transport=t*.14+max(u_event.y,0.0)*2.35*u_motion;
    float sun=pow(max(dot(rd,normalize(vec3(-.24,.20,1.0))),0.0),28.0);
    vec3 c=vec3(0);
${i}
    return c;
}
`+t.slice(a,o)+`
    return distantVolume(ro,rd);
}
void main(){
    vec2 pixel=gl_FragCoord.xy*u_resolution/u_volumeResolution;
    vec2 uv=(pixel-.5*u_resolution)/u_resolution.y;
    fragColor=vec4(rayWorld(uv,3),1.0);
}
`,c=`
bool windowGuideSlab(float a,float v,float center,float extent,inout vec2 interval) {
    float delta=a-center;
    if(v==0.0) return abs(delta)<=extent;
    vec2 t=vec2(-extent-delta,extent-delta)/v;
    interval.x=max(interval.x,min(t.x,t.y));
    interval.y=min(interval.y,max(t.x,t.y));
    return interval.x<=interval.y;
}
bool windowGuideClear(vec3 ro,vec3 rd,float lens,vec2 fullSize,vec2 guideSize) {
    if(!(u_time>=136.100&&u_time<170.125&&u_motion>=0.0&&u_motion<=1.0
        &&u_beat>=0.0&&u_beat<=1.0&&u_density>=0.0&&u_density<=1.0
        &&lens>=1.0&&lens<=2.0&&all(greaterThanEqual(fullSize,vec2(1)))
        &&all(greaterThanEqual(guideSize,vec2(1)))&&all(lessThanEqual(abs(ro),vec3(64)))
        &&dot(rd,rd)>=.999&&dot(rd,rd)<=1.001)) return false;
    if(density()<=.01) return true;
    float scale=1.0+.06*pulse()*u_motion;
    float tube=32.0*.5*length(fullSize/guideSize)/(fullSize.y*lens)*max(1.0,scale);
    float padding=tube+.006+.0002;
    vec3 a=vec3(ro.x*scale,ro.y,ro.z+templeTravel()),v=vec3(rd.x*scale,rd.y,rd.z);
    if(!(all(lessThanEqual(abs(a),vec3(256)))&&tube<=.5)) return false;
    for(int sideIndex=0;sideIndex<2;sideIndex++) {
        vec2 interval=vec2(.05,32.0);
        float side=float(sideIndex)*2.0-1.0;
        if(!windowGuideSlab(a.x,v.x,side*2.20,.024+padding,interval)) continue;
        if(!windowGuideSlab(a.y,v.y,.27,.594+padding,interval)) continue;
        vec2 z=a.z+v.z*interval;
        float first=ceil((min(z.x,z.y)-.594-padding)/4.2);
        float last=floor((max(z.x,z.y)+.594+padding)/4.2);
        if(first<=last) return false;
    }
    return true;
}
`;function l(e,t,n){if(e.indexOf(t)<0||e.indexOf(t)!==e.lastIndexOf(t))throw Error(`Primary shader anchor changed`);return e.replace(t,n)}var u=`// Experimental miss-only reuse. Clearance is a heuristic, not a no-hit proof.
bool primaryGuideMiss(vec2 screen,float angularMargin,inout float glow) {
    if(u_primaryGuideValid<.5) return false;
    ivec2 size=textureSize(u_primaryGuide,0);
    vec2 q=screen*vec2(size)-.5,f=fract(q);
    ivec2 base=ivec2(floor(q));
    vec4 a=texelFetch(u_primaryGuide,clamp(base,ivec2(0),size-1),0);
    vec4 b=texelFetch(u_primaryGuide,clamp(base+ivec2(1,0),ivec2(0),size-1),0);
    vec4 c=texelFetch(u_primaryGuide,clamp(base+ivec2(0,1),ivec2(0),size-1),0);
    vec4 d=texelFetch(u_primaryGuide,clamp(base+ivec2(1),ivec2(0),size-1),0);
    if(max(max(a.g,b.g),max(c.g,d.g))>.5) return false;
    vec4 packet=f.x<.5?(f.y<.5?a:c):(f.y<.5?b:d);
    if(packet.a<.5) return false;
    float lo=min(min(a.r,b.r),min(c.r,d.r)),hi=max(max(a.r,b.r),max(c.r,d.r));
    if(hi-lo>.02||min(min(a.b,b.b),min(c.b,d.b))<=angularMargin) return false;
    glow=mix(mix(a.r,b.r,f.x),mix(c.r,d.r,f.x),f.y);
    return true;
}

`,d=l(t,`uniform float u_cloudVolumeValid;
`,`uniform float u_cloudVolumeValid;
uniform sampler2D u_primaryGuide;
uniform float u_primaryGuideValid;
`);d=l(d,`vec3 rayWorld(vec2 uv,int scene) {`,u+`vec3 rayWorld(vec2 uv,int scene) {`),d=l(d,`    bool hit=false;
    for(int i=0;i<76;i++) {`,`    bool hit=false;
    bool reuseMiss=(scene==1||scene==3)&&primaryGuideMiss(gl_FragCoord.xy/u_resolution,
                                          2.5/(u_resolution.y*max(lens,.8)),glow);
    if(!reuseMiss) {
    for(int i=0;i<76;i++) {`),d=l(d,`    }
    vec3 c=bg;
    if(hit) {`,`    }
    }
    vec3 c=bg;
    if(hit) {`);var f=d,p=d.indexOf(`vec3 rayWorld(vec2 uv,int scene) {`),m=d.indexOf(`    vec3 bg=`,p);if(p<0||m<0)throw Error(`Primary guide camera source changed`);var h=d.slice(0,p)+`
uniform vec2 u_primaryGuideResolution;
${c}
`+d.slice(p,m).replace(`vec3 rayWorld`,`vec4 guideRay`)+`
    float travel=.05,glow=0.0,clearance=100.0;
    bool hit=false;
    for(int i=0;i<76;i++) {
        if(i>=60&&scene!=1) break;
        vec3 p=ro+rd*travel;
        float d=mapWorld(p,scene);
        if(scene==1) d=abs(d);
        glow+=(scene==1?.0013:.00075)/(.014+d*d);
        clearance=min(clearance,d/(1.0+travel));
        if(d<.0016*(1.0+travel*.06)) {hit=true;break;}
        travel+=max(d*.78,.003);
        if(travel>32.0) break;
    }
    bool windowClear=!hit&&(scene==1||windowGuideClear(ro,rd,lens,u_resolution,u_primaryGuideResolution));
    return vec4(min(glow,2.0),hit?1.0:0.0,clearance,windowClear?1.0:0.0);
}
void main(){
    vec2 pixel=gl_FragCoord.xy*u_resolution/u_primaryGuideResolution;
    vec2 uv=(pixel-.5*u_resolution)/u_resolution.y;
    fragColor=guideRay(uv,int(u_scene+.5));
}
`;function g(e,t,n,r){let i=null,a=[];try{if(i=e.createProgram(),!i)throw Error(`Primary world program unavailable`);for(let[n,r]of[[e.VERTEX_SHADER,t],[e.FRAGMENT_SHADER,f]]){let t=e.createShader(n);if(!t)throw Error(`Primary world shader unavailable`);if(a.push(t),e.shaderSource(t,r),e.compileShader(t),!e.getShaderParameter(t,e.COMPILE_STATUS))throw Error(`Primary world compilation failed`);e.attachShader(i,t)}if(e.bindAttribLocation(i,n,`a_position`),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))throw Error(`Primary world linking failed`);return{program:i,locations:Object.fromEntries(r.map(t=>[t,e.getUniformLocation(i,`u_${t}`)]))}}catch{return i&&e.deleteProgram(i),null}finally{for(let t of a)e.deleteShader(t)}}var _=t.match(/float hash\(vec2 p\) \{[\s\S]*?\n\}/)?.[0];if(!_)throw Error(`Original noise hash source is unavailable`);var v=`#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`,y=`#version 300 es
precision highp float;
out vec4 fragColor;
${_}
void main(){
    vec2 i=floor(gl_FragCoord.xy)-vec2(256.0);
    fragColor=vec4(hash(i),hash(i+vec2(1,0)),hash(i+vec2(0,1)),hash(i+vec2(1,1)));
}`,b=e=>Number.isFinite(e)&&Number.isFinite(Math.fround(e));function x(e){let{time:t,motion:n,beat:r,seed:i,shot:a,pointer:o,event:s}=e;return e.scene===3&&b(t)&&t>=0&&t<=170.125&&b(n)&&n>=0&&n<=1&&b(r)&&r>=0&&r<=1&&b(i)&&b(a)&&b(o?.[0])&&Math.abs(o[0])<=1&&b(o?.[1])&&Math.abs(o[1])<=1&&b(s?.[1])&&s[1]<=20.415&&b(s?.[2])}var ee=class{constructor(e){if(this.gl=e,this.enabled=!1,this.validity=0,e.activeTexture(e.TEXTURE0+5),this.fallback=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.fallback),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array(4)),this.parameters(),e.getExtension)try{if(!e.getExtension(`EXT_color_buffer_float`))return;if(this.texture=e.createTexture(),!this.texture)throw Error(`Noise cache texture unavailable`);if(e.bindTexture(e.TEXTURE_2D,this.texture),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,512,512,0,e.RGBA,e.FLOAT,null),this.parameters(),this.framebuffer=e.createFramebuffer(),!this.framebuffer)throw Error(`Noise cache framebuffer unavailable`);if(e.bindFramebuffer(e.FRAMEBUFFER,this.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.texture,0),e.checkFramebufferStatus(e.FRAMEBUFFER)!==e.FRAMEBUFFER_COMPLETE)throw Error(`Float noise cache attachment unavailable`);if(this.program=e.createProgram(),!this.program)throw Error(`Noise cache program unavailable`);for(let[t,n]of[[e.VERTEX_SHADER,v],[e.FRAGMENT_SHADER,y]]){let r=e.createShader(t);if(!r)throw Error(`Noise cache shader unavailable`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw e.deleteShader(r),Error(`Noise cache shader compilation failed`);e.attachShader(this.program,r),e.deleteShader(r)}if(e.linkProgram(this.program),!e.getProgramParameter(this.program,e.LINK_STATUS))throw Error(`Noise cache program linking failed`);if(this.vao=e.createVertexArray(),!this.vao)throw Error(`Noise cache vertex array unavailable`);if(e.viewport(0,0,512,512),e.disable(e.BLEND),e.disable(e.DEPTH_TEST),e.disable(e.CULL_FACE),e.useProgram(this.program),e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,3),e.getError()!==e.NO_ERROR)throw Error(`Noise cache initialization failed`);this.enabled=!0}catch{this.releaseCache()}finally{e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,this.fallback)}}parameters(){let e=this.gl;for(let t of[e.TEXTURE_MIN_FILTER,e.TEXTURE_MAG_FILTER])e.texParameteri(e.TEXTURE_2D,t,e.NEAREST);for(let t of[e.TEXTURE_WRAP_S,e.TEXTURE_WRAP_T])e.texParameteri(e.TEXTURE_2D,t,e.CLAMP_TO_EDGE)}bind(e,t){let n=this.gl,r=this.enabled&&t.scene===3;n.activeTexture(n.TEXTURE0+5),n.bindTexture(n.TEXTURE_2D,r?this.texture:this.fallback),this.validity=r?x(t)?2:1:0,n.uniform1i(e.noiseCache,5),n.uniform1f(e.noiseCacheValid,this.validity)}releaseCache(){let e=this.gl;for(let[t,n]of[[`texture`,`Texture`],[`framebuffer`,`Framebuffer`],[`program`,`Program`],[`vao`,`VertexArray`]])this[t]&&e[`delete${n}`](this[t]),this[t]=null;this.enabled=!1,this.validity=0}dispose(){this.releaseCache(),this.gl.deleteTexture(this.fallback),this.fallback=null}};function S({time:e,scene:t,motion:n,beat:r,pointer:i}){let a=e=>Number.isFinite(e)&&e>=0&&e<=1;return Number.isFinite(e)&&e>=0&&e<=290&&t===1&&a(n)&&a(r)&&i?.length===2&&Number.isFinite(i[0])&&Math.abs(i[0])<=1&&Number.isFinite(i[1])&&Math.abs(i[1])<=1?1:0}var C=e=>Number.isFinite(e)&&Number.isFinite(Math.fround(e));function te(e,t){return t<1440||e.poster!==0||!C(e.density)||e.density<0||e.density>1?!1:e.scene===1?e.time>=34.02&&e.time<81.655&&S(e)===1&&C(e.seed)&&C(e.shot):x(e)&&e.time>=151&&e.event[2]>0&&C(e.event[0])}var ne=`#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`,re=class{constructor(e){if(this.gl=e,this.enabled=!1,this.valid=!1,this.width=0,this.height=0,this.fallback=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.fallback),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),this.parameters(),e.getExtension)try{if(!e.getExtension(`EXT_color_buffer_float`))return;this.program=e.createProgram();for(let[t,n]of[[e.VERTEX_SHADER,ne],[e.FRAGMENT_SHADER,h]]){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw e.deleteShader(r),Error(`Primary guide shader compilation failed`);e.attachShader(this.program,r),e.deleteShader(r)}if(e.linkProgram(this.program),!e.getProgramParameter(this.program,e.LINK_STATUS))throw Error(`Primary guide program linking failed`);if(this.locations=Object.fromEntries([...h.matchAll(/uniform\s+(\w+)\s+u_(\w+)\s*;/g)].map(([,t,n])=>[n,{type:t,location:e.getUniformLocation(this.program,`u_${n}`)}])),this.texture=e.createTexture(),this.framebuffer=e.createFramebuffer(),!this.texture||!this.framebuffer)throw Error(`Primary guide target unavailable`);this.enabled=!0}catch{this.release()}}parameters(){let e=this.gl;for(let t of[e.TEXTURE_MIN_FILTER,e.TEXTURE_MAG_FILTER])e.texParameteri(e.TEXTURE_2D,t,e.NEAREST);for(let t of[e.TEXTURE_WRAP_S,e.TEXTURE_WRAP_T])e.texParameteri(e.TEXTURE_2D,t,e.CLAMP_TO_EDGE)}resize(e,t){if(!this.enabled)return;let n=this.gl,r=Math.ceil(e/4),i=Math.ceil(t/4);(r!==this.width||i!==this.height)&&(n.bindTexture(n.TEXTURE_2D,this.texture),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,r,i,0,n.RGBA,n.FLOAT,null),this.parameters(),n.bindFramebuffer(n.FRAMEBUFFER,this.framebuffer),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,this.texture,0),n.checkFramebufferStatus(n.FRAMEBUFFER)===n.FRAMEBUFFER_COMPLETE?(this.width=r,this.height=i):this.release(),n.bindFramebuffer(n.FRAMEBUFFER,null))}render(e,t,n,r,i){if(this.valid=!1,!this.enabled||t<n||!te(e,n)||(this.resize(t,n),!this.enabled))return;let a=this.gl;a.bindFramebuffer(a.FRAMEBUFFER,this.framebuffer),a.viewport(0,0,this.width,this.height),a.disable(a.BLEND),a.disable(a.DEPTH_TEST),a.disable(a.CULL_FACE),a.useProgram(this.program),a.bindVertexArray(r);let o={...e,resolution:[t,n],primaryGuideResolution:[this.width,this.height],flowBoundValid:S(e),noiseCache:5,noiseCacheValid:0,cloudVolume:6,cloudVolumeValid:0,primaryGuide:7,primaryGuideValid:0};a.activeTexture(a.TEXTURE0+6),a.bindTexture(a.TEXTURE_2D,this.fallback);for(let[e,{type:t,location:n}]of Object.entries(this.locations)){if(n===null)continue;let r=o[e];t===`float`?a.uniform1f(n,r):t===`sampler2D`?a.uniform1i(n,r):t===`vec2`?a.uniform2fv(n,r):t===`vec4`&&a.uniform4fv(n,r)}i.bind(Object.fromEntries(Object.entries(this.locations).map(([e,t])=>[e,t.location])),e),a.activeTexture(a.TEXTURE0+7),a.bindTexture(a.TEXTURE_2D,this.fallback),a.drawArrays(a.TRIANGLES,0,3),this.valid=a.getError()===a.NO_ERROR,this.valid||this.release(),a.bindFramebuffer(a.FRAMEBUFFER,null),a.viewport(0,0,t,n)}bind(e,t){let n=this.gl,r=this.enabled&&this.valid&&(t.scene===1||t.scene===3);n.activeTexture(n.TEXTURE0+7),n.bindTexture(n.TEXTURE_2D,r?this.texture:this.fallback),n.uniform1i(e.primaryGuide,7),n.uniform1f(e.primaryGuideValid,+!!r)}release(){let e=this.gl;for(let[t,n]of[[`texture`,`Texture`],[`framebuffer`,`Framebuffer`],[`program`,`Program`]])this[t]&&e[`delete${n}`](this[t]),this[t]=null;this.enabled=!1,this.valid=!1}dispose(){this.release(),this.gl.deleteTexture(this.fallback)}},ie=`#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`,ae=class{constructor(e){if(this.gl=e,this.enabled=!1,this.valid=!1,this.width=0,this.height=0,this.fallback=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.fallback),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),this.parameters(),e.getExtension)try{if(!e.getExtension(`EXT_color_buffer_float`)||!e.getExtension(`OES_texture_float_linear`))return;this.program=e.createProgram();for(let[t,n]of[[e.VERTEX_SHADER,ie],[e.FRAGMENT_SHADER,s]]){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw e.deleteShader(r),Error(`Volume shader compilation failed`);e.attachShader(this.program,r),e.deleteShader(r)}if(e.linkProgram(this.program),!e.getProgramParameter(this.program,e.LINK_STATUS))throw Error(`Volume program linking failed`);if(this.locations=Object.fromEntries([...s.matchAll(/uniform\s+(\w+)\s+u_(\w+)\s*;/g)].map(([,t,n])=>[n,{type:t,location:e.getUniformLocation(this.program,`u_${n}`)}])),this.texture=e.createTexture(),this.framebuffer=e.createFramebuffer(),!this.texture||!this.framebuffer)throw Error(`Volume target unavailable`);this.enabled=!0}catch{this.release()}}parameters(){let e=this.gl;for(let t of[e.TEXTURE_MIN_FILTER,e.TEXTURE_MAG_FILTER])e.texParameteri(e.TEXTURE_2D,t,e.LINEAR);for(let t of[e.TEXTURE_WRAP_S,e.TEXTURE_WRAP_T])e.texParameteri(e.TEXTURE_2D,t,e.CLAMP_TO_EDGE)}resize(e,t){if(!this.enabled)return;let n=this.gl,r=Math.ceil(e/2),i=Math.ceil(t/2);(r!==this.width||i!==this.height)&&(n.bindTexture(n.TEXTURE_2D,this.texture),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,r,i,0,n.RGBA,n.FLOAT,null),this.parameters(),n.bindFramebuffer(n.FRAMEBUFFER,this.framebuffer),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,this.texture,0),n.checkFramebufferStatus(n.FRAMEBUFFER)===n.FRAMEBUFFER_COMPLETE?(this.width=r,this.height=i):this.release(),n.bindFramebuffer(n.FRAMEBUFFER,null))}render(e,t,n,r,i){if(this.valid=!1,!this.enabled||e.scene!==3||n<1440||(this.resize(t,n),!this.enabled))return;let a=this.gl;a.bindFramebuffer(a.FRAMEBUFFER,this.framebuffer),a.viewport(0,0,this.width,this.height),a.disable(a.BLEND),a.disable(a.DEPTH_TEST),a.disable(a.CULL_FACE),a.useProgram(this.program),a.bindVertexArray(r);let o={...e,resolution:[t,n],volumeResolution:[this.width,this.height],flowBoundValid:0,noiseCache:5,noiseCacheValid:0,cloudVolume:6,cloudVolumeValid:0};a.activeTexture(a.TEXTURE0+6),a.bindTexture(a.TEXTURE_2D,this.fallback);for(let[e,{type:t,location:n}]of Object.entries(this.locations)){if(n===null)continue;let r=o[e];t===`float`?a.uniform1f(n,r):t===`sampler2D`?a.uniform1i(n,r):t===`vec2`?a.uniform2fv(n,r):t===`vec4`&&a.uniform4fv(n,r)}i.bind(Object.fromEntries(Object.entries(this.locations).map(([e,t])=>[e,t.location])),e),a.drawArrays(a.TRIANGLES,0,3),this.valid=a.getError()===a.NO_ERROR,this.valid||this.release(),a.bindFramebuffer(a.FRAMEBUFFER,null),a.viewport(0,0,t,n)}bind(e,t){let n=this.gl,r=this.enabled&&this.valid&&t.scene===3;n.activeTexture(n.TEXTURE0+6),n.bindTexture(n.TEXTURE_2D,r?this.texture:this.fallback),n.uniform1i(e.cloudVolume,6),n.uniform1f(e.cloudVolumeValid,+!!r)}release(){let e=this.gl;for(let[t,n]of[[`texture`,`Texture`],[`framebuffer`,`Framebuffer`],[`program`,`Program`]])this[t]&&e[`delete${n}`](this[t]),this[t]=null;this.enabled=!1,this.valid=!1}dispose(){this.release(),this.gl.deleteTexture(this.fallback)}},oe=`
void oceanCamera(out vec3 ro,out vec3 forward,out vec3 right,out vec3 up){
    float age=max(u_event.x,0.0)*(.12+.88*u_motion);
    ro=vec3(.12*sin(age*.20),1.20,age*.26);
    forward=normalize(vec3(.012*sin(age*.15),-.015,1.0));
    right=normalize(cross(forward,vec3(0,1,0)));up=cross(right,forward);
}
float oceanHeight(vec2 q){
    float t=u_time*(.12+.88*u_motion);
    float kick=max(u_beat*(.4+.6*u_motion),u_audio.y*u_motion);
    return .045*sin(q.x*.80+q.y*.45+t*.85)
          +.020*sin(q.y*1.60-q.x*.40-t*.63)
          +.012*(1.0+.20*kick*u_motion)*sin(q.x*2.20+q.y*.90+t*1.15);
}
vec3 oceanView(vec3 world){
    vec3 ro,f,r,u;oceanCamera(ro,f,r,u);vec3 p=world-ro;
    return vec3(vec2(dot(p,r),dot(p,u))*1.38/1.5,dot(p,f));
}
float oceanDepth(vec3 world){vec3 ro,f,r,u;oceanCamera(ro,f,r,u);return length(world-ro);}
float swimmerStory(float age){return mix(.44,clamp(age/17.01,0.0,1.0),clamp(u_motion,0.0,1.0));}
vec3 swimmerWorld(float age){
    float story=swimmerStory(age),crossing=smoothstep(0.0,.72,story);
    float resolve=smoothstep(.52,1.0,story);
    float chapterAge=max(0.0,u_event.x-u_event.y+age);
    float cameraZ=chapterAge*(.12+.88*u_motion)*.26;
    float x=mix(3.45,-1.35,crossing);x=mix(x,0.0,resolve);
    // A narrower current crosses the portrait lens soon enough to read; every
    // submerged stroke and reflection uses this same physical path.
    x*=mix(.45,1.0,smoothstep(.65,1.30,u_resolution.x/u_resolution.y));
    float z=cameraZ+7.3-.75*sin(story*3.14159)+11.0*resolve;
    float gait=max(0.0,age)*4.8*u_motion;
    float sink=.08*smoothstep(.93,1.0,clamp(age/17.01,0.0,1.0));
    return vec3(x,oceanHeight(vec2(x,z))+.014+.014*sin(gait*2.0)-sink,z);
}
vec3 swimmerDirection(float age){
    vec3 delta=swimmerWorld(age+.035)-swimmerWorld(age-.035);delta.y=0.0;
    // Hold a readable profile when motion is reduced to zero.
    return normalize(mix(vec3(-1,0,.15),delta+vec3(-.002,0,0),smoothstep(.0,.08,u_motion)));
}
`,w=`
precision highp float;
uniform vec2 u_resolution;
uniform float u_time, u_scene, u_local, u_shot, u_beat, u_motion, u_poster, u_density, u_cats, u_catRole, u_seed;
uniform vec4 u_event, u_audio;
uniform vec4 u_energy;
uniform vec2 u_pointer;
const float TAU=6.28318530718;
float hash(float p){return fract(sin(p*127.1+311.7)*43758.5453123);}
mat2 turn(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float clock(){return u_time*(.18+.82*u_motion);}
vec3 palette(float p){
    vec3 cyan=vec3(.07,.72,.96),violet=vec3(.43,.12,.88),coral=vec3(.98,.18,.35);
    return p<.76?mix(cyan,violet,p/.76):mix(violet,coral,(p-.76)/.24);
}
vec3 transitColor(float id){
    float evolution=u_time>=81.655&&u_time<136.100?clamp(u_local,0.0,1.0):0.0;
    vec3 color=mix(vec3(.04,.57,.86),vec3(.68,.035,.74),smoothstep(.18,.34,evolution));
    color=mix(color,vec3(.94,.43,.055),smoothstep(.44,.60,evolution));
    return mix(color,mix(vec3(.29,.07,.88),vec3(.08,.86,.94),hash(id+12.0)),smoothstep(.72,.90,evolution));
}
vec2 arcadeAxis(float z);
float arcadeZ();
vec3 arcadeView(vec3 world);
vec3 oceanView(vec3 world);
float oceanHeight(vec2 q);
vec3 transitView(vec3 world);
float transitTravel();
vec3 flow(float p,float branch){
    float t=clock(),a=p*TAU,side=branch<.5?-1.0:1.0;
    vec3 v;
    if(u_scene<.5){
        // Two tilted magnetic bows orbit the opening's central sculpture.
        float angle=a+t*.055+branch*.37;
        v=vec3((2.32+branch*.20)*cos(angle),1.24*sin(angle),5.5+.85*cos(angle+.8));
        v.xy=turn(-.20+branch*.38)*v.xy;
    }else if(u_scene<1.5){
        // A true longitudinal double helix: bodies pass at different depths.
        float angle=a*1.7+branch*3.14159+t*.24;
        v=vec3((1.6+.18*sin(a*.5))*cos(angle),1.08*sin(angle),2.3+10.0*p);
    }else if(u_scene<2.5){
        // Wall-relative lanes share the tunnel's exact integrated transport,
        // cross-section twist and moving lens as the passage opens out.
        float progress=u_time>=81.655&&u_time<136.100?clamp(u_local,0.0,1.0):0.0;
        float opening=smoothstep(.18,.65,progress),mt=u_time*(.12+.88*u_motion);
        float angle=branch*3.14159+.58*sin(a+t*.13)+p*1.5;
        vec3 world=vec3((2.35+opening*.80)*cos(angle),(1.45+opening*.45)*sin(angle),1.05+p*18.0);
        float twist=.14*sin((world.z+transitTravel())*.10)+.10*sin(mt*.19);
        world.xy=turn(-twist)*world.xy*(1.0+.06*u_beat*(.4+.6*u_motion)*u_motion);
        v=transitView(world);
    }else if(u_scene<3.5){
        // Hanging chandelier curtains leave the cathedral's aisle unobscured.
        vec3 suspended=vec3(side*(2.12+.29*sin(a*2.0+t*.20)),.25+1.75*cos(a*1.5),3.2+12.0*p);
        // The drum break turns hanging traces into a outward, falling fracture.
        float rupture=clamp(u_event.z,0.0,1.0),after=max(0.0,u_event.y-6.805);
        vec3 broken=vec3(side*(.38+3.35*p),2.1-3.8*p,3.2+15.0*p);
        broken.x+=side*.24*sin(a*2.0+t*.31+after*.5);
        broken.y+=.16*sin(a*4.0-t*.5);
        v=mix(suspended,broken,rupture);
    }else if(u_scene<4.5){
        // Orbiting jewel necklaces bank in different planes around the prism.
        float angle=a+t*.065+branch*.4;
        v=vec3(2.62*cos(angle),1.18*sin(angle),5.9+1.05*sin(angle+branch*1.5));
        v.xy=turn((branch-.5)*.74+.11*sin(t*.10))*v.xy;
    }else if(u_scene<5.5){
        // Charged fronts collide around, rather than over, the central engine.
        v=vec3(-4.2+8.4*p,side*(.75+.45*sin(p*3.14159))+.20*sin(a*3.0-t*.9),
               5.9+1.3*cos(a+t*.35));
        v.xy=turn(side*.48)*v.xy;
    }else if(u_scene<6.5){
        // Two unequal currents converge on the distant eclipse. Their highlights
        // lie on the actual waves, with perspective rather than a screen border.
        float z=max(u_event.x,0.0)*(.12+.88*u_motion)*.26+3.5+37.0*p;
        float x=side*(.32+5.8*p)+.44*sin(p*7.0+t*.035+branch);
        v=oceanView(vec3(x,oceanHeight(vec2(x,z))+.014,z));
    }else if(u_scene<7.5){
        float angle=a+t*.08+branch*.7;
        v=vec3(2.5*cos(angle),1.12*sin(angle),5.65+1.0*cos(angle+.5));
        v.xy=turn(-.42+branch*.72)*v.xy;
    }else if(u_scene<8.5){
        // Lateral jets peel away from the folded central material.
        v=vec3(side*(1.7+1.95*p),.6*sin(a+t*.18),3.8+p*6.5);
    }else if(u_scene<9.5){
        // The opening's lead belongs to the base world, with only a fine wake.
        v=vec3(-3.25+6.5*p,-.78-.73*sin(p*3.14159)+branch*.12,5.65+.45*cos(a));
    }else{
        // A lane of sparks follows the arcade road into its vanishing point.
        float z=arcadeZ()+1.2+22.0*p;
        vec2 axis=arcadeAxis(z);
        v=arcadeView(vec3(axis+vec2(side*1.90,-1.52+.025*sin(a*3.0)),z));
    }
    v.x+=.08*sin(t*.14+branch*3.0);
    if((u_scene<1.5||u_scene>2.5)&&(u_scene<5.5||u_scene>6.5))v.xy-=u_pointer*(.12+.24/v.z)*u_motion;
    if(u_poster>.5)v.x+=.3;
    return v;
}
vec2 project(vec3 p){return p.xy/p.z*vec2(3.0*u_resolution.y/u_resolution.x,3.0);}
vec4 clip(vec3 p){
    return vec4(p.xy*vec2(3.0*u_resolution.y/u_resolution.x,3.0),
                p.z*.998-.2,p.z);
}
float heroSpace(vec3 p){
    // Mid-distance bodies occupy the sides; nearby bodies can cross the lens.
    vec2 s=p.xy/p.z*1.5;
    vec2 focus=vec2(u_poster>.5?.30:0.0,0.0);
    float keep=smoothstep(.20,.39,length((s-focus)*vec2(1.0,1.1)));
    return mix(.24,1.0,keep);
}
vec2 arcadeAxis(float z){return vec2(1.55*sin(z*.065)+.40*sin(z*.19),.72*sin(z*.075)+.28*cos(z*.17));}
float arcadeZ(){return max(u_event.x,0.0)*(.12+.88*u_motion)*5.40;}
void arcadeCamera(out vec3 ro,out vec3 forward,out vec3 right,out vec3 up,out float lens,out float bank){
    float z=arcadeZ(),progress=clamp(u_event.w,0.0,1.0),strafe=.36*sin(z*.11)*u_motion;
    float rise=.35+.85*sin(progress*TAU)*u_motion;
    ro=vec3(arcadeAxis(z)+vec2(strafe,rise),z);
    vec3 ta=vec3(arcadeAxis(z+4.0)+vec2(-.15*strafe,.18+.25*cos(progress*TAU)),z+4.0);
    ro.xy+=u_pointer*.09*u_motion;
    forward=normalize(ta-ro);right=normalize(cross(forward,vec3(0,1,0)));up=cross(right,forward);
    lens=1.05-.035*max(u_beat*(.4+.6*u_motion),u_audio.y*u_motion);
    bank=clamp((arcadeAxis(z+2.0).x-arcadeAxis(z).x)*.38,-.33,.33)*u_motion;
    float trick=smoothstep(.30,.42,progress)*(1.0-smoothstep(.72,.84,progress));
    bank+=trick*.69*sin((progress-.30)*TAU/.54)*u_motion;
}
vec3 arcadeView(vec3 world){
    vec3 ro,f,r,u;float lens,bank;arcadeCamera(ro,f,r,u,lens,bank);
    vec3 v=world-ro;return vec3(turn(-bank)*vec2(dot(v,r),dot(v,u))*lens/1.5,dot(v,f));
}
float arcadeDepth(vec3 world){vec3 ro,f,r,u;float lens,bank;arcadeCamera(ro,f,r,u,lens,bank);return length(world-ro);}
float actorClock(){return u_time*clamp(u_motion,0.0,1.0);}
float transitTravel(){
    float rate=.12+.88*u_motion,kick=u_beat*(.4+.6*u_motion)*u_motion;
    if(u_time>=81.655&&u_time<136.100){
        float age=max(u_event.x,0.0),p=clamp(age/54.445,0.0,1.0);
        return (81.655*6.7+6.7*age+(16.5*54.445/2.4)*pow(p,2.4))*rate+.70*kick;
    }
    return u_time*rate*6.7+.70*kick;
}
vec3 transitView(vec3 world){
    float t=u_time*(.12+.88*u_motion),age=max(u_event.x,0.0),mode=mod(floor(u_shot),4.0);
    float progress=u_time>=81.655&&u_time<136.100?clamp(u_local,0.0,1.0):0.0;
    float opening=smoothstep(.18,.65,progress),kick=u_beat*(.4+.6*u_motion)*u_motion;
    float bank=(mode==1.0?.32:mode==3.0?-.20:.06)*sin(t*.27)+.18*opening*sin(age*.23)*u_motion;
    vec3 ro=vec3(.22*sin(t*.22)+.60*opening*sin(age*.12),.17*cos(t*.17)+.20*opening,0);
    vec3 ta=ro+vec3(.08*sin(t*.19)+.04*opening*sin(age*.19),.05-.09*opening,1);
    if(mode==2.0)ro.xy+=vec2(.36,-.18);
    ro.xy+=u_pointer*.09*u_motion;
    vec3 forward=normalize(ta-ro),right=normalize(cross(forward,vec3(0,1,0))),up=cross(right,forward);
    vec3 p=world-ro;vec2 xy=turn(-bank)*vec2(dot(p,right),dot(p,up));
    if(mod(floor(u_seed),3.0)==2.0)xy=turn(-.016*kick)*xy;
    float lens=1.10-.15*opening-.05*kick;
    return vec3(xy*lens/(1.5*(1.0-.038*kick)),dot(p,forward));
}
float performanceAge(){return u_event.w*13.61*clamp(u_motion,0.0,1.0);}
float shadowProgress(float id,float t){return clamp(u_event.w*13.61/4.0,0.0,1.0);}
float shadowSpeed(float id){return u_catRole>1.5?0.0:6.18*u_motion;}
float runnerZ(float t){
    float age=max(0.0,performanceAge()-max(0.0,actorClock()-t));
    float origin=arcadeZ()-u_event.w*13.61*(.12+.88*u_motion)*5.40;
    return origin+4.8+age*6.18;
}
float runnerJump(float t){
    float distanceToGap=3.6-abs(mod(runnerZ(t)+3.6,7.2)-3.6);
    return 1.0-smoothstep(.02,.82,distanceToGap);
}
vec3 shadowWorld(float t){
    float age=max(0.0,performanceAge()-max(0.0,actorClock()-t)),z=runnerZ(t);
    vec2 axis=arcadeAxis(z);
    // The guide follows the left lane, with paws on the actual curved road.
    return vec3(axis.x-.76+age*.08,axis.y-1.578+.72*.40+runnerJump(t)*.22,z);
}
vec3 shadowPath(float id,float t){
    if(u_catRole>1.5)return vec3(1.35,-.62,4.6);
    return arcadeView(shadowWorld(t));
}
${oe}

`,T=`
uniform vec2 u_resolution;
uniform sampler2D u_depthTexture;
uniform float u_depthScale,u_hasDepth;
float visibility(float depth){
    if(u_hasDepth<.5)return 1.0;
    float surface=texture(u_depthTexture,gl_FragCoord.xy/u_resolution).a*u_depthScale;
    return smoothstep(-.10,.20,surface-depth);
}
`,se=`#version 300 es
${w}
uniform float u_kind;
out vec2 v_shape;
out vec3 v_color;
out float v_alpha, v_blur, v_size,v_depth;
const vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
void main(){
    float id=float(gl_InstanceID),h=hash(id+5.1),branch=mod(id,2.0),t=clock();
    float speed=u_scene>1.5&&u_scene<2.5?.22:u_scene>4.5&&u_scene<5.5?.075:.034;
    if(u_scene>5.5&&u_scene<6.5)speed=.012;
    float direction=u_scene>1.5&&u_scene<2.5?-1.0:u_scene>4.5&&u_scene<5.5?(branch<.5?1.0:-1.0):1.0;
    float p=fract(h+t*(speed+.010*hash(id+91.0))*direction);
    if(u_scene>1.5&&u_scene<2.5)p=fract(h-transitTravel()/18.0);
    vec3 center=flow(p,branch),previous=flow(p-.012,branch);
    float helix=id*2.399963+t*(.9+.45*hash(id+21.0));
    float spread=.085+.18*pow(hash(id+84.0),2.0);
    center.yz+=vec2(cos(helix),sin(helix))*spread;
    center.x+=.085*sin(helix*1.3);
    float size=.008+.020*pow(hash(id+13.0),3.0);
    if(mod(id,117.0)<.5)size*=2.6;
    // A bass hit physically spreads the wake rather than scaling every light.
    center.xy+=normalize(center.xy+vec2(.01))*.10*u_audio.y;
    size*=1.0+.10*u_energy.x;
    v_blur=0.0;
    v_alpha=(.30+.36*h)*heroSpace(center);
    if(u_scene>2.5&&u_scene<3.5)v_alpha*=mix(.28,.58,clamp(u_event.z,0.0,1.0));
    if(u_scene>3.5&&u_scene<4.5)v_alpha*=.65;
    if(u_scene>5.5&&u_scene<6.5)v_alpha*=.40;
    if(u_kind>.5){
        center=vec3((hash(id+4.0)-.5)*8.8,(hash(id+61.0)-.5)*5.0,
                    1.05+fract(hash(id+37.0)-t*.034)*4.8);
        center.x+=sign(center.x)*1.20;
        center.xy=turn(.09*sin(t*.1))*center.xy;
        center.xy-=u_pointer*.25*u_motion;
        previous=center+vec3(.09,.018,.035);
        size=.05+.075*hash(id+78.0);
        v_blur=1.0-smoothstep(1.15,3.2,center.z);
        v_alpha=(.12+.27*(1.0-v_blur))*.65;
        if(u_scene>3.5&&u_scene<4.5)v_alpha*=.65;
        if(u_scene>5.5&&u_scene<6.5)v_alpha*=.45;
    }
    vec2 q=corners[gl_VertexID];
    v_shape=vec2(q.x*4.0-2.5,q.y*1.5);
    vec2 tangent=normalize(project(center)-project(previous)+vec2(.00001));
    if(u_kind>.5)tangent=normalize(vec2(.9,-.3));
    vec2 across=vec2(-tangent.y,tangent.x);
    vec2 screenOffset=(tangent*v_shape.x+across*v_shape.y)*size;
    vec4 position=clip(center);
    position.xy+=screenOffset*vec2(3.0*u_resolution.y/u_resolution.x,3.0);
    gl_Position=position;
    v_color=palette(hash(id+44.0)*.87);
    if(u_scene>1.5&&u_scene<2.5)v_color=transitColor(id);
    if(u_scene>2.5&&u_scene<3.5)v_color=mix(vec3(.08,.48,.64),vec3(.70,.12,.93),hash(id+16.0)*(.3+.7*u_event.z));
    if(u_kind>.5)v_color=mix(vec3(.06,.56,.82),vec3(.48,.13,.88),hash(id+14.0));
    v_size=size;
    v_alpha*=u_density;
    v_depth=center.z;
}
`,ce=`#version 300 es
precision highp float;
${T}
in vec2 v_shape;
in vec3 v_color;
in float v_alpha,v_blur,v_size,v_depth;
out vec4 fragColor;
void main(){
    float d=length(v_shape),sphere=1.0-smoothstep(.88,1.04,d);
    vec3 normal=vec3(v_shape,sqrt(max(0.0,1.0-d*d)));
    float diffuse=max(0.0,dot(normal,normalize(vec3(-.55,.7,1.0))));
    float spec=pow(max(0.0,dot(normal,normalize(vec3(-.35,.45,1.0)))),24.0);
    float rim=pow(1.0-max(normal.z,0.0),3.0);
    vec3 solid=v_color*(.18+.72*diffuse)+v_color*spec*.22+v_color*rim*.36;
    float glow=exp(-d*d*1.5)*.08;
    float tail=exp(-abs(v_shape.y)*12.0)*exp(min(v_shape.x,0.0)*.66)
               *(1.0-smoothstep(-.3,.1,v_shape.x))*.18;
    float blur=exp(-d*d*.7)*.40;
    vec3 color=mix(solid*sphere+v_color*(glow+tail),v_color*blur,v_blur);
    float alpha=mix(max(sphere,glow+tail),blur,v_blur)*v_alpha;
    if(alpha<.002)discard;
    fragColor=vec4(color,alpha*visibility(v_depth));
}
`,le=`#version 300 es
${w}
out float v_side,v_phase,v_alpha,v_depth;
out vec3 v_color;
const float side[6]=float[6](-1.0,1.0,-1.0,-1.0,1.0,1.0);
const float edge[6]=float[6](0.0,0.0,1.0,1.0,0.0,1.0);
void main(){
    float id=float(gl_InstanceID),s=float(gl_VertexID/6);
    float p=(s+edge[gl_VertexID%6])/420.0;
    float branch=mod(id,2.0),t=clock();
    vec3 center=flow(p,branch),ahead=flow(p+.003,branch);
    float twist=p*TAU*3.0-t*.35+id*2.2;
    center.yz+=vec2(cos(twist),sin(twist))*(.07+.075*id);
    vec3 tangent=normalize(ahead-flow(p-.003,branch));
    vec3 normal=normalize(cross(tangent,normalize(center)));
    float front=fract(u_audio.w)*1.5-.25;
    float impulse=exp(-pow((p-front)*12.0,2.0))*u_audio.x;
    center+=normal*impulse*.055*u_motion;
    float width=(.008+.009*pow(sin(p*3.14159),2.0))*(1.0+.18*u_energy.y);
    center+=normal*side[gl_VertexID%6]*width;
    gl_Position=clip(center);
    v_side=side[gl_VertexID%6];v_phase=p;
    v_color=id<1.5?vec3(.06,.66,.94):vec3(.63,.12,.83);
    if(u_scene>1.5&&u_scene<2.5)v_color=transitColor(id*7.0);
    if(u_scene>2.5&&u_scene<3.5)v_color=id<1.5?vec3(.17,.69,.94):vec3(.64,.21,.90);
    v_alpha=pow(sin(p*3.14159),.35)*heroSpace(center)*u_density;
    if(u_scene>2.5&&u_scene<3.5)v_alpha*=mix(.16,.36,clamp(u_event.z,0.0,1.0));
    if(u_scene>3.5&&u_scene<4.5)v_alpha*=.65;
    if(u_scene>5.5&&u_scene<6.5)v_alpha*=.42;
    v_depth=center.z;
}
`,ue=`#version 300 es
precision highp float;
${T}
in float v_side,v_phase,v_alpha,v_depth;
in vec3 v_color;
out vec4 fragColor;
uniform float u_time,u_beat;
void main(){
    float bevel=sqrt(max(0.0,1.0-v_side*v_side));
    float spec=pow(max(0.0,1.0-abs(v_side-.34)*1.5),10.0);
    float traveling=pow(.5+.5*cos(v_phase*60.0-u_time*2.8),8.0);
    vec3 color=v_color*(.30+.58*bevel+.34*traveling)+v_color*spec*.24;
    float alpha=v_alpha*(.36+.24*bevel+.16*traveling);
    fragColor=vec4(color,alpha*visibility(v_depth));
}
`,de=`#version 300 es
${w}
uniform float u_kind;
out vec2 v_shape;
out vec3 v_color;
out float v_alpha,v_id,v_depth,v_scale,v_phase,v_echo,v_jump,v_crouch,v_role;
const vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
void main(){
    float id=0.0,t=actorClock(),echo=u_kind;
    t-=echo*.10*clamp(u_motion,0.0,1.0);
    vec3 center=shadowPath(id,t);
    float scale=u_catRole>1.5?.55:.40;
    float progress=shadowProgress(id,t);
    float direction=u_catRole>1.5?-1.0:1.0;
    v_crouch=u_catRole>1.5?smoothstep(-2.6,-.12,u_event.y)*.70*u_motion:0.0;
    v_role=u_catRole;
    // A stationary sentinel only breathes; running paws share the lane speed.
    float age=max(0.0,performanceAge()-echo*.10*u_motion),stride=age*18.6;
    center.y+=u_catRole>1.5?0.0:.012*sin(stride*2.0);
    v_shape=vec2(corners[gl_VertexID].x*1.85-.25,corners[gl_VertexID].y*1.08+.05);
    vec2 local=vec2(v_shape.x*direction,v_shape.y);
    vec3 body=center+vec3(local*scale,0.0);
    if(u_catRole<1.5){
        // A physical profile plane along the road, rather than a pasted face.
        vec3 origin=shadowWorld(t);
        vec3 world=origin+vec3(.35,0,.94)*local.x*scale+vec3(0,local.y*scale,0);
        world.y+=arcadeAxis(world.z).y-arcadeAxis(origin.z).y;
        body=arcadeView(world);
    }
    gl_Position=clip(body);
    v_color=u_catRole>1.5?vec3(.22,.50,.70):vec3(.10,.74,.92);
    v_alpha=u_density;
    if(u_catRole>1.5)v_alpha*=1.0-smoothstep(-.16,0.0,u_event.y);
    else v_alpha*=smoothstep(0.0,.18,u_event.w*13.61)*(1.0-smoothstep(3.55,4.0,u_event.w*13.61));
    v_id=id;v_depth=u_catRole>1.5?center.z:arcadeDepth(shadowWorld(t));v_scale=scale;
    v_phase=u_catRole>1.5?0.0:stride;
    v_echo=echo;v_jump=u_catRole>1.5?0.0:runnerJump(t);
}
`,fe=`#version 300 es
precision highp float;
${T}
in vec2 v_shape;
in vec3 v_color;
in float v_alpha,v_id,v_depth,v_scale,v_phase,v_echo,v_jump,v_crouch,v_role;
uniform float u_time,u_motion,u_beat;
out vec4 fragColor;
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cross2(vec2 a,vec2 b){return a.x*b.y-a.y*b.x;}
float triangle(vec2 p,vec2 a,vec2 b,vec2 c){
    vec2 ab=b-a,bc=c-b,ca=a-c;float winding=sign(cross2(ab,c-a));
    return max(max(-winding*cross2(ab,p-a)/length(ab),-winding*cross2(bc,p-b)/length(bc)),-winding*cross2(ca,p-c)/length(ca));
}
float ellipse(vec2 p,vec2 r){return (length(p/r)-1.0)*min(r.x,r.y);}
float capsule(vec2 p,vec2 a,vec2 b,float radius){vec2 q=p-a,e=b-a;return length(q-e*clamp(dot(q,e)/dot(e,e),0.0,1.0))-radius;}
float merge(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
float silhouette(vec2 p){
    float gait=v_phase,bob=v_role>1.5?.006*sin(u_time*u_motion*1.8):.015*sin(gait*2.0);
    // Compression keeps all four paws planted while the watcher crouches.
    float ground=-.72;
    p.y=ground+(p.y-ground)/(1.0-.28*v_crouch);
    p.y-=bob;
    float d=ellipse(p-vec2(-.02,.02),vec2(.64,.25));
    d=merge(d,ellipse(p-vec2(.42,.20),vec2(.24,.31)),.09);
    d=merge(d,ellipse(p-vec2(.67,.47),vec2(.225,.23)),.045);
    d=merge(d,ellipse(p-vec2(.84,.41),vec2(.10,.082)),.022);
    d=min(d,triangle(p,vec2(.49,.61),vec2(.59,.84),vec2(.70,.65))-.010);
    d=min(d,triangle(p,vec2(.68,.65),vec2(.79,.83),vec2(.86,.60))-.008);
    // Four articulated legs: diagonally paired, with shoulders, knees and paws.
    for(int side=0;side<2;side++){
        float phase=gait+float(side)*3.14159;
        float swing=v_role>1.5?0.0:sin(phase),lift=v_role>1.5?0.0:max(0.0,cos(phase));
        vec2 hip=vec2(-.45,-.12),knee=vec2(-.40+.14*swing,-.36);
        vec2 foot=vec2(-.48-.23*swing-v_jump*.10,-.72+.14*lift+v_jump*.20);
        d=merge(d,capsule(p,hip,knee,.064),.045);
        d=min(d,capsule(p,knee,foot,.035));
        d=min(d,ellipse(p-foot-vec2(.043,.012),vec2(.085,.040)));
        vec2 shoulder=vec2(.40,-.09),elbow=vec2(.43-.11*swing,-.35);
        vec2 fore=vec2(.47+.23*swing+v_jump*.15,-.72+(v_role>1.5?0.0:.14*max(0.0,-cos(phase)))+v_jump*.12);
        d=merge(d,capsule(p,shoulder,elbow,.045),.045);
        d=min(d,capsule(p,elbow,fore,.031));
        d=min(d,ellipse(p-fore-vec2(.043,.012),vec2(.083,.038)));
    }
    // Long expressive tail, a curved chain of physical slender segments.
    vec2 previous=vec2(-.57,.04);
    for(int i=1;i<=12;i++){
        float u=float(i)/12.0;
        float v=1.0-u,sway=v_role>1.5?.22*sin(u_time*u_motion*.75):sin(gait*.30);
        vec2 next=v*v*v*vec2(-.57,.04)+3.0*v*v*u*vec2(-1.14,.12+.08*sway)
                  +3.0*v*u*u*vec2(-1.88,.91+.14*sway)+u*u*u*vec2(-1.48,.96+.12*sway);
        d=min(d,capsule(p,previous,next,.045-.022*u));previous=next;
    }
    d=min(d,capsule(p,vec2(.90,.43),vec2(1.14,.47),.006));
    d=min(d,capsule(p,vec2(.90,.40),vec2(1.12,.33),.006));
    return d;
}
void main(){
    float d=silhouette(v_shape),aa=max(fwidth(d),.0014);
    if(d>max(.028,aa*3.0))discard;
    float inside=1.0-smoothstep(-aa,aa,d);
    float grain=hash2(gl_FragCoord.xy+floor(u_time*24.0)*vec2(13.1,37.3));
    float contour=exp(-abs(d)*110.0)*( .35+.65*smoothstep(.18,.8,grain));
    vec2 gradient=normalize(vec2(silhouette(v_shape+vec2(.002,0))-d,silhouette(v_shape+vec2(0,.002))-d)+vec2(.00001));
    float rimLight=.32+.68*max(0.0,dot(gradient,normalize(vec2(-.45,.8))));
    vec3 color=vec3(.003,.005,.012)+v_color*(.009+.012*grain)*inside;
    color+=v_color*contour*(.45+.32*u_beat)*rimLight;
    // One tiny feline eye glints from the darkness; no portrait embellishments.
    float eye=exp(-dot((v_shape-vec2(.777,.503))*vec2(1,1.8),(v_shape-vec2(.777,.503))*vec2(1,1.8))*4200.0);
    color+=v_color*eye*.46;
    float alpha=max(inside*.97,contour*.50)*v_alpha;
    if(v_echo>.5){
        color=v_color*contour*(.42+.35*grain);
        alpha=contour*.29/v_echo*v_alpha*(.5+.5*u_beat);
    }
    alpha*=visibility(v_depth-.06*v_scale);
    fragColor=vec4(color,alpha);
}
`,pe=`#version 300 es
${w}
uniform float u_kind;
out vec3 v_normal,v_position;
out vec2 v_shape;
out float v_depth,v_alpha;
const vec2 quad[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
void main(){
    vec3 center=shadowPath(0.0,actorClock());
    float scale=u_catRole>1.5?.55:.40;
    float top=center.y-.72*scale;
    vec2 q=quad[gl_VertexID%6];
    v_shape=q;
    vec3 p;
    if(u_kind<.5){
        int face=gl_VertexID/6;vec3 unit;
        if(face==0){unit=vec3(1,q.x,q.y);v_normal=vec3(1,0,0);}
        else if(face==1){unit=vec3(-1,q.x,q.y);v_normal=vec3(-1,0,0);}
        else if(face==2){unit=vec3(q.x,1,q.y);v_normal=vec3(0,1,0);}
        else if(face==3){unit=vec3(q.x,-1,q.y);v_normal=vec3(0,-1,0);}
        else if(face==4){unit=vec3(q.x,q.y,1);v_normal=vec3(0,0,1);}
        else{unit=vec3(q.x,q.y,-1);v_normal=vec3(0,0,-1);}
        // The thin cantilever joins a slim pier running into the foreground
        // floor/crop, so the watcher is part of the architecture.
        vec3 base=vec3(center.x,top-.035,center.z);
        vec3 extent=vec3(.53,.035,.22);
        if(gl_InstanceID>0){base=vec3(center.x+.42,top-.53,center.z+.16);extent=vec3(.055,.495,.105);}
        p=base+unit*extent;
    }else{
        p=vec3(center.x+q.x*.42,top+.003,center.z+q.y*.21);
        if(u_catRole<1.5){
            vec3 world=shadowWorld(actorClock());
            world.y-=.72*scale+runnerJump(actorClock())*.22;
            world+=vec3(q.x*.24,.003,q.y*.38);
            p=arcadeView(world);
        }
        v_normal=vec3(0,1,0);
    }
    v_position=p;v_depth=p.z;gl_Position=clip(p);
    v_alpha=u_density;
    if(u_catRole<1.5)v_alpha*=smoothstep(0.0,.18,u_event.w*13.61)*(1.0-smoothstep(3.55,4.0,u_event.w*13.61))*(1.0-.5*runnerJump(actorClock()));
}
`,me=`#version 300 es
precision highp float;
${T}
uniform float u_kind;
in vec3 v_normal,v_position;
in vec2 v_shape;
in float v_depth,v_alpha;
out vec4 fragColor;
void main(){
    if(u_kind>.5){
        float shadow=exp(-dot(v_shape,v_shape)*2.7)*.48;
        fragColor=vec4(vec3(.001,.002,.007),shadow*v_alpha*visibility(v_depth));return;
    }
    float light=max(0.0,dot(v_normal,normalize(vec3(-.4,1,-.5))));
    float seam=pow(max(0.0,1.0-abs(v_shape.x)*.97),40.0)+pow(max(0.0,1.0-abs(v_shape.y)*.97),40.0);
    vec3 color=vec3(.008,.028,.043)*(.45+.85*light);
    color+=vec3(.008,.09,.13)*seam*.20;
    fragColor=vec4(color,v_alpha*visibility(v_depth));
}
`,he=`#version 300 es
${w}
uniform float u_kind;
out vec2 v_shape;
out vec3 v_world;
out float v_depth,v_alpha,v_phase,v_reflection,v_rear,v_turn;
const vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
void main(){
    float age=clamp(u_event.y,0.0,17.01),scale=.70;
    vec3 center=swimmerWorld(age),axis=swimmerDirection(age);
    v_turn=abs(axis.z);
    v_shape=vec2(corners[gl_VertexID].x*1.70-.38,corners[gl_VertexID].y*.96+.08);
    vec3 world=center+axis*v_shape.x*scale+vec3(0,v_shape.y*scale,0);
    v_rear=step(1.5,u_kind);
    if(v_rear>.5){
        // A second physical skull cross-section preserves two ears as the cat
        // turns away; the side-profile plane alone would collapse edge-on.
        v_shape=vec2(corners[gl_VertexID].x*.35,corners[gl_VertexID].y*.43+.36);
        vec3 across=vec3(-axis.z,0,axis.x);
        world=center+axis*.64*scale+across*v_shape.x*scale+vec3(0,v_shape.y*scale,0);
    }
    v_reflection=mod(u_kind,2.0);
    if(v_reflection>.5){
        world.y=2.0*oceanHeight(world.xz)-world.y;
        world.x+=.014*sin(world.z*8.0+u_time*(.12+.88*u_motion));
    }
    v_world=world;v_depth=oceanDepth(world);
    gl_Position=clip(oceanView(world));
    v_phase=age*4.8*u_motion;
    // Departure is primarily eleven metres of perspective toward the light.
    // A short final dissolve removes the distant head before the end title.
    v_alpha=smoothstep(0.0,.45,u_event.y)*(1.0-smoothstep(16.65,17.01,u_event.y));
    if(v_rear>.5)v_alpha*=smoothstep(.22,.70,abs(axis.z));
}
`,ge=`#version 300 es
precision highp float;
${T}
uniform float u_time,u_motion,u_beat;
uniform vec4 u_event,u_audio;
${oe}
in vec2 v_shape;
in vec3 v_world;
in float v_depth,v_alpha,v_phase,v_reflection,v_rear,v_turn;
out vec4 fragColor;
float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ellipse(vec2 p,vec2 r){return (length(p/r)-1.0)*min(r.x,r.y);}
float capsule(vec2 p,vec2 a,vec2 b,float radius){vec2 q=p-a,e=b-a;return length(q-e*clamp(dot(q,e)/dot(e,e),0.0,1.0))-radius;}
float cross2(vec2 a,vec2 b){return a.x*b.y-a.y*b.x;}
float triangle(vec2 p,vec2 a,vec2 b,vec2 c){
    vec2 ab=b-a,bc=c-b,ca=a-c;float winding=sign(cross2(ab,c-a));
    return max(max(-winding*cross2(ab,p-a)/length(ab),-winding*cross2(bc,p-b)/length(bc)),-winding*cross2(ca,p-c)/length(ca));
}
float merge(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
float feline(vec2 p){
    if(v_rear>.5){
        float d=ellipse(p-vec2(0,.38),vec2(.225,.215));
        d=merge(d,ellipse(p-vec2(0,.12),vec2(.20,.23)),.06);
        d=min(d,triangle(p,vec2(-.19,.49),vec2(-.205,.75),vec2(-.025,.56))-.008);
        d=min(d,triangle(p,vec2(.025,.56),vec2(.205,.75),vec2(.19,.49))-.008);
        return d;
    }
    float d=ellipse(p-vec2(-.14,-.055),vec2(.69,.245));
    d=merge(d,ellipse(p-vec2(.35,.10),vec2(.24,.27)),.08);
    d=merge(d,ellipse(p-vec2(.64,.39),vec2(.215,.215)),.05);
    d=merge(d,ellipse(p-vec2(.82,.335),vec2(.095,.075)),.028);
    float ear=1.0-smoothstep(.40,.72,v_turn);
    d=min(d,triangle(p,vec2(.47,.53),vec2(.58,.57+.20*ear),vec2(.70,.55))-.010);
    d=min(d,triangle(p,vec2(.67,.56),vec2(.79,.57+.18*ear),vec2(.86,.51))-.008);
    for(int side=0;side<2;side++){
        float phase=v_phase+float(side)*3.14159;
        vec2 shoulder=vec2(.36,-.09),elbow=vec2(.40+.13*sin(phase),-.30);
        vec2 paw=vec2(.40-.22*sin(phase),-.55+.10*cos(phase));
        d=merge(d,capsule(p,shoulder,elbow,.05),.04);
        d=min(d,capsule(p,elbow,paw,.03));
        d=min(d,ellipse(p-paw,vec2(.07,.033)));
        vec2 hip=vec2(-.49,-.14),knee=vec2(-.43-.12*sin(phase),-.29);
        vec2 hind=vec2(-.47+.18*sin(phase),-.49-.09*cos(phase));
        d=merge(d,capsule(p,hip,knee,.062),.035);
        d=min(d,capsule(p,knee,hind,.03));
    }
    vec2 previous=vec2(-.71,-.015);
    for(int i=1;i<=10;i++){
        float a=float(i)/10.0,b=1.0-a,sway=.045*sin(v_phase*.5);
        vec2 next=b*b*b*vec2(-.71,-.015)+3.0*b*b*a*vec2(-1.11,.005)
                 +3.0*b*a*a*vec2(-1.84,.30+sway)+a*a*a*vec2(-1.70,.12+sway);
        d=min(d,capsule(p,previous,next,.039-.018*a));previous=next;
    }
    d=min(d,capsule(p,vec2(.89,.35),vec2(1.10,.37),.004));
    return d;
}
void main(){
    float d=feline(v_shape),aa=max(fwidth(d),.0012);
    if(d>max(.025,aa*3.0))discard;
    float inside=1.0-smoothstep(-aa,aa,d),surface=oceanHeight(v_world.xz);
    float immersion=1.0-smoothstep(-.015,.016,v_world.y-surface);
    if(v_reflection>.5&&v_world.y>surface+.006)discard;
    float noise=grain(v_shape*650.0+floor(u_time*18.0*u_motion));
    float rim=exp(-abs(d)*105.0)*(.28+.72*noise);
    vec3 color=vec3(.002,.006,.012)+vec3(.023,.10,.16)*noise*.035;
    color+=vec3(.09,.49,.63)*rim*.40;
    float eye=exp(-dot((v_shape-vec2(.751,.433))*vec2(1,1.7),(v_shape-vec2(.751,.433))*vec2(1,1.7))*5200.0);
    color+=vec3(.16,.54,.61)*eye*.26*(1.0-v_rear);
    float wet=exp(-abs(v_world.y-surface)*180.0)*inside;
    color+=vec3(.05,.37,.47)*wet*.28;
    float alpha=max(inside*.97,rim*.38)*v_alpha;
    if(v_reflection>.5){
        color=mix(vec3(.004,.023,.038),color,.40)+vec3(.008,.038,.06)*rim;
        alpha*=.20*exp(-max(0.0,surface-v_world.y)*5.0);
    }else{
        color=mix(color,vec3(.014,.085,.11),immersion*.65);
        alpha*=mix(1.0,.115,immersion);
    }
    // Immersed strokes and the reflection live in the water texture. The head
    // retains ordinary opaque scene depth, so it can disappear behind a wave.
    float depth=v_depth;
    if((immersion>.5||v_reflection>.5)&&u_hasDepth>.5){
        float surfaceDepth=texture(u_depthTexture,gl_FragCoord.xy/u_resolution).a*u_depthScale;
        depth=min(depth,surfaceDepth-.08);
    }
    fragColor=vec4(color,alpha*visibility(depth));
}
`,_e=`#version 300 es
${w}
uniform float u_kind;
out vec2 v_shape;
out float v_age,v_alpha,v_depth,v_kind;
const vec2 corners[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
void main(){
    // Each alternating paddle half-cycle emits one ripple at its actual stroke.
    float age=max(0.0,u_event.y),id=float(gl_InstanceID),strokeRate=1.527887*max(.01,u_motion);
    float latest=min(age,17.01),birth=(floor(latest*strokeRate)-id)/strokeRate;
    float life=age-birth,valid=step(0.0,birth)*step(0.0,life)*(1.0-step(2.25,life));
    vec3 center=swimmerWorld(clamp(birth,0.0,17.01));
    vec3 axis=swimmerDirection(clamp(birth,0.0,17.01)),across=vec3(-axis.z,0,axis.x);
    center+=across*(mod(floor(birth*strokeRate),2.0)<.5?-.14:.14);
    vec2 q=corners[gl_VertexID];float radius=.10+life*.46*(.25+.75*u_motion);
    v_shape=q;v_age=life;v_kind=u_kind;
    vec3 world=center+vec3(q.x*radius,0,q.y*radius*.60);
    v_alpha=valid*smoothstep(0.0,.12,life)*(1.0-smoothstep(.60,2.25,life))*.17;
    if(u_kind>.5){
        center=swimmerWorld(min(age,17.01));axis=swimmerDirection(min(age,17.01));across=vec3(-axis.z,0,axis.x);
        v_shape=vec2(q.x*1.45,(q.y+1.0)*2.2);
        world=center+across*v_shape.x-axis*v_shape.y;
        v_alpha=smoothstep(0.0,1.0,age)*(1.0-smoothstep(17.01,18.12,age))*.14*(.08+.92*u_motion);
    }
    world.y=oceanHeight(world.xz)+.012;
    v_depth=oceanDepth(world);gl_Position=clip(oceanView(world));
}
`,ve=`#version 300 es
precision highp float;
${T}
in vec2 v_shape;
in float v_age,v_alpha,v_depth,v_kind;
uniform float u_time,u_motion;
out vec4 fragColor;
void main(){
    float foam;
    if(v_kind<.5){
        float r=length(v_shape);
        foam=exp(-abs(r-.72)*60.0)+.30*exp(-abs(r-.49)*65.0);
        foam*=1.0-smoothstep(.83,1.0,r);
    }else{
        float width=.10+v_shape.y*.27;
        float broken=.65+.35*sin(v_shape.y*23.0-u_time*1.7*u_motion);
        foam=exp(-abs(abs(v_shape.x)-width)*75.0)*exp(-v_shape.y*.54)*broken;
        foam+=.16*exp(-abs(v_shape.x)*10.0)*exp(-v_shape.y*.75);
        foam*=smoothstep(0.0,.18,v_shape.y)*(1.0-smoothstep(3.3,4.4,v_shape.y));
    }
    fragColor=vec4(vec3(.08,.49,.61),foam*v_alpha*visibility(v_depth));
}
`,ye=`#version 300 es
${w}
uniform float u_kind;
out vec2 v_shape;
out vec3 v_color;
out float v_alpha,v_depth,v_kind;
const vec2 quad[6]=vec2[6](vec2(-1,-1),vec2(1,-1),vec2(-1,1),vec2(-1,1),vec2(1,-1),vec2(1,1));
void main(){
    float id=float(gl_InstanceID),h=hash(id+12.7),j=hash(id+51.4);
    float phase=fract(u_audio.w),pulse=floor(u_audio.w),t=clock();
    vec3 p;vec2 q=quad[gl_VertexID%6];v_shape=q;v_kind=u_kind;
    float alpha=0.0,size=.015+.035*h;
    v_color=palette(.2+.65*j);
    if(u_kind<.5){
        if(u_scene>2.5&&u_scene<3.5){
            float rate=.18+.82*u_motion;
            float z=3.4+j*17.0,side=hash(id+6.0)<.5?-1.0:1.0;
            p=vec3(side*(.8+hash(id+73.0)*2.2),2.5+hash(id+9.0)*1.3,z);
            if(u_event.y<6.805){
                // First fracture is a physical gravity burst. It exits the
                // frustum naturally; no dying-alpha tail suggests braking.
                float age=max(0.0,u_event.y-h*.75)*rate;
                p+=vec3(side*(.40+.50*h)*age,-(.45+.9*j)*age-.38*age*age,-.24*age);
                alpha=step(0.0,u_event.y)*smoothstep(0.0,.12,age)*.72;
            }else{
                // Reentry establishes a sustained falling field. Each depth
                // has a fixed velocity and brightness all the way to LS05.
                float fallSpeed=1.60+.09*z,span=1.20*z;
                float initial=fract((id+.5)/128.0+h*.013)*span;
                float travel=mod((u_event.y-6.805)*rate*fallSpeed+initial,span);
                p.y=.60*z-travel;
                alpha=.34;
            }
            p.x+=.10*sin(t*.6+id);
            size=.025+.060*pow(h,2.0);
            v_color=mix(vec3(.10,.57,.72),vec3(.53,.15,.82),h);
        }else{
            float age=phase*.4255;
            float angle=id*2.399963+pulse*.71,z=4.5+j*12.0;
            float radius=.6+age*(3.0+5.0*h);
            p=vec3(cos(angle)*radius,sin(angle)*radius*.65-.6,z-age*(2.0+5.0*j));
            alpha=smoothstep(.30,.83,u_audio.y)*exp(-phase*2.8);
            alpha*=u_scene>1.5&&u_scene<2.5?.56:.38;
        }
        vec2 local=turn(id*2.39996+t*(.6+h)*u_motion)*q;
        gl_Position=clip(p+vec3(local*vec2(size,size*(1.6+2.8*j)),0.0));
    }else if(u_kind<1.5){
        float segment=id/64.0;
        int corner=gl_VertexID%6;
        float edge=corner==2||corner==3||corner==5?1.0:0.0;
        float angle=(segment+edge/64.0)*TAU;
        float age=phase*.4255,radius=.25+age*9.5;
        float strength=smoothstep(.58,.94,u_audio.y)*exp(-phase*2.0);
        if(u_scene>2.5&&u_scene<3.5){
            if(u_event.y<0.0){
                radius=.25+age*6.5;
                strength*=.28;
            }else{
                age=u_event.y*(.18+.82*u_motion);
                radius=.22+age*4.2;
                strength=1.0-smoothstep(.45,1.45,age);
            }
        }
        float side=corner==0||corner==2||corner==3?-1.0:1.0,r=radius+side*.022;
        // Banked in depth, so the wave can pass behind pillars and facets.
        p=vec3(cos(angle)*r,sin(angle)*r*.68+.36,7.4+sin(angle)*r*.26);
        gl_Position=clip(p);v_shape=vec2(side,0.0);
        alpha=strength*.42;v_color=vec3(.13,.48,.87);
    }else{
        float h2=hash(id+pulse*3.17),age=phase*.4255;
        float z=2.0+fract(h2-t*.17)*17.0;
        float side=mod(id,2.0)<.5?-1.0:1.0;
        if(u_scene>2.5&&u_scene<3.5){
            if(u_event.y<0.0){
                // Just three tracers streak from the side lanterns on onsets.
                p=vec3(side*(2.0+.08*sin(pulse)),.92+.55*id-age*2.0,5.0+id*3.2-age*3.5);
                alpha=id<3.0?smoothstep(.38,.80,max(u_audio.x,u_audio.z))*exp(-phase*2.5)*.32:0.0;
            }else{
                p=vec3(side*(1.05+.14*z),1.6-2.2*fract(h2+t*.24),z);
                alpha=smoothstep(6.8,8.1,u_event.y)*(.12+.34*u_audio.x);
            }
        }else{
            p=vec3(side*(.8+.13*z),-.30+.8*sin(id*2.2),z-age*8.0);
            alpha=(.10+.35*u_audio.x)*smoothstep(.1,.8,u_energy.z);
        }
        vec2 local=turn(side*.37)*vec2(q.x*(.22+.32*h2),q.y*.007);
        gl_Position=clip(p+vec3(local,0.0));v_color=vec3(.06,.64,.88);
    }
    v_depth=p.z;v_alpha=alpha*u_density;
    if(u_scene>5.5&&u_scene<6.5)v_alpha=0.0;
}
`,be=`#version 300 es
precision highp float;
${T}
in vec2 v_shape;
in vec3 v_color;
in float v_alpha,v_depth,v_kind;
out vec4 fragColor;
void main(){
    if(v_alpha<.003)discard;
    float alpha;vec3 color;
    if(v_kind<.5){
        float edge=1.0-smoothstep(.88,1.0,abs(v_shape.x)+abs(v_shape.y)*.72);
        float bevel=.30+.65*max(0.0,1.0-abs(v_shape.x-v_shape.y*.18));
        color=v_color*bevel;alpha=edge*v_alpha;
    }else if(v_kind<1.5){
        float ridge=exp(-abs(v_shape.x)*2.0);
        color=v_color*(.48+.42*ridge);alpha=v_alpha*ridge;
    }else{
        float tail=exp(-abs(v_shape.y)*3.0)*(1.0-smoothstep(.35,1.0,abs(v_shape.x)));
        color=v_color;alpha=v_alpha*tail;
    }
    fragColor=vec4(color,alpha*visibility(v_depth));
}
`;function E(e,t,n){let r=[t,n].map((t,n)=>{let r=e.createShader(n?e.FRAGMENT_SHADER:e.VERTEX_SHADER);if(e.shaderSource(r,t),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(`Secondary cast shader: ${t}`)}return r}),i=e.createProgram();if(r.forEach(t=>e.attachShader(i,t)),e.linkProgram(i),r.forEach(t=>e.deleteShader(t)),!e.getProgramParameter(i,e.LINK_STATUS)){let t=e.getProgramInfoLog(i);throw e.deleteProgram(i),Error(`Secondary cast program: ${t}`)}return{program:i,uniforms:Object.fromEntries([`resolution`,`time`,`scene`,`local`,`shot`,`energy`,`beat`,`motion`,`pointer`,`poster`,`density`,`kind`,`cats`,`catRole`,`event`,`audio`,`seed`,`depthTexture`,`depthScale`,`hasDepth`].map(t=>[t,e.getUniformLocation(i,`u_${t}`)]))}}var xe=class{constructor(e){this.gl=e,this.width=e.drawingBufferWidth,this.height=e.drawingBufferHeight,this.pearl=E(e,se,ce),this.ribbon=E(e,le,ue),this.mesh=E(e,de,fe),this.support=E(e,pe,me),this.impact=E(e,ye,be),this.swim=E(e,he,ge),this.wake=E(e,_e,ve);let t=e.getParameter(e.ACTIVE_TEXTURE);e.activeTexture(e.TEXTURE4);let n=e.getParameter(e.TEXTURE_BINDING_2D);this.fallbackDepth=e.createTexture(),e.bindTexture(e.TEXTURE_2D,this.fallbackDepth),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([255,255,255,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.bindTexture(e.TEXTURE_2D,n),e.activeTexture(t);let r=e.getParameter(e.VERTEX_ARRAY_BINDING);this.emptyVAO=e.createVertexArray(),e.bindVertexArray(r)}resize(e,t){this.width=Math.max(1,e),this.height=Math.max(1,t)}renderForCompositor(e={}){this.render(e,!1)}render(e={},t=!0){let n=this.gl;if(this.disposed||n.isContextLost())return;let r=e.density??1,i=Number(e.scene??0);Math.floor(Number(e.shot??0));let a=e.catRole===`swimmer`?3:e.catRole===`sentinel`?2:+(e.catRole===`runner`),o=e.event??[0,-100,0,0],s=e.audio??[0,0,0,0],c=e.catsEnabled&&!e.poster&&i!==2&&i!==9&&(a===2&&i===3&&o[1]<0||a===1&&i===10&&o[3]*13.61<4||a===3&&i===6&&o[1]>=0&&o[1]<17.01)?1:0,l=i===6?300:i===9?310:i===4?470:i===3?420:i===10?380:1050;if(r<=0)return;let u=t?{program:n.getParameter(n.CURRENT_PROGRAM),vao:n.getParameter(n.VERTEX_ARRAY_BINDING),blend:n.isEnabled(n.BLEND),depth:n.isEnabled(n.DEPTH_TEST),cull:n.isEnabled(n.CULL_FACE),sourceRGB:n.getParameter(n.BLEND_SRC_RGB),destinationRGB:n.getParameter(n.BLEND_DST_RGB),sourceAlpha:n.getParameter(n.BLEND_SRC_ALPHA),destinationAlpha:n.getParameter(n.BLEND_DST_ALPHA),equationRGB:n.getParameter(n.BLEND_EQUATION_RGB),equationAlpha:n.getParameter(n.BLEND_EQUATION_ALPHA),depthMask:n.getParameter(n.DEPTH_WRITEMASK),activeTexture:n.getParameter(n.ACTIVE_TEXTURE)}:null;n.activeTexture(n.TEXTURE4),u&&(u.texture4=n.getParameter(n.TEXTURE_BINDING_2D)),n.bindTexture(n.TEXTURE_2D,e.depthTexture??this.fallbackDepth),n.enable(n.BLEND),n.disable(n.DEPTH_TEST),n.disable(n.CULL_FACE),n.depthMask(!1),n.blendEquation(n.FUNC_ADD);let d=t=>{n.useProgram(t.program);let i=t.uniforms;n.uniform2f(i.resolution,this.width,this.height);for(let t of[`time`,`scene`,`local`,`shot`,`beat`,`poster`,`seed`])n.uniform1f(i[t],Number(e[t]??0));n.uniform1f(i.motion,e.motion??1),n.uniform1f(i.density,r),n.uniform1f(i.cats,c),n.uniform1f(i.catRole,a),n.uniform4fv(i.event,o),n.uniform4fv(i.audio,s),n.uniform1i(i.depthTexture,4),n.uniform1f(i.depthScale,e.depthScale??40),n.uniform1f(i.hasDepth,+!!e.depthTexture),n.uniform4fv(i.energy,e.energy??[.3,.3,.2,.25]),n.uniform2fv(i.pointer,e.pointer??[0,0])};try{n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),n.bindVertexArray(this.emptyVAO),d(this.ribbon),n.drawArraysInstanced(n.TRIANGLES,0,2520,[2,3,6,10].includes(i)?2:3),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE_MINUS_SRC_ALPHA),d(this.pearl),n.uniform1f(this.pearl.uniforms.kind,0),n.drawArraysInstanced(n.TRIANGLES,0,6,Math.round(l*Math.min(r,1))),[2,3,5,10].includes(i)&&(d(this.impact),n.uniform1f(this.impact.uniforms.kind,0),n.drawArraysInstanced(n.TRIANGLES,0,6,i===3?128:44),n.uniform1f(this.impact.uniforms.kind,1),n.drawArraysInstanced(n.TRIANGLES,0,6,64),n.uniform1f(this.impact.uniforms.kind,2),n.drawArraysInstanced(n.TRIANGLES,0,6,i===3?18:12)),i===6&&!e.poster&&o[1]>=0&&o[1]<18.12&&(c>0&&(n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),d(this.swim),n.uniform1f(this.swim.uniforms.kind,1),n.drawArrays(n.TRIANGLES,0,6),n.uniform1f(this.swim.uniforms.kind,3),n.drawArrays(n.TRIANGLES,0,6)),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE_MINUS_SRC_ALPHA),d(this.wake),n.uniform1f(this.wake.uniforms.kind,0),n.drawArraysInstanced(n.TRIANGLES,0,6,12),n.uniform1f(this.wake.uniforms.kind,1),n.drawArrays(n.TRIANGLES,0,6),c>0&&(n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),d(this.swim),n.uniform1f(this.swim.uniforms.kind,0),n.drawArrays(n.TRIANGLES,0,6),n.uniform1f(this.swim.uniforms.kind,2),n.drawArrays(n.TRIANGLES,0,6))),c>0&&a!==3&&(n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),d(this.support),a===2&&(n.uniform1f(this.support.uniforms.kind,0),n.drawArraysInstanced(n.TRIANGLES,0,36,2)),n.uniform1f(this.support.uniforms.kind,1),n.drawArrays(n.TRIANGLES,0,6),d(this.mesh),a===1&&s[0]>.62&&(n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE_MINUS_SRC_ALPHA),n.uniform1f(this.mesh.uniforms.kind,1),n.drawArrays(n.TRIANGLES,0,6)),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),n.uniform1f(this.mesh.uniforms.kind,0),n.drawArrays(n.TRIANGLES,0,6)),n.bindVertexArray(this.emptyVAO),d(this.pearl),n.uniform1f(this.pearl.uniforms.kind,1),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE_MINUS_SRC_ALPHA),n.drawArraysInstanced(n.TRIANGLES,0,6,i===6?8:i===3?12:24)}finally{if(u){n.useProgram(u.program),n.bindVertexArray(u.vao),n.activeTexture(n.TEXTURE4),n.bindTexture(n.TEXTURE_2D,u.texture4),n.activeTexture(u.activeTexture),n.blendFuncSeparate(u.sourceRGB,u.destinationRGB,u.sourceAlpha,u.destinationAlpha),n.blendEquationSeparate(u.equationRGB,u.equationAlpha),n.depthMask(u.depthMask);for(let[e,t]of[[n.BLEND,u.blend],[n.DEPTH_TEST,u.depth],[n.CULL_FACE,u.cull]])t?n.enable(e):n.disable(e)}}}dispose(){if(this.disposed)return;let e=this.gl;for(let t of[this.pearl,this.ribbon,this.mesh,this.support,this.impact,this.swim,this.wake])e.deleteProgram(t.program);e.deleteTexture(this.fallbackDepth),e.deleteVertexArray(this.emptyVAO),this.disposed=!0}},Se=`#version 300 es
layout(location=0) in vec2 a_position;
out vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`,Ce=`#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform vec2 u_size;
`,we=Ce+`
void main(){
 vec2 p=1./u_size;
 vec3 c=(texture(u_image,v_uv+vec2(-p.x,-p.y)).rgb+texture(u_image,v_uv+vec2(p.x,-p.y)).rgb+texture(u_image,v_uv+vec2(-p.x,p.y)).rgb+texture(u_image,v_uv+p).rgb)*.25;
 float light=max(c.r,max(c.g,c.b));
 float gate=smoothstep(.30,.76,light);
 fragColor=vec4(c*gate,1.);
}`,Te=Ce+`
uniform vec2 u_direction;
void main(){
 vec2 d=u_direction/u_size;
 vec3 c=texture(u_image,v_uv).rgb*.227027;
 c+=(texture(u_image,v_uv+d*1.384615).rgb+texture(u_image,v_uv-d*1.384615).rgb)*.316216;
 c+=(texture(u_image,v_uv+d*3.230769).rgb+texture(u_image,v_uv-d*3.230769).rgb)*.070270;
 fragColor=vec4(c,1.);
}`,Ee=Ce+`
uniform sampler2D u_bloom;
uniform sampler2D u_history;
uniform float u_time;
uniform float u_beat;
uniform float u_motion;
uniform float u_poster;
uniform float u_cut;
uniform float u_historyWeight;
uniform float u_scene;
uniform vec4 u_energy;
uniform vec4 u_event;
uniform vec4 u_audio;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 vec2 q=v_uv, p=q-.5;
 float transient=pow(u_beat,3.)*u_motion;
 float cut=pow(max(0.,1.-u_cut/.22),3.)*u_motion;
 float poster=1.-u_poster;
 float shadowFilm=1.-step(.4,abs(u_scene-9.));
 float arcade=step(9.5,u_scene);
 float cathedral=1.-step(.4,abs(u_scene-3.));
 float effectWeight=step(.4,abs(u_scene-2.))*poster*u_motion;
 // A travelling refractive pressure front follows each kick. The roof breach
 // sends a separate expanding front, then leaves the changed world intact.
 float radius=length(p*vec2(u_size.x/u_size.y,1.));
 float kickFront=exp(-pow((radius-(.06+fract(u_audio.w)*1.1))/.045,2.));
 float breachAge=max(0.,u_event.y);
 float breach=cathedral*step(0.,u_event.y)*(1.-smoothstep(.75,1.9,breachAge));
 float breachFront=exp(-pow((radius-breachAge*.68)/.08,2.))*breach;
 vec2 radial=p/max(.02,length(p));
 q+=radial*(kickFront*u_audio.y*.0018+breachFront*.011)*effectWeight;
 // Brief prismatic lens breaks stay local; the scene remains readable.
 float stripe=step(.992,hash(vec2(floor(q.y*64.),floor(u_time*24.))));
 q.x+=stripe*cut*.018*poster;
 float lens=(.0009+.0020*transient+.0032*cut+.0025*breachFront+.0011*u_audio.z*effectWeight)*poster;
 vec2 dispersion=normalize(p+vec2(.0001))*lens*length(p)*1.5;
 vec3 c=vec3(texture(u_image,q+dispersion).r,texture(u_image,q).g,texture(u_image,q-dispersion).b);
 vec3 bloom=texture(u_bloom,q).rgb;
 c+=bloom*(.34+.26*u_energy.z+.22*transient+.09*u_audio.x*effectWeight)*(1.-u_poster*.28);
 // The bonus route has its own phosphor cadence and stepped lens edges.
 float scan=.5+.5*sin(q.y*u_size.y*3.14159265);
 c*=1.-arcade*.026*scan;
 // A few luminous traces persist during dance passages, not the shadows.
 vec2 echoUV=.5+(q-.5)*(1.+.008*u_motion);
 echoUV+=vec2(sin(u_time*.21),cos(u_time*.17))*.0012*u_motion;
 vec3 echo=texture(u_history,echoUV).rgb;
 float echoGate=smoothstep(.25,.9,max(echo.r,max(echo.g,echo.b)));
 float preserveShadow=smoothstep(.025,.13,dot(c,vec3(.2126,.7152,.0722)));
 c=mix(c,max(c,echo*.88),u_historyWeight*echoGate*preserveShadow);
 // Chromatic print grain breathes inside the dark midtones. The large moving
 // envelope gives the noise a composition instead of covering every pixel.
 vec2 grainUV=floor(q*u_size/1.7);
 float grainTime=floor(u_time*(6.+6.*u_motion));
 vec3 grain=vec3(hash(grainUV+grainTime*vec2(7,13)),hash(grainUV+grainTime*vec2(19,3)+41.),hash(grainUV+grainTime*vec2(5,23)+97.))-.5;
 float envelope=noise(q*vec2(8.,5.)+vec2(u_time*.09,-u_time*.065));
 float darkPrint=smoothstep(.005,.05,max(c.r,max(c.g,c.b)))*(1.-smoothstep(.22,.65,max(c.r,max(c.g,c.b))));
 c+=grain*(.007+shadowFilm*.042)*(.30+.70*envelope)*darkPrint;
 float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(l),c,1.10);
 c=(c-.055)*1.065+.055;
 c+=vec3(.002,.004,.011)*(1.-smoothstep(.1,.55,l));
 c=max(c,vec3(0.));
 c*=1.-.10*smoothstep(.24,.82,length(p));
 // Preserve the folds of chrome and glass even under a strong transient bloom.
 vec3 high=max(c-vec3(.74),vec3(0.));
 c=min(c,vec3(.74))+high/(1.+high*2.8);
 fragColor=vec4(clamp(c,0.,1.),1.);
}`,De=Ce+`void main(){fragColor=vec4(texture(u_image,v_uv).rgb,1.);}`,Oe=class{constructor(e){this.gl=e,this.targets=[],this.lastTime=-100,this.lastScene=-1,this.historyReady=!1,this.historyIndex=0,this.vao=e.createVertexArray(),e.bindVertexArray(this.vao),this.buffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.buffer),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),this.programs=[we,Te,Ee,De].map(e=>this.program(e)),e.bindVertexArray(null)}program(e){let t=this.gl,n=(e,n)=>{let r=t.createShader(e);if(t.shaderSource(r,n),t.compileShader(r),!t.getShaderParameter(r,t.COMPILE_STATUS))throw Error(t.getShaderInfoLog(r));return r},r=t.createProgram(),i=n(t.VERTEX_SHADER,Se),a=n(t.FRAGMENT_SHADER,e);if(t.attachShader(r,i),t.attachShader(r,a),t.linkProgram(r),t.deleteShader(i),t.deleteShader(a),!t.getProgramParameter(r,t.LINK_STATUS))throw Error(t.getProgramInfoLog(r));return{program:r,uniforms:Object.fromEntries([`image`,`size`,`direction`,`bloom`,`history`,`time`,`beat`,`motion`,`poster`,`cut`,`historyWeight`,`scene`,`energy`,`event`,`audio`].map(e=>[e,t.getUniformLocation(r,`u_${e}`)]))}}target(e,t){let n=this.gl,r={width:e,height:t,texture:n.createTexture(),framebuffer:n.createFramebuffer()};if(n.bindTexture(n.TEXTURE_2D,r.texture),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,e,t,0,n.RGBA,n.UNSIGNED_BYTE,null),n.bindFramebuffer(n.FRAMEBUFFER,r.framebuffer),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,r.texture,0),n.checkFramebufferStatus(n.FRAMEBUFFER)!==n.FRAMEBUFFER_COMPLETE)throw Error(`The visual compositor could not allocate its render targets.`);return this.targets.push(r),r}resize(e,t){if(this.width===e&&this.height===t)return;let n=this.gl;this.targets.forEach(e=>{n.deleteFramebuffer(e.framebuffer),n.deleteTexture(e.texture)}),this.targets=[],this.width=e,this.height=t,this.scene=this.target(e,t),this.depthCopy=this.target(e,t),this.bright=this.target(Math.max(1,Math.ceil(e/2)),Math.max(1,Math.ceil(t/2))),this.blurA=this.target(Math.max(1,Math.ceil(e/4)),Math.max(1,Math.ceil(t/4))),this.blurB=this.target(this.blurA.width,this.blurA.height),this.history=[this.target(e,t),this.target(e,t)],this.historyReady=!1,n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,e,t)}begin(){let e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,this.scene.framebuffer),e.viewport(0,0,this.width,this.height),e.disable(e.BLEND),e.disable(e.DEPTH_TEST),e.disable(e.CULL_FACE)}captureDepth(){let e=this.gl;return e.bindFramebuffer(e.READ_FRAMEBUFFER,this.scene.framebuffer),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,this.depthCopy.framebuffer),e.blitFramebuffer(0,0,this.width,this.height,0,0,this.width,this.height,e.COLOR_BUFFER_BIT,e.NEAREST),e.bindFramebuffer(e.FRAMEBUFFER,this.scene.framebuffer),this.depthCopy.texture}texture(e,t,n){let r=this.gl;r.activeTexture(r.TEXTURE0+e),r.bindTexture(r.TEXTURE_2D,t),r.uniform1i(n,e)}pass(e,t,n,r=null){let i=this.gl,{program:a,uniforms:o}=this.programs[e];i.bindFramebuffer(i.FRAMEBUFFER,t?.framebuffer||null),i.viewport(0,0,t?.width||this.width,t?.height||this.height),i.useProgram(a),i.bindVertexArray(this.vao),this.texture(0,n.texture,o.image),i.uniform2f(o.size,n.width,n.height),r&&i.uniform2fv(o.direction,r),i.drawArrays(i.TRIANGLES,0,3)}finish(e){let t=this.gl;t.disable(t.BLEND),t.disable(t.DEPTH_TEST),t.disable(t.CULL_FACE),this.pass(0,this.bright,this.scene),this.pass(1,this.blurA,this.bright,[2.5,0]),this.pass(1,this.blurB,this.blurA,[0,1.9]);let n=this.history[this.historyIndex],r=this.history[1-this.historyIndex],{program:i,uniforms:a}=this.programs[2];t.bindFramebuffer(t.FRAMEBUFFER,n.framebuffer),t.viewport(0,0,this.width,this.height),t.useProgram(i),t.bindVertexArray(this.vao),this.texture(0,this.scene.texture,a.image),this.texture(1,this.blurB.texture,a.bloom),this.texture(2,r.texture,a.history),t.uniform2f(a.size,this.width,this.height),t.uniform1f(a.time,e.time),t.uniform1f(a.beat,e.beat),t.uniform1f(a.motion,e.motion),t.uniform1f(a.poster,e.poster),t.uniform1f(a.cut,e.cutAge??10),t.uniform1f(a.scene,e.scene),t.uniform4fv(a.energy,e.energy),t.uniform4fv(a.event,e.event??[0,-1,0,0]),t.uniform4fv(a.audio,e.audio??[0,0,0,0]);let o=e.time-this.lastTime,s=this.historyReady&&o>0&&o<.2&&e.scene===this.lastScene;t.uniform1f(a.historyWeight,s&&!e.poster?(.16+.24*e.energy[2])*e.motion:0),t.drawArrays(t.TRIANGLES,0,3),this.pass(3,null,n),this.historyIndex=1-this.historyIndex,this.historyReady=!0,this.lastTime=e.time,this.lastScene=e.scene,t.activeTexture(t.TEXTURE0),t.bindVertexArray(null)}dispose(){let e=this.gl;this.targets.forEach(t=>{e.deleteFramebuffer(t.framebuffer),e.deleteTexture(t.texture)}),this.programs.forEach(t=>e.deleteProgram(t.program)),e.deleteBuffer(this.buffer),e.deleteVertexArray(this.vao)}},ke=[[9,0],[9,1],[9,8],[7,2],[8,0],[9,9],[0,4],[7,6],[9,10],[8,3],[1,0],[1,3],[7,2],[8,5],[1,6],[9,9],[7,7],[1,6]];function Ae({order:e,row:t,chapter:n,poster:r=!1}){if(r)return{scene:9,shot:0,density:.56};let i=n.world,a=Math.floor(e/2)%8;return e<ke.length?[i,a]=ke[e]:n.index===2?i=2:n.index===3?(i=3,a=0):n.index===4?e>=57&&e<=60?(i=10,a=0):(e===54||e===55)&&(i=8,a=5):n.index===5?e===72||e===73?(i=10,a=1):e===75&&t>=32&&(i=2,a=7):n.index===1&&e===21&&(i=9,a=10),n.index===6&&(a=0),{scene:i,shot:a,density:n.index===6?.78:i===9?.72:1}}var je=[{order:0,name:`Shadow transmission`,line:`COLOUR INSIDE THE DARK`,world:9,color:`#b1baff`,words:[`SHADOW`,`TRANSMISSION`]},{order:10,name:`Noise tide`,line:`MATTER LEARNS TO MOVE`,world:1,color:`#8affea`,words:[`NOISE`,`TIDE`]},{order:24,name:`Neon velocity`,line:`NO BRAKES. NO HORIZON.`,world:2,color:`#e4ff73`,words:[`NEON`,`VELOCITY`]},{order:40,name:`Spectral cathedral`,line:`A MONUMENT TO FREQUENCY`,world:3,color:`#ffbcff`,words:[`SPECTRAL`,`CATHEDRAL`]},{order:50,name:`Machine bloom`,line:`THE SIGNAL BECOMES A BODY`,world:4,color:`#ffbfa6`,words:[`MACHINE`,`BLOOM`]},{order:67,name:`Total pressure`,line:`EVERYTHING AT ONCE`,world:5,color:`#e4ff73`,words:[`TOTAL`,`PRESSURE`]},{order:77,name:`Afterimage`,line:`THE OCEAN REMEMBERS`,world:6,color:`#b7ddff`,words:[`AFTER`,`IMAGE`]}],D=(e,t=0,n=1)=>Math.max(t,Math.min(n,e)),Me=(e,t,n)=>{let r=D((n-e)/(t-e));return r*r*(3-2*r)};function Ne(e,t,n=null){let r=0,i=e.length;for(;r<i;){let a=r+i>>1;(n?e[a][n]:e[a])<=t?r=a+1:i=a}return Math.max(0,r-1)}function Pe(e){let t=t=>e.orders.find(e=>e.order===t)?.time??0,n=je.map((e,n)=>({...e,index:n,time:t(e.order)}));n.forEach((t,r)=>t.end=n[r+1]?.time??e.duration);let r={rupture:t(44),reentry:t(46),sentinel:t(42),arcade:t(57),arcadeEnd:t(61),encore:t(72),encoreEnd:t(74),field:t(4),swimmerEnter:t(78),swimmerExit:t(83)};function i(t){let n=e.analysis.bands,r=D(Math.floor(t*e.analysis.fps),0,n.energy.length-1),i=Ne(e.beats,t),a=e.beats[i],o=Math.max(0,t-a),s=e.beats[i+1]??a+60/e.bpm,c=n.onset[r]||0,l=n.kick[r]||0,u=e.rows[Ne(e.rows,t,`time`)],d=e.analysis.impacts,f=t-d[Ne(d,t)],p=f>=0?Math.exp(-f*7)*(.45+.55*c):0;return{energy:[n.bass[r]||0,n.mid[r]||0,n.treble[r]||0,n.energy[r]||0],beat:t>=a?Math.exp(-o*9)*(.5+.5*l):0,order:u?.order||0,row:u?.row||0,phrase:Math.floor((u?.order||0)/2),onset:c,kick:l,impact:p,beatIndex:i,pulsePhase:D(o/Math.max(.01,s-a))}}function a(t,{poster:a=!1,motion:o=1,pointer:s=[0,0],scene:c=null}={}){let l=n[Ne(n,a?0:t,`time`)],u=i(t),d=Ae({...u,chapter:l,poster:a}),f=c??d.scene,p=Math.max(0,t-l.time),m=D(p/(l.end-l.time)),h=[p,t-r.field,Me(0,5,t-r.field),0],g=`none`;if(f===2&&(h=[p,p,Me(.12,.95,m),m]),f===3&&(h=[p,t-r.rupture,Me(0,4.8,t-r.rupture),0],t>=r.sentinel&&t<r.rupture&&(g=`sentinel`)),f===10){let e=t>=r.encore,n=e?r.encore:r.arcade,i=e?r.encoreEnd:r.arcadeEnd;h=[Math.max(0,t-n),t-n,Me(0,2,t-n),D((t-n)/(i-n))],!e&&t>=n&&t<n+4&&(g=`runner`)}f===6&&(h=[p,t-r.swimmerEnter,m,D((t-r.swimmerEnter)/(r.swimmerExit-r.swimmerEnter))],t>=r.swimmerEnter&&t<r.swimmerExit&&(g=`swimmer`));let _=e.orders[Ne(e.orders,t,`time`)];return{chapter:l,music:u,frame:{time:t,scene:f,shot:d.shot,local:a?.35:m,energy:a?[.22,.3,.16,.22]:u.energy,beat:a?.2:u.beat,motion:o,pointer:s,poster:+!!a,density:d.density,cutAge:a?10:t-_.time,event:h,audio:[u.onset,u.kick,u.impact,u.beatIndex+u.pulsePhase],catRole:g,catsEnabled:!a&&g!==`none`,catCount:+(!a&&g!==`none`),seed:a?2:u.phrase}}}return{chapters:n,cues:r,musicAt:i,at:a}}var Fe=(e,t=0,n=1)=>Math.max(t,Math.min(n,e)),O=(e,t,n)=>{let r=Fe((n-e)/(t-e));return r*r*(3-2*r)};function Ie(e,t,n=null){let r=0,i=e.length;for(;r<i;){let a=r+i>>1;(n?e[a][n]:e[a])<=t?r=a+1:i=a}return Math.max(0,r-1)}function Le(e){let t=Math.max(0,Math.floor(e||0));return`${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toString().padStart(2,`0`)}`}function Re(e,{t,chapter:n,music:r,frame:i,analysis:a,width:o,height:s,started:c=!0,motion:l=1}){let u={width:o,height:s,started:c,motion:l},d=u.width,f=u.height,p=Math.min(d,f),m=d/f;if(e.clearRect(0,0,d,f),e.globalAlpha=1,!u.started){let t=e.createLinearGradient(0,0,d,f*.2);t.addColorStop(0,`rgba(4,12,14,.40)`),t.addColorStop(.48,`rgba(4,12,14,.18)`),t.addColorStop(1,`rgba(4,12,14,0)`),e.fillStyle=t,e.fillRect(0,0,d,f);return}let h=t-n.time,g=n.index,_=t<5;r.energy;let v=d*.047;e.save();let y=e.createLinearGradient(0,0,0,f);y.addColorStop(0,`rgba(2,5,10,.17)`),y.addColorStop(.3,`rgba(2,5,10,0)`),y.addColorStop(.72,`rgba(2,5,10,0)`),y.addColorStop(1,`rgba(2,5,10,.38)`),e.fillStyle=y,e.fillRect(0,0,d,f),e.strokeStyle=`rgba(229,245,226,.34)`,e.lineWidth=.65;let b=(t,n,r)=>{e.beginPath(),e.moveTo(t-r,n),e.lineTo(t+r,n),e.moveTo(t,n-r),e.lineTo(t,n+r),e.stroke()};if(b(v,f*.5,4),b(d-v,f*.5,4),e.font=`${Math.max(7,d*.0057)}px monospace`,e.fillStyle=`rgba(239,252,232,.56)`,e.fillText(`LS—${String(g+1).padStart(2,`0`)} / ${n.line}`,v,f-24),e.textAlign=`right`,e.fillText(`${String(r.order).padStart(2,`0`)}:${String(r.row).padStart(2,`0`)}  ·  ${Le(t)}`,d-v,f-24),e.textAlign=`left`,i.scene===10){let t=i.event[0],n=Math.floor(t*5.4/7.2),r=t*5.4/7.2%1;e.save(),e.fillStyle=`#d9ff9d`,e.globalAlpha=.72,e.font=`bold ${Math.max(9,p*.019)}px monospace`,e.letterSpacing=`2px`,e.fillText(`BONUS CIRCUIT`,v,f*.12),e.font=`${Math.max(8,p*.015)}px monospace`,e.letterSpacing=`1px`,e.fillText(`GATE ${String(n+1).padStart(2,`0`)}  /  NO BRAKES`,v,f*.12+p*.032),e.strokeStyle=`rgba(185,250,255,.44)`,e.lineWidth=1;let a=p*.23,o=f*.12+p*.052;e.strokeRect(v,o,a,3),e.fillRect(v,o,a*r,3),t<1.7&&(e.globalAlpha=(1-O(.55,1.7,t))*.65,e.font=`900 ${p*.078}px Arial`,e.letterSpacing=`${-p*.003}px`,e.fillText(`SECRET ROUTE`,v,f*.82)),e.restore()}if(i.scene===3&&i.event[1]>=0&&i.event[1]<1.6){let t=i.event[1];e.save(),e.globalAlpha=Math.sin(Fe(t/1.6)*Math.PI)*.54*l,e.font=`900 ${d*(m<1?.1:.074)}px Arial`,e.letterSpacing=`${-d*.003}px`,e.strokeStyle=`#fff0d3`,e.lineWidth=1,e.strokeText(`SKY / BREACH`,v,f*.21),e.restore()}let x=_?t-.45:h,ee=_?3.8:2.45,S=O(0,.5,x)*(1-O(ee-.9,ee,x));if(S>.001){e.save(),e.globalAlpha=S;let i=_?d*(m<1?.2:.117):d*(m<1?.095:.072),a=_?f*(m<1?.73:.5):f*(m<1?.68:.6),o=_?[`LA`,`SIRENA.`]:n.words,s=_?v+d*.02:v;e.translate(s,a+(1-O(0,.7,x))*22*l);let c=e.createLinearGradient(-s,0,d*.7,0);c.addColorStop(0,`rgba(0,5,9,.38)`),c.addColorStop(1,`rgba(0,5,9,0)`),e.fillStyle=c,e.fillRect(-s,-i,d*.73,i*2.6),e.font=`900 ${i}px Arial, sans-serif`,e.textBaseline=`alphabetic`,e.fillStyle=`#f4f4ec`,e.letterSpacing=`${-i*.07}px`;let u=Math.sin(t*2.7)*r.beat*l*1.8;o.forEach((t,a)=>{e.fillStyle=a===1&&!_?n.color:`#f4f4ec`,e.fillText(t,u,a*i*.82),r.beat>.65&&l>.5&&(e.globalAlpha=S*.25,e.fillStyle=`#ff435c`,e.fillText(t,-2.5,a*i*.82+1),e.globalAlpha=S)}),e.letterSpacing=`1.8px`,e.font=`${Math.max(8,d*.007)}px monospace`,e.fillStyle=n.color,e.fillText(_?`SHADOW / COLOUR / FREQUENCY`:`ACT ${String(g+1).padStart(2,`0`)}   /   ${n.line}`,4,-i*.97),e.restore()}let C=(1-O(.035,.23,t-(a.orders[Ie(a.orders,t,`time`)]?.time||0)))*l;if(C>.01&&r.order>0&&r.order%4==0){e.save(),e.globalAlpha=C*.56,e.fillStyle=n.color;let t=f*.009;for(let n=0;n<2;n++){let i=(n*.163+r.order*.137)%1*f;e.fillRect(n%2?d*.94:0,i,d*.06,t)}e.globalAlpha=C*.36,e.font=`900 ${d*.028}px Arial`,e.letterSpacing=`-2px`,e.fillText(`///`,d*.91,f*.26),e.restore()}if(h<.6&&g>0&&l>.3){let t=O(0,.6,h);e.save(),e.fillStyle=n.color;for(let n=0;n<9;n++){let r=d*(1-O(0,1,Fe(t*1.5-n*.055)));e.globalAlpha=(1-t)*.8,e.fillRect(n%2?d-r:0,n*f/9,r,f/9+1)}e.restore()}if(!_&&S<.12&&r.beat>.16){e.save(),e.globalAlpha=r.beat*.24*l,e.strokeStyle=n.color,e.lineWidth=.7;let t=d*(.5+Math.sin(r.phrase*2.14)*.27),i=f*(.5+Math.cos(r.phrase)*.2),a=p*(.1+(1-r.beat)*.12);e.beginPath(),e.arc(t,i,a,-.1,.6),e.stroke(),e.beginPath(),e.arc(t,i,a+6,Math.PI,Math.PI+.7),e.stroke(),b(t,i,4),e.restore()}let te=a.orders[Ie(a.orders,t,`time`)],ne=t-((te?.time||0)+(te?.duration||3.4)*.75);if(g>0&&g<6&&i.scene!==10&&!(i.scene===3&&i.event[1]>=0)&&r.order%4==3&&ne>=0&&ne<.65&&l>.3){let t=ne/.65,i=[``,`FLOW.`,`FASTER.`,`RESONATE.`,`REFRACT.`,`OVERRUN.`];e.save(),e.globalAlpha=Math.sin(t*Math.PI)*.58*l;let a=d*(g===3||g===5?.135:.19);e.font=`900 ${a}px Arial`,e.letterSpacing=`${-a*.06}px`,e.textAlign=`center`,e.lineWidth=1.3,e.strokeStyle=n.color;let o=f*.54+(t-.5)*18;e.strokeText(i[g],d*.5,o),e.beginPath(),e.rect(0,o-a*.36,d,a*.13),e.clip(),e.fillStyle=n.color,e.fillText(i[g],d*.5-3*r.beat,o),e.restore()}if(g>=2&&g<6&&l>.4&&r.energy[0]>.38){let i=t-a.beats[Ie(a.beats,t)];if(i<.32&&r.beatIndex%2==0){e.save(),e.globalAlpha=(1-O(.03,.32,i))*.5*l,e.fillStyle=n.color;for(let t=0;t<22;t++){let n=t*2.39996+r.beatIndex*.7,a=p*(.13+i*(1.1+t%3*.3)),o=d*.5+Math.cos(n)*a,s=f*.5+Math.sin(n)*a*.65,c=1+t%3;e.fillRect(o,s,c*(1+i*6),c)}e.restore()}}let re=t-(a.duration-5.3);if(re>0){let t=O(0,3.6,re);e.fillStyle=`rgba(3,9,13,${t*.56})`,e.fillRect(0,0,d,f),e.globalAlpha=t,e.textAlign=`center`,e.font=`900 ${d*.08}px Arial`,e.letterSpacing=`${-d*.004}px`,e.fillStyle=`#e9f3e6`,e.fillText(`LA SIRENA.`,d/2,f*.49),e.font=`${Math.max(8,d*.007)}px monospace`,e.letterSpacing=`2px`,e.fillStyle=`#acbbff`,e.fillText(`SHADOW / COLOUR / FREQUENCY`,d/2,f*.55),e.font=`${Math.max(7,d*.006)}px monospace`,e.fillStyle=`#94a99d`,e.fillText(`SONG.MOD / FOUR CHANNELS / ALL MATHEMATICS`,d/2,f*.64),e.textAlign=`left`}e.restore(),e.globalAlpha=1,e.letterSpacing=`0px`}var k=e=>document.getElementById(e),A=k(`audio`),j=k(`world`),M=k(`film`),ze=M.getContext(`2d`,{alpha:!0}),Be=new URLSearchParams(location.search),Ve=Be.has(`preview`),He=matchMedia(`(prefers-reduced-motion: reduce)`),N=[{name:`HQ`,scale:1,max:1920},{name:`ULTRA`,scale:1.4,max:2560},{name:`ECO`,scale:.65,max:1100}],P={ready:!1,started:!1,playing:!1,quality:0,pointer:[0,0],smoothPointer:[0,0],motion:He.matches?.2:1,width:innerWidth,height:innerHeight,scene:-1,lastTime:0,lastActive:performance.now(),energy:[0,0,0,0],record:null,recordStart:0,previewTime:0},F,I,L=[],R,z,Ue,We,B,V,H,Ge,U,Ke,W,qe,Je,G,K,Ye=0,Xe=60,Ze,Qe=[],q=null;function J(e){let t=Math.max(0,Math.floor(e||0));return`${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toString().padStart(2,`0`)}`}var $e=(e,t=0,n=1)=>Math.max(t,Math.min(n,e));function et(e,t,n=null){let r=0,i=e.length;for(;r<i;){let a=r+i>>1;(n?e[a][n]:e[a])<=t?r=a+1:i=a}return Math.max(0,r-1)}function Y(e){k(`toast`).textContent=e,k(`toast`).classList.add(`visible`),clearTimeout(Ze),Ze=setTimeout(()=>k(`toast`).classList.remove(`visible`),2800)}function tt(e){k(`error-message`).textContent=e,k(`error`).hidden=!1}function nt(){if(V=j.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`high-performance`,preserveDrawingBuffer:!1}),!V)throw Error(`This film needs WebGL 2. Open it in a recent Chrome, Firefox, Edge, or Safari browser.`);let n=(e,t)=>{let n=V.createShader(t);if(V.shaderSource(n,e),V.compileShader(n),!V.getShaderParameter(n,V.COMPILE_STATUS)){let e=V.getShaderInfoLog(n);throw V.deleteShader(n),Error(`Could not compile the visual engine: ${e}`)}return Qe.push(n),n};if(H=V.createProgram(),V.attachShader(H,n(e,V.VERTEX_SHADER)),V.attachShader(H,n(t,V.FRAGMENT_SHADER)),V.linkProgram(H),!V.getProgramParameter(H,V.LINK_STATUS))throw Error(V.getProgramInfoLog(H));V.useProgram(H),U=V.createVertexArray(),V.bindVertexArray(U);let r=V.createBuffer();V.bindBuffer(V.ARRAY_BUFFER,r),V.bufferData(V.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),V.STATIC_DRAW);let i=V.getAttribLocation(H,`a_position`);V.enableVertexAttribArray(i),V.vertexAttribPointer(i,2,V.FLOAT,!1,0,0);let a=[`resolution`,`time`,`scene`,`local`,`energy`,`beat`,`motion`,`pointer`,`seed`,`poster`,`shot`,`density`,`event`,`audio`,`flowBoundValid`,`noiseCache`,`noiseCacheValid`,`cloudVolume`,`cloudVolumeValid`,`primaryGuide`,`primaryGuideValid`];Ge=Object.fromEntries(a.map(e=>[e,V.getUniformLocation(H,`u_${e}`)])),K=g(V,e,i,a),Ke=new xe(V),W=new Oe(V),qe=new ee(V),Je=new ae(V),G=new re(V),K||G.release(),rt()}function rt(){P.width=q?.width??innerWidth,P.height=q?.height??innerHeight;let e=N[P.quality],t=Math.min(devicePixelRatio,1.4)*e.scale,n=Math.min(t,e.max/innerWidth);j.width=q?.width??Math.max(1,Math.round(innerWidth*n)),j.height=q?.height??Math.max(1,Math.round(innerHeight*n));let r=q?1:Math.min(devicePixelRatio,2);M.width=Math.round(P.width*r),M.height=Math.round(P.height*r),ze.setTransform(r,0,0,r,0,0),V&&V.viewport(0,0,j.width,j.height),Ke?.resize(j.width,j.height),W?.resize(j.width,j.height),P.record&&P.record.canvas}function it(){I=Pe(F),L=I.chapters,k(`chapter-track`).replaceChildren(),k(`chapter-list`).replaceChildren();for(let e of L){let t=document.createElement(`button`);t.className=`chapter-segment`,t.style.flex=`${e.end-e.time}`,t.setAttribute(`aria-label`,`Jump to ${e.name}, ${J(e.time)}`),t.title=`${String(e.index+1).padStart(2,`0`)} — ${e.name}`,t.innerHTML=`<span>${String(e.index+1).padStart(2,`0`)}</span>`,t.addEventListener(`click`,()=>X(e.time)),k(`chapter-track`).append(t);let n=document.createElement(`button`);n.className=`chapter-item`,n.innerHTML=`<span class="chapter-number">${String(e.index+1).padStart(2,`0`)}</span><span class="chapter-name">${e.name}<small>${e.line}</small></span><span class="chapter-time">${J(e.time)}</span>`,n.addEventListener(`click`,()=>{X(e.time),Q(!1)}),k(`chapter-list`).append(n)}k(`total`).textContent=J(F.duration),k(`duration-label`).textContent=J(F.duration),k(`seek`).max=F.duration}async function at(){try{nt();let e=await fetch(`./track-analysis.json`);if(!e.ok)throw Error(`The audio analysis could not be loaded. Run npm run audio:prepare, then reload.`);F=await e.json(),it(),await new Promise((e,t)=>{A.readyState>=2?e():(A.addEventListener(`loadeddata`,e,{once:!0}),A.addEventListener(`error`,()=>t(Error(`The music could not be loaded. Run npm run audio:prepare, then reload.`)),{once:!0}),A.load())}),P.ready=!0,k(`enter`).disabled=!1,k(`enter-label`).textContent=`ENTER THE TRANSMISSION`,k(`enter-detail`).textContent=`${J(F.duration)} · Headphones recommended`,Ve&&(document.body.classList.add(`preview-mode`,`started`),P.started=!0,P.previewTime=Number(Be.get(`t`)||0))}catch(e){console.error(e),tt(e.message)}}async function ot(){R||(R=new(window.AudioContext||window.webkitAudioContext),Ue=R.createMediaElementSource(A),z=R.createAnalyser(),z.fftSize=256,z.smoothingTimeConstant=.68,We=R.createMediaStreamDestination(),Ue.connect(z),z.connect(R.destination),z.connect(We),new Uint8Array(z.frequencyBinCount)),R.state===`suspended`&&await R.resume()}async function st(){if(P.ready)try{let e=!P.started;await ot(),A.currentTime>=F.duration-.05&&(A.currentTime=0),await A.play(),P.started=!0,document.querySelector(`.landing`).inert=!0,document.body.classList.add(`started`),e&&k(`play`).focus({preventScroll:!0}),Z()}catch(e){Y(`Playback couldn't start: ${e.message}`)}}function ct(e){P.playing=e,document.body.classList.toggle(`playing`,e),k(`play`).setAttribute(`aria-label`,e?`Pause`:`Play`),k(`play`).innerHTML=e?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor"/></svg>`:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>`,e||document.body.classList.remove(`ui-hidden`)}function lt(){P.ready&&(P.playing?A.pause():st())}function X(e){P.ready&&(A.currentTime=$e(e,0,F.duration),P.started||st(),Z())}function Z(){P.lastActive=performance.now(),document.body.classList.remove(`ui-hidden`)}function Q(e){let t=e??!k(`chapters`).classList.contains(`open`);k(`chapters`).classList.toggle(`open`,t),k(`chapters`).inert=!t,k(`chapters-button`).setAttribute(`aria-expanded`,String(t)),Z()}function ut(){A.muted=!A.muted,document.body.classList.toggle(`muted`,A.muted),k(`sound-label`).textContent=A.muted?`SOUND OFF`:`SOUND ON`,k(`sound-toggle`).setAttribute(`aria-label`,A.muted?`Unmute audio`:`Mute audio`),Z()}async function dt(){try{document.fullscreenElement?await document.exitFullscreen():await k(`app`).requestFullscreen()}catch{Y(`Fullscreen is unavailable in this browser.`)}Z()}function ft(){P.quality=(P.quality+1)%N.length,k(`quality`).textContent=N[P.quality].name,k(`quality`).setAttribute(`aria-label`,`Render quality: ${N[P.quality].name}`),rt(),Y(`${N[P.quality].name} render quality`)}function pt(e,t){if(!I||!P.started)return{energy:[.22,.3,.16,.22],beat:.2,order:0,row:0,phrase:0,onset:0,kick:0,impact:0,pulsePhase:0,beatIndex:0};let n=I.musicAt(e),r=n.energy;for(let e=0;e<4;e++){let n=r[e]>P.energy[e]?24:8;P.energy[e]+=(r[e]-P.energy[e])*(1-Math.exp(-t*n))}return{...n,energy:P.energy}}function mt(e,t,n,r){Re(ze,{t:e,chapter:t,music:n,frame:r,analysis:F,width:P.width,height:P.height,started:P.started,motion:P.motion})}function ht(e=performance.now(),t=null){if(P.offline&&t===null)return;let n=Math.min(.1,Math.max(.001,(e-Ye)/1e3||.016));if(Ye=e,Xe+=(1/n-Xe)*.035,V&&H&&Ke&&W){let r=t??(Ve?P.previewTime:P.started?A.currentTime:10+e*28e-5),i=F?L[et(L,P.started?r:0,`time`)]:{...je[0],index:0,time:0,end:27},a=pt(r,n),o=P.started?$e((r-i.time)/(i.end-i.time)):.35;P.smoothPointer.forEach((e,t)=>P.smoothPointer[t]+=(P.pointer[t]-e)*Math.min(1,n*2));let s=I?.at(r,{poster:!P.started,motion:P.motion,pointer:P.smoothPointer,scene:P.forcedWorld})?.frame??{time:r,scene:9,shot:0,local:o,energy:a.energy,beat:a.beat,motion:P.motion,pointer:P.smoothPointer,poster:1,density:.56,cutAge:10,event:[0,-1,0,0],audio:[0,0,0,0],catRole:`none`,catsEnabled:!1,catCount:0,seed:2};s.energy=a.energy;let c=s.scene;Je.render(s,j.width,j.height,U,qe),G.render(s,j.width,j.height,U,qe),W.begin();let l=!!(K&&G.valid),u=l?K.program:H,d=l?K.locations:Ge;if(V.useProgram(u),V.bindVertexArray(U),qe.bind(d,s),Je.bind(d,s),l&&G.bind(d,s),V.uniform2f(d.resolution,j.width,j.height),V.uniform1f(d.time,r),V.uniform1f(d.scene,c),V.uniform1f(d.local,s.local),V.uniform4fv(d.energy,a.energy),V.uniform1f(d.beat,s.beat),V.uniform1f(d.motion,P.motion),V.uniform2fv(d.pointer,P.smoothPointer),V.uniform1f(d.seed,s.seed),V.uniform1f(d.poster,s.poster),V.uniform1f(d.shot,s.shot),V.uniform1f(d.density,s.density),V.uniform1f(d.flowBoundValid,S({time:r,scene:c,motion:P.motion,beat:s.beat,pointer:P.smoothPointer})),V.uniform4fv(d.event,s.event),V.uniform4fv(d.audio,s.audio),V.drawArrays(V.TRIANGLES,0,3),s.depthTexture=W.captureDepth(),s.depthScale=40,Ke.renderForCompositor(s),W.finish(s),P.world=c,P.shot=s.shot,P.event=s.event,P.catRole=s.catRole,P.catCount=s.catCount,mt(r,i,a,s),P.record){let t=P.record.context;t.drawImage(j,0,0,P.record.canvas.width,P.record.canvas.height),t.drawImage(M,0,0,P.record.canvas.width,P.record.canvas.height),k(`record-time`).textContent=J((e-P.recordStart)/1e3)}P.scene!==i.index&&(P.scene=i.index,k(`current-act`).textContent=`${String(i.index+1).padStart(2,`0`)} — ${i.name.toUpperCase()}`,document.querySelectorAll(`.chapter-segment,.chapter-item`).forEach(e=>{let t=Array.from(e.parentElement.children);e.classList.toggle(`active`,t.indexOf(e)===i.index)})),k(`elapsed`).textContent=J(P.started?r:0),k(`seek`).value=P.started?r:0,k(`seek`).style.setProperty(`--progress`,`${P.started?100*r/(F?.duration||289):0}%`),P.playing&&e-P.lastActive>3e3&&!k(`chapters`).classList.contains(`open`)&&!P.record&&document.body.classList.add(`ui-hidden`),P.lastTime=r}t===null&&requestAnimationFrame(ht)}async function gt(){if(P.record){$();return}if(P.ready){if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){Y(`Video recording is unavailable in this browser.`);return}try{await ot();let e=document.createElement(`canvas`);e.width=Math.min(1920,Math.round(innerWidth*devicePixelRatio/2)*2),e.height=Math.round(e.width*innerHeight/innerWidth/2)*2;let t=e.getContext(`2d`,{alpha:!1});t.drawImage(j,0,0,e.width,e.height),t.drawImage(M,0,0,e.width,e.height);let n=e.captureStream(30);for(let e of We.stream.getAudioTracks())n.addTrack(e.clone());let r=[`video/webm;codecs=vp9,opus`,`video/webm;codecs=vp8,opus`,`video/webm`,`video/mp4`].find(e=>MediaRecorder.isTypeSupported(e));if(!r)throw Error(`No supported video encoder`);B=new MediaRecorder(n,{mimeType:r,videoBitsPerSecond:1e7,audioBitsPerSecond:192e3});let i=[];B.ondataavailable=e=>{e.data.size&&i.push(e.data)},B.onstop=()=>{let e=new Blob(i,{type:r}),t=URL.createObjectURL(e),a=document.createElement(`a`);a.href=t,a.download=`la-sirena-${J(P.recordFrom).replace(`:`,`-`)}.${r.includes(`mp4`)?`mp4`:`webm`}`,document.body.append(a),a.click(),a.remove(),setTimeout(()=>URL.revokeObjectURL(t),6e4),n.getTracks().forEach(e=>e.stop()),P.record=null,k(`record-status`).hidden=!0,k(`record`).classList.remove(`active`),k(`record`).setAttribute(`aria-label`,`Record video from current position`),Y(`Your film has been saved.`)},B.onerror=e=>{console.error(e),Y(`The recording stopped unexpectedly.`),$()},P.record={canvas:e,context:t,stream:n},P.recordFrom=A.currentTime,P.recordStart=performance.now(),B.start(1e3),k(`record-status`).hidden=!1,k(`record`).classList.add(`active`),k(`record`).setAttribute(`aria-label`,`Stop recording and save video`),(A.paused||A.ended)&&await st(),Y(`Recording picture + sound. Stop to save the film.`)}catch(e){console.error(e),P.record=null,Y(`Recording couldn't start: ${e.message}`)}}}function $(){B&&B.state!==`inactive`&&B.stop()}k(`enter`).addEventListener(`click`,st),k(`play`).addEventListener(`click`,lt),k(`sound-toggle`).addEventListener(`click`,ut),k(`fullscreen`).addEventListener(`click`,dt),k(`quality`).addEventListener(`click`,ft),k(`chapters-button`).addEventListener(`click`,()=>Q()),k(`close-chapters`).addEventListener(`click`,()=>Q(!1)),k(`record`).addEventListener(`click`,gt),k(`stop-record`).addEventListener(`click`,$),k(`retry`).addEventListener(`click`,()=>location.reload()),k(`seek`).addEventListener(`input`,e=>X(Number(e.target.value))),k(`seek`).addEventListener(`pointermove`,e=>{let t=e.target.getBoundingClientRect(),n=$e((e.clientX-t.left)/t.width);k(`seek-tooltip`).textContent=J(n*(F?.duration||289)),k(`seek-tooltip`).style.left=`${n*100}%`}),document.querySelector(`.wordmark`).addEventListener(`click`,e=>{e.preventDefault(),P.started&&(A.pause(),A.currentTime=0,P.started=!1,document.querySelector(`.landing`).inert=!1,document.body.classList.remove(`started`,`ui-hidden`),P.scene=-1,Q(!1),$())}),A.addEventListener(`play`,()=>ct(!0)),A.addEventListener(`pause`,()=>{ct(!1),B?.state===`recording`&&B.pause()}),A.addEventListener(`play`,()=>{B?.state===`paused`&&B.resume()}),A.addEventListener(`ended`,()=>{ct(!1),$(),Y(`Transmission complete. Press Space to return to the abyss.`)}),A.addEventListener(`waiting`,()=>{P.started&&Y(`Buffering the signal…`)}),window.addEventListener(`resize`,rt),document.addEventListener(`fullscreenchange`,()=>{k(`fullscreen`).setAttribute(`aria-label`,document.fullscreenElement?`Exit fullscreen`:`Enter fullscreen`),rt()}),document.addEventListener(`pointermove`,e=>{Z(),P.pointer=[e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2]}),document.addEventListener(`pointerdown`,Z),document.addEventListener(`focusin`,Z),document.addEventListener(`keydown`,e=>{if(e.target.matches(`input`)){e.key===`Escape`&&Q(!1);return}e.code===`Space`&&e.target.matches(`button,a`)||([`Space`,`ArrowLeft`,`ArrowRight`,`KeyF`,`KeyM`,`KeyC`,`KeyR`,`KeyV`].includes(e.code)&&e.preventDefault(),e.code===`Space`&&lt(),e.code===`ArrowLeft`&&X(A.currentTime-5),e.code===`ArrowRight`&&X(A.currentTime+5),e.code===`KeyF`&&dt(),e.code===`KeyM`&&ut(),e.code===`KeyC`&&Q(),e.code===`KeyR`&&gt(),e.code===`KeyV`&&(P.motion=P.motion<.5?1:.2,Y(P.motion<.5?`Motion softened`:`Full motion`)),e.key===`Escape`&&Q(!1),Z())}),He.addEventListener(`change`,e=>{P.motion=e.matches?.2:1}),j.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),A.pause(),tt(`The graphics context was lost. Reload to reconnect the signal.`)}),document.addEventListener(`visibilitychange`,()=>{document.hidden&&P.playing&&!P.record&&A.pause()}),k(`app`).addEventListener(`dblclick`,e=>{e.target.id===`app`&&dt()}),window.__film={get ready(){return P.ready},get state(){return{time:A.currentTime,playing:P.playing,scene:P.scene,world:P.world,shot:P.shot,event:P.event,catRole:P.catRole,catCount:P.catCount,fps:Xe,width:j.width,height:j.height,motion:P.motion}},setExportResolution(e,t){if(!P.ready||!V)throw Error(`The film renderer is not ready.`);if(!Number.isSafeInteger(e)||!Number.isSafeInteger(t)||e<=0||t<=0)throw Error(`Export dimensions must be positive integers.`);let n=V.getParameter(V.MAX_TEXTURE_SIZE),r=V.getParameter(V.MAX_VIEWPORT_DIMS);if(e>n||t>n||e>r[0]||t>r[1])throw Error(`Export dimensions exceed the GPU render limits.`);if(q={width:e,height:t},P.offline=!0,rt(),V.drawingBufferWidth!==e||V.drawingBufferHeight!==t)throw Error(`The GPU could not allocate the requested export resolution.`);return{width:j.width,height:j.height}},get cues(){return I?.cues},get chapters(){return L.map(({time:e,end:t,name:n,world:r})=>({time:e,end:t,name:n,world:r}))},seek:X,play:st,pause:()=>A.pause(),record:gt,stopRecording:$,frame(e,t=null){return P.started=!0,P.forcedWorld=t,document.body.classList.add(`started`,`preview-mode`),P.previewTime=e,ht(performance.now(),e),!0},pixels(){let e=new Uint8Array(4*j.width*j.height);return V.readPixels(0,0,j.width,j.height,V.RGBA,V.UNSIGNED_BYTE,e),{width:j.width,height:j.height,pixels:Array.from(e)}},snapshot(){ht(performance.now(),P.lastTime);let e=document.createElement(`canvas`);e.width=j.width,e.height=j.height;let t=e.getContext(`2d`);return t.drawImage(j,0,0,e.width,e.height),t.drawImage(M,0,0,e.width,e.height),e.toDataURL(`image/png`)},exportFrame(e,t=null,n=`image/png`){P.offline=!0,P.started=!0,P.forcedWorld=t,P.previewTime=e,document.body.classList.add(`started`,`preview-mode`);let r=$e(Math.floor(e*F.analysis.fps),0,F.analysis.bands.energy.length-1),i=F.analysis.bands;P.energy=[i.bass[r],i.mid[r],i.treble[r],i.energy[r]],ht(performance.now(),e);let a=document.createElement(`canvas`);a.width=j.width,a.height=j.height;let o=a.getContext(`2d`);return o.drawImage(j,0,0,a.width,a.height),o.drawImage(M,0,0,a.width,a.height),a.toDataURL(n,.97)}},at(),requestAnimationFrame(ht);