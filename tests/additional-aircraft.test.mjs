import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareAdditionalAircraft} from '../src/additional-aircraft.js';
import {repairMaterials,presetState,meshList,find,inspectAppearance} from '../src/rig-tools.js';

// Image decoding is browser-only; retain real UVs and material bindings here.
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
const fixtures=[['eflash','fg-e-flash-c73b47ce.glb'],['bo105','fg-bo105-5f1245bd.glb'],['dauphin','fg-dauphin-ea380a4c.glb'],['ec130','fg-ec130-9797aa83.glb'],['spitfire','fg-spitfire-spitfirevb-371986bf.glb'],['seafire','fg-spitfire-seafireiiic-e1e7c198.glb']];
for(const [id,file]of fixtures){
 const bytes=readFileSync(new URL('../dist/models/'+file,import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const root=gltf.scene;repairMaterials(root);const rig=prepareAdditionalAircraft(root,id),meshes=meshList(root);
 const neutral={...presetState(true),collective:0,cyclicPitch:0,cyclicRoll:0,doors:0,wingPitch:0,wingRoll:0,wheelSteer:0};
 rig.configure(neutral);const parked=rig.bounds().getSize(new THREE.Vector3());assert(parked.x<16&&parked.y<7&&parked.z<13);
 assert(rig.report.originalAnimationDisabled);
 const matrices=()=>meshes.map(m=>{m.updateWorldMatrix(true,false);return m.matrixWorld.clone();});
 for(const key of rig.fields.filter(k=>k!=='engine'))for(const sign of [-1,1]){
  rig.configure({...neutral,[key]:sign});const bounded=matrices();rig.configure({...neutral,[key]:sign*100});const extreme=matrices();
  for(let i=0;i<meshes.length;i++)assert(bounded[i].elements.every((v,j)=>Math.abs(v-extreme[i].elements[j])<1e-8),id+' clamps '+key);
 }
 rig.configure(neutral);
 const hidden=meshes.filter(m=>m.name.startsWith('original_'));assert(hidden.length>10);
 for(const m of hidden){assert(!m.visible);m.visible=true;for(let p=m.parent;p&&p!==root;p=p.parent)assert(p.visible);}
 rig.configure(neutral);assert(hidden.every(m=>!m.visible));
 const mats=new Set(meshes.flatMap(m=>Array.isArray(m.material)?m.material:[m.material]));
 const original=new Map([...mats].map(m=>[m,{map:m.map,color:m.color.clone(),vertexColors:m.vertexColors}]));
 inspectAppearance(root,'clay');inspectAppearance(root,'wireframe');inspectAppearance(root,'textured');
 for(const m of mats){assert.equal(m.map,original.get(m).map);assert(m.color.equals(original.get(m).color));assert.equal(m.vertexColors,original.get(m).vertexColors);assert(!m.wireframe);}
 if(rig.mainRotor){
  assert.equal(rig.mainRotor.blades.length,rig.report.mainRotorBlades);assert.equal(rig.tailRotor.blades.length,rig.report.tailRotorBlades);
  const center=rig.mainRotor.mount.position.clone();rig.configure({...neutral,cyclicPitch:1,cyclicRoll:-1,collective:1});assert(rig.mainRotor.mount.position.equals(center));
  assert(rig.mainRotor.blades.every(b=>Math.abs(b.rotation.z-12*Math.PI/180)<1e-8));
  assert(!meshes.some(m=>m.visible&&/shadow|propblur|propdisc|HDR/.test(m.name)));
 }
 if(id==='eflash'){
  assert(rig.report.sailHeightCorrection>2);root.updateMatrixWorld(true);const sail=new THREE.Box3().setFromObject(find(root,'i0_Sail'));assert(sail.min.y>1.8&&sail.max.y<2.5);
  assert(!meshes.some(m=>m.visible&&/^original_equipment/.test(m.name)));
 }
 if(id==='spitfire'||id==='seafire'){
  rig.configure(neutral);root.updateMatrixWorld(true);
  const heights=['i0_tyre-l','i0_tyre','i0_Tyre'].map(name=>{const m=find(root,name),p=m.geometry.attributes.position,v=new THREE.Vector3();let low=Infinity;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);low=Math.min(low,v.y*Math.cos(rig.groundPitch)-v.x*Math.sin(rig.groundPitch));}return low;});
  assert(Math.max(...heights)-Math.min(...heights)<1e-5,'All parked tires meet the same plane');
  assert.equal(meshes.filter(m=>m.name.startsWith('procedural_'+id+'_propeller_blade_')).length,id==='spitfire'?3:4);
  rig.configure(presetState(false));assert(!find(root,'i0_tyre-l').visible);if(id==='seafire')assert(rig.bounds().getSize(new THREE.Vector3()).z>parked.z*1.8);
 }
 const moving=rig.mainRotor?.rotor??rig.propeller,pose=moving.quaternion.clone();rig.spin(.2,0);assert(moving.quaternion.equals(pose));
 rig.update(.2,{pitch:1,roll:1,throttle:.8},true,true);assert(moving.quaternion.equals(pose));
 rig.spin(.2,.8);assert(!moving.quaternion.equals(pose));
 for(const surface of Object.values(rig.surfaces??{}))assert(Math.abs(surface.hinge.quaternion.length()-1)<1e-8);
 console.log(id+': configured geometry, bounded motion, rotor counts, parked contact, pause, hidden-part reset and texture restoration passed');
}
