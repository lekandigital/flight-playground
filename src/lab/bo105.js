import * as THREE from 'three';
import {meshList,clamp} from '../rig-tools.js';
import {labFind,makeXmlRig,quarantine,sourceGlass} from './lab-tools.js';
import {sourceRotor,mapRange} from './rotor-tools.js';

const fields=['doors','collective','cyclicPitch','cyclicRoll','rudder','engine'];
const signed=(v,r)=>v<0?-v*r[0]:v*r[1];
const paintObjects=['fuselage','filler','door_front_L','door_front_R','door_back_L','door_back_R','door_stop_L','door_stop_R','rail_L','rail_R','ear_L','ear_R','funny_box','wire_cutter','hot','gatling','reardoor_L','reardoor_R','tail','tailplate','tailstab_L','tailstab_R','skirt'];
function driver(a,s){const p=a.property??'';if(/doors\/door/.test(p))return s.doors;if(p==='controls/flight/elevator')return s.cyclicPitch;if(p==='controls/flight/aileron')return s.cyclicRoll;if(p==='controls/flight/rudder')return s.rudder;return null;}

// Project the approximate XML hinge onto the nearest actual door edge. Movement
// along the axis is immaterial; only its perpendicular offset needs correcting.
function snapDoorLine(root,node,a){
 root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),axis=new THREE.Vector3().fromArray(a.glb_axis_dir).normalize(),origin=new THREE.Vector3().fromArray(a.glb_center),points=[];
 for(const m of meshList(node)){const tr=inv.clone().multiply(m.matrixWorld),pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){const p=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(tr),d=p.clone().sub(origin);d.addScaledVector(axis,-d.dot(axis));points.push({p,d,length:d.length()});}}
 points.sort((x,y)=>x.length-y.length);const close=points.filter(p=>p.length<=points[0].length+.006),delta=close.reduce((v,p)=>v.add(p.d),new THREE.Vector3()).divideScalar(close.length);
 return {center:origin.add(delta).toArray(),distance:delta.length()};
}

