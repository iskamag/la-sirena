import {drawFilmGraphics} from '../graphics.js';

const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const n=x=>Number(x.toFixed(4));
function color(value){
  const match=String(value).match(/^rgba?\(([^)]+)\)$/);
  if(!match)return {value,alpha:1};
  const c=match[1].split(',').map(Number);
  return {value:`rgb(${c.slice(0,3).join(',')})`,alpha:c[3]??1};
}

// The production Canvas2D pass executes unchanged. Only its drawing backend
// differs, producing vector commands for librsvg rather than a browser canvas.
export class SVGCanvas {
  constructor(width,height){
    this.width=width;this.height=height;this.elements=[];this.defs=[];this.stack=[];this.id=0;this.path='';
    this.state={fillStyle:'#000',strokeStyle:'#000',globalAlpha:1,lineWidth:1,font:'10px sans-serif',letterSpacing:'0px',textAlign:'left',textBaseline:'alphabetic',x:0,y:0,clip:null};
  }
  save(){this.stack.push({...this.state});}
  restore(){this.state=this.stack.pop()??this.state;}
  translate(x,y){this.state.x+=x;this.state.y+=y;}
  clearRect(){this.elements=[];}
  createLinearGradient(x1,y1,x2,y2){
    const gradient={id:`gradient${++this.id}`,x1,y1,x2,y2,stops:[],addColorStop(offset,value){this.stops.push({offset,...color(value)});}};
    this.defs.push(gradient);return gradient;
  }
  attrs(paint){
    const s=this.state,value=s[paint==='fill'?'fillStyle':'strokeStyle'];
    const c=typeof value==='object'?{value:`url(#${value.id})`,alpha:1}:color(value);
    return `${paint}="${escape(c.value)}" ${paint}-opacity="${n(c.alpha)}" opacity="${n(s.globalAlpha)}" ${paint==='stroke'?`fill="none" stroke-width="${n(s.lineWidth)}"`:''} transform="translate(${n(s.x)} ${n(s.y)})" ${s.clip?`clip-path="url(#${s.clip})"`:''}`;
  }
  fillRect(x,y,width,height){if(width>0&&height>0)this.elements.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" ${this.attrs('fill')}/>`);}
  strokeRect(x,y,width,height){this.elements.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" ${this.attrs('stroke')}/>`);}
  beginPath(){this.path='';this.current=null;}
  moveTo(x,y){this.path+=`M${n(x)} ${n(y)} `;this.current=[x,y];}
  lineTo(x,y){this.path+=`L${n(x)} ${n(y)} `;this.current=[x,y];}
  rect(x,y,w,h){this.path+=`M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}z `;this.current=[x,y];}
  arc(x,y,r,start,end,anticlockwise=false){
    const sx=x+Math.cos(start)*r,sy=y+Math.sin(start)*r,ex=x+Math.cos(end)*r,ey=y+Math.sin(end)*r;
    if(this.current)this.lineTo(sx,sy);else this.moveTo(sx,sy);
    const span=Math.abs(end-start),large=span>Math.PI?1:0,sweep=anticlockwise?0:1;
    this.path+=`A${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(ex)} ${n(ey)} `;this.current=[ex,ey];
  }
  stroke(){this.elements.push(`<path d="${this.path}" ${this.attrs('stroke')}/>`);}
  fill(){this.elements.push(`<path d="${this.path}" ${this.attrs('fill')}/>`);}
  clip(){const id=`clip${++this.id}`;this.defs.push(`<clipPath id="${id}"><path d="${this.path}"/></clipPath>`);this.state.clip=id;}
  text(value,x,y,paint){
    const s=this.state,font=s.font.match(/([\d.]+)px\s+(.+)$/),size=font?.[1]??10,family=font?.[2]??'sans-serif';
    const weight=s.font.startsWith('900')?'900':s.font.startsWith('bold')?'bold':'normal';
    const anchor=s.textAlign==='center'?'middle':s.textAlign==='right'?'end':'start';
    this.elements.push(`<text x="${n(x)}" y="${n(y)}" font-family="${escape(family)}" font-size="${size}" font-weight="${weight}" letter-spacing="${escape(s.letterSpacing)}" text-anchor="${anchor}" ${this.attrs(paint)}>${escape(value)}</text>`);
  }
  fillText(value,x,y){this.text(value,x,y,'fill');}
  strokeText(value,x,y){this.text(value,x,y,'stroke');}
  svg(){
    const defs=this.defs.map(d=>typeof d==='string'?d:`<linearGradient id="${d.id}" gradientUnits="userSpaceOnUse" x1="${n(d.x1)}" y1="${n(d.y1)}" x2="${n(d.x2)}" y2="${n(d.y2)}">${d.stops.map(s=>`<stop offset="${s.offset}" stop-color="${s.value}" stop-opacity="${s.alpha}"/>`).join('')}</linearGradient>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}"><defs>${defs}</defs>${this.elements.join('')}</svg>`;
  }
}
for(const name of ['fillStyle','strokeStyle','globalAlpha','lineWidth','font','letterSpacing','textAlign','textBaseline'])Object.defineProperty(SVGCanvas.prototype,name,{get(){return this.state[name];},set(value){this.state[name]=value;}});

export function filmSVG(analysis,scored,width,height){
  const ink=new SVGCanvas(width,height);
  drawFilmGraphics(ink,{t:scored.frame.time,chapter:scored.chapter,music:scored.music,frame:scored.frame,analysis,width,height,started:!scored.frame.poster,motion:scored.frame.motion});
  return ink.svg();
}
