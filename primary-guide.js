import { primaryGuideFragment } from './primary-shaders.js';
import { cloudFrameCertified } from './noise-cache.js';

export const primaryGuideMinimumHeight = 1440;
const finiteGPU=value=>Number.isFinite(value)&&Number.isFinite(Math.fround(value));
export function primaryGuideEligible(frame,height) {
    return height>=primaryGuideMinimumHeight&&cloudFrameCertified(frame)&&
        frame.time>=156.515&&frame.event[2]>=1&&frame.poster===0&&
        finiteGPU(frame.density)&&frame.density>=0&&frame.density<=1&&
        finiteGPU(frame.event[0]);
}
const vertex = `#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`;

// Experimental quarter-resolution primary miss/glow guide.
// Conservative-looking gates remain heuristics until a no-hit proof is supplied.
export class PrimaryGuide {
    constructor(gl) {
        this.gl=gl;this.enabled=false;this.valid=false;this.width=0;this.height=0;
        this.fallback=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.fallback);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
        this.parameters();
        if(!gl.getExtension)return;
        try {
            if(!gl.getExtension('EXT_color_buffer_float'))return;
            this.program=gl.createProgram();
            for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,primaryGuideFragment]]) {
                const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
                if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {gl.deleteShader(shader);throw new Error('Primary guide shader compilation failed');}
                gl.attachShader(this.program,shader);gl.deleteShader(shader);
            }
            gl.linkProgram(this.program);
            if(!gl.getProgramParameter(this.program,gl.LINK_STATUS)) throw new Error('Primary guide program linking failed');
            this.locations=Object.fromEntries([...primaryGuideFragment.matchAll(/uniform\s+(\w+)\s+u_(\w+)\s*;/g)].map(([,type,name])=>[name,{type,location:gl.getUniformLocation(this.program,`u_${name}`)}]));
            this.texture=gl.createTexture();this.framebuffer=gl.createFramebuffer();
            if(!this.texture||!this.framebuffer)throw new Error('Primary guide target unavailable');
            this.enabled=true;
        } catch {this.release();}
    }
    parameters() {
        const gl=this.gl;
        for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,name,gl.NEAREST);
        for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
    }
    resize(width,height) {
        if(!this.enabled)return;
        const gl=this.gl,w=Math.ceil(width/4),h=Math.ceil(height/4);
        if(w===this.width&&h===this.height)return;
        gl.bindTexture(gl.TEXTURE_2D,this.texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,w,h,0,gl.RGBA,gl.FLOAT,null);this.parameters();
        gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)this.release();
        else {this.width=w;this.height=h;}
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
    render(frame,width,height,vao,noiseCache) {
        this.valid=false;if(!this.enabled||width<height||!primaryGuideEligible(frame,height))return;
        this.resize(width,height);if(!this.enabled)return;
        const gl=this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);gl.viewport(0,0,this.width,this.height);
        gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
        gl.useProgram(this.program);gl.bindVertexArray(vao);
        const values={...frame,resolution:[width,height],primaryGuideResolution:[this.width,this.height],flowBoundValid:0,noiseCache:5,noiseCacheValid:0,cloudVolume:6,cloudVolumeValid:0,primaryGuide:7,primaryGuideValid:0};
        // A complete fallback on unit 6 avoids a feedback loop even if uniforms
        // in unused functions survive shader compilation.
        gl.activeTexture(gl.TEXTURE0+6);gl.bindTexture(gl.TEXTURE_2D,this.fallback);
        for(const [name,{type,location}] of Object.entries(this.locations)) {
            if(location===null)continue;
            const value=values[name];
            if(type==='float')gl.uniform1f(location,value);
            else if(type==='sampler2D')gl.uniform1i(location,value);
            else if(type==='vec2')gl.uniform2fv(location,value);
            else if(type==='vec4')gl.uniform4fv(location,value);
        }
        noiseCache.bind(Object.fromEntries(Object.entries(this.locations).map(([name,v])=>[name,v.location])),frame);
        gl.activeTexture(gl.TEXTURE0+7);gl.bindTexture(gl.TEXTURE_2D,this.fallback);
        gl.drawArrays(gl.TRIANGLES,0,3);
        this.valid=gl.getError()===gl.NO_ERROR;
        if(!this.valid)this.release();
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);
    }
    bind(locations,frame) {
        const gl=this.gl,valid=this.enabled&&this.valid&&frame.scene===3;
        gl.activeTexture(gl.TEXTURE0+7);gl.bindTexture(gl.TEXTURE_2D,valid?this.texture:this.fallback);
        gl.uniform1i(locations.primaryGuide,7);gl.uniform1f(locations.primaryGuideValid,valid?1:0);
    }
    release() {
        const gl=this.gl;for(const [name,kind] of [['texture','Texture'],['framebuffer','Framebuffer'],['program','Program']]) {
            if(this[name])gl[`delete${kind}`](this[name]);this[name]=null;
        }
        this.enabled=false;this.valid=false;
    }
    dispose(){this.release();this.gl.deleteTexture(this.fallback);}
}
