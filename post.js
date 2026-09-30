// A real multipass compositor: bright extraction, two bloom passes, restrained
// temporal echoes, lens dispersion and a final colour grade.
const vertex = `#version 300 es
layout(location=0) in vec2 a_position;
out vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const header = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform vec2 u_size;
`;
const extract = header + `
void main(){
 vec2 p=1./u_size;
 vec3 c=(texture(u_image,v_uv+vec2(-p.x,-p.y)).rgb+texture(u_image,v_uv+vec2(p.x,-p.y)).rgb+texture(u_image,v_uv+vec2(-p.x,p.y)).rgb+texture(u_image,v_uv+p).rgb)*.25;
 float light=max(c.r,max(c.g,c.b));
 float gate=smoothstep(.30,.76,light);
 fragColor=vec4(c*gate,1.);
}`;
const blur = header + `
uniform vec2 u_direction;
void main(){
 vec2 d=u_direction/u_size;
 vec3 c=texture(u_image,v_uv).rgb*.227027;
 c+=(texture(u_image,v_uv+d*1.384615).rgb+texture(u_image,v_uv-d*1.384615).rgb)*.316216;
 c+=(texture(u_image,v_uv+d*3.230769).rgb+texture(u_image,v_uv-d*3.230769).rgb)*.070270;
 fragColor=vec4(c,1.);
}`;
const composite = header + `
uniform sampler2D u_bloom;
uniform sampler2D u_history;
uniform float u_time;
uniform float u_beat;
uniform float u_motion;
uniform float u_poster;
uniform float u_cut;
uniform float u_historyWeight;
uniform float u_scene;
uniform vec4 u_energy;
uniform vec4 u_event;
uniform vec4 u_audio;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 vec2 q=v_uv, p=q-.5;
 float transient=pow(u_beat,3.)*u_motion;
 float cut=pow(max(0.,1.-u_cut/.22),3.)*u_motion;
 float poster=1.-u_poster;
 float shadowFilm=1.-step(.4,abs(u_scene-9.));
 float arcade=step(9.5,u_scene);
 float cathedral=1.-step(.4,abs(u_scene-3.));
 float effectWeight=step(.4,abs(u_scene-2.))*poster*u_motion;
 // A travelling refractive pressure front follows each kick. The roof breach
 // sends a separate expanding front, then leaves the changed world intact.
 float radius=length(p*vec2(u_size.x/u_size.y,1.));
 float kickFront=exp(-pow((radius-(.06+fract(u_audio.w)*1.1))/.045,2.));
 float breachAge=max(0.,u_event.y);
 float breach=cathedral*step(0.,u_event.y)*(1.-smoothstep(.75,1.9,breachAge));
 float breachFront=exp(-pow((radius-breachAge*.68)/.08,2.))*breach;
 vec2 radial=p/max(.02,length(p));
 q+=radial*(kickFront*u_audio.y*.0018+breachFront*.011)*effectWeight;
 // Brief prismatic lens breaks stay local; the scene remains readable.
 float stripe=step(.992,hash(vec2(floor(q.y*64.),floor(u_time*24.))));
 q.x+=stripe*cut*.018*poster;
 float lens=(.0009+.0020*transient+.0032*cut+.0025*breachFront+.0011*u_audio.z*effectWeight)*poster;
 vec2 dispersion=normalize(p+vec2(.0001))*lens*length(p)*1.5;
 vec3 c=vec3(texture(u_image,q+dispersion).r,texture(u_image,q).g,texture(u_image,q-dispersion).b);
 vec3 bloom=texture(u_bloom,q).rgb;
 c+=bloom*(.34+.26*u_energy.z+.22*transient+.09*u_audio.x*effectWeight)*(1.-u_poster*.28);
 // The bonus route has its own phosphor cadence and stepped lens edges.
 float scan=.5+.5*sin(q.y*u_size.y*3.14159265);
 c*=1.-arcade*.026*scan;
 // A few luminous traces persist during dance passages, not the shadows.
 vec2 echoUV=.5+(q-.5)*(1.+.008*u_motion);
 echoUV+=vec2(sin(u_time*.21),cos(u_time*.17))*.0012*u_motion;
 vec3 echo=texture(u_history,echoUV).rgb;
 float echoGate=smoothstep(.25,.9,max(echo.r,max(echo.g,echo.b)));
 float preserveShadow=smoothstep(.025,.13,dot(c,vec3(.2126,.7152,.0722)));
 c=mix(c,max(c,echo*.88),u_historyWeight*echoGate*preserveShadow);
 // Chromatic print grain breathes inside the dark midtones. The large moving
 // envelope gives the noise a composition instead of covering every pixel.
 vec2 grainUV=floor(q*u_size/1.7);
 float grainTime=floor(u_time*(6.+6.*u_motion));
 vec3 grain=vec3(hash(grainUV+grainTime*vec2(7,13)),hash(grainUV+grainTime*vec2(19,3)+41.),hash(grainUV+grainTime*vec2(5,23)+97.))-.5;
 float envelope=noise(q*vec2(8.,5.)+vec2(u_time*.09,-u_time*.065));
 float darkPrint=smoothstep(.005,.05,max(c.r,max(c.g,c.b)))*(1.-smoothstep(.22,.65,max(c.r,max(c.g,c.b))));
 c+=grain*(.007+shadowFilm*.042)*(.30+.70*envelope)*darkPrint;
 float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(l),c,1.10);
 c=(c-.055)*1.065+.055;
 c+=vec3(.002,.004,.011)*(1.-smoothstep(.1,.55,l));
 c=max(c,vec3(0.));
 c*=1.-.10*smoothstep(.24,.82,length(p));
 // Preserve the folds of chrome and glass even under a strong transient bloom.
 vec3 high=max(c-vec3(.74),vec3(0.));
 c=min(c,vec3(.74))+high/(1.+high*2.8);
 fragColor=vec4(clamp(c,0.,1.),1.);
}`;
const present = header + `void main(){fragColor=vec4(texture(u_image,v_uv).rgb,1.);}`;

