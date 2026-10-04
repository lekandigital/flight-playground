import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareCa60} from '../src/ca60.js';
import {meshList,presetState,categorize,inspectAppearance} from '../src/rig-tools.js';

const bytes=readFileSync(new URL('../dist/models/man-caproni-ca60-e193e5f3.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const root=gltf.scene,raw=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
assert(raw.x>160,'Fixture contains the distant duplicated export geometry');
const rig=prepareCa60(root),bounds=rig.bounds().getSize(new THREE.Vector3());
assert(bounds.x>2&&bounds.x<4&&bounds.z>3&&bounds.z<4&&bounds.y<1.5);
assert.equal(rig.banks.length,3);assert.equal(rig.props.length,8);
assert.equal(Object.keys(rig.surfaces).length,20);
assert(rig.report.originalAnimationDisabled);
const meshes=meshList(root),hidden=meshes.filter(m=>m.name.startsWith('original_ca60_'));
assert(hidden.length>=9);assert(hidden.every(m=>!m.visible));
for(const m of hidden){assert.equal(categorize(m.name),'Original export geometry');m.visible=true;for(let p=m.parent;p&&p!==root;p=p.parent)assert(p.visible);}
rig.configure(presetState(true));assert(hidden.every(m=>!m.visible));
assert.equal(meshes.filter(m=>m.name.startsWith('procedural_ca60_propeller_blade_')).length,16);
const origins=Object.values(rig.surfaces).map(s=>s.hinge.position.clone());
for(const a of [-1,0,1])for(const e of [-1,0,1])for(const r of [-1,1]){
 const s={...presetState(false),aileron:a,elevator:e,rudder:r};rig.configure(s);
 const bounded=Object.values(rig.surfaces).map(s=>s.hinge.quaternion.clone());
 Object.values(rig.surfaces).forEach((s,i)=>{assert(Math.abs(s.angle)<=12*Math.PI/180+1e-8);assert(s.hinge.position.equals(origins[i]));assert(Math.abs(s.hinge.quaternion.length()-1)<1e-8);});
 rig.configure({...s,aileron:a*100,elevator:e*100,rudder:r*100});Object.values(rig.surfaces).forEach((s,i)=>assert(s.hinge.quaternion.equals(bounded[i])));
}
const materials=new Set(meshes.map(m=>m.material)),base=new Map([...materials].map(m=>[m,m.vertexColors]));
inspectAppearance(root,'clay');for(const m of materials)assert(!m.vertexColors);
inspectAppearance(root,'textured');for(const m of materials)assert.equal(m.vertexColors,base.get(m));
const rotations=rig.props.map(p=>p.rotation.z);rig.spin(.1,0);assert.deepEqual(rig.props.map(p=>p.rotation.z),rotations);
rig.update(.1,{roll:1,pitch:1,throttle:.8},true,true);assert.deepEqual(rig.props.map(p=>p.rotation.z),rotations);
rig.update(.1,{roll:1,pitch:1,throttle:.8},true,false);assert(rig.props.every((p,i)=>p.rotation.z!==rotations[i]));
console.log('Ca.60: sane visible bounds, three wing banks, eight rotors, bounded stable hinges, pause, hidden-original reset and clay/color restoration passed');
