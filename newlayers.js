// A second, independent cast: sculptural filaments, schools of moving pearls,
// rare shadowcat performers, rhythmic fracture debris and nearby lens bokeh. Every position lives in 3D and is
// projected through the same moving virtual lens; there are no screen-space
// ornaments or external textures. Does not clear or change the framebuffer.

// This water surface and lens are shared verbatim with the primary ocean.
// A stroke, its reflection and its wake occupy the same world-space waterline.
const oceanGeometry = `
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
`;

const common = `
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
${oceanGeometry}

`;

const depthFragment = `
uniform vec2 u_resolution;
uniform sampler2D u_depthTexture;
uniform float u_depthScale,u_hasDepth;
float visibility(float depth){
    if(u_hasDepth<.5)return 1.0;
    float surface=texture(u_depthTexture,gl_FragCoord.xy/u_resolution).a*u_depthScale;
    return smoothstep(-.10,.20,surface-depth);
}
`;

const pearlVertex = `#version 300 es
${common}
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
`;

const pearlFragment = `#version 300 es
precision highp float;
${depthFragment}
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
`;

const ribbonVertex = `#version 300 es
${common}
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
`;

const ribbonFragment = `#version 300 es
precision highp float;
${depthFragment}
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
`;

const meshVertex = `#version 300 es
${common}
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
`;

const meshFragment = `#version 300 es
precision highp float;
${depthFragment}
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
`;

// A support is part of the composition: the watcher's paws have a surface.
const supportVertex = `#version 300 es
${common}
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
`;
const supportFragment = `#version 300 es
precision highp float;
${depthFragment}
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
`;

// The finale's one performer is immersed in the water. Only the skull, ears,
// shoulders, back and tail break the surface; its legs paddle beneath it.
const swimVertex = `#version 300 es
${common}
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
`;

const swimFragment = `#version 300 es
precision highp float;
${depthFragment}
uniform float u_time,u_motion,u_beat;
uniform vec4 u_event,u_audio;
${oceanGeometry}
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
`;

const wakeVertex = `#version 300 es
${common}
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
`;

const wakeFragment = `#version 300 es
precision highp float;
${depthFragment}
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
`;

// Deterministic 3D impulses. Kick waves expand; shards fly and fall under
// gravity; onset comets travel through depth. None are screen-space flashes.
const impactVertex = `#version 300 es
${common}
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
`;
const impactFragment = `#version 300 es
precision highp float;
${depthFragment}
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
`;

function link(gl, vertex, fragment) {
  const shaders = [vertex, fragment].map((source, i) => {
    const shader = gl.createShader(i ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
      throw new Error(`Secondary cast shader: ${reason}`);
    }
    return shader;
  });
  const program = gl.createProgram();
  shaders.forEach(shader => gl.attachShader(program, shader)); gl.linkProgram(program);
  shaders.forEach(shader => gl.deleteShader(shader));
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const reason = gl.getProgramInfoLog(program); gl.deleteProgram(program);
    throw new Error(`Secondary cast program: ${reason}`);
  }
  const uniforms = Object.fromEntries(['resolution', 'time', 'scene', 'local', 'shot', 'energy', 'beat', 'motion', 'pointer', 'poster', 'density', 'kind', 'cats', 'catRole', 'event', 'audio', 'seed', 'depthTexture', 'depthScale', 'hasDepth'].map(name => [name, gl.getUniformLocation(program, `u_${name}`)]));
  return { program, uniforms };
}

