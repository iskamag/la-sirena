// Eleven procedural worlds. Time is song time; energy lanes are bass/mid/high/overall.
// Full-motion parameters, exported for deterministic motion/luminance QA.
export const templeMotionMetrics = Object.freeze({
    ruptureTime: 149.710,
    reentryTime: 156.515,
    chapterCutTime: 170.125,
    openingDuration: 4.8,
    windRate: 2.35,
    baseDriftRate: .14,
    transportRate: 2.49,
    volumeAdvection: Object.freeze([.996, 5.478]),
    sheetAdvection: Object.freeze([.15438, .23655]),
    roofTravelRate: .50,
    openSkyMinimumLuminance: .145,
    billowLightRetention: .68
});
export const filmDevelopmentMetrics = Object.freeze({
    transit: Object.freeze({start:81.655, end:136.100, duration:54.445,
        initialSpeed:6.7, finalSpeed:23.2, speedPower:1.4,
        travelIntegralPower:2.4, travelIntegralGain:374.309375,
        phaseTimes:Object.freeze([81.655,95.265,108.875,122.485]),
        finalRevealTimes:Object.freeze([129.290,132.695])}),
    templeEntrance: Object.freeze({initialSpeed:14.0, settledSpeed:.50,
        timeConstant:2.0, stopEntranceAt:149.710}),
    ocean: Object.freeze({start:261.995, end:289.320, cameraHeight:1.20,
        lens:1.38, glideSpeed:.26, forwardDown:.015,
        phaseTimes:Object.freeze([268.800,272.205,275.605,282.410]),
        waterPlane:0, depthRange:40})
});
export const vertexShader = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

