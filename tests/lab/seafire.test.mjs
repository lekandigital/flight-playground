import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareSeafireLab} from '../../src/lab/seafire.js';
import {prepareAdditionalAircraft} from '../../src/additional-aircraft.js';
import {find,meshList,presetState,inspectAppearance} from '../../src/rig-tools.js';
import {labFind,interp} from '../../src/lab/lab-tools.js';

globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
const asset='fg-spitfire-seafireiiic-e1e7c198';
const bytes=readFileSync(new URL(`../../dist/models/${asset}.glb`,import.meta.url));
async function fixture(){return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
const facts=JSON.parse(readFileSync(new URL(`../../dist/lab/${asset}/facts.json`,import.meta.url)));
facts.runtimeGeometryLoader=async file=>JSON.parse(readFileSync(new URL(`../../dist/lab/${asset}/${file}`,import.meta.url)));
facts.runtimeTextureLoader=async url=>{const texture=new THREE.Texture();texture.name=url;texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;return texture;};
const gltf=await fixture(),root=gltf.scene;
const rig=await prepareSeafireLab(root,gltf.animations,facts);
const rest={...presetState(false),hook:0,doors:0,cowl:0};
const binding=name=>rig.bindings.find(surface=>surface.anim.objects[0]===name);
const box=name=>{root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(labFind(root,name));};
const matrices=()=>{root.updateMatrixWorld(true);return meshList(root).map(mesh=>mesh.matrixWorld.clone());};
const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-7,message+`: ${actual} != ${expected}`);

assert(rig.report.originalAnimationDisabled);
assert.equal(rig.report.borrowedParts[0].donor,'man-supermarine-spitfire-1093b498');
assert.equal(rig.report.propellerBlades,4);
assert.equal(meshList(rig.originalPropeller).filter(m=>m.visible).length,1);
assert(!meshList(root).some(mesh=>mesh.name.startsWith('procedural_')));
assert(meshList(rig.originalPropeller).filter(m=>m.name.startsWith('original_')).every(mesh=>!mesh.visible&&mesh.userData.labHiddenReason));
assert(rig.originalSpinner.visible);
const donorMesh=labFind(root,'lab_borrowed_Rotol_four_blade');let donorRadius=0;const donorPoint=new THREE.Vector3();root.updateMatrixWorld(true);for(let i=0;i<donorMesh.geometry.attributes.position.count;i++){donorPoint.fromBufferAttribute(donorMesh.geometry.attributes.position,i).applyMatrix4(donorMesh.matrixWorld);donorRadius=Math.max(donorRadius,Math.hypot(donorPoint.y,donorPoint.z));}assert(Math.abs(donorRadius/facts.fdm_geometry.propellers[0].radius_m-1)<.03,'Actual donor vertex radius follows FDM');assert(donorMesh.material.map,'Donor uses source paint');
assert(Math.abs(rig.report.propellerDiameter/rig.report.fdmPropellerDiameter-1)<.03);
close(rig.groundPitch*180/Math.PI,12.04,'Flight model parked pitch');
const size=rig.report.geometryMeasurements.lab.size,specs=facts.real_world_specs;
for(const [actual,expected,name] of [[size[0],specs.length_m,'length'],[size[2],specs.span_m,'span']])assert(Math.abs(actual/expected-1)<.05,name+' within 5% in level flight pose');
assert(rig.report.remaining.some(s=>s.includes('height')),'Height discrepancy explicitly recorded');assert(rig.report.geometryMeasurements.imported.size[1]>size[1],'Removing source blur disk reduces false height');

// Every supported exterior control is bounded, including coupled tip folds.
for(const field of rig.fields.filter(field=>field!=='engine'))for(const endpoint of [-1,1]){
 rig.configure({...rest,[field]:endpoint});const bounded=matrices();
 rig.configure({...rest,[field]:endpoint*100});const overshoot=matrices();
 for(let i=0;i<bounded.length;i++)assert(bounded[i].elements.every((v,j)=>Math.abs(v-overshoot[i].elements[j])<1e-8),field+' clamps all descendant transforms');
}
rig.configure({...rest,aileron:1,elevator:1,rudder:1,flaps:1,cowl:1,canopy:1,doors:1,hook:1});
for(const [name,degrees] of [['Aileron-L',-20],['Aileron-R',-20],['Elevator-L',-15],['Elevator-R',15],['Rudder-Assmbly',-30],['Flap-Inner-L',-86],['Flap-Inner-R',86],['Flap-Outer-L-Inner',-86],['Flap-Outer-L-Outer',-86],['Flap-Outer-R-Inner',86],['Flap-Outer-R-Outer',86],['Flap',70],['Door',-170],['Arrester-Hook',60]])close(binding(name).angle*180/Math.PI,degrees,name+' source XML endpoint');
close(binding('Canopy-Main').angle,.57,'Source canopy slide');
rig.configure({...rest,flaps:.49});close(binding('Flap-Inner-L').angle,0,'Split flaps up detent');
rig.configure({...rest,flaps:.51});close(binding('Flap-Inner-L').angle*180/Math.PI,-86,'Split flaps down detent');

