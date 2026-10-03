import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareCaproni} from '../src/caproni.js';
import {meshList,find,presetState,inspectAppearance,RAD,categorize} from '../src/rig-tools.js';
const bytes=readFileSync(new URL('../dist/models/man-caproni-ca60-e193e5f3.glb',import.meta.url));
const {scene:root,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.equal(animations[0].name,'scene');root.updateMatrixWorld(true);
const donor=find(root,'Plane.002'),donorTriangles=donor.geometry.index.count/3;
const preserved=meshList(root).filter(m=>!/^Plane/.test(m.name)&&m.name!=='static_merged').map(m=>({mesh:m,matrix:m.matrixWorld.clone()}));
const rig=prepareCaproni(root),meshes=meshList(root),size=rig.bounds().getSize(new THREE.Vector3());root.updateMatrixWorld(true);
const displayed=[];root.traverseVisible(m=>{if(m.isMesh)displayed.push(m);});
assert(size.x>2.5&&size.x<3&&size.z>3&&size.z<3.3,'Exploded merged mesh stays out of visible bounds');
assert.equal(rig.rotors.length,8);assert.equal(rig.wingGroups.length,3);
assert.equal(Object.keys(rig.surfaces).filter(k=>k.startsWith('rudder_')).length,4);
assert.equal(Object.keys(rig.surfaces).filter(k=>k.includes('Aileron')).length,18);
for(const bank of rig.wingGroups){const triangles=meshList(bank.assembly).reduce((n,m)=>n+m.geometry.index.count/3,0);assert.equal(triangles,donorTriangles,'Each wing bank preserves the entire intact donor geometry');}
const alignment=find(root,'ca60_axis_correction');assert.equal(alignment.rotation.y,-Math.PI/2,'Native +Z bow aligns with -X before shared app yaw');
const inverse=alignment.matrixWorld.clone().invert();
for(const [key,s]of Object.entries(rig.surfaces))if(key.startsWith('rudder_')){const g=s.hinge.children[0].geometry,p=g.attributes.position,b=new THREE.Box3();for(let i=0;i<p.count;i++)b.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(s.hinge.matrixWorld).applyMatrix4(inverse));assert(b.min.z>.62&&b.max.z<.89,'Rudders remain inside the rear bank');assert(b.min.y>.21&&b.max.y<.78,'Rudders stay between the rear wing levels');assert(Math.abs(Math.abs(b.getCenter(new THREE.Vector3()).x)-.575)<.02);}
const sites=[[-.354,.43,2.989],[.344,.43,2.989],[-.354,.43,.486],[.344,.43,.486],[0,.37,2.974],[0,.39,2.446],[0,.37,.50],[0,.39,1.02]];
for(const [i,{rotor}]of rig.rotors.entries()){assert.deepEqual(rotor.position.toArray(),sites[i]);assert.equal(rotor.children.filter(m=>/_blade_/.test(m.name)).length,i<4?2:4);}
// Correcting orientation must not reposition sound hull, nacelle or bracing objects.
for(const {mesh,matrix}of preserved)assert(mesh.matrixWorld.elements.every((x,i)=>Math.abs(x-alignment.matrixWorld.clone().multiply(matrix).elements[i])<1e-8),'Preserve imported object transforms');
const fixedTransforms=new Map(preserved.map(({mesh})=>[mesh,mesh.matrixWorld.clone()]));
function matrices(){root.updateMatrixWorld(true);return meshes.map(m=>m.matrixWorld.clone());}
for(const [roll,pitch,yaw]of [[1,1,1],[-1,-1,-1],[1,-1,1],[-1,1,-1]]){
 rig.configure({aileron:roll,elevator:pitch,rudder:yaw});const bounded=matrices();rig.configure({aileron:roll*100,elevator:pitch*100,rudder:yaw*100});const extreme=matrices();
 for(let i=0;i<meshes.length;i++)assert(bounded[i].elements.every((x,j)=>Math.abs(x-extreme[i].elements[j])<1e-9));
 for(const [key,s]of Object.entries(rig.surfaces))assert(Math.abs(s.angle)<=(key.startsWith('rudder_')?10:16)*RAD+1e-9);
 for(const [m,mat]of fixedTransforms)assert(m.matrixWorld.equals(mat),'Cabin, bracing and nacelles stay fixed');
}
rig.configure({elevator:1});for(const s of Object.values(rig.surfaces)){if(s.bank==='middle')assert.equal(s.angle,0);if(s.bank==='forward')assert.equal(s.angle,8*RAD);if(s.bank==='aft')assert.equal(s.angle,-8*RAD);}
const hidden=meshes.find(m=>categorize(m)==='Imported / quarantined');hidden.visible=true;rig.configure(presetState(true));assert(!hidden.visible);
const materials=new Set(meshes.flatMap(m=>Array.isArray(m.material)?m.material:[m.material]));
const appearance=new Map([...materials].map(m=>[m,{map:m.map,color:m.color.clone(),vertexColors:m.vertexColors}]));
inspectAppearance(root,'clay');for(const m of materials){assert(!m.map);assert(!m.vertexColors);}inspectAppearance(root,'textured');for(const [m,base]of appearance){assert.equal(m.map,base.map);assert(m.color.equals(base.color));assert.equal(m.vertexColors,base.vertexColors);}
const before=rig.rotors.map(p=>p.rotor.rotation.z);rig.spin(1,0);assert.deepEqual(rig.rotors.map(p=>p.rotor.rotation.z),before);rig.spin(.1,1);assert(rig.rotors.every((p,i)=>p.rotor.rotation.z!==before[i]));
const spinning=rig.rotors.map(p=>p.rotor.rotation.z);rig.update(.5,{roll:1,pitch:1,throttle:1},true,true);assert.deepEqual(rig.rotors.map(p=>p.rotor.rotation.z),spinning);
for(let i=0;i<300;i++)rig.update(1/60,{roll:100,pitch:-100,throttle:.8},true,false);for(let i=0;i<300;i++)rig.update(1/60,{roll:0,pitch:0,throttle:0},false,false);for(const s of Object.values(rig.surfaces))assert(Math.abs(s.angle)<1e-8);
for(const m of meshes)for(const value of m.geometry.attributes.position.array)assert(Number.isFinite(value));
console.log('Caproni: intact donor wing geometry, unchanged imported transforms, four interplane rudders, correct nose / engine anchors, bounded controls, pause and appearance restoration passed.');
