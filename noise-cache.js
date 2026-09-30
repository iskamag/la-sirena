import { fragmentShader } from './shaders.js';

// A static 512² RGBA32F lattice uses 4 MiB. Each texel stores the original
// four hash corners for one integer noise cell, with no filtering/quantization.
// Production temple cloud inputs fit [-256,256); other cells evaluate directly.
export const noiseCacheSide = 512;
const hashSource = fragmentShader.match(/float hash\(vec2 p\) \{[\s\S]*?\n\}/)?.[0];
if (!hashSource) throw new Error('Original noise hash source is unavailable');
const vertex = `#version 300 es
void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`;
export const noiseCacheFragment = `#version 300 es
precision highp float;
out vec4 fragColor;
${hashSource}
void main(){
    vec2 i=floor(gl_FragCoord.xy)-vec2(${noiseCacheSide / 2}.0);
    fragColor=vec4(hash(i),hash(i+vec2(1,0)),hash(i+vec2(0,1)),hash(i+vec2(1,1)));
}`;

// Certify the camera/transport inputs once per frame. The interval proof in
// scripts/check-noise-cache-bounds.py covers every normalized viewing ray,
// every cathedral camera mode, pointer [-1,1] and these time/age limits.
// Unusual finite shots still select a default or one of the three bounded
// camera variants; no shot enumeration is necessary.
const finiteGPU=value=>Number.isFinite(value)&&Number.isFinite(Math.fround(value));
export function cloudFrameCertified(frame) {
    const {time,motion,beat,seed,shot,pointer,event}=frame;
    return frame.scene===3&&finiteGPU(time)&&time>=0&&time<=170.125&&
        finiteGPU(motion)&&motion>=0&&motion<=1&&finiteGPU(beat)&&beat>=0&&beat<=1&&
        finiteGPU(seed)&&finiteGPU(shot)&&
        finiteGPU(pointer?.[0])&&Math.abs(pointer[0])<=1&&finiteGPU(pointer?.[1])&&Math.abs(pointer[1])<=1&&
        finiteGPU(event?.[1])&&event[1]<=20.415&&finiteGPU(event?.[2]);
}

export class NoiseCache {
    constructor(gl) {
        this.gl=gl;this.enabled=false;this.validity=0;
        gl.activeTexture(gl.TEXTURE0+5);
        this.fallback=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.fallback);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
        this.parameters();
        // Native recording lacks extension queries and retains original hashes.
        if(!gl.getExtension) return;
        try {
            if(!gl.getExtension('EXT_color_buffer_float')) return;
            this.texture=gl.createTexture();
            if(!this.texture) throw new Error('Noise cache texture unavailable');
            gl.bindTexture(gl.TEXTURE_2D,this.texture);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,noiseCacheSide,noiseCacheSide,0,gl.RGBA,gl.FLOAT,null);
            this.parameters();
            this.framebuffer=gl.createFramebuffer();
            if(!this.framebuffer) throw new Error('Noise cache framebuffer unavailable');
            gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);
            if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('Float noise cache attachment unavailable');
            this.program=gl.createProgram();
            if(!this.program) throw new Error('Noise cache program unavailable');
            for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,noiseCacheFragment]]) {
                const shader=gl.createShader(type);
                if(!shader) throw new Error('Noise cache shader unavailable');
                gl.shaderSource(shader,source);gl.compileShader(shader);
                if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
                    gl.deleteShader(shader);throw new Error('Noise cache shader compilation failed');
                }
                gl.attachShader(this.program,shader);gl.deleteShader(shader);
            }
            gl.linkProgram(this.program);
            if(!gl.getProgramParameter(this.program,gl.LINK_STATUS)) throw new Error('Noise cache program linking failed');
            this.vao=gl.createVertexArray();
            if(!this.vao) throw new Error('Noise cache vertex array unavailable');
            gl.viewport(0,0,noiseCacheSide,noiseCacheSide);
            gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
            gl.useProgram(this.program);gl.bindVertexArray(this.vao);
            gl.drawArrays(gl.TRIANGLES,0,3);
            if(gl.getError()!==gl.NO_ERROR) throw new Error('Noise cache initialization failed');
            this.enabled=true;
        } catch {
            this.releaseCache();
        } finally {
            gl.bindFramebuffer(gl.FRAMEBUFFER,null);
            gl.bindTexture(gl.TEXTURE_2D,this.fallback);
        }
    }

    parameters() {
        const gl=this.gl;
        for(const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,name,gl.NEAREST);
        for(const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
    }

    bind(locations,frame) {
        const gl=this.gl,valid=this.enabled&&frame.scene===3;
        gl.activeTexture(gl.TEXTURE0+5);gl.bindTexture(gl.TEXTURE_2D,valid?this.texture:this.fallback);
        this.validity=valid?(cloudFrameCertified(frame)?2:1):0;
        gl.uniform1i(locations.noiseCache,5);gl.uniform1f(locations.noiseCacheValid,this.validity);
    }

    releaseCache() {
        const gl=this.gl;
        for(const [name,kind] of [['texture','Texture'],['framebuffer','Framebuffer'],['program','Program'],['vao','VertexArray']]) {
            if(this[name]) gl[`delete${kind}`](this[name]);this[name]=null;
        }
        this.enabled=false;this.validity=0;
    }

    dispose() {this.releaseCache();this.gl.deleteTexture(this.fallback);this.fallback=null;}
}
