// Exercise the profiler's actual injected scheduler without launching a GPU.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateBenchmarkMode, benchmarkLabels, benchmarkSideOrder, summarizeBenchmark } from './profile-bench.mjs';

const source = await readFile(new URL('./profile-render.mjs', import.meta.url), 'utf8');
const injection = source.match(/const injection = `([\s\S]*?)`;/)?.[1];
assert.ok(injection, 'Profiler injection is available for the CPU check');

function mockRenderer() {
  let active = null, queued = 0, maximumQueued = 0, deletedQueries = 0, deletedFences = 0;
  const queries = [], times = [];
  const gl = {
    TIME_ELAPSED_EXT: 1, QUERY_RESULT_AVAILABLE: 2, QUERY_RESULT: 3,
    GPU_DISJOINT_EXT: 4, SYNC_GPU_COMMANDS_COMPLETE: 5,
    ALREADY_SIGNALED: 6, CONDITION_SATISFIED: 7, WAIT_FAILED: 8,
    getExtension: () => gl,
    createQuery: () => ({ frames: 0, availabilityPolls: 0 }),
    beginQuery: (target, query) => {
      assert.equal(active, null); active = query; queries.push(query);
    },
    endQuery: () => { assert.ok(active); active = null; },
    fenceSync: () => ({ polls: 0 }),
    flush: () => {},
    clientWaitSync: fence => {
      if (++fence.polls < 2) return 0;
      queued = 0; return gl.ALREADY_SIGNALED;
    },
    deleteSync: () => { deletedFences++; },
    getQueryParameter: (query, parameter) => {
      if (parameter === gl.QUERY_RESULT_AVAILABLE) return ++query.availabilityPolls >= 2;
      assert.equal(parameter, gl.QUERY_RESULT);
      return query.frames * 1e6; // One millisecond per simulated frame.
    },
    getParameter: parameter => { assert.equal(parameter, gl.GPU_DISJOINT_EXT); return queries.length === 2; },
    deleteQuery: () => { deletedQueries++; },
    getError: () => 0,
  };
  const render = (now, time) => {
    if (active) active.frames++;
    queued++; maximumQueued = Math.max(maximumQueued, queued); times.push(time);
  };
  const window = {};
  new Function('window', 'gl', 'render', injection)(window, gl, render);
  return {
    profile: window.__profile, gl, times, queries,
    stats: () => ({ queued, maximumQueued, deletedQueries, deletedFences }),
  };
}

const timed = mockRenderer();
const result = await timed.profile.timing(11, 5, 2, 1);
assert.deepEqual(timed.queries.map(query => query.frames), [2, 2, 1]);
assert.equal(timed.stats().maximumQueued, 2);
assert.equal(timed.stats().queued, 0);
assert.equal(timed.stats().deletedQueries, 3);
assert.equal(timed.stats().deletedFences, 4);
assert.deepEqual(timed.times, Array.from({ length: 5 }, (_, i) => 11 + i / 60));
assert.equal(result.gpuMs, 1, 'Query sum excludes fence waits and cooldown');
assert.deepEqual(result.chunks, [
  { time: 11, frames: 2, gpuMs: 1 },
  { time: 11 + 2 / 60, frames: 2, gpuMs: 1 },
  { time: 11 + 4 / 60, frames: 1, gpuMs: 1 },
]);
assert.ok(result.deliberateWaitMs > 0);
assert.equal(result.disjoint, true, 'Any disjoint chunk invalidates the aggregate');

const untimed = mockRenderer();
untimed.profile.cooldownMs = 1;
for (let i = 0; i < 4; i++) await untimed.profile.frame(i / 60);
assert.equal(untimed.stats().maximumQueued, 1, 'Warmup/comparison frame calls drain before resolving');
assert.equal(untimed.stats().deletedFences, 4);

const failed = mockRenderer();
failed.gl.clientWaitSync = () => failed.gl.WAIT_FAILED;
await assert.rejects(failed.profile.drain(), /GPU completion fence failed/);
assert.equal(failed.stats().deletedFences, 1, 'Failed waits release the fence');
console.log(JSON.stringify({ timedChunkFrames: [2, 2, 1], untimedMaximumQueued: 1, querySum: 'passed', disjointPropagation: 'passed', fenceCleanup: 'passed', gpuUsed: false }));

// Single-side scheduling submits each block exactly once; sample summaries
// belong to the candidate at side 0 and keep genuine absolute measurements.
validateBenchmarkMode({mode:'bench',candidateOnly:true,disableBaselineRoofAngles:false});
assert.throws(()=>validateBenchmarkMode({mode:'compare',candidateOnly:true}),/requires --mode bench/);
assert.throws(()=>validateBenchmarkMode({mode:'bench',candidateOnly:true,disableBaselineRoofAngles:true}),/cannot disable a baseline/);
assert.throws(()=>validateBenchmarkMode({mode:'invalid',candidateOnly:false}),/Mode must be/);
const labels=benchmarkLabels(true);assert.deepEqual(labels,['candidate']);
assert.deepEqual(Array.from({length:4},(_,block)=>benchmarkSideOrder(block,labels.length)),[[0],[0],[0],[0]]);
assert.deepEqual(benchmarkLabels(false),['baseline','candidate']);
assert.deepEqual([benchmarkSideOrder(0,2),benchmarkSideOrder(1,2)],[[0,1],[1,0]]);
const samples=[
 {side:0,gpuMs:12,wallMs:102,submitMs:.4,chunks:[{gpuMs:10},{gpuMs:14}]},
 {side:0,gpuMs:10,wallMs:100,submitMs:.2,chunks:[{gpuMs:9},{gpuMs:11}]},
];
assert.throws(()=>summarizeBenchmark([],labels,1),/No benchmark samples/);
assert.throws(()=>summarizeBenchmark([{...samples[0],chunks:[]}],labels,1),/No frame timings/);
const summaries=summarizeBenchmark(samples,labels,1);
assert.deepEqual(summaries,[{side:0,label:'candidate',gpuMs:11,wallMs:101,submitMs:(.4+.2)/2,gpuFrameP95Ms:14,gpuFrameMaximumMs:14}]);
assert.equal(summaries.at(-1).gpuMs,11,'Single-side budget targets the candidate');
assert(!Object.hasOwn(summaries[0],'gpuReductionPercent'),'Single-side summaries report absolute measurements');
const paired=summarizeBenchmark([...samples,{side:1,gpuMs:8,wallMs:98,submitMs:.1,chunks:[{gpuMs:8}]}],benchmarkLabels(false),1);
assert.equal(paired.at(-1).label,'candidate');assert.equal(paired.at(-1).gpuMs,8);assert.equal(paired[0].gpuMs,11);
console.log('Candidate-only mode rejection, one-side/alternating schedules and sample/frame aggregation passed.');
