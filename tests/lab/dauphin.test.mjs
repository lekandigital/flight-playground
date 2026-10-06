import assert from 'node:assert/strict';import * as THREE from 'three';
import {fixture} from './fixture.mjs';import {prepareDauphinLab} from '../../src/lab/dauphin.js';import {labFind,interp} from '../../src/lab/lab-tools.js';import {meshList,parkingPitch} from '../../src/rig-tools.js';
const {root,facts,animations}=await fixture('fg-dauphin-ea380a4c');facts.runtimeTextureLoader=async url=>{const t=new THREE.Texture();t.name=url;t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;return t;};const rig=await prepareDauphinLab(root,animations,facts),box=n=>{root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(labFind(root,n));};const near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} vs ${b}`);
assert.equal(rig.report.originalAnimationDisabled,true);near(rig.groundPitch,0);assert(rig.groundContacts.length===3);assert.equal(rig.mainRotor.count,4);assert.equal(rig.tailRotor.count,11);
for(const [rotor,index]of [[rig.mainRotor,0],[rig.tailRotor,1]]){
 assert(rotor.mount.position.equals(new THREE.Vector3().fromArray(facts.fdm_geometry.rotors[index].glb)));
 let radius=0;for(const blade of rotor.blades)for(const mesh of meshList(blade)){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)radius=Math.max(radius,Math.hypot(a.getX(i),a.getZ(i)));}
 assert(Math.abs(radius/rotor.radius-1)<.03,'Actual vertex rotor radius within3%');
 const before=rotor.rotor.rotation.y;rotor.spin(.01,1);near(rotor.rotor.rotation.y-before,-.01*facts.fdm_geometry.rotors[index].rpm*Math.PI/30);
}
rig.configure({gear:1});near(parkingPitch(root,['i0_roueG','i0_roueD'],['i0_roueA']),0);for(const n of ['i0_roueA','i0_roueG','i0_roueD'])near(box(n).min.y,-1.844,.001);
const size=rig.bounds().getSize(new THREE.Vector3());assert(Math.abs(size.x/13.73-1)<.05);assert(Math.abs(size.y/4.06-1)<.05);
for(const gear of [1,.75,.5,.25,0]){rig.configure({gear});const l=box('i0_roueG'),r=box('i0_roueD');near(l.min.y,r.min.y);near(l.min.z,-r.max.z);for(const n of ['i0_roueA','i0_roueG','i0_roueD'])assert(labFind(root,n).visible);}
for(const n of ['i0_roueA','i0_roueG','i0_roueD'])assert(box('i0_fuselage').containsBox(box(n)),'Retracted tyres inside source fuselage envelope');
for(const v of [-100,100]){rig.configure(Object.fromEntries(rig.fields.map(k=>[k,v])));for(const b of rig.bindings){const angle=b.anim.type==='translate'?b.angle:b.angle*180/Math.PI;assert(angle>=Math.min(...b.anim.travel)-1e-6&&angle<=Math.max(...b.anim.travel)+1e-6);}}
rig.configure({gear:0,doors:1,collective:1,cyclicPitch:0,cyclicRoll:0,rudder:1});for(const [i,value]of [[0,0],[1,0],[2,-90],[3,-90],[4,35],[5,-90],[6,-35],[18,-70],[19,70],[20,-70],[21,70],[23,.95],[24,3],[26,.95],[27,-3]]){const bs=rig.bindings.filter(b=>b.anim.sourceIndex===i);assert(bs.length);for(const b of bs)near(b.anim.type==='translate'?b.angle:b.angle*180/Math.PI,value);}
near(rig.mainRotor.blades[0].rotation.z*180/Math.PI,12);near(rig.tailRotor.blades[0].rotation.z*180/Math.PI,14);const shaft=rig.mainRotor.mount.quaternion.clone();rig.configure({cyclicPitch:1,cyclicRoll:1});assert(rig.mainRotor.mount.quaternion.equals(shaft),'Cyclic pitches blades without tilting rotor mast');
assert.equal(interp([[1,0],[.8,0],[.2,-.02],[0,0]],.2),-.02);assert.equal(rig.liveries.options.length,12);for(const l of rig.liveries.options)await rig.liveries.select(l.value);await rig.liveries.select('French Navy');assert(labFind(root,'i0_fuselage').material.map.name.endsWith('Fmarine.png'));assert(rig.report.textures.applied.length>30);
assert(meshList(root).filter(m=>!m.visible).every(m=>m.userData.labHiddenReason));assert(labFind(root,'i0_nez1').visible&&!labFind(root,'i0_nez2').visible);
const spin=rig.mainRotor.rotor.rotation.y;rig.update(.2,{throttle:1,pitch:1,roll:1},true,true);near(rig.mainRotor.rotor.rotation.y,spin);
console.log('Dauphin Lab: FDM rotor diameter/count/chord/hubs/RPM, fixed mast blade incidence, original compound gear/contacts/containment/mirror, XML door sequences,12 liveries and hidden reasons passed.');
