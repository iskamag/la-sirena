// Procedural graphic pass, shared by the canvas player and native exports.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smoothstep=(a,b,x)=>{const p=clamp((x-a)/(b-a));return p*p*(3-2*p);};
function lowerIndex(items,t,key=null){let lo=0,hi=items.length;while(lo<hi){const mid=(lo+hi)>>1;if((key?items[mid][key]:items[mid])<=t)lo=mid+1;else hi=mid;}return Math.max(0,lo-1);}
function timecode(t){const s=Math.max(0,Math.floor(t||0));return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;}
export function drawFilmGraphics(ink, {t, chapter, music, frame, analysis, width, height, started=true, motion=1}) {
  const state={width,height,started,motion};
  const w = state.width, h = state.height, min = Math.min(w, h), aspect = w / h;
  ink.clearRect(0, 0, w, h); ink.globalAlpha = 1;
  if (!state.started) {
    const shade = ink.createLinearGradient(0, 0, w, h * .2); shade.addColorStop(0, 'rgba(4,12,14,.40)'); shade.addColorStop(.48, 'rgba(4,12,14,.18)'); shade.addColorStop(1, 'rgba(4,12,14,0)'); ink.fillStyle = shade; ink.fillRect(0, 0, w, h);
    return;
  }
  const localTime = t - chapter.time;
  const chapterIndex = chapter.index;
  const intro = t < 5;
  const e = music.energy;
  const margin = w * .047;

  // The graphic layer belongs to the film and is included in exported video.
  ink.save();
  const edgeFade = ink.createLinearGradient(0, 0, 0, h); edgeFade.addColorStop(0, 'rgba(2,5,10,.17)'); edgeFade.addColorStop(.3, 'rgba(2,5,10,0)'); edgeFade.addColorStop(.72, 'rgba(2,5,10,0)'); edgeFade.addColorStop(1, 'rgba(2,5,10,.38)'); ink.fillStyle = edgeFade; ink.fillRect(0, 0, w, h);

  // Tiny registration marks make the evolving worlds feel like one transmission.
  ink.strokeStyle = 'rgba(229,245,226,.34)'; ink.lineWidth = .65;
  const cross = (x, y, s) => { ink.beginPath(); ink.moveTo(x-s,y); ink.lineTo(x+s,y); ink.moveTo(x,y-s); ink.lineTo(x,y+s); ink.stroke(); };
  cross(margin, h * .5, 4); cross(w-margin, h*.5,4);
  ink.font = `${Math.max(7, w * .0057)}px monospace`; ink.fillStyle = 'rgba(239,252,232,.56)';
  ink.fillText(`LS—${String(chapterIndex + 1).padStart(2, '0')} / ${chapter.line}`, margin, h - 24);
  ink.textAlign = 'right'; ink.fillText(`${String(music.order).padStart(2, '0')}:${String(music.row).padStart(2, '0')}  ·  ${timecode(t)}`, w - margin, h - 24); ink.textAlign = 'left';

  if(frame.scene===10){
    const age=frame.event[0],checkpoint=Math.floor(age*5.4/7.2),phase=(age*5.4/7.2)%1;
    ink.save();ink.fillStyle='#d9ff9d';ink.globalAlpha=.72;
    ink.font=`bold ${Math.max(9,min*.019)}px monospace`;ink.letterSpacing='2px';
    ink.fillText('BONUS CIRCUIT',margin,h*.12);
    ink.font=`${Math.max(8,min*.015)}px monospace`;ink.letterSpacing='1px';
    ink.fillText(`GATE ${String(checkpoint+1).padStart(2,'0')}  /  NO BRAKES`,margin,h*.12+min*.032);
    ink.strokeStyle='rgba(185,250,255,.44)';ink.lineWidth=1;
    const barW=min*.23,barY=h*.12+min*.052;ink.strokeRect(margin,barY,barW,3);
    ink.fillRect(margin,barY,barW*phase,3);
    if(age<1.7){ink.globalAlpha=(1-smoothstep(.55,1.7,age))*.65;ink.font=`900 ${min*.078}px Arial`;ink.letterSpacing=`${-min*.003}px`;ink.fillText('SECRET ROUTE',margin,h*.82);}
    ink.restore();
  }
  if(frame.scene===3&&frame.event[1]>=0&&frame.event[1]<1.6){
    const age=frame.event[1];ink.save();ink.globalAlpha=Math.sin(clamp(age/1.6)*Math.PI)*.54*motion;
    ink.font=`900 ${w*(aspect<1?.10:.074)}px Arial`;ink.letterSpacing=`${-w*.003}px`;ink.strokeStyle='#fff0d3';ink.lineWidth=1;
    ink.strokeText('SKY / BREACH',margin,h*.21);ink.restore();
  }

  const titleAge = intro ? t - .45 : localTime;
  const titleDuration = intro ? 3.8 : 2.45;
  const titleOpacity = smoothstep(0, .5, titleAge) * (1 - smoothstep(titleDuration - .9, titleDuration, titleAge));
  if (titleOpacity > .001) {
    ink.save();
    ink.globalAlpha = titleOpacity;
    const fontSize = intro ? w * (aspect < 1 ? .20 : .117) : w * (aspect < 1 ? .095 : .072);
    const y = intro ? h * (aspect<1?.73:.50) : h * (aspect<1?.68:.60);
    const words = intro ? ['LA', 'SIRENA.'] : chapter.words;
    const x = intro ? margin + w * .02 : margin;
    ink.translate(x, y + (1 - smoothstep(0, .7, titleAge)) * 22 * motion);
    const shadow = ink.createLinearGradient(-x, 0, w * .70, 0); shadow.addColorStop(0, 'rgba(0,5,9,.38)'); shadow.addColorStop(1,'rgba(0,5,9,0)'); ink.fillStyle=shadow; ink.fillRect(-x,-fontSize,w*.73,fontSize*2.6);
    ink.font = `900 ${fontSize}px Arial, sans-serif`; ink.textBaseline = 'alphabetic';
    ink.fillStyle = '#f4f4ec'; ink.letterSpacing = `${-fontSize * .07}px`;
    const drift = Math.sin(t * 2.7) * music.beat * motion * 1.8;
    words.forEach((word, i) => {
      ink.fillStyle = i === 1 && !intro ? chapter.color : '#f4f4ec';
      ink.fillText(word, drift, i * fontSize * .82);
      if (music.beat > .65 && motion > .5) { ink.globalAlpha=titleOpacity*.25; ink.fillStyle='#ff435c'; ink.fillText(word, -2.5, i*fontSize*.82+1); ink.globalAlpha=titleOpacity; }
    });
    ink.letterSpacing = '1.8px'; ink.font = `${Math.max(8, w * .007)}px monospace`; ink.fillStyle = chapter.color;
    ink.fillText(intro ? 'SHADOW / COLOUR / FREQUENCY' : `ACT ${String(chapterIndex+1).padStart(2,'0')}   /   ${chapter.line}`, 4, -fontSize * .97);
    ink.restore();
  }

  // A brief graphic cut on each new phrase, then clear space for the world.
  const orderTime = analysis.orders[lowerIndex(analysis.orders, t, 'time')]?.time || 0;
  const orderAge = t - orderTime;
  const cut = (1 - smoothstep(.035, .23, orderAge)) * motion;
  if (cut > .01 && music.order > 0 && music.order % 4 === 0) {
    ink.save(); ink.globalAlpha = cut * .56;
    ink.fillStyle = chapter.color;
    const stripeH = h * .009;
    for (let i = 0; i < 2; i++) {
      const pos = ((i * .163 + music.order * .137) % 1) * h;
      ink.fillRect(i % 2 ? w * .94 : 0, pos, w*.06, stripeH);
    }
    ink.globalAlpha = cut * .36; ink.font = `900 ${w * .028}px Arial`; ink.letterSpacing = '-2px'; ink.fillText('///', w*.91, h*.26);
    ink.restore();
  }

  // Chapter changes open with moving shutters rather than a flat flash.
  if (localTime < .6 && chapterIndex > 0 && motion > .3) {
    const p = smoothstep(0, .6, localTime);
    ink.save(); ink.fillStyle = chapter.color;
    for (let i = 0; i < 9; i++) { const stagger = clamp(p * 1.5 - i * .055); const width = w * (1 - smoothstep(0, 1, stagger)); ink.globalAlpha = (1 - p) * .8; ink.fillRect(i % 2 ? w-width : 0, i*h/9, width, h/9+1); }
    ink.restore();
  }

  // Percussive orbital annotations: graphic punctuation, never an equalizer.
  if (!intro && titleOpacity < .12 && music.beat > .16) {
    ink.save(); ink.globalAlpha = music.beat * .24 * motion; ink.strokeStyle = chapter.color; ink.lineWidth=.7;
    const cx = w * (.5 + Math.sin(music.phrase * 2.14)*.27); const cy = h*(.5 + Math.cos(music.phrase)*.2); const radius = min * (.10 + (1-music.beat)*.12);
    ink.beginPath(); ink.arc(cx,cy,radius,-.1, .6); ink.stroke(); ink.beginPath(); ink.arc(cx,cy,radius+6,Math.PI,Math.PI+.7); ink.stroke(); cross(cx,cy,4);
    ink.restore();
  }

  // Rhythmic type interventions recur sparsely, like cuts in an edited film.
  const orderEvent = analysis.orders[lowerIndex(analysis.orders, t, 'time')];
  const stampAge = t - ((orderEvent?.time || 0) + (orderEvent?.duration || 3.4) * .75);
  if (chapterIndex > 0 && chapterIndex < 6 && frame.scene!==10 && !(frame.scene===3&&frame.event[1]>=0) && music.order % 4 === 3 && stampAge >= 0 && stampAge < .65 && motion > .3) {
    const p = stampAge / .65;
    const words = ['', 'FLOW.', 'FASTER.', 'RESONATE.', 'REFRACT.', 'OVERRUN.'];
    ink.save(); ink.globalAlpha = Math.sin(p * Math.PI) * .58 * motion;
    const size = w * (chapterIndex === 3 || chapterIndex === 5 ? .135 : .19);
    ink.font = `900 ${size}px Arial`; ink.letterSpacing = `${-size*.06}px`; ink.textAlign='center'; ink.lineWidth=1.3; ink.strokeStyle=chapter.color;
    const y=h*.54+(p-.5)*18; ink.strokeText(words[chapterIndex], w*.5, y);
    ink.beginPath();ink.rect(0,y-size*.36,w,size*.13);ink.clip();ink.fillStyle=chapter.color;ink.fillText(words[chapterIndex],w*.5-3*music.beat,y);ink.restore();
  }

  // Small geometric fragments shed from the composition on selected kicks.
  if (chapterIndex >= 2 && chapterIndex < 6 && motion > .4 && music.energy[0] > .38) {
    const beatTime = analysis.beats[lowerIndex(analysis.beats,t)];
    const age = t - beatTime;
    if (age < .32 && music.beatIndex % 2 === 0) {
      ink.save(); ink.globalAlpha=(1-smoothstep(.03,.32,age))*.5*motion; ink.fillStyle=chapter.color;
      for(let i=0;i<22;i++) {
        const angle=i*2.39996+music.beatIndex*.7;
        const distance=min*(.13+age*(1.1+(i%3)*.3));
        const px=w*.5+Math.cos(angle)*distance;const py=h*.5+Math.sin(angle)*distance*.65;
        const size=1+(i%3);ink.fillRect(px,py,size*(1+age*6),size);
      }
      ink.restore();
    }
  }

  // The closing title settles over the living ocean; its light stays visible.
  const endAge = t - (analysis.duration - 5.3);
  if (endAge > 0) {
    const p=smoothstep(0,3.6,endAge); ink.fillStyle=`rgba(3,9,13,${p*.56})`; ink.fillRect(0,0,w,h);
    ink.globalAlpha=p; ink.textAlign='center'; ink.font=`900 ${w*.08}px Arial`; ink.letterSpacing=`${-w*.004}px`; ink.fillStyle='#e9f3e6'; ink.fillText('LA SIRENA.',w/2,h*.49);
    ink.font=`${Math.max(8,w*.007)}px monospace`; ink.letterSpacing='2px'; ink.fillStyle='#acbbff'; ink.fillText('SHADOW / COLOUR / FREQUENCY',w/2,h*.55);
    ink.font=`${Math.max(7,w*.006)}px monospace`; ink.fillStyle='#94a99d'; ink.fillText('SONG.MOD / FOUR CHANNELS / ALL MATHEMATICS',w/2,h*.64); ink.textAlign='left';
  }
  ink.restore(); ink.globalAlpha=1; ink.letterSpacing='0px';
}
