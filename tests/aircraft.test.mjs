import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareCorsair} from '../src/corsair.js';
import {prepareF16,prepareSeaplane} from '../src/aircraft-rigs.js';
import {repairMaterials,presetState,meshList,find,inspectAppearance} from '../src/rig-tools.js';
// Image decoding requires a browser. This suite verifies real geometry/material bindings.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
const files=['man-supermarine-s-6b-366f4f6d.glb','man-macchi-castoldi-mc72-6fa2f786.glb','fg-macchi-m33-70f57d9d.glb','fg-f4u-8cea7feb.glb','fg-f16-defa67fc.glb'];
for(const [i,file]of files.entries()){
 const bytes=readFileSync(new URL('../dist/models/'+file,import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const root=gltf.scene;repairMaterials(root);
 const rig=i===3?prepareCorsair(root):i===4?prepareF16(root):prepareSeaplane(root,gltf.animations);
 rig.configure(presetState(true));const parked=rig.bounds().getSize(new THREE.Vector3());
 assert(parked.x>5&&parked.x<20&&parked.z>4&&parked.z<15);
 const meshes=meshList(root),materials=new Set(meshes.flatMap(m=>Array.isArray(m.material)?m.material:[m.material]));
 const appearance=new Map([...materials].map(m=>[m,{map:m.map,color:m.color.clone()}]));
 inspectAppearance(root,'clay');for(const m of materials)assert.equal(m.map,null);
 inspectAppearance(root,'wireframe');for(const m of materials)assert(m.wireframe);
 inspectAppearance(root,'textured');for(const m of materials){assert.equal(m.map,appearance.get(m).map);assert(m.color.equals(appearance.get(m).color));assert(!m.wireframe);}
 if(i===3){assert(find(root,'i0_wheel.L').visible);assert(Math.abs(find(root,'pivot_056_i2_leftwing').rotation.x)>1);for(const m of materials){if(['logo','number'].includes(m.map?.name))assert(m.alphaTest>.1);if(m.ior!==undefined)assert(m.ior<3);}}
 if(i===4){assert(find(root,'procedural_nose_gear_tire').visible);assert(meshList(find(root,'i0_FrontTire')).every(m=>!m.visible));}
 if(i>=3){
  root.updateMatrixWorld(true);const wheelNames=i===3?['i0_wheel.L','i0_wheel.R','i0_tailwheel']:['procedural_nose_gear_tire','procedural_left_main_gear_tire','procedural_right_main_gear_tire'];
  const heights=wheelNames.map(name=>{const m=find(root,name),a=m.geometry.attributes.position;let h=Infinity;for(let j=0;j<a.count;j++){const p=new THREE.Vector3().fromBufferAttribute(a,j).applyMatrix4(m.matrixWorld);h=Math.min(h,p.y*Math.cos(rig.groundPitch)-p.x*Math.sin(rig.groundPitch));}return h;});assert(Math.max(...heights)-Math.min(...heights)<1e-6,'Parked tires must touch the same ground plane');
 }
 // Reveal a hidden imported mesh without exposing all of its siblings, then reset.
 const hidden=meshes.find(m=>!m.visible);if(hidden){hidden.visible=true;for(let p=hidden.parent;p&&p!==root;p=p.parent)assert(p.visible);rig.configure(presetState(true));assert(!hidden.visible);}
 const poses=()=>meshes.map(m=>{m.updateWorldMatrix(true,false);return m.matrixWorld.clone();});
 for(const key of rig.fields.filter(k=>k!=='engine')){
  for(const sign of [1,-1]){rig.configure({...presetState(true),[key]:sign});const bounded=poses();rig.configure({...presetState(true),[key]:sign*100});const extreme=poses();for(let n=0;n<bounded.length;n++)assert(bounded[n].elements.every((v,j)=>Math.abs(v-extreme[n].elements[j])<1e-8));}
 }
 rig.configure(presetState(false));const flight=rig.bounds().getSize(new THREE.Vector3());
 if(i===3){assert(!find(root,'i0_wheel.L').visible);assert(flight.z>parked.z*1.5);assert(Math.abs(find(root,'pivot_056_i2_leftwing').rotation.x)<1e-8);}
 if(i===4)assert(!find(root,'procedural_nose_gear_tire').visible);
 rig.update(1/60,{roll:100,pitch:-100,throttle:.8},true,false);
 for(const [key,s]of Object.entries(rig.surfaces??{})){if(!s.hinge)continue;const limit=key.includes('Aileron')?rig.report.limitsDegrees.aileron:key.includes('Elevator')?rig.report.limitsDegrees.elevator:rig.report.limitsDegrees.rudder;assert(Math.abs(s.angle)<=limit*Math.PI/180+1e-8);assert(Math.abs(s.hinge.quaternion.length()-1)<1e-8);}
 console.log(file+': parked/flight configuration, extreme input limits, texture restoration and hidden-part reset passed');
}
