// WebGL2 command recorder. Real compilation, linking, FBO checks and draws are
// performed by native-replay.py; the JS adapter only records the app's passes.
const C = {
  ARRAY_BUFFER:34962, STATIC_DRAW:35044, FLOAT:5126, TRIANGLES:4,
  VERTEX_SHADER:35633, FRAGMENT_SHADER:35632, COMPILE_STATUS:35713, LINK_STATUS:35714,
  TEXTURE_2D:3553, TEXTURE0:33984, TEXTURE4:33988, ACTIVE_TEXTURE:34016,
  TEXTURE_BINDING_2D:32873, TEXTURE_MIN_FILTER:10241, TEXTURE_MAG_FILTER:10240,
  TEXTURE_WRAP_S:10242, TEXTURE_WRAP_T:10243, LINEAR:9729, NEAREST:9728,
  CLAMP_TO_EDGE:33071, RGBA:6408, RGBA8:32856, UNSIGNED_BYTE:5121,
  FRAMEBUFFER:36160, READ_FRAMEBUFFER:36008, DRAW_FRAMEBUFFER:36009,
  FRAMEBUFFER_COMPLETE:36053, COLOR_ATTACHMENT0:36064, COLOR_BUFFER_BIT:16384,
  BLEND:3042, DEPTH_TEST:2929, CULL_FACE:2884, DEPTH_WRITEMASK:2930,
  CURRENT_PROGRAM:35725, VERTEX_ARRAY_BINDING:34229,
  BLEND_SRC_RGB:32969, BLEND_DST_RGB:32968, BLEND_SRC_ALPHA:32971,
  BLEND_DST_ALPHA:32970, BLEND_EQUATION_RGB:32777, BLEND_EQUATION_ALPHA:34877,
  FUNC_ADD:32774, ONE:1, ZERO:0, SRC_ALPHA:770, ONE_MINUS_SRC_ALPHA:771,
};
export function recordingGL(width, height) {
  let nextID = 1;
  const gl = { ...C, drawingBufferWidth:width, drawingBufferHeight:height, commands:[] };
  const parameters = new Map([
    [C.ACTIVE_TEXTURE,C.TEXTURE0], [C.CURRENT_PROGRAM,null], [C.VERTEX_ARRAY_BINDING,null],
    [C.DEPTH_WRITEMASK,true], [C.BLEND_SRC_RGB,1], [C.BLEND_DST_RGB,0],
    [C.BLEND_SRC_ALPHA,1], [C.BLEND_DST_ALPHA,0],
    [C.BLEND_EQUATION_RGB,C.FUNC_ADD], [C.BLEND_EQUATION_ALPHA,C.FUNC_ADD],
  ]);
  const enabled = new Set(), textures = new Map();
  const encode = value => {
    if (ArrayBuffer.isView(value)) return { data:[...value], type:value.constructor.name };
    if (Array.isArray(value)) return value.map(encode);
    return value;
  };
  const emit = (op, args=[], result=null) => gl.commands.push({ op, args:args.map(encode), ...(result ? { result } : {}) });
  for (const kind of ['Shader','Program','Buffer','VertexArray','Texture','Framebuffer']) {
    gl[`create${kind}`] = (...args) => { const object={ resource:nextID++,kind }; emit(`create${kind}`,args,object.resource); return object; };
    gl[`delete${kind}`] = (...args) => emit(`delete${kind}`,args);
  }
  gl.getUniformLocation = (program,name) => ({ uniform:program.resource,name });
  gl.getAttribLocation = (program,name) => ({ attribute:program.resource,name });
  gl.getShaderParameter = () => true; gl.getProgramParameter = () => true;
  gl.getShaderInfoLog = () => ''; gl.getProgramInfoLog = () => '';
  gl.isContextLost = () => false; gl.isEnabled = cap => enabled.has(cap);
  gl.getParameter = param => param === C.TEXTURE_BINDING_2D ? textures.get(parameters.get(C.ACTIVE_TEXTURE)) ?? null : parameters.get(param) ?? null;
  gl.checkFramebufferStatus = target => { emit('checkFramebufferStatus',[target]); return C.FRAMEBUFFER_COMPLETE; };
  gl.enable = cap => { enabled.add(cap); emit('enable',[cap]); };
  gl.disable = cap => { enabled.delete(cap); emit('disable',[cap]); };
  gl.useProgram = value => { parameters.set(C.CURRENT_PROGRAM,value); emit('useProgram',[value]); };
  gl.bindVertexArray = value => { parameters.set(C.VERTEX_ARRAY_BINDING,value); emit('bindVertexArray',[value]); };
  gl.activeTexture = value => { parameters.set(C.ACTIVE_TEXTURE,value); emit('activeTexture',[value]); };
  gl.bindTexture = (target,value) => { textures.set(parameters.get(C.ACTIVE_TEXTURE),value); emit('bindTexture',[target,value]); };
  gl.depthMask = value => { parameters.set(C.DEPTH_WRITEMASK,value); emit('depthMask',[value]); };
  gl.blendFuncSeparate = (...values) => { [C.BLEND_SRC_RGB,C.BLEND_DST_RGB,C.BLEND_SRC_ALPHA,C.BLEND_DST_ALPHA].forEach((key,i)=>parameters.set(key,values[i])); emit('blendFuncSeparate',values); };
  gl.blendEquation = value => { parameters.set(C.BLEND_EQUATION_RGB,value);parameters.set(C.BLEND_EQUATION_ALPHA,value);emit('blendEquation',[value]); };
  gl.blendEquationSeparate = (...values) => { parameters.set(C.BLEND_EQUATION_RGB,values[0]);parameters.set(C.BLEND_EQUATION_ALPHA,values[1]);emit('blendEquationSeparate',values); };
  for (const name of ['shaderSource','compileShader','attachShader','linkProgram','bindBuffer','bufferData','enableVertexAttribArray','vertexAttribPointer','texParameteri','texImage2D','bindFramebuffer','framebufferTexture2D','viewport','blitFramebuffer','uniform1f','uniform1i','uniform2f','uniform2fv','uniform4fv','drawArrays','drawArraysInstanced']) gl[name] = (...args) => emit(name,args);
  return gl;
}
