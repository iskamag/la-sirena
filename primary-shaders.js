import { fragmentShader } from './shaders.js';
import { windowGuideGLSL } from './window-guide.js';

// Keep the production world/cloud programs untouched. Derive the tested guide
// variant through unique anchors; ambiguous or changed source fails explicitly.
function replaceOnce(source,anchor,replacement) {
    if(source.indexOf(anchor)<0||source.indexOf(anchor)!==source.lastIndexOf(anchor))throw new Error('Primary shader anchor changed');
    return source.replace(anchor,replacement);
}
const missHelper=`// Experimental miss-only reuse. Clearance is a heuristic, not a no-hit proof.
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

`;
let world=replaceOnce(fragmentShader,'uniform float u_cloudVolumeValid;\n','uniform float u_cloudVolumeValid;\nuniform sampler2D u_primaryGuide;\nuniform float u_primaryGuideValid;\n');
world=replaceOnce(world,'vec3 rayWorld(vec2 uv,int scene) {',missHelper+'vec3 rayWorld(vec2 uv,int scene) {');
world=replaceOnce(world,'    bool hit=false;\n    for(int i=0;i<76;i++) {',`    bool hit=false;
    bool reuseMiss=scene==3&&primaryGuideMiss(gl_FragCoord.xy/u_resolution,
                                          2.5/(u_resolution.y*max(lens,.8)),glow);
    if(!reuseMiss) {
    for(int i=0;i<76;i++) {`);
world=replaceOnce(world,'    }\n    vec3 c=bg;\n    if(hit) {','    }\n    }\n    vec3 c=bg;\n    if(hit) {');
export const primaryWorldFragment=world;

// Same camera and original primary march, without shading/clouds/film finish.
const guideCameraStart=world.indexOf('vec3 rayWorld(vec2 uv,int scene) {');
const guideCameraEnd=world.indexOf('    vec3 bg=',guideCameraStart);
if(guideCameraStart<0||guideCameraEnd<0)throw new Error('Primary guide camera source changed');
export const primaryGuideFragment=world.slice(0,guideCameraStart)+`
uniform vec2 u_primaryGuideResolution;
${windowGuideGLSL}
`+world.slice(guideCameraStart,guideCameraEnd).replace('vec3 rayWorld','vec4 guideRay')+`
    float travel=.05,glow=0.0,clearance=100.0;
    bool hit=false;
    for(int i=0;i<60;i++) {
        vec3 p=ro+rd*travel;
        float d=mapWorld(p,3);
        glow+=.00075/(.014+d*d);
        clearance=min(clearance,d/(1.0+travel));
        if(d<.0016*(1.0+travel*.06)) {hit=true;break;}
        travel+=max(d*.78,.003);
        if(travel>32.0) break;
    }
    bool windowClear=!hit&&windowGuideClear(ro,rd,lens,u_resolution,u_primaryGuideResolution);
    return vec4(min(glow,2.0),hit?1.0:0.0,clearance,windowClear?1.0:0.0);
}
void main(){
    vec2 pixel=gl_FragCoord.xy*u_resolution/u_primaryGuideResolution;
    vec2 uv=(pixel-.5*u_resolution)/u_resolution.y;
    fragColor=guideRay(uv,3);
}
`;

// Optional world-program failure preserves the production program. Attached
// shader resources are released after linking; the caller owns a returned program.
export function createPrimaryWorld(gl,vertex,position,names) {
    let program=null;const shaders=[];
    try {
        program=gl.createProgram();if(!program)throw new Error('Primary world program unavailable');
        for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,primaryWorldFragment]]) {
            const shader=gl.createShader(type);if(!shader)throw new Error('Primary world shader unavailable');shaders.push(shader);
            gl.shaderSource(shader,source);gl.compileShader(shader);
            if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Primary world compilation failed');
            gl.attachShader(program,shader);
        }
        gl.bindAttribLocation(program,position,'a_position');gl.linkProgram(program);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Primary world linking failed');
        return {program,locations:Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,`u_${name}`)]))};
    } catch {if(program)gl.deleteProgram(program);return null;}
    finally {for(const shader of shaders)gl.deleteShader(shader);}
}
