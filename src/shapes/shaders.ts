/**
 * GLSL ES 1.0 fragment shaders for the WebGL candidates. Each candidate ships only
 * HEAD + its own body; output is premultiplied alpha so the shape composites over
 * any section background. Tone K: 0 paper, 1 dark, 2 cobalt.
 */
export const HEAD = `precision highp float;
uniform vec2 R;uniform float T;uniform float K;
vec3 film(float x){return .5+.5*cos(6.2832*(x+vec3(0.,.33,.67)));}
vec3 shade(vec3 n,vec3 rd){
vec3 l=normalize(vec3(-.5,.7,.6));
float dif=max(dot(n,l),0.),fr=pow(1.-max(dot(n,-rd),0.),2.2),sp=pow(max(dot(reflect(rd,n),l),0.),36.);
vec3 b=K<.5?vec3(.18,.29,1.):K<1.5?vec3(.42,.5,1.):vec3(.86,.89,1.);
vec3 ir=film(fr*1.25+n.y*.3+n.x*.15+T*.05);
return b*(.22+.78*dif)+mix(ir,ir*ir,.3)*fr*1.05+sp*.9;}
`;

// Shared raymarch tail: bounding sphere B, map() supplied by the body.
const MARCH = `
void main(){
vec2 uv=(2.*gl_FragCoord.xy-R)/min(R.x,R.y);
vec3 ro=vec3(0,0,2.3),rd=normalize(vec3(uv,-2.2));
float b=dot(ro,rd),h=b*b-dot(ro,ro)+BR*BR;
if(h<0.){gl_FragColor=vec4(0);return;}
float t=-b-sqrt(h),te=-b+sqrt(h),dm=9.,tm=t,px=1.2/min(R.x,R.y);
for(int i=0;i<72;i++){float d=map(ro+rd*t);if(d<dm){dm=d;tm=t;}if(d<.0007||t>te)break;t+=d*.85;}
float a=clamp(1.-dm/(px*tm),0.,1.);
if(a<=0.){gl_FragColor=vec4(0);return;}
vec3 p=ro+rd*tm;vec2 e=vec2(.004,0);
vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
gl_FragColor=vec4(shade(n,rd)*a,a);}`;

export const BLOB = `#define BR 1.05
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float map(vec3 p){float t=T*.55;
float d=length(p-vec3(sin(t)*.25,cos(t*.8)*.18,0.))-.46;
d=smin(d,length(p-vec3(cos(t*.7)*.36,sin(t*1.1)*.3,sin(t*.5)*.2))-.3,.32);
d=smin(d,length(p-vec3(sin(t*1.3+2.)*.34,-cos(t*.6)*.34,cos(t*.9)*.2))-.27,.32);
return d+.012*sin(p.x*7.+t*2.)*sin(p.y*6.-t)*sin(p.z*5.+t);}
${MARCH}`;

export const TORUS = `#define BR 1.
float map(vec3 p){
float c=cos(1.05),s=sin(1.05);p.yz=mat2(c,-s,s,c)*p.yz;
c=cos(T*.35);s=sin(T*.35);p.xy=mat2(c,-s,s,c)*p.xy;
float a=atan(p.z,p.x);
return (length(vec2(length(p.xz)-.6,p.y))-.19-.03*sin(a*5.+T*1.4))*.8;}
${MARCH}`;

export const RIBBON = `
void main(){
vec2 uv=(2.*gl_FragCoord.xy-R)/min(R.x,R.y);
float px=2./min(R.x,R.y);vec4 o=vec4(0);
for(int k=0;k<3;k++){float f=float(k);
float x=uv.x,y0=.42*sin(x*1.5+T*.4+f*2.1)*.8+(f-1.)*.16;
float ph=x*2.4-T*.6+f*1.3,cp=cos(ph),hw=.15*abs(cp)+.012;
float d=uv.y-y0,ed=hw-abs(d);
if(ed<-px)continue;
float s=d/hw;
vec3 n=normalize(vec3(-.35*cos(x*1.5+T*.4+f*2.1),-sin(ph)*sign(cp)+s*.25,abs(cp)+.05));
float a=clamp(ed/px+.5,0.,1.)*smoothstep(.92,.4,abs(x));
vec3 c=shade(n,vec3(0,0,-1))+film(s*.18+x*.12+f*.2+T*.03)*.18;
o=vec4(c*a,a)+o*(1.-a);}
gl_FragColor=o;}`;
