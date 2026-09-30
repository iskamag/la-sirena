#!/usr/bin/env python3
"""Replay app WebGL2 traces in legitimate surfaceless EGL/GLES3.

No browser, sockets or sandbox override. Compilation, linking, framebuffer
completeness and every GL call are checked against the actual GLES driver.
The output covers the world/layers/post graph and supplied film graphics via
SVG/Cairo. Browser controls and live audio behavior remain outside its scope.
"""
import argparse
import ctypes as ct
import json
import importlib.util
import os
from pathlib import Path
import struct
import sys
import time
import zlib

os.environ.setdefault('MESA_SHADER_CACHE_DIR', '/tmp/mus2-native-shader-cache')
EGL = ct.CDLL('libEGL.so.1')
GL = ct.CDLL('libGLESv2.so.2')
U, I, F, B, P = ct.c_uint, ct.c_int, ct.c_float, ct.c_ubyte, ct.c_void_p

def bind(lib, name, result, args):
    fn = getattr(lib, name); fn.restype = result; fn.argtypes = args
    return fn

egl_platform = bind(EGL, 'eglGetPlatformDisplay', P, [U,P,ct.POINTER(I)])
egl_initialize = bind(EGL, 'eglInitialize', U, [P,ct.POINTER(I),ct.POINTER(I)])
egl_api = bind(EGL, 'eglBindAPI', U, [U])
egl_choose = bind(EGL, 'eglChooseConfig', U, [P,ct.POINTER(I),ct.POINTER(P),I,ct.POINTER(I)])
egl_surface = bind(EGL, 'eglCreatePbufferSurface', P, [P,P,ct.POINTER(I)])
egl_context = bind(EGL, 'eglCreateContext', P, [P,P,P,ct.POINTER(I)])
egl_current = bind(EGL, 'eglMakeCurrent', U, [P,P,P,P])
egl_error = bind(EGL, 'eglGetError', U, [])
egl_terminate = bind(EGL, 'eglTerminate', U, [P])
gl_error = bind(GL, 'glGetError', U, [])
gl_string = bind(GL, 'glGetString', ct.c_char_p, [U])
gl_finish = bind(GL, 'glFinish', None, [])
gl_read = bind(GL, 'glReadPixels', None, [I,I,I,I,U,U,P])
gl_get_shader = bind(GL, 'glGetShaderiv', None, [U,U,ct.POINTER(I)])
gl_get_program = bind(GL, 'glGetProgramiv', None, [U,U,ct.POINTER(I)])
gl_shader_log = bind(GL, 'glGetShaderInfoLog', None, [U,I,ct.POINTER(I),P])
gl_program_log = bind(GL, 'glGetProgramInfoLog', None, [U,I,ct.POINTER(I),P])
gl_uniform_location = bind(GL, 'glGetUniformLocation', I, [U,ct.c_char_p])
gl_attribute_location = bind(GL, 'glGetAttribLocation', I, [U,ct.c_char_p])

def checked(ok, label):
    if not ok: raise RuntimeError(f'{label}: EGL 0x{egl_error():04x}')

def context(width, height):
    # Same setup as visual_worlds' verified mus2-egl-render.c.
    display = egl_platform(0x31DD, None, None)
    major, minor = I(), I()
    checked(egl_initialize(display, ct.byref(major), ct.byref(minor)), 'eglInitialize')
    checked(egl_api(0x30A0), 'eglBindAPI')
    attrs = (I*13)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
    config, count = P(), I()
    checked(egl_choose(display, attrs, ct.byref(config), 1, ct.byref(count)), 'eglChooseConfig')
    if not count.value: raise RuntimeError('No EGL ES3 pbuffer config')
    surface = egl_surface(display, config, (I*5)(0x3057,width,0x3056,height,0x3038))
    ctx = egl_context(display, config, None, (I*3)(0x3098,3,0x3038))
    checked(egl_current(display,surface,surface,ctx), 'eglMakeCurrent')
    return display, {'renderer':gl_string(0x1F01).decode(), 'version':gl_string(0x1F02).decode(), 'egl':f'{major.value}.{minor.value}'}

def png(path, rgba, width, height):
    stride=width*4
    scan=b''.join(b'\0'+rgba[y*stride:(y+1)*stride] for y in range(height-1,-1,-1))
    def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    payload=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(scan,3))+chunk(b'IEND',b'')
    path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(payload)

