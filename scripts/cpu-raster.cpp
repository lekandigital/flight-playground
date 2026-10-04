// Small offline triangle rasterizer for inspecting exact Three.js snapshots.
// No GPU/WebGL dependency. Input/output binary streams are produced by Python.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <limits>
#include <vector>
struct Texture { int w,h; std::vector<unsigned char> p; };
struct Triangle { float v[3][11]; float color[3],rough,metal,opacity,alpha; int tex,transparent,side,additive; };
template<class X> void read(X& x){if(fread(&x,sizeof(X),1,stdin)!=1)std::exit(2);}
float srgb(float c){return c<=.04045f?c/12.92f:std::pow((c+.055f)/1.055f,2.4f);}
float display(float c){c=std::clamp(c,0.f,1.f);return c<=.0031308f?c*12.92f:1.055f*std::pow(c,1.f/2.4f)-.055f;}
int main(){
 int w,h,nt,ntri;read(w);read(h);read(nt);read(ntri);
 std::vector<Texture> textures(nt);
 for(auto& t:textures){read(t.w);read(t.h);t.p.resize(t.w*t.h*4);if(fread(t.p.data(),1,t.p.size(),stdin)!=t.p.size())return 3;}
 std::vector<Triangle> tris(ntri);if(fread(tris.data(),sizeof(Triangle),ntri,stdin)!=(size_t)ntri)return 4;
 std::stable_sort(tris.begin(),tris.end(),[](const Triangle&a,const Triangle&b){if(a.transparent!=b.transparent)return a.transparent<b.transparent;return a.transparent&&(a.v[0][2]+a.v[1][2]+a.v[2][2])<(b.v[0][2]+b.v[1][2]+b.v[2][2]);});
 std::vector<float> rgb(w*h*3),depth(w*h,-std::numeric_limits<float>::infinity());
 for(int y=0;y<h;y++)for(int x=0;x<w;x++){float k=.88f-.05f*y/h;rgb[(y*w+x)*3]=k-.035f;rgb[(y*w+x)*3+1]=k;rgb[(y*w+x)*3+2]=k+.022f;}
 for(const auto&t:tris){
  auto p=t.v;float den=(p[1][1]-p[2][1])*(p[0][0]-p[2][0])+(p[2][0]-p[1][0])*(p[0][1]-p[2][1]);if(std::abs(den)<1e-6)continue;
  int x0=std::max(0,(int)std::floor(std::min({p[0][0],p[1][0],p[2][0]}))),x1=std::min(w-1,(int)std::ceil(std::max({p[0][0],p[1][0],p[2][0]})));
  int y0=std::max(0,(int)std::floor(std::min({p[0][1],p[1][1],p[2][1]}))),y1=std::min(h-1,(int)std::ceil(std::max({p[0][1],p[1][1],p[2][1]})));
  for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){
   float a=((p[1][1]-p[2][1])*(x+.5f-p[2][0])+(p[2][0]-p[1][0])*(y+.5f-p[2][1]))/den;
   float b=((p[2][1]-p[0][1])*(x+.5f-p[2][0])+(p[0][0]-p[2][0])*(y+.5f-p[2][1]))/den,c=1-a-b;if(a<0||b<0||c<0)continue;
   int pi=y*w+x;float z=a*p[0][2]+b*p[1][2]+c*p[2][2];if(z<depth[pi]-1e-5)continue;
   float col[3]={t.color[0],t.color[1],t.color[2]},alpha=t.opacity;
   if(t.tex>=0){auto&tx=textures[t.tex];float u=a*p[0][6]+b*p[1][6]+c*p[2][6],v=a*p[0][7]+b*p[1][7]+c*p[2][7];int xx=std::clamp((int)(u*tx.w),0,tx.w-1),yy=std::clamp((int)(v*tx.h),0,tx.h-1);auto sample=&tx.p[(yy*tx.w+xx)*4];for(int k=0;k<3;k++)col[k]*=srgb(sample[k]/255.f);alpha*=sample[3]/255.f;}
   if(alpha<std::max(t.alpha,.005f))continue;
   float n[3];for(int k=0;k<3;k++)n[k]=a*p[0][3+k]+b*p[1][3+k]+c*p[2][3+k];float len=std::sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);if(len>0)for(auto&k:n)k/=len;
   float light=.42f+.63f*std::max(0.f,-.3f*n[0]+.82f*n[1]+.47f*n[2]);
   for(int k=0;k<3;k++){col[k]*=a*p[0][8+k]+b*p[1][8+k]+c*p[2][8+k];col[k]=display(col[k]*light);if(t.additive)rgb[pi*3+k]=std::min(1.f,col[k]*alpha+rgb[pi*3+k]);else if(t.transparent)rgb[pi*3+k]=col[k]*alpha+rgb[pi*3+k]*(1-alpha);else rgb[pi*3+k]=col[k];}
   if(!t.transparent)depth[pi]=z;
  }
 }
 printf("P6\n%d %d\n255\n",w,h);std::vector<unsigned char> pixels(rgb.size());for(size_t i=0;i<rgb.size();i++)pixels[i]=(unsigned char)(std::clamp(rgb[i],0.f,1.f)*255);fwrite(pixels.data(),1,pixels.size(),stdout);
}
