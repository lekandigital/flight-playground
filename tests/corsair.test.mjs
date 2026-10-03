import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {meshList} from '../src/rig-tools.js';
import {prepareCorsair} from '../src/corsair.js';
// Test actual imported geometry and hierarchy. Browser texture rendering is separate.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
const bytes=readFileSync(new URL('../dist/models/fg-f4u-8cea7feb.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene,rig=prepareCorsair(root);
const find=name=>root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
assert.equal(find('i0_prop').visible,false);
assert(meshList(find('i17_external loads')).every(m=>!m.visible));
assert(meshList(find('i15_propdisk')).every(m=>!m.visible));
assert.equal(find('i0_wheel.L').visible,false);
assert.equal(find('i0_geardoorfront.L').visible,true);
assert.equal(find('pivot_056_i2_leftwing').quaternion.w,1);
assert.equal(rig.propeller.children.filter(x=>x.name.startsWith('procedural_blade')).length,3);
const origins=Object.fromEntries(Object.entries(rig.surfaces).map(([k,s])=>[k,s.hinge.position.clone()]));
for(const direction of [1,-1]){
 for(let i=0;i<600;i++)rig.update(1/60,{roll:direction*100,pitch:direction*100,throttle:1},true,false);
 for(const [key,s]of Object.entries(rig.surfaces)){
  const limit=key.includes('Aileron')?18:key.includes('Elevator')?14:12;
  assert(Math.abs(s.angle)<=limit*Math.PI/180+1e-9);
  assert(s.hinge.position.distanceTo(origins[key])<1e-9);
  assert(Math.abs(s.hinge.quaternion.length()-1)<1e-8);
 }
 assert(Math.abs(rig.surfaces.leftAileron.angle+rig.surfaces.rightAileron.angle)<1e-9);
 assert(Math.abs(rig.surfaces.leftElevator.angle-rig.surfaces.rightElevator.angle)<1e-9);
}
const angle=rig.propeller.rotation.x;
rig.update(1,{roll:0,pitch:0,throttle:1},true,true);
assert.equal(rig.propeller.rotation.x,angle);
for(let i=0;i<300;i++)rig.update(1/60,{roll:0,pitch:0,throttle:0},false,false);
for(const s of Object.values(rig.surfaces))assert(Math.abs(s.angle)<1e-8);
assert(!rig.bounds().isEmpty());
console.log('Corsair geometry, flight configuration, hinge invariants, motion limits, pause, and neutral reset passed.');
