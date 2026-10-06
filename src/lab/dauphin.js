import * as THREE from 'three';
import {meshList,clamp} from '../rig-tools.js';
import {labFind,makeXmlRig,quarantine,sourceGlass} from './lab-tools.js';
import {sourceRotor,mapRange} from './rotor-tools.js';
const groups={TrainAvant:['axeAH','axeAB','verinA','roueA'],TrainGauche:['axeGH','axeGB','axeG1','axeG2','axeG3','roueG'],TrainDroit:['axeDH','axeDB','axeD1','axeD2','axeD3','roueD']};
const fields=['gear','doors','collective','cyclicPitch','cyclicRoll','rudder','engine'];
function driver(a,s){const p=a.property??'';if(/gear.*position-norm/.test(p))return s.gear;if(/float\[(10|11|24|25|26|27)\]/.test(p))return s.doors;return null;}
export async function prepareDauphinLab(root,animations,facts){
 root.traverse(o=>{if(o.name.startsWith('pivot_'))o.quaternion.identity();});root.updateMatrixWorld(true);
 const schedule=facts.animations_from_xml.slice(0,28),moving=new Set(),corrected=[];
 for(const [sourceIndex,a]of schedule.entries()){
  if(driver(a,{gear:0,doors:0})==null)continue;
  const names=groups[a.objects[0]]??a.objects;
  for(const name of names){const node=labFind(root,'i0_'+name);if(!node)continue;moving.add(node);corrected.push({...a,glb_nodes:[node.name],sourceIndex,travel:a.travel??[Math.min(0,Number(a.factor)),Math.max(0,Number(a.factor))]});}
 }
 for(const node of moving){root.attach(node);root.updateMatrixWorld(true);}
 // Retain sound hub/mast meshes, replace only duplicated/segmented blades.
 for(const mesh of meshList(root))if(/^i(?:[7-9]|10|1[3-9]|2[0-3])_/.test(mesh.name)||/propblur|propdisc/i.test(mesh.name))quarantine(mesh,'Original segmented rotor export duplicates blades; replaced at exact FDM dimensions','rotor',true);
 const main=sourceRotor(root,facts,0,'dauphin_lab_main_rotor'),tail=sourceRotor(root,facts,1,'dauphin_lab_tail_rotor');
 for(const rotor of [main,tail])for(const blade of rotor.blades)for(const mesh of meshList(blade)){
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  materials[0].color.set('#444b51');materials[1]?.color.set('#c8cbd0');
  for(const material of materials)material.userData.labMaterialReason='Neutral dark rotor / pale tips from M-IKEY Dauphin reference; renderer palette approximation';
 }
 for(const rotor of [main,tail])for(const child of rotor.rotor.children.filter(c=>c.isMesh&&/hub$/.test(c.name))){quarantine(child,'Authored rotor hub and mast retained; duplicate generated hub unnecessary','rotor',true);}
 const glass=['vitres','vitrescrewG','vitrescrewD','vitreporteAG','vitreporteBG','vitreporteAD','vitreporteBD'].map(n=>'i0_'+n);
 const paint=meshList(root).filter(m=>/^i0_/.test(m.name)&&m.geometry.attributes.uv).map(m=>m.name);
 const rig=await makeXmlRig(root,animations,{...facts,animations_from_xml:corrected},{
  fields,driver,properties:{'sim/multiplay/generic/bool[2]':false,'sim/multiplay/generic/bool[3]':false},
  stateProperties:s=>({'rotors/main/rpm':s.engine*355,'rotors/tail/rpm':s.engine*3584}),
  liveryOptions:{slots:{'sim/model/livery/texture':paint}},
  finishMaterials:()=>sourceGlass(root,glass,'Dauphin glass effect; standard pane layer selected, HDR duplicate inactive'),
  limits:{doors:70,collective:12,cyclicPitch:12,cyclicRoll:8,rudder:[-20,14]},
  configure:s=>{main.setPitch(mapRange(s.collective,main.limits.collective),s.cyclicPitch*12,s.cyclicRoll*8);tail.setPitch(s.rudder<0?s.rudder*20:s.rudder*14);},
  spin:(dt,engine)=>{main.spin(dt,engine);tail.spin(dt,engine);},
  flightTargets:(s,active)=>({collective:active?clamp(s.throttle,0,1):0,cyclicPitch:active?clamp(s.pitch/.58,-1,1):0,cyclicRoll:active?clamp(s.roll/.65,-1,1):0,rudder:active?clamp(s.roll/.65,-1,1):0}),
  summary:'Lab Dauphin: FDM11.94m four-blade rotor /1.10m eleven-blade Fenestron; original XML−90° gear plus±35° twist,−80° bay doors;70° cabin doors and0.95m source slide. Original12 named liveries.',
  rigExtras:{mainRotor:main,tailRotor:tail,labels:{rudder:'Tail rotor pitch'}},
 });
 rig.report.normalizedRanges={collective:main.limits.collective};
 Object.assign(rig.report,{sourceVariant:'SA365 source set / AS365 N3 specification comparison',mainRotorBlades:4,tailRotorBlades:11,rotorProfile:main.profileNote,sourceLimitNotes:{rotors:'Dauphin YASim min/max collective−12/+12, cyclic elevator±12/aileron±8, tail−20/+14; independent mechanical inspection channels, not a full aerodynamic rotor simulation',ground:'Three trusted source contacts are coplanar; parked0°',variant:'Missing dauphin-base.xml prevents resolving nose/HDR startup aliases; inspect standard nez1/panes, independently revealable'}});
 return rig;
}