// The mirrored axis signs give opposing physical ailerons and matching elevators.
rig.configure(rest);
function trailingSample(name){const bounds=box(name);return new THREE.Vector3(bounds.max.x,bounds.getCenter(new THREE.Vector3()).y,bounds.getCenter(new THREE.Vector3()).z);}
const points=['i0_Aileron-L','i0_Aileron-R','i0_Elevator-L','i0_Elevator-R'].map(name=>{const node=labFind(root,name);return{name,node,world:trailingSample(name),local:node.worldToLocal(trailingSample(name))};});
rig.configure({...rest,aileron:1,elevator:1});root.updateMatrixWorld(true);
const dy=points.map(point=>point.node.localToWorld(point.local.clone()).y-point.world.y);
assert(dy[0]*dy[1]<0,'Physical ailerons oppose');assert(dy[2]*dy[3]>0,'Physical elevators move together');
assert(Math.abs(Math.abs(dy[0])-Math.abs(dy[1]))<.002,'Ailerons mirror');assert(Math.abs(dy[2]-dy[3])<.002,'Elevators mirror');

// Source gear sequence has dwell at both ends; wheels tuck into their own wing.
const tail=labFind(root,'i0_Tyre');rig.configure(rest);root.updateMatrixWorld(true);const tailRest=tail.matrixWorld.clone();
for(const g of [0,.035,.07,.5,.93,.965,1]){
 rig.configure({...rest,gear:g});root.updateMatrixWorld(true);
 close(binding('Leg-Assembly-L').angle*180/Math.PI,interp([[0,-91.1],[.07,-91.1],[.93,0],[1,0]],g),'Left leg gear sequence');
 close(binding('Leg-Assembly-R').angle*180/Math.PI,-binding('Leg-Assembly-L').angle*180/Math.PI,'Right gear mirrors');
 close(binding('Door-L').angle*180/Math.PI,96*g,'Door source travel');
 close(binding('Door-R').angle*180/Math.PI,-96*g,'Door mirrored source travel');
 assert(tail.matrixWorld.equals(tailRest),'Fixed tail wheel never retracts');assert(tail.visible);
}
rig.configure(rest);
for(const [side,tyre] of [['L','i0_tyre-l'],['R','i0_tyre']]){
 const wing=new THREE.Box3();for(const name of [`i0_Stub-Wing-${side}`,`i0_Wing-${side}`,`i0_Wing-${side}-Outer`])wing.union(box(name));
 const wheel=box(tyre);assert(wing.containsBox(wheel),side+' retracted wheel lies inside wing bounds');assert(labFind(root,tyre).visible,'Retraction uses geometry, not hiding');
}
rig.configure({...rest,gear:1});
const contacts=facts.fdm_geometry.gear_contacts.filter(contact=>contact.is_wheel);
const lows=contacts.map(contact=>contact.glb[1]*Math.cos(rig.groundPitch)-contact.glb[0]*Math.sin(rig.groundPitch));
assert(Math.max(...lows)-Math.min(...lows)<.001,'Flight model contacts align at parked pitch');

rig.configure({...rest,fold:1});
for(const [name,degrees] of [['Wing-L-Outer',-110],['Wing-R-Outer',110],['Wing-Tip-T-L',110],['Wing-Tip-T-R',-110]])close(binding(name).angle*180/Math.PI,degrees,name+' exact fold endpoint');
assert(rig.bounds().getSize(new THREE.Vector3()).z<4.3,'Double fold reduces span to source folded footprint');
for(const side of ['L','R']){
 const tip=binding(`Wing-Tip-T-${side}`).hinge,main=binding(`Wing-${side}-Outer`).hinge;let inherits=false;
 for(let parent=tip.parent;parent;parent=parent.parent)if(parent===main)inherits=true;
 assert(inherits,'Tip inherits main wing fold '+side);
}
rig.configure({...rest,hook:1});assert(meshList(labFind(root,'i0_Arrester-Hook')).every(mesh=>mesh.visible),'Naval hook stays visible');
rig.configure(rest);
assert(meshList(root).filter(mesh=>!mesh.visible).every(mesh=>mesh.userData.labHiddenReason),'Every hidden part has a source reason');
for(const name of ['i0_Cover-Engine-T','i0_Headrest','i0_Bulkhead-F','i10_disk'])assert(labFind(root,name).visible,'Structural parts and instrument discs survive heuristic false positives');
const top=labFind(root,'i0_Wing-T-Outer-L');assert(top.material.map.name.includes('seafire-tx-02'),'Source naval wing paint applied');assert.equal(top.material.map.flipY,false);assert.equal(top.material.map.colorSpace,THREE.SRGBColorSpace);
assert.equal(rig.liveries.options.length,0,'Source has no invented alternate liveries');
const materials=[...new Set(meshList(root).flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]))],maps=new Map(materials.map(material=>[material,material.map]));
inspectAppearance(root,'clay');inspectAppearance(root,'textured');for(const material of materials)assert.equal(material.map,maps.get(material),'Texture restore');
const spinPose=rig.propeller.quaternion.clone();rig.spin(.2,0);assert(rig.propeller.quaternion.equals(spinPose));rig.update(.2,{roll:1,pitch:1,throttle:1},true,true);assert(rig.propeller.quaternion.equals(spinPose));rig.spin(.2,.8);assert(!rig.propeller.quaternion.equals(spinPose));

// Compare against the untouched ChatGPT version without changing its fixtures.
const originalGltf=await fixture(),original=prepareAdditionalAircraft(originalGltf.scene,'seafire');original.configure(presetState(false));
assert.equal(original.report.limitsDegrees.fold,82);assert.equal(original.report.limitsDegrees.rudder,12);assert.equal(original.report.limitsDegrees.flaps,25);
assert.equal(rig.report.limitsDegrees.fold,110);assert.equal(rig.report.limitsDegrees.rudder,30);assert.equal(rig.report.limitsDegrees.flaps,86);
console.log('Seafire Lab: XML controls, double folds, hook, fixed tail wheel, gear containment/sequence, proportions, source paint and cleared donor propeller passed');