export const fragmentShader = `#version 300 es
precision highp float;
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
            if((length(q)-boundRadius)*size-.0001>=d) continue;
            float candidate=nautilus(q,u_seed+fi*2.14+t*.13)*size;
            if(candidate<d) {d=candidate;mat=fi;}
        }
    }
    if(density()>.01) {
        vec3 center=vec3(-2.00,.68,-.70)+vec3(.12*sin(t*.45),.12*cos(t*.38),0);
        vec3 q=p-center;q.xz=rot(t*.35+.6)*q.xz;
        float fragment=torus(q,vec2(.56,.15));
        fragment=max(fragment,-q.y-.08);
        fragment+=.007*sin(atan(q.y,q.x)*36.0);
        if(fragment<d) {d=fragment;mat=4.0;}
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

// Four luminous organisms, each braided from three independent strands, with cells and links.
vec2 mapFlow(vec3 p) {
    float t=motionTime(),best=100.0,material=0.0;
    float z=p.z,beat=pulse()*u_motion;
    for(int i=0;i<4;i++) {
        float fi=float(i),phase=fi*TAU/4.0;
        float angle=phase+z*.24+t*.16;
        float radius=1.14+.20*sin(z*.42+phase+t*.20)+.07*beat;
        vec2 center=vec2(cos(angle)*radius*1.33,sin(angle)*radius);
        center+=.19*vec2(sin(z*.52+phase*1.7),cos(z*.47+phase));
        vec2 body=p.xy-center;
        // Radial lower bounds for the strands, cells, links and filament.
        // Keep a rounding margin; all surviving field arithmetic is unchanged.
        float boundRadius=max(.233,max(.143+.006*beat,.106+.016*beat));
        if((length(body)-boundRadius)*.48-.0001>=best) continue;
        for(int j=0;j<3;j++) {
            float fj=float(j),helix=z*2.35+fj*TAU/3.0+phase-t*.30;
            vec2 q=body-.105*vec2(cos(helix),sin(helix));
            float ribbon=(length(q)-.038-.006*beat)*.48;
            if(ribbon<best) {best=ribbon;material=fi;}
        }
        if(density()>.01) {
            float cellZ=mod(z+fi*.76+1.5,3.0)-1.5;
            float cell=length(vec3(body,cellZ))-.106-.016*beat;
            if(cell*.48<best) {best=cell*.48;material=4.0+fi;}
            float linkZ=mod(z+fi*.51+1.4,2.8)-1.4;
            float link=length(vec2(length(body)-.18,linkZ))-.010;
            if(link*.48<best) {best=link*.48;material=8.0+fi;}
            float helix=z*3.6+phase+t*.42;
            vec2 filament=body-.224*vec2(cos(helix),sin(helix));
            float thread=(length(filament)-.009)*.48;
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

float templeRoof(vec3 p) {
    float opening=rupture();
    // A conservative bound avoids expensive fragment evaluation below the vault.
    float bound=max(2.95-p.y,abs(p.x)-5.20);
    if(bound>.70) return bound;
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
        float radius=length(window.xy),angle=atan(window.y,window.x);
        float spokes=max(abs(sin(angle*6.0))*radius*.6-.013,abs(radius-.38)-.18);
        spokes=max(spokes,abs(window.z)-.024);
        d=min(d,min(rose,spokes));
        vec3 lantern=q-vec3(0,1.90,.35);
        lantern.xz=rot(motionTime()*.20)*lantern.xz;
        d=min(d,octaWire(lantern,.43,.009));
        vec3 crown=q-vec3(0,3.01,0);crown.y*=.65;
        d=min(d,octaWire(crown,.58,.012));
    }
    return min(d,templeRoof(p));
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
        q.xz=rot(t*.7+fi)*q.xz;q.yz=rot(t*.4+fi)*q.yz;
        float shard=octahedron(q,.20+.07*breathe)-.008;
        if(shard<best) {best=shard;material=fi+8.0;}
    }
    if(density()>.01) {
        vec3 cage=p;cage.xz=rot(-t*.22+.3)*cage.xz;cage.yz=rot(.34)*cage.yz;
        float scaffolding=octaWire(cage,2.18+.20*pulse()*u_motion,.010);
        if(scaffolding<best) {best=scaffolding;material=14.0;}
        for(int i=0;i<3;i++) {
            float fi=float(i),a=fi*TAU/3.0-t*.23;
            vec3 q=p-vec3(cos(a)*2.5,sin(a)*1.55,sin(a+fi)*.70);
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
        float h=hash(vec2(row+float(adjacent),float(sideIndex)*14.91+2.3));
        vec3 center=vec3(side*(3.90+.42*h),.91+1.10*h,z+.34*(h-.5));
        vec3 q=p-center;
        q.xy=rot(side*(.15+.14*h))*q.xy;q.yz=rot((h-.5)*.43)*q.yz;
        float cliff=octahedron(q/vec3(2.16,4.15+1.2*h,3.56),1.0)*2.16;
        cliff=max(cliff,-p.y-1.93);
        if(cliff<d) {d=cliff;material=1.0+float(sideIndex);}
        vec3 shard=p-vec3(side*(2.75-.29*h),-.69,z+2.26);
        shard.xy=rot(-side*.24)*shard.xy;shard.yz=rot(.16)*shard.yz;
        float satellite=octahedron(shard/vec3(.55,1.15+.40*h,.81),1.0)*.55;
        if(satellite<d) {d=satellite;material=3.0+float(sideIndex);}
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
    float transmittance=1.0;
    for(int i=0;i<12;i++) {
        float fi=float(i),distance=9.0+fi*3.5;
        vec3 p=ro+rd*distance;
        p.z+=transport*2.2;p.x+=transport*.4;
        vec2 weather=p.xz*.054;
        vec2 warp=vec2(fbm(weather+vec2(t*.015,4.2)),fbm(weather*.93+vec2(8.1,-t*.012)))-.45;
        float cloud=fbm(weather*2.8+warp*3.2);
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
    // A nearby folded cloud sheet supplies crisp billows over the distant volume.
    float nearDistance=clamp((7.10-ro.y)/max(rd.y,.105),10.0,53.0);
    vec3 nearPoint=ro+rd*nearDistance;
    vec2 sheet=nearPoint.xz*.092+vec2(transport*.062,transport*.095);
    vec2 curl=vec2(fbm(sheet*1.4+vec2(2.7,t*.014)),fbm(sheet*1.37+vec2(9.4,-t*.010)))-.46;
    float macro=fbm(sheet*2.75+curl*3.8);
    float fine=noise(sheet*18.0+curl*6.0);
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
`;
