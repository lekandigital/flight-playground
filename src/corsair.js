import {meshList,hinge,groupParts,flattenVisibility,rotation,deflect,presetState,parkingPitch} from './rig-tools.js';
import * as THREE from 'three';
const RAD=Math.PI/180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const find=(root,name)=>root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
function visibleBounds(root){root.updateMatrixWorld(true);const box=new THREE.Box3();root.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return box;}
function makePropeller(radius){
 const rotor=new THREE.Group();rotor.name='procedural_corsair_propeller';
 const bladeMaterial=new THREE.MeshStandardMaterial({color:'#171c24',metalness:.45,roughness:.32,side:THREE.DoubleSide});const tipMaterial=new THREE.MeshStandardMaterial({color:'#efc34e',metalness:.2,roughness:.4,side:THREE.DoubleSide});
 const positions=[],indices=[],groups=[];const rings=20,sections=8;
 for(let ring=0;ring<=rings;ring++){const t=ring/rings,r=.12+(radius-.12)*t,width=(.12+.21*Math.sin(Math.PI*Math.pow(t,.75)))*(t>.95?.6:1),thickness=.032*(1-.55*t),twist=(31-17*t)*RAD;
  for(let j=0;j<sections;j++){const a=j/sections*Math.PI*2,x=Math.cos(a)*thickness,z=Math.sin(a)*width*.5;positions.push(x*Math.cos(twist)+z*Math.sin(twist),r,-x*Math.sin(twist)+z*Math.cos(twist)+t*t*.11);}}
 for(let ring=0;ring<rings;ring++){const start=indices.length;for(let j=0;j<sections;j++){const a=ring*sections+j,b=ring*sections+(j+1)%sections,c=(ring+1)*sections+j,d=(ring+1)*sections+(j+1)%sections;indices.push(a,b,c,b,d,c);}groups.push({start,count:indices.length-start,materialIndex:ring>=17?1:0});}
 // Close root and tip, so the generated blade has solid geometry.
 for(const ring of [0,rings]){const start=indices.length;for(let j=1;j<sections-1;j++)indices.push(ring*sections,ring*sections+j,ring*sections+j+1);groups.push({start,count:indices.length-start,materialIndex:ring===rings?1:0});}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);for(const g of groups)geo.addGroup(g.start,g.count,g.materialIndex);geo.computeVertexNormals();
 for(let i=0;i<3;i++){const blade=new THREE.Mesh(geo,[bladeMaterial,tipMaterial]);blade.name=`procedural_blade_${i+1}`;blade.rotation.x=i*Math.PI*2/3;rotor.add(blade);}
 const hubMaterial=new THREE.MeshStandardMaterial({color:'#aeb9c5',metalness:.8,roughness:.24});const hub=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.43,24),hubMaterial);hub.rotation.z=Math.PI/2;hub.name='procedural_propeller_hub';rotor.add(hub);const nose=new THREE.Mesh(new THREE.SphereGeometry(.17,20,12),hubMaterial);nose.name='procedural_propeller_nose';nose.position.x=-.215;nose.scale.x=.68;rotor.add(nose);
 const blurMaterial=new THREE.MeshBasicMaterial({color:'#222b37',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});const blur=new THREE.Mesh(new THREE.RingGeometry(.23,radius,64),blurMaterial);blur.rotation.y=Math.PI/2;blur.name='procedural_propeller_blur';rotor.add(blur);
 return {rotor,blurMaterial,radius};
}
export function prepareCorsair(root){
 for(const n of ['i16_frontglass','i16_canopyglas']){const o=find(root,n);if(o?.isMesh)o.material=new THREE.MeshPhysicalMaterial({color:'#28495a',metalness:.1,roughness:.24,transparent:true,opacity:.43,depthWrite:false,side:THREE.DoubleSide});}
 const allMeshes=meshList(root);const hide=o=>o?.traverse(m=>{if(m.isMesh)m.visible=false;});
 for(const name of ['i17_external loads','i15_propdisk','i0_prop','i0_hubturn'])hide(find(root,name));root.traverse(o=>{if(/rocket|rocketrails/i.test(o.name))hide(o);if(o.name.startsWith('pivot_'))o.quaternion.identity();});
 const leftWing=find(root,'i2_leftwing'),rightWing=find(root,'i7_rightwing');
 const surfaces={leftAileron:hinge(root,['i2_aileron.L'],'z',leftWing),rightAileron:hinge(root,['i7_aileron.R'],'z',rightWing),leftElevator:hinge(root,['i0_elevator.L']),rightElevator:hinge(root,['i0_elevator.R']),rudder:hinge(root,['i0_rudder'],'y')};
 const flaps=['i0_flap1.L','i0_flap2.L','i0_flap1.R','i0_flap2.R','i2_flap3.L','i7_flap3.R'].map(name=>hinge(root,[name],'z',name.startsWith('i2')?leftWing:name.startsWith('i7')?rightWing:root));
 const gearNames=allMeshes.filter(m=>/^(i0_)(?:gear(?:p\d|leg|cylinder|sc\d)|wheel|tailgear|tailwheel\d?$)/i.test(m.name));
 const leftGear=groupParts(root,gearNames.filter(m=>m.name.endsWith('L')),new THREE.Vector3(2.332,-.78,1.632),'repaired_main_gear_left');
 const rightGear=groupParts(root,gearNames.filter(m=>m.name.endsWith('R')),new THREE.Vector3(2.332,-.78,-1.632),'repaired_main_gear_right');
 const tailGear=groupParts(root,gearNames.filter(m=>/tail/i.test(m.name)),new THREE.Vector3(8.345,-.522,0),'repaired_tail_gear');hide(find(root,'i0_hook'));
 const cowling=new THREE.Box3().setFromObject(find(root,'i0_cowling')),center=cowling.getCenter(new THREE.Vector3()),radius=Math.max(cowling.max.y-cowling.min.y,cowling.max.z-cowling.min.z)*1.2,prop=makePropeller(radius);prop.rotor.position.set(cowling.min.x-.36,center.y,center.z);root.add(prop.rotor);
 const baseline=flattenVisibility(root),wingPivots=[find(root,'pivot_056_i2_leftwing'),find(root,'pivot_057_i7_rightwing')];
 const canopyPivots=[find(root,'pivot_055_canopy'),find(root,'pivot_062_i16_canopyglas')],canopyRest=canopyPivots.map(o=>o.position.clone());
 const cowlPivots=[];root.traverse(o=>{if(/^pivot_.*cowlflap/i.test(o.name))cowlPivots.push(o);});
 const doors=[];root.traverse(o=>{if(/^pivot_.*(?:geardoor|doorlogo|tailwheeldoor)/i.test(o.name))doors.push(o);});
 let config=presetState(false),current={...config};
 function apply(state){config={...presetState(false),...state};for(const [m,v]of baseline)m.visible=v;const gear=clamp(config.gear,0,1),fold=clamp(config.fold,0,1);rotation(wingPivots[0],new THREE.Vector3(1,0,0),-85*fold);rotation(wingPivots[1],new THREE.Vector3(1,0,0),85*fold);
  for(const group of [leftGear,rightGear]){rotation(group,new THREE.Vector3(0,0,1),95*(1-gear));for(const m of meshList(group))m.visible=gear>.015;}
  rotation(tailGear,new THREE.Vector3(0,0,1),-80*(1-gear));for(const m of meshList(tailGear))m.visible=gear>.015;
  for(const door of doors){const left=/L$/.test(door.name),front=/front|doorlogo/.test(door.name);rotation(door,front?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0),gear*(front?-72:left?-65:65));}
  canopyPivots.forEach((o,i)=>o.position.copy(canopyRest[i]).add(new THREE.Vector3(clamp(config.canopy,0,1)*.7,0,0)));
  for(const o of cowlPivots){const angle=clamp(config.cowl,0,1)*8;rotation(o,new THREE.Vector3(0,/L$/.test(o.name)?-1:1,0),angle);}
  for(const flap of flaps)deflect(flap,-clamp(config.flaps,0,1)*25);
  deflect(surfaces.leftAileron,clamp(config.aileron,-1,1)*18);deflect(surfaces.rightAileron,-clamp(config.aileron,-1,1)*18);deflect(surfaces.leftElevator,clamp(config.elevator,-1,1)*14);deflect(surfaces.rightElevator,clamp(config.elevator,-1,1)*14);deflect(surfaces.rudder,-clamp(config.rudder,-1,1)*12);
 }
 function update(dt,state,active,paused){if(paused)return;const target={...presetState(false),aileron:active?clamp(state.roll/.65,-1,1):0,elevator:active?clamp(state.pitch/.58,-1,1):0,rudder:active?clamp(state.roll/.65,-1,1):0};const d=1-Math.exp(-dt*9);for(const key of ['aileron','elevator','rudder'])current[key]+=(target[key]-current[key])*d;apply(current);spin(dt,active?state.throttle:.06);}
 function spin(dt,throttle){if(throttle<=0){prop.blurMaterial.opacity=0;return;}prop.rotor.rotation.x=(prop.rotor.rotation.x+dt*(5+clamp(throttle,0,1)*100))%(Math.PI*2);prop.blurMaterial.opacity=throttle>.3?.045:0;}
 const report={limitsDegrees:{aileron:18,elevator:14,rudder:12,fold:85,flaps:25,cowl:8},propellerRadius:radius,propellerCenter:prop.rotor.position.toArray()};root.userData.corsairRepair=report;apply(presetState(true));const groundPitch=parkingPitch(root,['i0_wheel.L','i0_wheel.R'],['i0_tailwheel']);apply(presetState(false));
 return {update,configure:apply,spin,surfaces,propeller:prop.rotor,report,bounds:()=>visibleBounds(root),fields:['gear','fold','canopy','flaps','aileron','elevator','rudder','cowl','engine'],groundPitch};
}
