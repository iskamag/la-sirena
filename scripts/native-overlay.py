"""Rasterize the actual JS graphic pass onto an EGL RGBA readback.

Uses the system Cairo and librsvg libraries. Fonts follow system substitution,
so text metrics can differ slightly from Chromium. RGBA input/output stays in
OpenGL's bottom-up row order, matching native-replay.py.
"""
import ctypes as ct
import numpy as np

C=ct.CDLL('libcairo.so.2');R=ct.CDLL('librsvg-2.so.2');G=ct.CDLL('libgobject-2.0.so.0')
P=ct.c_void_p;I=ct.c_int
def bind(lib,name,result,args):
    fn=getattr(lib,name);fn.restype=result;fn.argtypes=args;return fn
surface_create=bind(C,'cairo_image_surface_create_for_data',P,[P,I,I,I,I])
surface_destroy=bind(C,'cairo_surface_destroy',None,[P])
surface_flush=bind(C,'cairo_surface_flush',None,[P])
create=bind(C,'cairo_create',P,[P]);destroy=bind(C,'cairo_destroy',None,[P])
status=bind(C,'cairo_status',I,[P])
new=bind(R,'rsvg_handle_new_from_data',P,[P,ct.c_size_t,ct.POINTER(P)])
render=bind(R,'rsvg_handle_render_cairo',I,[P,P])
unref=bind(G,'g_object_unref',None,[P])

def overlay(rgba,width,height,svg):
    # GL's presented framebuffer is opaque; Cairo's ARGB32 is BGRA on this
    # little-endian host. Render directly into the reordered input pixels.
    pixels=np.frombuffer(rgba,dtype=np.uint8).reshape(height,width,4)
    bgra=np.ascontiguousarray(pixels[::-1,:, [2,1,0,3]])
    bgra[:,:,3]=255
    surface=surface_create(bgra.ctypes.data,0,width,height,width*4)
    ctx=create(surface);handle=None
    try:
        encoded=svg.encode();buffer=ct.create_string_buffer(encoded);error=P()
        handle=new(buffer,len(encoded),ct.byref(error))
        if not handle:raise RuntimeError('librsvg could not parse the procedural graphic pass')
        if not render(handle,ctx) or status(ctx):raise RuntimeError('Cairo could not render the procedural graphic pass')
        surface_flush(surface)
        return np.ascontiguousarray(bgra[::-1,:, [2,1,0,3]]).tobytes()
    finally:
        if handle:unref(handle)
        destroy(ctx);surface_destroy(surface)
