import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './fixture.mjs';
import {prepareF16Lab} from '../../src/lab/f16.js';
import {labFind,animationValue} from '../../src/lab/lab-tools.js';
import {meshList,parkingPitch} from '../../src/rig-tools.js';
const {root,facts,animations}=await fixture('fg-f16-defa67fc');
facts.runtimeTextureLoader=async url=>{const map=new THREE.Texture();map.name=url;map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;return map;};
const rig=await prepareF16Lab(root,animations,facts),find=n=>labFind(root,n),box=n=>{root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(find(n));};
const near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} vs ${b}`);
assert.equal(rig.report.originalAnimationDisabled,true);assert.equal(rig.liveries.options.length,82);
assert(rig.report.sourceRecovery.main_sha256,'Recovered primary source is fingerprinted');
rig.configure({gear:1});near(rig.groundPitch*180/Math.PI,1.92);
assert(Math.abs(parkingPitch(root,['i0_LeftMainTire','i0_RightMainTire'],['i0_FrontTire'])*180/Math.PI-1.92)<1);
const contactY=facts.fdm_geometry.gear_contacts.map(c=>c.glb[1]);
for(const [name,index]of [['i0_FrontTire',0],['i0_LeftMainTire',1],['i0_RightMainTire',2]])near(box(name).min.y,contactY[index],.015);
for(const gear of [1,.75,.5,.25,0]){
 rig.configure({gear});const l=box('i0_LeftMainTire'),r=box('i0_RightMainTire');near(l.min.y,r.min.y,2e-5);near(l.min.x,r.min.x,2e-5);near(l.min.z,-r.max.z,2e-5);
 for(const n of ['i0_FrontTire','i0_LeftMainTire','i0_RightMainTire'])assert(meshList(find(n)).every(m=>m.visible),'Wheels remain real geometry throughout retraction');
}
assert(box('i0_AirIntake').containsBox(box('i0_FrontTire')),'Nose tyre ends within fuselage intake/bay envelope');
for(const n of ['i0_LeftMainTire','i0_RightMainTire'])assert(box('i0_RadarDomeTop').containsBox(box(n)),'Main tyre ends inside source airframe envelope');
// Small well-lining meshes are not a closed bay volume; pack must supply exact walls.
for(const extreme of [-100,100]){
 rig.configure(Object.fromEntries(rig.fields.map(f=>[f,extreme])));
 for(const b of rig.bindings){const value=b.anim.type==='translate'?b.angle:b.angle*180/Math.PI;if(b.anim.travel)assert(value>=Math.min(...b.anim.travel)-1e-6&&value<=Math.max(...b.anim.travel)+1e-6);}
}
rig.configure({gear:0,canopy:1,speedbrake:1,hook:1,elevator:1,rudder:1});
for(const [index,angle]of [[8,30],[9,57.175],[15,30],[16,25],[17,-25],[21,-112],[27,-95],[36,95],[43,-60],[44,60],[45,-60],[46,60]]){
 const bindings=rig.bindings.filter(b=>b.anim.sourceIndex===index);assert(bindings.length,`Missing source motion ${index}`);for(const b of bindings)near(b.angle*180/Math.PI,angle);
}
assert.equal(animationValue({factor:112,offset:-112,offsetUnits:'degrees',travel:[-112,0]},1),0);
assert.equal(animationValue({factor:112,offset:-112,offsetUnits:'degrees',travel:[-112,0]},0),-112);
assert.equal(animationValue({factor:2,offset:3,offsetUnits:'legacy'},4),14);
rig.configure({gear:1,canopy:0});root.rotation.z=-rig.groundPitch;root.updateMatrixWorld(true);
const size=rig.bounds().getSize(new THREE.Vector3());for(const [v,r]of [[size.x,15.062],[size.z,9.957],[size.y,4.877]])assert(Math.abs(v/r-1)<.05,'Production-shape airframe within5% production-series reference; not an exact YF-16 claim');
root.rotation.z=0;
assert(meshList(find('i12_PW_nozzle')).some(m=>m.visible),'Source engine2 selects original PW nozzle');assert(meshList(find('i29_GE_nozzle')).every(m=>!m.visible));
assert(rig.report.paintSlots.body.length>60);
assert(find('i0_CanopyFrame').material.map.name.endsWith('75-0745.png'));
const tyreMap=meshList(find('i0_FrontTire'))[1].material.map;
await rig.liveries.select('1W 350 Sqn, FA-14');assert(find('i0_CanopyFrame').material.map.name.endsWith('78-0129.png'));assert.equal(meshList(find('i0_FrontTire'))[1].material.map,tyreMap,'Paint switch leaves mechanical texture unchanged');
for(const option of rig.liveries.options)await rig.liveries.select(option.value);
assert(meshList(root).filter(m=>!m.visible).every(m=>m.userData.labHiddenReason));
assert(find('i0_CanopyForwardOutside').material.isMeshPhysicalMaterial);
console.log('F-16 Lab: source compound gear/offsets, contacts/mirrors, retained tyre containment envelope, control clamps/FCS radians, PW nozzle, 82 authored liveries and hidden reasons passed.');
