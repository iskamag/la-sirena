// Offline Linux export of the actual JavaScript score and GLES3 render graph.
import {spawn} from 'node:child_process';
import {readFile,mkdir,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

const args=process.argv.slice(2);
const full=args.includes('--full');
const option=(name,fallback)=>{const i=args.indexOf(`--${name}`);return i<0?fallback:args[i+1];};
const analysis=JSON.parse(await readFile('public/track-analysis.json','utf8'));
const width=Number(option('width',full?1920:1280)),height=Number(option('height',Math.round(width*9/16/2)*2));
const fps=Number(option('fps',30)),start=Number(option('start',full?0:135));
const duration=Math.min(Number(option('duration',full?analysis.duration-start:72.555)),analysis.duration-start);
const codec=option('codec','libx264'),preset=option('preset',codec==='libsvtav1'?'6':'fast');
const threads=Number(option('threads',4)),pauseMs=Number(option('pause-ms',50));
if(!['libx264','libsvtav1'].includes(codec)||!Number.isInteger(threads)||threads<1||!Number.isFinite(pauseMs)||pauseMs<0)throw Error('Use libx264/libsvtav1, positive integer threads and nonnegative pause-ms.');
const crf=Number(option('crf',18)),output=resolve(option('output',full?'artifacts/la-sirena-rupture.mp4':'artifacts/la-sirena-rupture-preview.mp4'));
if(![width,height,fps,start,duration,crf].every(Number.isFinite)||width<2||height<2||width%2||height%2||fps<=0||start<0||duration<=0)throw Error('Use even positive dimensions, positive FPS/duration and a valid start time.');
const work=output.replace(/\.mp4$/i,'')+'.render';
if(work===output)throw Error('Output must end in .mp4');
await mkdir(dirname(output),{recursive:true});await mkdir(work,{recursive:true});
const trace=resolve(work,'trace.jsonl'),silent=resolve(work,'silent.mp4');
const frames=Math.ceil(duration*fps),began=Date.now();
const done=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>code===0?resolve():reject(Error(`${child.spawnfile} exited ${code??signal}`)));});
const run=(command,argv)=>done(spawn(command,argv,{stdio:'inherit'}));

const planArgs=['scripts/native-plan.mjs','--width',String(width),'--height',String(height),'--fps',String(fps),'--start',String(start),'--end',String(start+duration),'--no-png','--output',trace];
await run(process.execPath,planArgs);
const codecArgs=codec==='libsvtav1'?['-svtav1-params',`lp=${threads}`]:['-threads',String(threads)];
const encoder=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','bgra','-video_size',`${width}x${height}`,'-framerate',String(fps),'-i','pipe:0','-an','-vf','scale=in_range=full:out_range=limited:out_color_matrix=bt709','-filter_threads','1','-c:v',codec,'-preset',preset,'-crf',String(crf),...codecArgs,'-pix_fmt',codec==='libsvtav1'?'yuv420p10le':'yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-frames:v',String(frames),silent],{stdio:['pipe','inherit','inherit']});
const renderer=spawn('python3',['scripts/native-replay.py',trace,'--out',work,'--raw','-','--raw-format','bgra','--pause-ms',String(pauseMs)],{stdio:['ignore','pipe','pipe']});
encoder.stdin.on('error',()=>renderer.kill('SIGTERM'));
renderer.stdout.pipe(encoder.stdin);
let pending='';renderer.stderr.on('data',chunk=>{
  pending+=chunk;
  const lines=pending.split('\n');pending=lines.pop();
  for(const line of lines){
    try{const value=JSON.parse(line);if(value.context)console.log(`Rendering on ${value.context.renderer}`);else if(value.index!==undefined)console.log(`Frame ${value.index+1}/${frames} · ${value.time.toFixed(3)}s · ${value.renderSeconds.toFixed(3)}s/frame`);}
    catch{process.stderr.write(line+'\n');}
  }
});
const encoderDone=done(encoder),rendererDone=done(renderer);
try{await Promise.all([encoderDone,rendererDone]);}
catch(error){renderer.kill('SIGTERM');encoder.kill('SIGTERM');await Promise.allSettled([encoderDone,rendererDone]);throw error;}
await run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',silent,'-ss',String(start),'-i',resolve('public/music.mp3'),'-map','0:v:0','-map','1:a:0','-t',String(duration),'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',output]);
await run('ffmpeg',['-hide_banner','-loglevel','error','-xerror','-i',output,'-f','null','-']);
await unlink(silent);await unlink(trace);
console.log(`Saved ${output} · ${width}×${height} · ${fps}fps · ${duration.toFixed(3)}s · ${((Date.now()-began)/1000).toFixed(1)}s rendering · decoded to EOF`);
