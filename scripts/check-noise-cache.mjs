// CPU-only cache lifecycle checks. Hardware hash/image equivalence is separate.
import assert from 'node:assert/strict';
import { NoiseCache, noiseCacheSide, cloudFrameCertified } from '../noise-cache.js';
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

// Check the actual per-frame certificate at every boundary; the separate
// interval proof establishes why certified coordinates fit the texture.
const certified={scene:3,time:170.125,motion:1,beat:1,seed:12,shot:3,pointer:[-1,1],event:[999,20.415,1,NaN]};
assert(cloudFrameCertified(certified));
for(const change of [
    {time:0,motion:0,beat:0,pointer:[0,0],event:[0,-1e30,-100,0]},
    {shot:-100.5},{shot:1e30},{seed:-1e30},
    {event:[NaN,0,1e30,NaN]},
])assert(cloudFrameCertified({...certified,...change}),'All bounded cameras and irrelevant fields retain certification');
for(const change of [
    {scene:1},{time:-Number.MIN_VALUE},{time:170.125+1e-10},{time:NaN},
    {motion:-1e-10},{motion:1+1e-10},{motion:Infinity},
    {beat:-1e-10},{beat:1+1e-10},{beat:NaN},
    {seed:Infinity},{seed:1e300},{shot:NaN},{shot:1e300},
    {pointer:[-1-1e-10,0]},{pointer:[0,1+1e-10]},{pointer:[NaN,0]},{pointer:null},
    {event:[0,20.415+1e-10,0,0]},{event:[0,NaN,0,0]},{event:[0,0,Infinity,0]},{event:null},
])assert(!cloudFrameCertified({...certified,...change}),'Unproved or non-finite inputs retain guarded lookup');
{
    const gl=mock(null),cache=new NoiseCache(gl),program=gl.createProgram();
    const locations={noiseCache:gl.getUniformLocation(program,'u_noiseCache'),noiseCacheValid:gl.getUniformLocation(program,'u_noiseCacheValid')};
    assert.equal(cache.validity,0);
    cache.bind(locations,certified);assert.equal(uniform(gl,'u_noiseCacheValid'),2);assert.equal(cache.validity,2);
    cache.bind(locations,{...certified,time:171});assert.equal(uniform(gl,'u_noiseCacheValid'),1);assert.equal(cache.validity,1);
    cache.enabled=false;cache.bind(locations,certified);assert.equal(uniform(gl,'u_noiseCacheValid'),0);assert.equal(cache.validity,0);
    cache.dispose();
}
console.log('Cloud coordinate certificate boundaries and cache flags 0/1/2 passed.');
