// Guard only periodic cathedral windows/spokes. Other bodies retain the original
// miss-guide heuristic; this is not an all-scene no-hit certificate.
export const windowGuideGLSL = `
bool windowGuideSlab(float a,float v,float center,float extent,inout vec2 interval) {
    float delta=a-center;
    if(v==0.0) return abs(delta)<=extent;
    vec2 t=vec2(-extent-delta,extent-delta)/v;
    interval.x=max(interval.x,min(t.x,t.y));
    interval.y=min(interval.y,max(t.x,t.y));
    return interval.x<=interval.y;
}
bool windowGuideClear(vec3 ro,vec3 rd,float lens,vec2 fullSize,vec2 guideSize) {
    if(!(u_time>=136.100&&u_time<170.125&&u_motion>=0.0&&u_motion<=1.0
        &&u_beat>=0.0&&u_beat<=1.0&&u_density>=0.0&&u_density<=1.0
        &&lens>=1.0&&lens<=2.0&&all(greaterThanEqual(fullSize,vec2(1)))
        &&all(greaterThanEqual(guideSize,vec2(1)))&&all(lessThanEqual(abs(ro),vec3(64)))
        &&dot(rd,rd)>=.999&&dot(rd,rd)<=1.001)) return false;
    if(density()<=.01) return true;
    float scale=1.0+.06*pulse()*u_motion;
    float tube=32.0*.5*length(fullSize/guideSize)/(fullSize.y*lens)*max(1.0,scale);
    float padding=tube+.006+.0002;
    vec3 a=vec3(ro.x*scale,ro.y,ro.z+templeTravel()),v=vec3(rd.x*scale,rd.y,rd.z);
    if(!(all(lessThanEqual(abs(a),vec3(256)))&&tube<=.5)) return false;
    for(int sideIndex=0;sideIndex<2;sideIndex++) {
        vec2 interval=vec2(.05,32.0);
        float side=float(sideIndex)*2.0-1.0;
        if(!windowGuideSlab(a.x,v.x,side*2.20,.024+padding,interval)) continue;
        if(!windowGuideSlab(a.y,v.y,.27,.594+padding,interval)) continue;
        vec2 z=a.z+v.z*interval;
        float first=ceil((min(z.x,z.y)-.594-padding)/4.2);
        float last=floor((max(z.x,z.y)+.594+padding)/4.2);
        if(first<=last) return false;
    }
    return true;
}
`;