export async function prepareBo105Lab(root,animations,facts){
 root.traverse(o=>{if(o.name.startsWith('pivot_'))o.quaternion.identity();});root.updateMatrixWorld(true);
 const corrected=[],moving=new Set(),doorSnaps=[];
 for(const [sourceIndex,a]of facts.animations_from_xml.entries()){
  if(driver(a,Object.fromEntries(fields.map(f=>[f,0])))==null)continue;
  let center=a.glb_center;
  if(a.type==='rotate'&&/doors\/door/.test(a.property)){const door=labFind(root,'i0_'+a.objects[0]);if(door){const snapped=snapDoorLine(root,door,a);center=snapped.center;doorSnaps.push({sourceIndex,objects:a.objects,sourceCenter:a.glb_center,center,distance:snapped.distance});}}
  for(const name of a.objects){const node=labFind(root,'i0_'+name);if(!node)continue;moving.add(node);
   const domain=/controls\/flight/.test(a.property)?[-1,1]:[0,1],travel=a.travel??domain.map(v=>v*Number(a.factor??1)+Number(a.offset??0)).sort((x,y)=>x-y);
   corrected.push({...a,glb_center:center,glb_nodes:[node.name],sourceIndex,travel});
  }
 }
 // One binding per actual mesh preserves the source's compound slide/rotation
 // order without attaching a shared converted pivot to competing assemblies.
 for(const node of moving){root.attach(node);root.updateMatrixWorld(true);}
 for(const mesh of meshList(root)){
  if(/^i0_(?:blade\d[a-e]?|disc\d[a-e]?|tailrotor_blade\d|main_rotor_disc|rotor_disc_T)$/.test(mesh.name))quarantine(mesh,'Original segmented rotor export replaced by a continuous rotor at source FDM diameter/count/chord; source hub and mechanics retained','rotor',true);
  else if(/^i0_shadow_/.test(mesh.name))quarantine(mesh,'FlightGear projected shadow billboard; playground supplies real scene shadows','variant',true);
 }
 const main=sourceRotor(root,facts,0,'bo105_lab_main_rotor'),tail=sourceRotor(root,facts,1,'bo105_lab_tail_rotor');
 for(const rotor of [main,tail])rotor.rotor.rotation.y=Number(rotor.spec.source_parameters.phi0??0)*Math.PI/180;
 for(const rotor of [main,tail]){
  for(const blade of rotor.blades)for(const m of meshList(blade))for(const material of Array.isArray(m.material)?m.material:[m.material]){material.color.set('#25282b');material.userData.labMaterialReason='Supplied original Rotor/black.png and museum reference02 show dark blades. Set-requested orange.png is missing; black source fallback retained.';}
  for(const child of rotor.rotor.children.filter(c=>c.isMesh&&/hub$/.test(c.name)))quarantine(child,'Authored rotor hub and gearbox retained; duplicate generated hub unnecessary','rotor',true);
 }
 const properties={'sim/aircraft':'bo105','sim/crashed':false,'sim/model/bo105/miniguns':false,'sim/model/bo105/missiles':false,'sim/rendering/shadows-ac':true};
 for(let i=0;i<6;i++)properties[`sim/model/bo105/doors/door[${i}]/enabled`]=true;
 for(const n of ['strobe-top/state','strobe-bottom/state','beacon-top/state','beacon-bottom/state','nav-lights'])properties['sim/model/bo105/lighting/'+n]=false;
 // The XML names logical groups, whereas the GLB only exports their children.
 const conditionFacts={...facts,source_conditions:facts.source_conditions.map(r=>['pilot','copilot'].includes(r.objects?.[0])?{...r,glb_nodes:meshList(root).filter(m=>m.name.startsWith('i0_'+r.objects[0]+'_')||m.name.startsWith('i0_h'+(r.objects[0]==='pilot'?'p':'c')+'_')).map(m=>m.name)}:r),animations_from_xml:corrected};
 const contacts=facts.fdm_geometry.gear_contacts.slice(0,4),front=contacts[0].glb,rear=contacts[1].glb,groundPitch=Math.atan2(rear[1]-front[1],rear[0]-front[0]);
 const glasses=facts.node_categories['canopy/glass'];
 const rig=await makeXmlRig(root,animations,conditionFacts,{
  fields,driver,properties,groundPitch,
  limits:{doors:170,collective:main.limits.collective,cyclicPitch:main.limits.cyclicPitch,cyclicRoll:main.limits.cyclicRoll,rudder:[-10,20]},
  stateProperties:s=>({'rotors/main/rpm':s.engine*442,'rotors/tail/rpm':s.engine*2219}),
  configure:s=>{main.setPitch(mapRange(s.collective,main.limits.collective),signed(s.cyclicPitch,main.limits.cyclicPitch),signed(s.cyclicRoll,main.limits.cyclicRoll));tail.setPitch(mapRange((1-s.rudder)/2,tail.limits.collective));},
  spin:(dt,engine)=>{main.spin(dt,engine);tail.spin(dt,engine);},
  flightTargets:(s,active)=>({collective:active?clamp(s.throttle,0,1):0,cyclicPitch:active?clamp(s.pitch/.58,-1,1):0,cyclicRoll:active?clamp(s.roll/.65,-1,1):0,rudder:active?clamp(s.roll/.65,-1,1):0}),
  finishMaterials:()=>{
   const props=facts.default_properties,base='sim/model/bo105/material/fuselage/diffuse/';
   for(const name of paintObjects)for(const mesh of meshList(labFind(root,'i0_'+name)))for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){mat.color.setRGB(props[base+'red'],props[base+'green'],props[base+'blue']);mat.userData.labMaterialReason='bo105-set.xml Yellow MedEvac diffuse RGB [0.8,0.7,0.001]; original livery.rgb retained';}
   sourceGlass(root,glasses,'bo105-set.xml white glass diffuse and alpha0.2');
   for(const name of glasses)for(const mesh of meshList(labFind(root,name)))for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){mat.color.setRGB(1,1,1);mat.opacity=.2;mat.transmission=0;}
  },
  summary:'Lab Bo105 CBS: source Yellow MedEvac finish and visible wire cutter;9.98m four-blade main rotor /1.91m two-blade tail rotor.170° front and aft hinged doors,0.03m pop then0.6m passenger-door slide; fixed skids at1.01° source contact pitch.',
  rigExtras:{mainRotor:main,tailRotor:tail,labels:{rudder:'Tail rotor pitch'}},
 });
 rig.groundContacts=contacts;
 rig.report.normalizedRanges={collective:main.limits.collective};rig.report.signedRanges={rudder:[20,-10]};
 Object.assign(rig.report,{sourceVariant:'Eurocopter Bo105 CBS / Yellow MedEvac (bo105-set.xml)',mainRotorBlades:4,tailRotorBlades:2,doorSnaps,rotorProfile:main.profileNote,sourceLimitNotes:{ground:'Pack9.12° includes auxiliary tail contact; four exact fixed main-skid contacts give1.005°. Contacts are mislabeled wheels; actual skid outer surfaces extend about3cm below source contact datum.',variant:'Pack specs describe shorter Bo105CB, selected source set CBS. No named variant XML or alternate geometry supplied; original Yellow MedEvac livery retained.',paint:'Set requests Rotor/orange.png and medical insignia oebh.png, absent from pack. Available black rotor paint and source empty emblem retained; missing medical markings remain.',rotors:'FDM diameter/count/chord/shaft/RPM, tail phi0=110° resting azimuth and YASim mechanical ranges. Blade section is procedural; no articulated flapping, damping, or full rotor aerodynamics. Source tail-angle-deg is crash deformation, held0; fixed tail never folds.'}});
 return rig;
}
