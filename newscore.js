import { directShot } from './choreography.js';

export const chapterSpecs=[
  {order:0,name:'Shadow transmission',line:'COLOUR INSIDE THE DARK',world:9,color:'#b1baff',words:['SHADOW','TRANSMISSION']},
  {order:10,name:'Noise tide',line:'MATTER LEARNS TO MOVE',world:1,color:'#8affea',words:['NOISE','TIDE']},
  {order:24,name:'Neon velocity',line:'NO BRAKES. NO HORIZON.',world:2,color:'#e4ff73',words:['NEON','VELOCITY']},
  {order:40,name:'Spectral cathedral',line:'A MONUMENT TO FREQUENCY',world:3,color:'#ffbcff',words:['SPECTRAL','CATHEDRAL']},
  {order:50,name:'Machine bloom',line:'THE SIGNAL BECOMES A BODY',world:4,color:'#ffbfa6',words:['MACHINE','BLOOM']},
  {order:67,name:'Total pressure',line:'EVERYTHING AT ONCE',world:5,color:'#e4ff73',words:['TOTAL','PRESSURE']},
  {order:77,name:'Afterimage',line:'THE OCEAN REMEMBERS',world:6,color:'#b7ddff',words:['AFTER','IMAGE']},
];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const p=clamp((x-a)/(b-a));return p*p*(3-2*p);};
function before(items,t,key=null){
  let lo=0,hi=items.length;
  while(lo<hi){const mid=(lo+hi)>>1;if((key?items[mid][key]:items[mid])<=t)lo=mid+1;else hi=mid;}
  return Math.max(0,lo-1);
}

// Shared by the player and offline rendering: seeks reproduce transformations.
export function createFilmScore(analysis){
  const orderTime=order=>analysis.orders.find(o=>o.order===order)?.time??0;
  const chapters=chapterSpecs.map((s,index)=>({...s,index,time:orderTime(s.order)}));
  chapters.forEach((c,i)=>c.end=chapters[i+1]?.time??analysis.duration);
  const cues={rupture:orderTime(44),reentry:orderTime(46),sentinel:orderTime(42),arcade:orderTime(57),arcadeEnd:orderTime(61),encore:orderTime(72),encoreEnd:orderTime(74),field:orderTime(4),swimmerEnter:orderTime(78),swimmerExit:orderTime(83)};
  function musicAt(time){
    const bands=analysis.analysis.bands,index=clamp(Math.floor(time*analysis.analysis.fps),0,bands.energy.length-1);
    const beatIndex=before(analysis.beats,time),beatTime=analysis.beats[beatIndex],age=Math.max(0,time-beatTime);
    const next=analysis.beats[beatIndex+1]??beatTime+60/analysis.bpm;
    const onset=bands.onset[index]||0,kick=bands.kick[index]||0;
    const row=analysis.rows[before(analysis.rows,time,'time')];
    const impacts=analysis.analysis.impacts,impactTime=impacts[before(impacts,time)],impactAge=time-impactTime;
    const impact=impactAge>=0?Math.exp(-impactAge*7)*(.45+.55*onset):0;
    return{energy:[bands.bass[index]||0,bands.mid[index]||0,bands.treble[index]||0,bands.energy[index]||0],beat:time>=beatTime?Math.exp(-age*9)*(.5+.5*kick):0,order:row?.order||0,row:row?.row||0,phrase:Math.floor((row?.order||0)/2),onset,kick,impact,beatIndex,pulsePhase:clamp(age/Math.max(.01,next-beatTime))};
  }
  function at(time,{poster=false,motion=1,pointer=[0,0],scene:override=null}={}){
    const chapter=chapters[before(chapters,poster?0:time,'time')];
    const music=musicAt(time),direction=directShot({...music,chapter,poster});
    const scene=override??direction.scene,chapterAge=Math.max(0,time-chapter.time);
    const chapterProgress=clamp(chapterAge/(chapter.end-chapter.time));
    let event=[chapterAge,time-cues.field,smooth(0,5,time-cues.field),0],catRole='none';
    if(scene===2)event=[chapterAge,chapterAge,smooth(.12,.95,chapterProgress),chapterProgress];
    if(scene===3){
      event=[chapterAge,time-cues.rupture,smooth(0,4.8,time-cues.rupture),0];
      if(time>=cues.sentinel&&time<cues.rupture)catRole='sentinel';
    }
    if(scene===10){
      const encore=time>=cues.encore,start=encore?cues.encore:cues.arcade,end=encore?cues.encoreEnd:cues.arcadeEnd;
      event=[Math.max(0,time-start),time-start,smooth(0,2,time-start),clamp((time-start)/(end-start))];
      if(!encore&&time>=start&&time<start+4)catRole='runner';
    }
    if(scene===6){
      event=[chapterAge,time-cues.swimmerEnter,chapterProgress,clamp((time-cues.swimmerEnter)/(cues.swimmerExit-cues.swimmerEnter))];
      if(time>=cues.swimmerEnter&&time<cues.swimmerExit)catRole='swimmer';
    }
    const order=analysis.orders[before(analysis.orders,time,'time')];
    const frame={time,scene,shot:direction.shot,local:poster?.35:chapterProgress,energy:poster?[.22,.3,.16,.22]:music.energy,beat:poster?.2:music.beat,motion,pointer,poster:poster?1:0,density:direction.density,cutAge:poster?10:time-order.time,event,audio:[music.onset,music.kick,music.impact,music.beatIndex+music.pulsePhase],catRole,catsEnabled:!poster&&catRole!=='none',catCount:!poster&&catRole!=='none'?1:0,seed:poster?2:music.phrase};
    return{chapter,music,frame};
  }
  return{chapters,cues,musicAt,at};
}
