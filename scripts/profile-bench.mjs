// CPU-only benchmark scheduling/report helpers shared with the profiler check.
export function validateBenchmarkMode({mode,candidateOnly,disableBaselineRoofAngles}) {
    if(!['compare','bench'].includes(mode))throw Error('Mode must be compare or bench');
    if(candidateOnly&&mode!=='bench')throw Error('--candidate-only requires --mode bench');
    if(candidateOnly&&disableBaselineRoofAngles)throw Error('--candidate-only cannot disable a baseline roof angle cache');
}
export function benchmarkLabels(candidateOnly) {return candidateOnly?['candidate']:['baseline','candidate'];}
export function benchmarkSideOrder(block,count) {return count===1?[0]:block%2?[1,0]:[0,1];}
const median=values=>{const a=[...values].sort((x,y)=>x-y);return(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
export function summarizeBenchmark(samples,labels,maxQueuedFrames) {
    return labels.map((label,side)=>{
        const own=samples.filter(sample=>sample.side===side);
        if(own.length===0)throw Error(`No benchmark samples for ${label}`);
        const summary={side,label,...Object.fromEntries(['gpuMs','wallMs','submitMs'].map(key=>[key,median(own.map(sample=>sample[key]))]))};
        if(maxQueuedFrames===1){
            const frames=own.flatMap(sample=>sample.chunks.map(chunk=>chunk.gpuMs)).sort((a,b)=>a-b);
            if(frames.length===0)throw Error(`No frame timings for ${label}`);
            summary.gpuFrameP95Ms=frames[Math.ceil(frames.length*.95)-1];summary.gpuFrameMaximumMs=frames.at(-1);
        }
        return summary;
    });
}
