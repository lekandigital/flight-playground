import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './fixture.mjs';
import {prepareBo105Lab} from '../../src/lab/bo105.js';
import {labFind} from '../../src/lab/lab-tools.js';
import {meshList} from '../../src/rig-tools.js';
const {root,facts,animations}=await fixture('fg-bo105-5f1245bd');
facts.runtimeTextureLoader=async url=>{const t=new THREE.Texture();t.name=url;t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;return t;};
const rig=await prepareBo105Lab(root,animations,facts),near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} vs ${b}`),box=n=>{root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(labFind(root,n));};
assert.equal(rig.report.originalAnimationDisabled,true);assert(!rig.fields.includes('gear'),'Source fixed skids have no invented retraction');assert(!rig.bindings.some(b=>b.anim.property==='sim/model/bo105/tail-angle-deg'),'Crash deformation is not a fold control');
near(rig.groundPitch*180/Math.PI,1.0050860052541821);assert.equal(rig.groundContacts.length,4);const ys=rig.groundContacts.map(c=>c.glb[1]*Math.cos(rig.groundPitch)-c.glb[0]*Math.sin(rig.groundPitch));near(Math.min(...ys),Math.max(...ys));
for(const [rotor,index]of [[rig.mainRotor,0],[rig.tailRotor,1]]){
 const spec=facts.fdm_geometry.rotors[index];assert.equal(rotor.count,spec.blades);assert(rotor.mount.position.equals(new THREE.Vector3().fromArray(spec.glb)));assert(new THREE.Vector3(0,1,0).applyQuaternion(rotor.mount.quaternion).distanceTo(new THREE.Vector3().fromArray(spec.glb_normal).normalize())<1e-6);
 let radius=0;for(const blade of rotor.blades)for(const m of meshList(blade)){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)radius=Math.max(radius,Math.hypot(a.getX(i),a.getZ(i)));m.geometry.computeBoundingBox();near(m.geometry.boundingBox.max.x-m.geometry.boundingBox.min.x,Number(spec.source_parameters.chord),1e-6);}
 assert(Math.abs(radius/rotor.radius-1)<.03,'Actual rotor vertex diameter within3% of FDM');const before=rotor.rotor.rotation.y;rotor.spin(.01,1);near(rotor.rotor.rotation.y-before,.01*spec.rpm*Math.PI/30);
}
rig.tailRotor.rotor.rotation.y=110*Math.PI/180;root.rotation.z=-rig.groundPitch;
const size=rig.bounds().getSize(new THREE.Vector3());assert(Math.abs(size.x/11.86-1)<.05,'Parked source phi0 tail azimuth length agrees with related CB reference');assert(Math.abs(size.y/3-1)<.05,'Parked source phi0 tail azimuth height agrees with related CB reference');root.rotation.z=0;
const left=box('i0_skid_L'),right=box('i0_skid_R');near(left.min.y,right.min.y);near(left.min.z,-right.max.z);near(left.max.z,-right.min.z);assert(labFind(root,'i0_wire_cutter').visible,'Set explicitly enables wire cutter');
for(const v of [-100,100]){rig.configure(Object.fromEntries(rig.fields.map(k=>[k,v])));for(const b of rig.bindings){const value=b.anim.type==='translate'?b.angle:b.angle*180/Math.PI;assert(value>=Math.min(...b.anim.travel)-1e-6&&value<=Math.max(...b.anim.travel)+1e-6);}}
rig.configure({doors:1,collective:1,cyclicPitch:0,cyclicRoll:0,rudder:1});
for(const [index,angle]of [[50,-170],[51,170],[52,.03],[53,.6],[54,.03],[55,.6],[56,170],[57,-170]]){const bindings=rig.bindings.filter(b=>b.anim.sourceIndex===index);assert(bindings.length);for(const b of bindings)near(b.anim.type==='translate'?b.angle:b.angle*180/Math.PI,angle);}
for(const names of [['i0_door_front_L','i0_door_front_R'],['i0_door_back_L','i0_door_back_R'],['i0_reardoor_L','i0_reardoor_R']]){const l=box(names[0]),r=box(names[1]);near(l.min.z,-r.max.z,3e-6);near(l.max.z,-r.min.z,3e-6);near(l.min.y,r.min.y,3e-6);}
assert(rig.report.doorSnaps.every(s=>s.distance<.002),'Door hinges fit actual source edges within2mm despite global poor frame statistic');
rig.configure({doors:0});const closed=box('i0_door_back_R');rig.configure({doors:.1});const popped=box('i0_door_back_R');near(popped.min.x,closed.min.x);near(popped.min.z-closed.min.z,-.03);rig.configure({doors:1});const slid=box('i0_door_back_R');near(slid.min.x-popped.min.x,.6*facts.animations_from_xml[53].glb_axis_dir[0]);
rig.configure({collective:0,cyclicPitch:0,cyclicRoll:0,rudder:0});near(rig.mainRotor.blades[0].rotation.z*180/Math.PI,-.2);near(rig.tailRotor.blades[0].rotation.z*180/Math.PI,5);rig.configure({collective:1,rudder:-1});near(rig.mainRotor.blades[0].rotation.z*180/Math.PI,15.8);near(rig.tailRotor.blades[0].rotation.z*180/Math.PI,20);const mast=rig.mainRotor.mount.quaternion.clone();rig.configure({cyclicPitch:1,cyclicRoll:1});assert(rig.mainRotor.mount.quaternion.equals(mast),'Cyclic changes blade incidence without tilting physical mast');
const body=labFind(root,'i0_fuselage').material;assert(body.map.name.endsWith('livery.png'));near(body.color.r,.8);near(body.color.g,.7);near(body.color.b,.001);assert.equal(body.map.flipY,false);assert.equal(body.map.colorSpace,THREE.SRGBColorSpace);assert(rig.report.textures.applied.length>20);assert.equal(rig.liveries.options.length,0,'No named variant XML was supplied');
const glass=labFind(root,'i0_glass_fixed').material;near(glass.opacity,.2);assert(glass.color.equals(new THREE.Color(1,1,1)));assert(meshList(root).filter(m=>!m.visible).every(m=>m.userData.labHiddenReason));const before=rig.mainRotor.rotor.rotation.y;rig.update(.2,{throttle:1,pitch:1,roll:1},true,true);near(rig.mainRotor.rotor.rotation.y,before);
console.log('Bo105 Lab: actual source rotor diameter/count/chord/hubs/shaft/RPM/phi0, fixed mast blade incidence, XML170° doors and slide sequence, symmetry, source skid pitch, source paint/glass, selected wire cutter and hidden reasons passed.');