export class SecondaryLayers {
  constructor(gl) {
    this.gl = gl;
    this.width = gl.drawingBufferWidth; this.height = gl.drawingBufferHeight;
    this.pearl = link(gl, pearlVertex, pearlFragment);
    this.ribbon = link(gl, ribbonVertex, ribbonFragment);
    this.mesh = link(gl, meshVertex, meshFragment);
    this.support = link(gl, supportVertex, supportFragment);
    this.impact = link(gl, impactVertex, impactFragment);
    this.swim = link(gl, swimVertex, swimFragment);
    this.wake = link(gl, wakeVertex, wakeFragment);
    const active = gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.activeTexture(gl.TEXTURE4);
    const texture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    this.fallbackDepth = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.fallbackDepth);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, texture); gl.activeTexture(active);
    const previousVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    this.emptyVAO = gl.createVertexArray();
    gl.bindVertexArray(previousVAO);
  }

  resize(width, height) { this.width = Math.max(1, width); this.height = Math.max(1, height); }

  render(frame = {}) {
    const gl = this.gl;
    if (this.disposed || gl.isContextLost()) return;
    const density = frame.density ?? 1;
    const scene = Number(frame.scene ?? 0), shot = Math.floor(Number(frame.shot ?? 0));
    const role = frame.catRole === 'swimmer' ? 3 : frame.catRole === 'sentinel' ? 2 : frame.catRole === 'runner' ? 1 : 0;
    const event = frame.event ?? [0, -100, 0, 0];
    const audio = frame.audio ?? [0, 0, 0, 0];
    // Explicit choreography owns casting. No secondary cats in the opening,
    // LS03 or other worlds, and no late sentinel after the musical rupture.
    const catCount = frame.catsEnabled && !frame.poster && scene !== 2 && scene !== 9 &&
      ((role === 2 && scene === 3 && event[1] < 0) || (role === 1 && scene === 10 && event[3] * 13.61 < 4) ||
       (role === 3 && scene === 6 && event[1] >= 0 && event[1] < 17.01)) ? 1 : 0;
    const pearlCount = scene === 6 ? 300 : scene === 9 ? 310 : scene === 4 ? 470 : scene === 3 ? 420 : scene === 10 ? 380 : 1050;
    if (density <= 0) return;
    const previous = {
      program: gl.getParameter(gl.CURRENT_PROGRAM), vao: gl.getParameter(gl.VERTEX_ARRAY_BINDING),
      blend: gl.isEnabled(gl.BLEND), depth: gl.isEnabled(gl.DEPTH_TEST), cull: gl.isEnabled(gl.CULL_FACE),
      sourceRGB: gl.getParameter(gl.BLEND_SRC_RGB), destinationRGB: gl.getParameter(gl.BLEND_DST_RGB),
      sourceAlpha: gl.getParameter(gl.BLEND_SRC_ALPHA), destinationAlpha: gl.getParameter(gl.BLEND_DST_ALPHA),
      equationRGB: gl.getParameter(gl.BLEND_EQUATION_RGB), equationAlpha: gl.getParameter(gl.BLEND_EQUATION_ALPHA),
      depthMask: gl.getParameter(gl.DEPTH_WRITEMASK),
      activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
    };
    gl.activeTexture(gl.TEXTURE4);
    previous.texture4 = gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D, frame.depthTexture ?? this.fallbackDepth);
    gl.enable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(false);
    gl.blendEquation(gl.FUNC_ADD);
    const use = layer => {
      gl.useProgram(layer.program);
      const u = layer.uniforms;
      gl.uniform2f(u.resolution, this.width, this.height);
      for (const name of ['time', 'scene', 'local', 'shot', 'beat', 'poster', 'seed']) gl.uniform1f(u[name], Number(frame[name] ?? 0));
      gl.uniform1f(u.motion, frame.motion ?? 1); gl.uniform1f(u.density, density); gl.uniform1f(u.cats, catCount);
      gl.uniform1f(u.catRole, role); gl.uniform4fv(u.event, event); gl.uniform4fv(u.audio, audio);
      gl.uniform1i(u.depthTexture, 4); gl.uniform1f(u.depthScale, frame.depthScale ?? 40); gl.uniform1f(u.hasDepth, frame.depthTexture ? 1 : 0);
      gl.uniform4fv(u.energy, frame.energy ?? [.3, .3, .2, .25]);
      gl.uniform2fv(u.pointer, frame.pointer ?? [0, 0]);
    };
    try {
      // Distant fine structures, then the solid secondary cast, then lens-near
      // pearls. The base world is left intact beneath the secondary subjects.
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.emptyVAO); use(this.ribbon);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 420 * 6, [2,3,6,10].includes(scene) ? 2 : 3);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      use(this.pearl); gl.uniform1f(this.pearl.uniforms.kind, 0);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, Math.round(pearlCount * Math.min(density, 1)));
      if ([2,3,5,10].includes(scene)) {
        use(this.impact);
        gl.uniform1f(this.impact.uniforms.kind, 0);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, scene === 3 ? 128 : 44);
        gl.uniform1f(this.impact.uniforms.kind, 1);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 64);
        gl.uniform1f(this.impact.uniforms.kind, 2);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, scene === 3 ? 18 : 12);
      }
      if (scene === 6 && !frame.poster && event[1] >= 0 && event[1] < 18.12) {
        // The wake remains for a little over a second after the distant swimmer.
        if (catCount > 0) {
          gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          use(this.swim);gl.uniform1f(this.swim.uniforms.kind, 1);gl.drawArrays(gl.TRIANGLES, 0, 6);
          gl.uniform1f(this.swim.uniforms.kind, 3);gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        use(this.wake);gl.uniform1f(this.wake.uniforms.kind, 0);gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 12);
        gl.uniform1f(this.wake.uniforms.kind, 1);gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (catCount > 0) {
          gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          use(this.swim);gl.uniform1f(this.swim.uniforms.kind, 0);gl.drawArrays(gl.TRIANGLES, 0, 6);
          gl.uniform1f(this.swim.uniforms.kind, 2);gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
      if (catCount > 0 && role !== 3) {
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        use(this.support);
        if (role === 2) {
          gl.uniform1f(this.support.uniforms.kind, 0);gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, 2);
        }
        gl.uniform1f(this.support.uniforms.kind, 1);gl.drawArrays(gl.TRIANGLES, 0, 6);
        use(this.mesh);
        // A runner's brief wake marks a gate crossing. The watcher stays still.
        if (role === 1 && audio[0] > .62) {
          gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform1f(this.mesh.uniforms.kind, 1);gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1f(this.mesh.uniforms.kind, 0);gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.bindVertexArray(this.emptyVAO); use(this.pearl); gl.uniform1f(this.pearl.uniforms.kind, 1);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, scene === 6 ? 8 : scene === 3 ? 12 : 24);
    } finally {
      gl.useProgram(previous.program); gl.bindVertexArray(previous.vao);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, previous.texture4); gl.activeTexture(previous.activeTexture);
      gl.blendFuncSeparate(previous.sourceRGB, previous.destinationRGB, previous.sourceAlpha, previous.destinationAlpha);
      gl.blendEquationSeparate(previous.equationRGB, previous.equationAlpha);
      gl.depthMask(previous.depthMask);
      for (const [capability, enabled] of [[gl.BLEND, previous.blend], [gl.DEPTH_TEST, previous.depth], [gl.CULL_FACE, previous.cull]]) {
        if (enabled) gl.enable(capability); else gl.disable(capability);
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    const gl = this.gl;
    for (const layer of [this.pearl, this.ribbon, this.mesh, this.support, this.impact, this.swim, this.wake]) gl.deleteProgram(layer.program);
    gl.deleteTexture(this.fallbackDepth);
    gl.deleteVertexArray(this.emptyVAO);
    this.disposed = true;
  }
}
