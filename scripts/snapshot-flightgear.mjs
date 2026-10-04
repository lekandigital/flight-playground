import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as T from 'three';
import {fixtures,loadFixture,meshBounds} from './flightgear-fixtures.mjs';

const output=path.resolve(process.argv[2]||'flightgear-inspection');fs.mkdirSync(output,{recursive:true});
for(const [id,prepare]of fixtures){
 const {rig}=await loadFixture(id,prepare),geometries={},poses=[];
 for(const m of rig.meshes){
  const g=m.geometry;if(geometries[g.uuid])continue;
  const read=(name,n)=>{const a=g.attributes[name];return a?Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,k)=>a.getComponent(i,k))).flat():[];};
  geometries[g.uuid]={positions:read('position',3),normals:read('normal',3),uvs:read('uv',2),colors:read('color',3),indices:g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),groups:g.groups};
 }
 const states=[['Parked',rig.preset(true),true,[-9,4,13]],['Flight',rig.preset(false),false,[-9,4,13]],['Side / parked',rig.preset(true),true,[0,2,15]],['Underside / flight',rig.preset(false),false,[-5,-8,12]]];
 for(const key of rig.fields){
  for(const value of rig.signedFields.includes(key)?[-1,1]:[0,1]){
   const base=rig.preset(true);if(key==='gear'||key==='engine'){base.groundIntakes=0;}
   const direction=/flaps|aileron|elevator|rudder|speedbrake|slats|Trim/.test(key)?[6,4,14]:/gear|compression|wheel/.test(key)?[-8,2,13]:[-9,4,13];
   states.push([key+' = '+value,{...base,[key]:value},false,direction]);
  }
 }
 for(const value of [.15,.33,.4,.67])states.push(['Gear sequence '+value,{...rig.preset(false),gear:value,engine:.6},false,[-8,-3,13]]);
 if(id==='mig29')states.push(['Combined taileron pitch + roll',{...rig.preset(false),aileron:1,elevator:1,engine:1},false,[6,4,14]]);
 for(const [label,state,parked,direction]of states){
  rig.configure(state);rig.root.rotation.set(0,0,parked?-rig.groundPitch:0);rig.root.position.set(0,0,0);rig.root.updateMatrixWorld(true);
  if(parked){const ys=rig.groundContacts.map(v=>v.clone().applyMatrix4(rig.root.matrixWorld).y);rig.root.position.y=-ys.reduce((a,b)=>a+b,0)/ys.length;rig.root.updateMatrixWorld(true);}
  const meshes=[];const physical=new T.Box3();
  for(const m of rig.meshes){if(!m.visible)continue;
   if(!m.userData.nonPhysicalEffect)physical.union(meshBounds(m,m.matrixWorld));
   meshes.push({name:m.name,geometry:m.geometry.uuid,matrix:m.matrixWorld.toArray(),effect:!!m.userData.nonPhysicalEffect,materials:(Array.isArray(m.material)?m.material:[m.material]).map(mat=>({color:mat.color.toArray(),roughness:mat.roughness,metalness:mat.metalness,map:mat.map?.userData.sourceFile||mat.map?.name,alphaTest:mat.alphaTest,opacity:mat.opacity,transparent:mat.transparent,additive:mat.blending===T.AdditiveBlending,vertexColors:mat.vertexColors,side:mat.side}))});
  }
  poses.push({id,label,state,parked,direction,physicalBounds:[physical.min.toArray(),physical.max.toArray()],meshes});
 }
 fs.writeFileSync(path.join(output,id+'-snapshots.json.gz'),zlib.gzipSync(JSON.stringify({id,geometries,poses}),{level:6}));
 fs.writeFileSync(path.join(output,id+'-runtime-report.json'),JSON.stringify({...rig.report,hiddenParts:rig.report.hiddenParts()},null,2));
 console.log(id,poses.length,'poses');
}
