// CPU-only cache lifecycle checks. Hardware hash/image equivalence is separate.
import assert from 'node:assert/strict';
import { NoiseCache, noiseCacheSide } from '../noise-cache.js';
import { recordingGL } from './native-gl.mjs';

function mock(failure) {
    const gl=recordingGL(640,360);
    gl.NO_ERROR=0;gl.RGBA32F=34836;
    if(failure!=='no-api') gl.getExtension=()=>{if(failure==='extension')throw new Error('Extension unavailable');return failure==='unsupported'?null:{};};
    gl.getShaderParameter=()=>failure!=='compile';gl.getProgramParameter=()=>failure!=='link';
    gl.getError=()=>failure==='draw'?1282:0;
    gl.checkFramebufferStatus=()=>failure==='attachment'?36054:gl.FRAMEBUFFER_COMPLETE;
    return gl;
}
function uniform(gl,name) {return gl.commands.filter(c=>c.op.startsWith('uniform')&&c.args[0].name===name).at(-1)?.args[1];}
for(const failure of ['no-api','unsupported','extension','attachment','compile','link','draw',null]) {
    const gl=mock(failure),cache=new NoiseCache(gl);
    const fallbackUpload=gl.commands.find(c=>c.op==='texImage2D'&&c.args[3]===1&&c.args[4]===1);
    assert(fallbackUpload,'Every capability path has a complete RGBA8 placeholder');
    assert.equal(cache.enabled,failure===null);
    const program=gl.createProgram();
    const locations={noiseCache:gl.getUniformLocation(program,'u_noiseCache'),noiseCacheValid:gl.getUniformLocation(program,'u_noiseCacheValid')};
    cache.bind(locations,{scene:3});
    assert.equal(uniform(gl,'u_noiseCache'),5);
    assert.equal(uniform(gl,'u_noiseCacheValid'),failure===null?1:0);
    assert.equal(gl.getParameter(gl.TEXTURE_BINDING_2D),failure===null?cache.texture:cache.fallback);
    cache.bind(locations,{scene:1});
    assert.equal(uniform(gl,'u_noiseCacheValid'),0);assert.equal(gl.getParameter(gl.TEXTURE_BINDING_2D),cache.fallback);
    const draws=gl.commands.filter(c=>c.op==='drawArrays');
    assert.equal(draws.length,failure===null||failure==='draw'?1:0,'At most one static cache initialization draw');
    if(failure===null) {
        const allocation=gl.commands.find(c=>c.op==='texImage2D'&&c.args[2]===gl.RGBA32F);
        assert.equal(allocation.args[3],noiseCacheSide);assert.equal(allocation.args[4],noiseCacheSide);
    }
    const owned=[cache.fallback,cache.texture,cache.framebuffer,cache.program,cache.vao].filter(Boolean);
    cache.dispose();
    for(const resource of owned)assert.equal(gl.commands.filter(c=>c.op.startsWith('delete')&&c.args[0]?.resource===resource.resource).length,1,'Each retained cache resource is released once');
}
console.log('Noise cache capability, initialization-failure, placeholder, scene isolation and lifecycle checks passed.');
