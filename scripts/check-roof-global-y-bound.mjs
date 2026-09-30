#!/usr/bin/env node
// CPU arithmetic model only: no browser, graphics context, or GPU is created.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const options = { seed: 20481, samples: 1_000_000 };
for (let i = 2; i < process.argv.length; i++) {
    const key = process.argv[i];
    if (key === '--help') {
        console.log('node scripts/check-roof-global-y-bound.mjs [--seed UINT32] [--samples COUNT]');
        process.exit(0);
    }
    if (!['--seed', '--samples'].includes(key)) throw new Error(`Unknown option: ${key}`);
    const value = Number(process.argv[++i]);
    if (!Number.isSafeInteger(value) || value < 0 || (key === '--seed' && value > 0xffffffff)) {
        throw new Error(`Invalid ${key}`);
    }
    options[key.slice(2)] = value;
}
const shaderPath = fileURLToPath(new URL('../shaders.js', import.meta.url));
const shaderSha256 = createHash('sha256').update(readFileSync(shaderPath)).digest('hex');

// Round each scalar operation to binary32. JS trig is evaluated in binary64,
// then rounded; GPU approximations, reassociation, and fused multiply-add differ.
const f = Math.fround;
const add = (a, b) => f(f(a) + f(b));
const sub = (a, b) => f(f(a) - f(b));
const mul = (a, b) => f(f(a) * f(b));
const length = p => f(Math.sqrt(p.reduce((sum, v) => add(sum, mul(v, v)), 0)));
const mod = (x, y) => sub(x, mul(y, Math.floor(f(f(x) / f(y)))));
function rotate(a, b, angle) {
    const c = f(Math.cos(angle)), s = f(Math.sin(angle));
    // GLSL mat2(c,-s,s,c) is column-major.
    return [add(mul(c, a), mul(s, b)), sub(mul(c, b), mul(s, a))];
}
function box(p, extent) {
    const q = p.map((v, i) => sub(Math.abs(v), extent[i]));
    return add(length(q.map(v => Math.max(v, 0))), Math.min(Math.max(...q), 0));
}

// Original fields are evaluated independently of the candidate lower bounds.
function plateCenter({ opening: o, onset, x, row, h, side }) {
    return [
        add(mul(x, 2.30), mul(mul(side, o), add(.54, mul(.28, h)))),
        add(add(3.32, mul(o, add(1.30, mul(3.6, h)))), mul(mul(.045, onset), o)),
        add(mul(row, 3.15), mul(mul(sub(h, .5), o), 1.15)),
    ];
}
function roofField(p, state) {
    const { opening: o, h, side } = state;
    const q = p.map((v, i) => sub(v, plateCenter(state)[i]));
    [q[0], q[2]] = rotate(q[0], q[2], mul(mul(side, o), add(.16, mul(.43, h))));
    [q[0], q[1]] = rotate(q[0], q[1], mul(mul(side, o), add(.26, mul(.62, h))));
    [q[1], q[2]] = rotate(q[1], q[2], mul(mul(sub(h, .5), o), 1.4));
    const piece = sub(box(q, [1.105, .050, 1.525]), .018);
    const clip = add(add(mul(side, add(q[0], mul(.63, q[2]))), .018), mul(o, .065));
    return mul(Math.max(piece, clip), .72);
}
// Transform local plate probes back to world space in inverse order. This
// exercises actual rounded-box faces/interiors, independently of cluster faces.
function plateWorld(local, state) {
    const { opening: o, h, side } = state;
    const q = local.slice();
    [q[1], q[2]] = rotate(q[1], q[2], -mul(mul(sub(h, .5), o), 1.4));
    [q[0], q[1]] = rotate(q[0], q[1], -mul(mul(side, o), add(.26, mul(.62, h))));
    [q[0], q[2]] = rotate(q[0], q[2], -mul(mul(side, o), add(.16, mul(.43, h))));
    const center = plateCenter(state);
    return q.map((v, i) => add(v, center[i]));
}
function cluster(state) {
    const { opening: o, onset, x, row } = state;
    return {
        center: [mul(x, 2.30), add(add(3.32, mul(3.10, o)), mul(mul(.045, onset), o)), mul(row, 3.15)],
        extent: [add(1.903, mul(.82, o)), add(Math.min(f(1.903), add(.068, mul(2.04, o))), mul(1.80, o)), add(1.903, mul(.575, o))],
    };
}
function roofBound(p, state) {
    // Deliberately independent of center, h, side, onset, and all rotations.
    const lowestY = sub(3.2519, mul(.055, state.opening));
    return mul(sub(lowestY, p[1]), .72);
}

