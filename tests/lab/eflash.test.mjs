import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './fixture.mjs';
import {prepareEflashLab} from '../../src/lab/eflash.js';
import {labFind} from '../../src/lab/lab-tools.js';
import {meshList} from '../../src/rig-tools.js';

const {root,facts,animations}=await fixture('fg-e-flash-c73b47ce'),rig=await prepareEflashLab(root,animations,facts);
const near=(a,b,e=1e-5)=>assert(Math.abs(a-b)<e,`${a} vs ${b}`);
function vertices(name){root.updateMatrixWorld(true);const mesh=labFind(root,name),a=mesh.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));}
const box=name=>new THREE.Box3().setFromPoints(vertices(name));
const angles=i=>rig.bindings.filter(b=>b.anim.sourceIndex===i).map(b=>b.angle*180/Math.PI);
assert(rig.report.originalAnimationDisabled);assert.deepEqual(rig.fields,['wingRoll','wingPitch','wheelSteer','engine']);assert(!rig.fields.includes('gear'),'All three fixed wheels stay fixed');near(rig.groundPitch*180/Math.PI,-1.22);assert.deepEqual(rig.groundContacts,[]);
assert(facts.source_supplement.set_xml_byte_identical_to_pack&&facts.source_supplement.model_xml_byte_identical_to_pack);
assert.equal(rig.report.geometryRestorations,114);assert.equal(facts.source_geometry_restore.unmatched.length,0);
// −1/3 elevator puts both source pitch tables at zero, exposing the AC datum.
rig.configure({gear:1,wingRoll:0,wingPitch:-1/3,wheelSteer:0});
for(const name of ['i0_Sail','i0_Sail002','i0_Sidetube','i0_LowerSideWire','i0_Circle002','i0_NoseWheel','i0_Prop','i0_Head']){
 const correction=facts.source_geometry_restore.transforms.find(t=>t.glb_node===name),actual=box(name);
 for(let j=0;j<3;j++){near(actual.min.getComponent(j),correction.source_bounds.min[j]);near(actual.max.getComponent(j),correction.source_bounds.max[j]);}
}
const sourceSpan=34.61*.3048,wingWidth=box('i0_Sidetube').max.z-box('i0_Sidetube001').min.z;assert(Math.abs(wingWidth/sourceSpan-1)<.05);
const sourceHub=new THREE.Vector3(2.4,.55,0),radius=Math.max(...vertices('i0_Prop').map(v=>Math.hypot(v.y-sourceHub.y,v.z-sourceHub.z)));assert(Math.abs(radius/(61.8*.0254/2)-1)<.03);assert.equal(rig.report.propellerBlades,3);assert.equal(rig.spins.length,1);near(rig.spins[0].origin.x,2.4);near(rig.spins[0].origin.y,.55);assert(rig.spins[0].axis.equals(new THREE.Vector3(1,0,0)));
// In the parked source reference frame the counter-motion keeps tyres fixed,
// while in flight the wing stays fixed and the suspended pod shifts underneath.
rig.configure({gear:1,wingRoll:0,wingPitch:0});const nose=box('i0_NoseWheel'),main=box('i0_Cylinder013'),sail=box('i0_Sail');
const opposite=box('i0_Cylinder016');near(main.min.x,opposite.min.x);near(main.min.y,opposite.min.y);assert(Math.abs(main.getCenter(new THREE.Vector3()).z+opposite.getCenter(new THREE.Vector3()).z)<.025,'Source tyre outlines have a 21 mm lateral asymmetry; preserve it rather than inventing mirror geometry');
rig.configure({gear:1,wingRoll:1,wingPitch:1});assert(box('i0_NoseWheel').min.distanceTo(nose.min)<1e-6);assert(box('i0_Cylinder013').min.distanceTo(main.min)<1e-6);assert(box('i0_Sail').min.distanceTo(sail.min)>.05);
rig.configure({gear:0,wingRoll:0,wingPitch:0});const airSail=box('i0_Sail'),airNose=box('i0_NoseWheel');rig.configure({gear:0,wingRoll:1,wingPitch:1});assert(box('i0_Sail').min.distanceTo(airSail.min)<1e-6);assert(box('i0_NoseWheel').min.distanceTo(airNose.min)>.2);
angles(3).forEach(a=>near(a,0));angles(4).forEach(a=>near(a,15));angles(5).forEach(a=>near(a,3));angles(6).forEach(a=>near(a,-12));
for(const value of [-100,100]){rig.configure({gear:1,wingRoll:value,wingPitch:value,wheelSteer:value});for(const binding of rig.bindings){const a=binding.angle*180/Math.PI;assert(a>=Math.min(...binding.anim.travel)-1e-5&&a<=Math.max(...binding.anim.travel)+1e-5);}angles(0).forEach(a=>near(a,value<0?-20:20));}
assert(rig.bindings.filter(b=>b.anim.sourceIndex===0).every(b=>b.axis.distanceTo(new THREE.Vector3(-.2,1,0).normalize())<1e-6));
rig.configure({gear:1,wingRoll:0,wingPitch:0,wheelSteer:0,engine:1});assert(labFind(root,'i0_Head').visible,'Source pilot=1 survives the erroneous pack false and alias mismatch');assert(!labFind(root,'i0_tete').visible,'Source passenger=0');assert(labFind(root,'i0_Prop').visible,'Sound original blades remain visible without a missing blur substitute');
assert(meshList(root).filter(m=>!m.visible).every(m=>m.userData.labHiddenReason));assert(meshList(root).filter(m=>/^original_.*i4_/.test(m.name)).every(m=>!m.visible));assert(labFind(root,'i0_NoseCone').visible,'Wing nose cone was falsely categorized as ground equipment');
near(labFind(root,'i0_Fairing').material.color.g,.3245);near(labFind(root,'i0_Fin').material.color.b,.8849);assert(rig.report.textures.applied.length>=29);assert(labFind(root,'i0_Sail').material.userData.labTexture.endsWith('reg.png'));assert(rig.report.textures.missing.some(b=>b.texture.endsWith('magnetoswitch.rgb')),'Source archive also omits referenced magneto texture; do not claim recovery');assert.equal(rig.liveries.options.length,0);
const before=rig.spins[0].degrees;rig.spin(.01,1);near(rig.spins[0].degrees-before,-60);const paused=rig.spins[0].degrees;rig.update(.3,{throttle:1,pitch:1,roll:1},true,true);near(rig.spins[0].degrees,paused);
assert(rig.report.sourceLimitNotes.ground&&rig.report.sourceLimitNotes.propeller&&rig.report.sourceLimitNotes.variant);
console.log('E-Flash Lab: exact recovered AC transforms, source weight-shift frame/pitch tables/clamps, tilted steering, fixed gear, original pusher radius/sign, pilot aliases, authored colours/UV textures and hidden reasons passed.');
