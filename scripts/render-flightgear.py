"""Render snapshot-flightgear output offline. Requires numpy, Pillow and g++."""
import gzip, io, json, struct, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(sys.argv[1]);AIRCRAFT=sys.argv[2] if len(sys.argv)>2 else None
EXE=OUT/'cpu-raster'
if not EXE.exists() or EXE.stat().st_mtime < (ROOT/'scripts/cpu-raster.cpp').stat().st_mtime:subprocess.run(['g++','-O3','-std=c++17',str(ROOT/'scripts/cpu-raster.cpp'),'-o',str(EXE)],check=True)
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
TITLE=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24)
DT=np.dtype([('v','<f4',(3,11)),('color','<f4',(3,)),('rough','<f4'),('metal','<f4'),('opacity','<f4'),('alpha','<f4'),('tex','<i4'),('transparent','<i4'),('side','<i4'),('additive','<i4')],align=False)

def images_for(id):
 b=(ROOT/'dist/flightgear'/id/'model.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);data=b[28+n:];result={}
 for im in j.get('images',[]):
  bv=j['bufferViews'][im['bufferView']];result[im.get('name','')]=Image.open(io.BytesIO(data[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGBA')
 return result

def render(id,geometries,pose,w,h,images):
 d=np.array(pose['direction'],float);d/=np.linalg.norm(d);right=np.cross([0,1,0],d);right/=np.linalg.norm(right);up=np.cross(d,right)
 items=[];allv=[]
 for m in pose['meshes']:
  g=geometries[m['geometry']];tr=np.array(m['matrix']).reshape(4,4).T;v=np.array(g['positions']).reshape(-1,3);v=(np.c_[v,np.ones(len(v))]@tr.T)[:,:3];items.append((m,g,tr,v))
  if not m['effect']:allv.append(v)
 allv=np.concatenate(allv);project=np.stack([allv@right,allv@up],-1);lo,hi=project.min(0),project.max(0);scale=min((w-70)/(hi[0]-lo[0]),(h-100)/(hi[1]-lo[1]));center=(lo+hi)/2
 textures=[];texids={};triangles=[]
 for m,g,tr,v in items:
  # Source effect flames can extend beyond the aircraft; scale is based on
  # physical geometry, never those effects.
  p=np.stack([(v@right-center[0])*scale+w/2,h/2+20-(v@up-center[1])*scale,v@d],-1)
  idx=np.array(g['indices']).reshape(-1,3);normal=np.array(g['normals']).reshape(-1,3) if g['normals'] else np.zeros_like(v)
  normal=normal@np.linalg.inv(tr[:3,:3]);uv=np.array(g['uvs']).reshape(-1,2)if g['uvs']else np.zeros((len(v),2));vc=np.array(g['colors']).reshape(-1,3)if g['colors']else np.ones_like(v)
  group=np.zeros(len(idx),int)
  for gr in g['groups']:group[gr['start']//3:(gr['start']+gr['count'])//3]=min(gr['materialIndex'],len(m['materials'])-1)
  for mi,mat in enumerate(m['materials']):
   ids=idx[group==mi];wn=np.cross(v[ids[:,1]]-v[ids[:,0]],v[ids[:,2]]-v[ids[:,0]])*np.sign(np.linalg.det(tr[:3,:3]));facing=wn@d
   if mat['side']==0:ids=ids[facing>0]
   elif mat['side']==1:ids=ids[facing<0]
   if not len(ids):continue
   arr=np.zeros(len(ids),dtype=DT);values=np.c_[p,normal,uv,vc if mat.get('vertexColors')else np.ones_like(v)];arr['v']=values[ids];arr['color']=mat['color'];arr['rough']=mat['roughness'];arr['metal']=mat['metalness'];arr['opacity']=mat['opacity'];arr['alpha']=mat['alphaTest'];arr['transparent']=mat['transparent'];arr['side']=mat['side'];arr['additive']=mat.get('additive',False);arr['tex']=-1
   name=mat.get('map')
   if name and g['uvs']:
    if name not in images and name.startswith('/flightgear/'):
     images[name]=Image.open(ROOT/'dist'/name.lstrip('/')).convert('RGBA')
    if name in images:
     if name not in texids:texids[name]=len(textures);textures.append(images[name])
     arr['tex']=texids[name]
   triangles.append(arr)
 triangles=np.concatenate(triangles)
 stream=io.BytesIO();stream.write(struct.pack('<iiii',w,h,len(textures),len(triangles)))
 for tex in textures:stream.write(struct.pack('<ii',tex.width,tex.height));stream.write(tex.tobytes())
 stream.write(triangles.tobytes());result=subprocess.run([str(EXE)],input=stream.getvalue(),capture_output=True,check=True)
 image=Image.open(io.BytesIO(result.stdout)).convert('RGB');draw=ImageDraw.Draw(image);draw.text((22,18),id.upper()+'  |  '+pose['label'],font=FONT,fill='#213e51')
 if pose['parked']:draw.text((22,h-30),'Parked pitch: '+str(round(abs(np.arcsin(np.array(pose['meshes'][0]['matrix']).reshape(4,4).T[1,0]))*180/np.pi,2))+'°  ·  FDM contact ground',font=FONT,fill='#506775')
 return image

for id in ([AIRCRAFT]if AIRCRAFT else ['p51d','p51davinci','mustangiii','mig29']):
 obj=json.load(gzip.open(OUT/(id+'-snapshots.json.gz')));images=images_for(id);folder=OUT/id;folder.mkdir(exist_ok=True);thumbs=[]
 for i,pose in enumerate(obj['poses']):
  im=render(id,obj['geometries'],pose,1000 if i<4 else 480,720 if i<4 else 350,images);target=folder/(str(i).zfill(2)+'.png');temporary=target.with_suffix('.tmp.png');im.save(temporary);Image.open(temporary).verify();temporary.replace(target)
  thumb=im.copy();thumb.thumbnail((480,350));panel=Image.new('RGB',(480,350),'#d3dfe4');panel.paste(thumb,((480-thumb.width)//2,(350-thumb.height)//2));thumbs.append(panel)
 sheet=Image.new('RGB',(1920,80+350*((len(thumbs)+3)//4)),'#e0e8ec');draw=ImageDraw.Draw(sheet);draw.text((24,20),id.upper()+' · Parked, flight, every configured channel extreme and gear sequence',font=TITLE,fill='#203e52')
 for i,im in enumerate(thumbs):sheet.paste(im,((i%4)*480,80+(i//4)*350))
 target=OUT/(id+'-all-states.png');temporary=target.with_suffix('.tmp.png');sheet.save(temporary);Image.open(temporary).verify();temporary.replace(target);print(id,len(thumbs),'offline poses rendered',flush=True)