const results = Object.fromEntries(['roof'].map(name => [name, {
    random: 0, targeted: 0, maxOverestimate: -Infinity, guardedViolations: 0, unsafeRejects: 0,
}]));
function check(name, p, state, kind) {
    const field = roofField(p, state);
    const bound = roofBound(p, state);
    const safeBound = sub(bound, .0001), result = results[name];
    result[kind]++;
    result.maxOverestimate = Math.max(result.maxOverestimate, bound - field);
    if (!Number.isFinite(field) || !Number.isFinite(bound) || safeBound > field) result.guardedViolations++;
    // Probe cutoff ties and their immediate small neighborhoods. Rejection must
    // never hide a component smaller than the current winning field/cutoff.
    for (const offset of [-.0002, -.0001, -1e-7, 0, 1e-7, .0001, .0002]) {
        const cutoff = add(field, offset);
        if (safeBound >= cutoff && field < cutoff) result.unsafeRejects++;
    }
}
let rngState = options.seed;
function random() {
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    return rngState / 4294967296;
}
for (let k = 0; k < options.samples; k++) {
    const state = { opening: f(random()), onset: f(random()), x: Math.floor(random() * 3) - 1,
        row: Math.floor(random() * 340) - 170, h: f(random()), side: random() < .5 ? -1 : 1 };
    const p = plateCenter(state).map(v => add(v, (random() - .5) * (k % 3 === 0 ? 4 : 80)));
    check('roof', p, state, 'random');
    
    
}

// Plate faces, rounded interiors, cluster faces, and motion endpoints exercise
// ties and clipping transitions that broad random samples can miss.
const offsets = [-.0002, -1e-7, 0, 1e-7, .0002];
for (const opening of [0, 1e-7, .5, 1 - 1e-7, 1]) for (const h of [0, 1e-7, .5, 1 - 1e-7, 1]) {
    for (const onset of [0, 1]) for (const side of [-1, 1]) for (const row of [-170, 0, 169]) for (const x of [-1, 0, 1]) {
        const state = { opening: f(opening), h: f(h), onset, side, row, x };
        const { center, extent } = cluster(state);
        check('roof', plateCenter(state), state, 'targeted');
        for (const offset of offsets) {
            const p = plateCenter(state);
            p[1] = add(sub(3.2519, mul(.055, state.opening)), offset);
            check('roof', p, state, 'targeted');
        }
        for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
            for (const offset of [-.018, -1e-7, 0, 1e-7, .018]) {
                const local = [0, 0, 0];
                local[axis] = mul(sign, add([1.105, .050, 1.525][axis], offset));
                check('roof', plateWorld(local, state), state, 'targeted');
            }
        }
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            check('roof', plateWorld([mul(sx, 1.105), mul(sy, .050), mul(sz, 1.525)], state), state, 'targeted');
        }
        for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) for (const offset of offsets) {
            const p = center.slice(); p[axis] = add(p[axis], mul(sign, add(extent[axis], offset)));
            check('roof', p, state, 'targeted');
        }
    }
}
console.log(JSON.stringify({ shaderPath, shaderSha256, seed: options.seed, randomSamplesPerField: options.samples,
    model: 'CPU separately rounded float32 operations; binary64 JS transcendentals rounded to float32; no GPU/FMA equivalence claim',
    results }, null, 2));
if (Object.values(results).some(r => r.guardedViolations || r.unsafeRejects)) process.exitCode = 1;
