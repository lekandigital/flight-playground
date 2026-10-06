import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fixture} from './fixture.mjs';
import {prepareSpitfireLab} from '../../src/lab/spitfire.js';
import {labFind} from '../../src/lab/lab-tools.js';
import {meshList,presetState} from '../../src/rig-tools.js';
const{root,animations,facts}=await fixture('fg-spitfire-spitfirevb-371986bf');
const rig=await prepareSpitfireLab(root,animations,facts),neutral={...presetState(true),wheelSteer:0};rig.configure(neutral);
assert(!rig.fields.includes('fold')&&!rig.fields.includes('hook'));
assert(Math.abs(rig.groundPitch*180/Math.PI-12.04)<1);
assert(Math.abs(rig.report.propellerDiameter/3.276-1)<.03);assert.equal(rig.report.propellerBlades,3);
const tail=labFind(root,'i0_Tyre'),tailRest=tail.getWorldPosition(new THREE.Vector3());rig.configure({...neutral,gear:0});assert(tail.getWorldPosition(new THREE.Vector3()).distanceTo(tailRest)<1e-7);assert(tail.visible);
const rest=()=>meshList(root).map(m=>{m.updateWorldMatrix(true,false);return m.matrixWorld.clone();});
for(const key of rig.fields.filter(k=>k!=='engine'))for(const sign of [-1,1]){rig.configure({...neutral,[key]:sign});const bounded=rest();rig.configure({...neutral,[key]:100*sign});rest().forEach((m,i)=>assert(m.elements.every((v,j)=>Math.abs(v-bounded[i].elements[j])<1e-8),key));}
rig.configure({...neutral,flaps:.2});assert(rig.bindings.filter(b=>/Flap-/.test(b.anim.objects[0])).every(b=>b.angle===0));rig.configure({...neutral,flaps:.8});assert(rig.bindings.filter(b=>/Flap-/.test(b.anim.objects[0])).every(b=>Math.abs(Math.abs(b.angle)-86*Math.PI/180)<1e-8));
const canopy=rig.bindings.find(b=>b.anim.type==='translate');rig.configure({...neutral,canopy:1});assert(Math.abs(canopy.angle-.57)<1e-8);
rig.configure(neutral);const size=rig.bounds().getSize(new THREE.Vector3());assert(Math.abs(size.x/9.119-1)<.05);assert(Math.abs(size.z/11.227-1)<.05);
const contacts=rig.groundContacts.map(c=>c.glb[1]*Math.cos(rig.groundPitch)-c.glb[0]*Math.sin(rig.groundPitch));assert(Math.max(...contacts)-Math.min(...contacts)<.001,'FDM wheel contacts share parked ground plane');
const actualProp=new THREE.Box3().setFromObject(labFind(root,'i0_Propeller'));assert(Math.abs(Math.max(actualProp.max.y,-actualProp.min.y,actualProp.max.z,-actualProp.min.z)/1.638-1)<.03,'Actual solid blade radius within FDM tolerance');
const box=name=>{root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(labFind(root,name));};
const binding=name=>{const b=rig.bindings.find(b=>b.anim.objects[0]===name);assert(b,'Missing source motion '+name);return b;};
for(const gear of [0,.035,.07,.5,.93,.965,1]){rig.configure({...neutral,gear});const left=binding('Leg-Assembly-L').angle,right=binding('Leg-Assembly-R').angle;assert(Math.abs(left+right)<1e-8);assert(Math.abs(binding('Door-L').angle+binding('Door-R').angle)<1e-8);assert(labFind(root,'i0_tyre-l').visible&&labFind(root,'i0_tyre').visible);}
rig.configure({...neutral,gear:0});
for(const[side,tyre]of [['L','i0_tyre-l'],['R','i0_tyre']]){const wing=new THREE.Box3();for(const n of [`i0_Stub-Wing-${side}`,`i0_Wing-${side}`,`i0_Wing-${side}-Outer`]){const node=labFind(root,n);if(node)wing.union(box(n));}assert(wing.containsBox(box(tyre)),side+' wheel contained in source wing');}
rig.configure({...neutral,aileron:1,elevator:1,rudder:1});for(const[name,deg]of [['Aileron-L',-20],['Aileron-R',-20],['Elevator-L',-15],['Elevator-R',15],['Rudder',-15]])assert(Math.abs(binding(name).angle*180/Math.PI-deg)<1e-8);
rig.configure(neutral);assert(meshList(labFind(root,'i0_Pilot')).every(m=>!m.visible),'Permanent crew quarantine survives configure');
for(const m of meshList(root).filter(m=>!m.visible))assert(m.userData.labHiddenReason,'Missing hidden reason '+m.name);
assert(rig.report.textures.applied.length>0);assert(rig.bindings.every(b=>b.anim.source_xml.endsWith('spitfireV_model.xml')));
const prop=rig.spins[0],q=prop.hinge.quaternion.clone();rig.spin(.2,0);assert(prop.hinge.quaternion.equals(q));rig.spin(.2,1);assert(!prop.hinge.quaternion.equals(q));
console.log('Spitfire Lab: XML clamps, binary flaps, fixed tail, canopy, dimensions, source paint and hidden reasons passed.');