class Replay:
    def __init__(self):
        self.resources={}; self.locations={}; self.programs=0; self.shaders=0; self.draws=0
        self.simple={}
        signatures={
            'attachShader':[U,U], 'linkProgram':[U], 'compileShader':[U],
            'bindBuffer':[U,U], 'enableVertexAttribArray':[U], 'vertexAttribPointer':[U,I,U,B,I,P],
            'bindVertexArray':[U], 'activeTexture':[U], 'bindTexture':[U,U],
            'texParameteri':[U,U,I], 'bindFramebuffer':[U,U],
            'framebufferTexture2D':[U,U,U,U,I], 'viewport':[I,I,I,I],
            'blitFramebuffer':[I,I,I,I,I,I,I,I,U,U],
            'useProgram':[U], 'enable':[U], 'disable':[U], 'depthMask':[B],
            'blendFuncSeparate':[U,U,U,U], 'blendEquation':[U], 'blendEquationSeparate':[U,U],
            'uniform1f':[I,F], 'uniform1i':[I,I], 'uniform2f':[I,F,F],
            'drawArrays':[U,I,I], 'drawArraysInstanced':[U,I,I,I],
        }
        for op,args in signatures.items(): self.simple[op]=bind(GL,'gl'+op[0].upper()+op[1:],None,args)
        self.create_shader=bind(GL,'glCreateShader',U,[U]); self.create_program=bind(GL,'glCreateProgram',U,[])
        self.shader_source=bind(GL,'glShaderSource',None,[U,I,ct.POINTER(ct.c_char_p),ct.POINTER(I)])
        self.buffer_data=bind(GL,'glBufferData',None,[U,ct.c_ssize_t,P,U])
        self.tex_image=bind(GL,'glTexImage2D',None,[U,I,I,I,I,I,U,U,P])
        self.uniform2=bind(GL,'glUniform2fv',None,[I,I,ct.POINTER(F)])
        self.uniform4=bind(GL,'glUniform4fv',None,[I,I,ct.POINTER(F)])
        self.fbo_status=bind(GL,'glCheckFramebufferStatus',U,[U])

    def resolve(self,value):
        if value is None: return 0
        if not isinstance(value,dict): return value
        if 'resource' in value: return self.resources[value['resource']]
        for kind,fn in [('uniform',gl_uniform_location),('attribute',gl_attribute_location)]:
            if kind in value:
                key=(kind,value[kind],value['name'])
                if key not in self.locations: self.locations[key]=fn(self.resources[value[kind]],value['name'].encode())
                return self.locations[key]
        return value

    def log(self,object_id,shader):
        length=I(); (gl_get_shader if shader else gl_get_program)(object_id,0x8B84,ct.byref(length))
        buf=ct.create_string_buffer(max(length.value,1))
        (gl_shader_log if shader else gl_program_log)(object_id,len(buf),None,buf)
        return buf.value.decode(errors='replace')

    def calls(self,commands):
        for index,command in enumerate(commands):
            op=command['op']; args=[self.resolve(a) for a in command.get('args',[])]
            if op.startswith('create'):
                kind=op[6:]
                if kind=='Shader': result=self.create_shader(*args); self.shaders+=1
                elif kind=='Program': result=self.create_program(); self.programs+=1
                else:
                    plural={'VertexArray':'VertexArrays','Framebuffer':'Framebuffers','Texture':'Textures','Buffer':'Buffers'}[kind]
                    fn=bind(GL,'glGen'+plural,None,[I,ct.POINTER(U)]); result=U(); fn(1,ct.byref(result)); result=result.value
                self.resources[command['result']]=result
            elif op.startswith('delete'):
                kind=op[6:]
                if kind in ['Shader','Program']: bind(GL,'glDelete'+kind,None,[U])(*args)
                else:
                    plural={'VertexArray':'VertexArrays','Framebuffer':'Framebuffers','Texture':'Textures','Buffer':'Buffers'}[kind]
                    item=U(args[0]); bind(GL,'glDelete'+plural,None,[I,ct.POINTER(U)])(1,ct.byref(item))
            elif op=='shaderSource':
                text=args[1].encode(); source=ct.c_char_p(text); self.shader_source(args[0],1,ct.byref(source),None)
            elif op=='bufferData':
                data=args[1]; scalar=F if data['type']=='Float32Array' else B
                array=(scalar*len(data['data']))(*data['data']); self.buffer_data(args[0],ct.sizeof(array),array,args[2])
            elif op=='texImage2D':
                data=args[-1]; array=(B*len(data['data']))(*data['data']) if isinstance(data,dict) else None
                self.tex_image(*args[:-1],array)
            elif op in ['uniform2fv','uniform4fv']:
                values=args[1]['data'] if isinstance(args[1],dict) else args[1]
                array=(F*len(values))(*values); (self.uniform2 if op=='uniform2fv' else self.uniform4)(args[0],1,array)
            elif op=='checkFramebufferStatus':
                status=self.fbo_status(args[0])
                if status!=0x8CD5: raise RuntimeError(f'Framebuffer incomplete:0x{status:04x}')
            elif op in self.simple:
                self.simple[op](*args)
                if op=='compileShader':
                    okay=I(); gl_get_shader(args[0],0x8B81,ct.byref(okay))
                    if not okay.value: raise RuntimeError('Shader compilation: '+self.log(args[0],True))
                if op=='linkProgram':
                    okay=I(); gl_get_program(args[0],0x8B82,ct.byref(okay))
                    if not okay.value: raise RuntimeError('Program linking: '+self.log(args[0],False))
                if op.startswith('drawArrays'): self.draws+=1
            else: raise RuntimeError(f'Unsupported WebGL call:{op}')
            error=gl_error()
            if error: raise RuntimeError(f'GL 0x{error:04x} after command {index} {op}')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('trace'); parser.add_argument('--out',default='artifacts/native-qa')
    parser.add_argument('--raw',help='Concatenate top-down raw frames into this file (or - for stdout)')
    parser.add_argument('--raw-format',choices=['rgb24','bgra'],default='rgb24',help='Raw output pixel format; BGRA keeps the Cairo staging buffer')
    parser.add_argument('--pause-ms',type=float,default=0,help='Idle after every frame to keep the desktop responsive')
    options=parser.parse_args();
    if options.pause_ms<0: parser.error('pause-ms must be nonnegative')
    out=Path(options.out); out.mkdir(parents=True,exist_ok=True)
    report={'scope':'Exact GLES3 world + SecondaryLayers + Compositor, shared film graphics via SVG/Cairo when supplied; excludes browser controls/audio behavior','frames':[]}
    display=None; raw=None
    overlay_spec=importlib.util.spec_from_file_location('native_overlay',Path(__file__).with_name('native-overlay.py'))
    overlay_module=importlib.util.module_from_spec(overlay_spec); overlay_spec.loader.exec_module(overlay_module)
    try:
        with open(options.trace) as stream:
            init=json.loads(next(stream)); width,height=init['width'],init['height']
            display,info=context(width,height); report.update(info); report['width']=width; report['height']=height; report['sourceHashes']=init.get('sourceHashes')
            print(json.dumps({'context':info,'width':width,'height':height}),file=sys.stderr,flush=True)
            replay=Replay(); began=time.perf_counter(); replay.calls(init['commands']); gl_finish(); report['initializationSeconds']=time.perf_counter()-began
            raw=sys.stdout.buffer if options.raw=='-' else open(options.raw,'wb') if options.raw else None
            pixels=(B*(width*height*4))()
            for number,line in enumerate(stream):
                item=json.loads(line); began=time.perf_counter(); replay.calls(item['commands']); gl_finish()
                gl_read(0,0,width,height,0x1908,0x1401,pixels); error=gl_error()
                if error: raise RuntimeError(f'GL readback 0x{error:04x}')
                data=bytes(pixels); bgra=None
                if item.get('overlay'):
                    fused=bool(raw and options.raw_format=='bgra')
                    result=bytes(overlay_module.overlay(data,width,height,item['overlay'],'bgra' if fused else 'rgba'))
                    if len(result)!=width*height*4: raise RuntimeError('Overlay returned invalid RGBA/BGRA size')
                    if fused:bgra=result;data=None
                    else:data=result
                if raw and options.raw_format=='bgra' and bgra is None:
                    bgra=overlay_module.swap_red_blue_flip_rows(data,width,height).tobytes()
                path=out/item.get('name',f'frame-{number:05d}.png')
                if item.get('capture',True):
                    if data is None:data=overlay_module.swap_red_blue_flip_rows(bgra,width,height).tobytes()
                    png(path,data,width,height)
                if raw:
                    if options.raw_format=='bgra':raw.write(bgra)
                    else:
                        rows=[data[y*width*4:(y+1)*width*4] for y in range(height-1,-1,-1)]
                        rgba=b''.join(rows); rgb=bytearray(width*height*3)
                        rgb[0::3]=rgba[0::4];rgb[1::3]=rgba[1::4];rgb[2::3]=rgba[2::4];raw.write(rgb)
                stride=max(4,(width*height//5000)*4)
                if data is None:
                    # Preserve the original bottom-up sample positions and RGB
                    # operation order without copying the whole frame back.
                    offsets=((height-1-n//(width*4))*width*4+n%(width*4) for n in range(0,len(bgra),stride))
                    luminance=[bgra[n+2]*.2126+bgra[n+1]*.7152+bgra[n]*.0722 for n in offsets]
                else:luminance=[data[n]*.2126+data[n+1]*.7152+data[n+2]*.0722 for n in range(0,len(data),stride)]
                detail={'index':number,'time':item.get('time'),'state':item.get('state'),'path':str(path) if item.get('capture',True) else None,'renderSeconds':time.perf_counter()-began,'averageLuminance':sum(luminance)/len(luminance),'litFraction':sum(value>8 for value in luminance)/len(luminance),'overlay':bool(item.get('overlay')),'glError':error}
                report['frames'].append(detail)
                if item.get('capture',True) or number%30==0: print(json.dumps(detail),file=sys.stderr,flush=True)
                if options.pause_ms: time.sleep(options.pause_ms/1000)
            report['compiledPrograms']=replay.programs;report['compiledShaders']=replay.shaders;report['drawCalls']=replay.draws
    except Exception as error:
        report['failure']=str(error); raise
    finally:
        (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
        if raw and raw is not sys.stdout.buffer: raw.close()
        if display: egl_terminate(display)

if __name__=='__main__': main()
