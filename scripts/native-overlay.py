"""Rasterize the actual JS graphic pass onto an EGL RGBA readback.

Uses the system Cairo and librsvg libraries. Fonts follow system substitution,
so text metrics can differ slightly from Chromium. RGBA input/output stays in
OpenGL's bottom-up row order by default. Explicit BGRA output keeps Cairo's
top-down staging buffer for a fused native encoder handoff.
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

def swap_red_blue_flip_rows(data,width,height,opaque=False):
    """Convert bottom-up RGBA <-> top-down BGRA with one packed allocation."""
    source=np.frombuffer(data,dtype=np.uint8).reshape(height,width,4)
    packed=np.empty((height,width,4),dtype=np.uint8)
    packed[:,:,0]=source[::-1,:,2]
    packed[:,:,1]=source[::-1,:,1]
    packed[:,:,2]=source[::-1,:,0]
    packed[:,:,3]=255 if opaque else source[::-1,:,3]
    return packed

def overlay(rgba,width,height,svg,output_format='rgba'):
    if output_format not in ('rgba','bgra'):raise ValueError('Unsupported overlay output format')
    # GL's presented framebuffer is opaque; Cairo's ARGB32 is BGRA on this
    # little-endian host. Render directly into the reordered input pixels.
    bgra=swap_red_blue_flip_rows(rgba,width,height,opaque=True)
    surface=surface_create(bgra.ctypes.data,0,width,height,width*4)
    ctx=create(surface);handle=None
    try:
        encoded=svg.encode();buffer=ct.create_string_buffer(encoded);error=P()
        handle=new(buffer,len(encoded),ct.byref(error))
        if not handle:raise RuntimeError('librsvg could not parse the procedural graphic pass')
        if not render(handle,ctx) or status(ctx):raise RuntimeError('Cairo could not render the procedural graphic pass')
        surface_flush(surface)
        if output_format=='bgra':return bgra.tobytes()
        return swap_red_blue_flip_rows(bgra,width,height).tobytes()
    finally:
        if handle:unref(handle)
        destroy(ctx);surface_destroy(surface)
