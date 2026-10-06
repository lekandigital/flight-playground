import assert from 'node:assert/strict';
import * as THREE from 'three';
import {meshList,inspectAppearance} from '../../src/rig-tools.js';
import {labFind} from '../../src/lab/lab-tools.js';
export const near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<e,`${a} vs ${b}`);
export function sample(root,name){
 const node=labFind(root,name),a=node.geometry.attributes.position;root.updateMatrixWorld(true);
 let local=new THREE.Vector3(),maximum=-Infinity;
 for(let i=0;i<a.count;i++){const point=new THREE.Vector3().fromBufferAttribute(a,i),world=point.clone().applyMatrix4(node.matrixWorld);if(world.x>maximum){maximum=world.x;local=point;}}
 return{node,local,rest:local.clone().applyMatrix4(node.matrixWorld)};
}
export async function checkSeaplane({root,facts,rig},expected){
 assert(rig.report.originalAnimationDisabled);assert(rig.isSeaplane);assert(!rig.fields.includes('gear'),'No invented float/boat gear retraction');
 near(rig.groundPitch*180/Math.PI,facts.fdm_geometry.parked_pitch_deg_nose_up);
 assert(rig.report.sourceLimitNotes.ground.includes('untrusted'),'Water datum limitation stated');
 assert(rig.spins.length===expected.props);
 assert(meshList(root).every(m=>!m.name.startsWith('procedural_')),'Sound original propellers retained');
 const size=rig.report.geometryMeasurements.levelFlight.size;
 for(const[actual,spec]of [[size[0],facts.real_world_specs.length_m],[size[1],facts.real_world_specs.height_m],[size[2],facts.real_world_specs.span_m]])if(spec)assert(Math.abs(actual/spec-1)<.05,'Actual level dimensions within5%');
 for(const p of rig.report.propellers){assert(Math.abs(p.diameter/p.fdmDiameter-1)<.03,'Actual original vertex diameter within3%');assert(p.count===2);}
 const matrices=()=>{root.updateMatrixWorld(true);return meshList(root).map(m=>m.matrixWorld.clone());},rest=Object.fromEntries(rig.fields.map(field=>[field,0]));
 for(const field of rig.fields)for(const endpoint of ['aileron','elevator','rudder'].includes(field)?[-1,1]:[0,1]){
  rig.configure({...rest,[field]:endpoint});const bounded=matrices();rig.configure({...rest,[field]:endpoint?endpoint*100:-100});const overshoot=matrices();
  for(let i=0;i<bounded.length;i++)assert(bounded[i].elements.every((v,j)=>Math.abs(v-overshoot[i].elements[j])<1e-8),field+' clamps every descendant transform');
 }
 rig.configure({...rest,aileron:1,elevator:1,rudder:1,doors:1});
 for(const b of rig.bindings){near(b.angle*180/Math.PI,expected.angle(b.anim));assert(b.anim.travel);assert(b.angle*180/Math.PI>=Math.min(...b.anim.travel)-1e-7&&b.angle*180/Math.PI<=Math.max(...b.anim.travel)+1e-7);}
 rig.configure(rest);const samples=['i0_aileronG','i0_aileronD',...(expected.splitElevator?['i0_profondeurG','i0_profondeurD']:[])].map(n=>sample(root,n));
 rig.configure({...rest,aileron:1,elevator:1});root.updateMatrixWorld(true);const dy=samples.map(s=>s.local.clone().applyMatrix4(s.node.matrixWorld).y-s.rest.y);
 assert(dy[0]*dy[1]<0,'Physical aileron trailing edges oppose');near(Math.abs(dy[0]),Math.abs(dy[1]),.015);
 if(expected.splitElevator){assert(dy[2]*dy[3]>0,'Physical elevator halves move together');near(dy[2],dy[3],.002);}
 rig.configure(rest);const float=labFind(root,expected.float);root.updateMatrixWorld(true);const floatRest=float.matrixWorld.clone();
 rig.configure({...rest,aileron:1,elevator:1,rudder:1,doors:1,engine:1});root.updateMatrixWorld(true);assert(float.matrixWorld.equals(floatRest),'Fixed floats/hull do not move with controls');
 for(const name of expected.bladeNames)assert(!labFind(root,name).visible,'XML high-rpm selector chooses disc');
 for(const name of expected.discNames)assert(labFind(root,name).visible,'XML high-rpm disc visible');
 rig.configure(rest);assert(meshList(root).filter(m=>!m.visible).every(m=>m.userData.labHiddenReason),'Every hidden part has source reason');
 for(const name of expected.bladeNames)assert(labFind(root,name).visible,'Original blades visible at rest');
 assert(rig.report.textures.applied.length>=expected.textures);const body=labFind(root,'i0_fuselage');assert(body.material.map);assert.equal(body.material.map.flipY,false);assert.equal(body.material.map.colorSpace,THREE.SRGBColorSpace);
 assert.equal(rig.liveries.options.length,1);await rig.liveries.select('Default');assert(body.material.map.name.endsWith('texture.png'));await rig.liveries.select('');
 const maps=new Map(meshList(root).flatMap(m=>Array.isArray(m.material)?m.material:[m.material]).map(m=>[m,m.map]));inspectAppearance(root,'clay');inspectAppearance(root,'textured');for(const[m,map]of maps)assert.equal(m.map,map);
 const quats=rig.spins.map(s=>s.hinge.quaternion.clone());rig.spin(.2,0);rig.update(.2,{throttle:1,pitch:1,roll:1},true,true);rig.spins.forEach((s,i)=>assert(s.hinge.quaternion.equals(quats[i]),'Stopped/paused source propeller does not turn'));
 rig.spin(.01,1);
 rig.spins.forEach((s,i)=>{near(s.degrees,.01*facts.fdm_geometry.propellers[i].cruise_rpm*6*Number(s.anim.factor));assert(s.hinge.quaternion.equals(new THREE.Quaternion().setFromAxisAngle(s.axis,s.degrees*Math.PI/180)),'Source shaft axis and RPM drive quaternion');});
}
