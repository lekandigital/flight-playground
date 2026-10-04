import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {meshList,parkingPitch} from '../../src/rig-tools.js';
import {labFind,interp} from '../../src/lab/lab-tools.js';
import {prepareF4uLab} from '../../src/lab/f4u.js';

globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
const bytes=readFileSync(new URL('../../dist/models/fg-f4u-8cea7feb.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const facts=JSON.parse(readFileSync(new URL('../../dist/lab/fg-f4u-8cea7feb/facts.json',import.meta.url)));
const maps=new Map();facts.runtimeTextureLoader=async url=>{
 if(!maps.has(url)){const map=new THREE.Texture();map.name=url;map.flipY=false;map.colorSpace=THREE.SRGBColorSpace;maps.set(url,map);}return maps.get(url);
};
const root=gltf.scene,originalMeshes=meshList(root),sourceProp=labFind(root,'i0_prop'),rig=await prepareF4uLab(root,gltf.animations,facts);
const find=name=>labFind(root,name),box=name=>{root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(find(name));};
const near=(actual,expected,tolerance=1e-7)=>assert(Math.abs(actual-expected)<tolerance,`${actual} vs ${expected}`);
assert.equal(rig.propeller,sourceProp,'Preserve the sound original solid propeller');
assert.equal(meshList(root).length,originalMeshes.length,'No source geometry removed or procedural additions');
assert.equal(rig.report.originalAnimationDisabled,true);
assert.equal(rig.report.sourceVariant,'F4U-1');
assert.equal(rig.report.propellerBlades,3);
assert(Math.abs(rig.report.measuredPropellerRadius/2.03-1)<.03,'Propeller radius within 3% of source FDM');
near(rig.groundPitch*180/Math.PI,12.9);assert.equal(rig.groundContacts.length,3,'Emergency belly contacts excluded from wheel datum');

rig.configure({gear:1,fold:0});
const fittedPitch=parkingPitch(root,['i0_wheel.L','i0_wheel.R'],['i0_tailwheel'])*180/Math.PI;
assert(Math.abs(fittedPitch-12.9)<1,`Tire geometry parked pitch ${fittedPitch}° vs source12.9°`);
const dimensions=rig.bounds().getSize(new THREE.Vector3());
// Independent primary museum check of the F4U-1 series, rather than pack F4U-4.
// https://airandspace.si.edu/collection-objects/vought-f4u-1d-corsair/nasm_A19610124000
for(const [value,reference]of [[dimensions.x,10.2],[dimensions.z,12.5],[dimensions.y,4.6]])assert(Math.abs(value/reference-1)<.05,`${value}m vs museum ${reference}m`);
const leftDown=box('i0_wheel.L'),rightDown=box('i0_wheel.R');
near(leftDown.min.y,rightDown.min.y,2e-6);near(leftDown.min.z,-rightDown.max.z,2e-6);
assert(find('i0_hook').visible,'Real F4U hook is stowed, not quarantined equipment');
assert(!find('i15_spdisk').visible&&!find('i15_fpdisk').visible,'Source blur discs are absent at zero rpm');
assert(sourceProp.visible,'Original solid propeller shown at rest');
for(const mesh of meshList(root).filter(m=>!m.visible))assert(mesh.userData.labHiddenReason,`Hidden ${mesh.name} lacks a source reason`);

const inWing=(wheel,wing)=>assert(box(wing).containsBox(box(wheel)),`${wheel} retracts inside ${wing}`);
for(const extension of [1,.75,.5,.25,0]){
 rig.configure({gear:extension,fold:0});
 for(const wheel of ['i0_wheel.L','i0_wheel.R','i0_tailwheel'])assert(find(wheel).visible,'Retracting wheels are retained throughout the source sequence');
 const left=box('i0_wheel.L'),right=box('i0_wheel.R');near(left.min.y,right.min.y,2e-6);near(left.min.z,-right.max.z,2e-6);
}
inWing('i0_wheel.L','i0_centerwing');inWing('i0_wheel.R','i0_centerwing.001');inWing('i0_tailwheel','i0_fuselage');
assert(!find('i0_gearp1.L').visible&&!find('i0_gearp1.R').visible,'XML links disappear at extension≤.56');
rig.configure({gear:.57});assert(find('i0_gearp1.L').visible&&find('i0_gearp1.R').visible);

const stateFields=['gear','fold','canopy','flaps','aileron','elevator','rudder','hook','cowl','engine'];
for(const extreme of [-100,100]){
 rig.configure(Object.fromEntries(stateFields.map(key=>[key,extreme])));
 for(const surface of rig.bindings){
  const {anim,angle}=surface;
  if(anim.travel){const value=anim.type==='translate'?angle:angle*180/Math.PI;assert(value>=Math.min(...anim.travel)-1e-7&&value<=Math.max(...anim.travel)+1e-7,`${anim.objects} clamps within XML travel`);}
  assert(surface.hinge.quaternion.length()>.999999&&surface.hinge.quaternion.length()<1.000001);
 }
}
const angles=(index)=>{const bindings=rig.bindings.filter(s=>s.anim.sourceIndex===index);assert(bindings.length,'Missing source motion '+index);return bindings.map(s=>s.angle*180/Math.PI);};
rig.configure({gear:0,fold:1,flaps:1,cowl:1,hook:1,elevator:-1,rudder:1,aileron:1,canopy:1});
for(const [index,degrees]of [[2,86],[7,84],[8,90],[16,86],[20,84],[21,90],[29,53],[37,30],[42,-30],[47,30],[48,-50],[49,50],[52,30],[53,-30],[54,-30],[57,95],[58,95],[60,18],[62,18]])for(const angle of angles(index))near(angle,degrees);
for(const index of [56,65])for(const surface of rig.bindings.filter(s=>s.anim.sourceIndex===index))near(surface.angle,.7);
rig.configure({elevator:1});for(const index of [53,54])for(const angle of angles(index))near(angle,20);
rig.configure({gear:.05});for(const index of [5,18])for(const angle of angles(index))near(angle,index===5?-43:43);
rig.configure({gear:.1});for(const index of [6,19])for(const angle of angles(index))near(angle,index===6?30:-30);
assert.equal(interp([[0,0],[.1,-86],[1,-86]],.5),-86);

const correction=rig.report.corrections.find(c=>c.sourceIndex===36);assert.deepEqual(correction.to,[8.518,-.401,0]);
assert(rig.bindings.filter(b=>b.anim.sourceIndex===36).every(b=>b.origin.z===0),'Hook rotates on source/FDM centreline');
rig.configure({gear:1,hook:0});const stowedHook=box('i0_hook').clone();rig.configure({gear:1,hook:1});assert(box('i0_hook').min.y<stowedHook.min.y-.5,'Hook extends down behind gear');

assert.deepEqual(rig.liveries.options.map(l=>l.label),['US Marines','US Navy']);
const propMap=sourceProp.material.map,logoMap=find('i0_logo.L').material.map;
await rig.liveries.select('US Navy');
assert(find('i0_fuselage').material.map.name.endsWith('f4u-1a.png'));
assert(find('i2_outerwing.L').material.map.name.endsWith('f4u-2a.png'));
assert(find('i7_outerwing.R').material.map.name.endsWith('f4u-3a.png'));
assert.equal(sourceProp.material.map,propMap,'Changing paint leaves propeller texture alone');
assert.equal(find('i0_logo.L').material.map,logoMap,'Livery does not replace independent insignia texture');
await rig.liveries.select('US Marines');assert(find('i0_fuselage').material.map.name.endsWith('f4u-1.png'));
assert(rig.report.textures.applied.length>40,'Authored texture-by-part bindings actually applied');
assert.equal(find('i0_logo.L').material.alphaTest,.12);assert.equal(find('i0_number').material.alphaTest,.12);
assert.equal(find('i16_frontglass').material.transparent,true);assert.equal(find('i0_frontcanopy').material.transparent,false);

rig.configure({engine:1});assert(!sourceProp.visible&&find('i15_fpdisk').visible,'Source RPM threshold chooses high-speed disc');
rig.configure({engine:1200/rig.report.engineRpm});assert(!sourceProp.visible&&find('i15_spdisk').visible&&!find('i15_fpdisk').visible,'Source medium-speed disc selected');
rig.configure({engine:0});assert(sourceProp.visible&&!find('i15_spdisk').visible&&!find('i15_fpdisk').visible);
const spin=rig.spins.find(s=>s.anim.objects.includes('prop')),before=spin.degrees;
rig.spin(.1,1);const expected=(-.1*1293*6)%360;near(spin.degrees-before,expected);
const paused=spin.degrees;rig.update(.1,{roll:20,pitch:20,throttle:1},true,true);assert.equal(spin.degrees,paused);
rig.configure({gear:0});for(let i=0;i<300;i++)rig.update(1/60,{roll:100,pitch:-100,throttle:1},true,false);
for(const angle of angles(52))near(angle,30);for(const angle of angles(53))near(angle,-30);
rig.configure({gear:1,fold:0});for(const mesh of meshList(root).filter(m=>!m.visible))assert(mesh.userData.labHiddenReason);
console.log('F4U Lab: original meshes/propeller, exact XML ranges/sequences, nested gear twist/bay containment, mirrored wheels, source textures/liveries, hidden reasons, hook correction, pitch/proportions and pause passed.');