export class Compositor {
  constructor(gl) {
    this.gl=gl;this.targets=[];this.lastTime=-100;this.lastScene=-1;this.historyReady=false;this.historyIndex=0;
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    this.programs=[extract,blur,composite,present].map(source=>this.program(source));
    gl.bindVertexArray(null);
  }
  program(fragment) {
    const gl=this.gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const p=gl.createProgram(),v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    const names=['image','size','direction','bloom','history','time','beat','motion','poster','cut','historyWeight','scene','energy','event','audio'];
    return{program:p,uniforms:Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(p,`u_${n}`)]))};
  }
  target(width,height) {
    const gl=this.gl,t={width,height,texture:gl.createTexture(),framebuffer:gl.createFramebuffer()};
    gl.bindTexture(gl.TEXTURE_2D,t.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,t.framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t.texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('The visual compositor could not allocate its render targets.');
    this.targets.push(t);return t;
  }
  resize(width,height) {
    if(this.width===width&&this.height===height)return;
    const gl=this.gl;this.targets.forEach(t=>{gl.deleteFramebuffer(t.framebuffer);gl.deleteTexture(t.texture);});this.targets=[];this.width=width;this.height=height;
    this.scene=this.target(width,height);this.depthCopy=this.target(width,height);this.bright=this.target(Math.max(1,Math.ceil(width/2)),Math.max(1,Math.ceil(height/2)));this.blurA=this.target(Math.max(1,Math.ceil(width/4)),Math.max(1,Math.ceil(height/4)));this.blurB=this.target(this.blurA.width,this.blurA.height);this.history=[this.target(width,height),this.target(width,height)];this.historyReady=false;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);
  }
  begin() {
    const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,this.scene.framebuffer);gl.viewport(0,0,this.width,this.height);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  }
  captureDepth(){const gl=this.gl;gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.scene.framebuffer);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.depthCopy.framebuffer);gl.blitFramebuffer(0,0,this.width,this.height,0,0,this.width,this.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,this.scene.framebuffer);return this.depthCopy.texture;}
  texture(unit,texture,location){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(location,unit);}
  pass(which,target,input,direction=null) {
    const gl=this.gl,{program,uniforms:u}=this.programs[which];gl.bindFramebuffer(gl.FRAMEBUFFER,target?.framebuffer||null);gl.viewport(0,0,target?.width||this.width,target?.height||this.height);gl.useProgram(program);gl.bindVertexArray(this.vao);this.texture(0,input.texture,u.image);gl.uniform2f(u.size,input.width,input.height);if(direction)gl.uniform2fv(u.direction,direction);gl.drawArrays(gl.TRIANGLES,0,3);
  }
  finish(frame) {
    const gl=this.gl;gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    this.pass(0,this.bright,this.scene);this.pass(1,this.blurA,this.bright,[2.5,0]);this.pass(1,this.blurB,this.blurA,[0,1.9]);
    const target=this.history[this.historyIndex],previous=this.history[1-this.historyIndex];
    const {program,uniforms:u}=this.programs[2];gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);gl.viewport(0,0,this.width,this.height);gl.useProgram(program);gl.bindVertexArray(this.vao);
    this.texture(0,this.scene.texture,u.image);this.texture(1,this.blurB.texture,u.bloom);this.texture(2,previous.texture,u.history);
    gl.uniform2f(u.size,this.width,this.height);gl.uniform1f(u.time,frame.time);gl.uniform1f(u.beat,frame.beat);gl.uniform1f(u.motion,frame.motion);gl.uniform1f(u.poster,frame.poster);gl.uniform1f(u.cut,frame.cutAge??10);gl.uniform1f(u.scene,frame.scene);gl.uniform4fv(u.energy,frame.energy);gl.uniform4fv(u.event,frame.event??[0,-1,0,0]);gl.uniform4fv(u.audio,frame.audio??[0,0,0,0]);
    const delta=frame.time-this.lastTime;const continuity=this.historyReady&&delta>0&&delta<.2&&frame.scene===this.lastScene;
    gl.uniform1f(u.historyWeight,continuity&&!frame.poster?(.16+.24*frame.energy[2])*frame.motion:0);gl.drawArrays(gl.TRIANGLES,0,3);
    this.pass(3,null,target);this.historyIndex=1-this.historyIndex;this.historyReady=true;this.lastTime=frame.time;this.lastScene=frame.scene;
    gl.activeTexture(gl.TEXTURE0);gl.bindVertexArray(null);
  }
  dispose(){const gl=this.gl;this.targets.forEach(t=>{gl.deleteFramebuffer(t.framebuffer);gl.deleteTexture(t.texture);});this.programs.forEach(p=>gl.deleteProgram(p.program));gl.deleteBuffer(this.buffer);gl.deleteVertexArray(this.vao);}
}
