import * as THREE from 'three';
import {meshList,clamp} from '../rig-tools.js';
import {labFind,makeXmlRig,quarantine,sourceGlass} from './lab-tools.js';
const fields=['gear','canopy','flaps','aileron','elevator','rudder','speedbrake','hook','engine'];
const source='https://github.com/NikolaiVChr/f16/blob/master/Systems/jsb-controls.xml';
function objects(root,a){return [...new Set((a.glb_nodes??[]).filter(n=>/^i\d+_/.test(n)).map(n=>labFind(root,n)).filter(Boolean))].filter(n=>!n.parent?.name.startsWith(n.name+'_'));}
function driver(a,s){
 const p=a.property??'';
 if(/compression/.test(p))return 0;
 if(/canopy/.test(p))return s.canopy;
 if(/tailhook/.test(p))return s.hook;
 if(/gear.*position-norm/.test(p))return s.gear;
 if(/speedbrake/.test(p))return s.speedbrake;
 if(a.labControl==='aileron')return (a.objects[0].startsWith('Left')?-1:1)*s.aileron;
 if(/float\[6\]/.test(p))return clamp(s.flaps+s.aileron*21.5/20,-23/20,21.5/20);
 if(/float\[5\]/.test(p))return -clamp(s.flaps-s.aileron*21.5/20,-23/20,21.5/20);
 if(/HorizonTail/.test(a.objects.join(' ')))return (a.objects[0].startsWith('Left')?-1:1)*s.elevator*25/57.3;
 if(/rudder/.test(p))return s.rudder;
 // Leading-edge flaps are driven in degrees through the original FCS mapping.
 if(/flap-pos-norm/.test(p))return s.flaps*25;
 return null;
}
export async function prepareF16Lab(root,animations,facts){
 root.traverse(o=>{if(o.name.startsWith('pivot_'))o.quaternion.identity();});root.updateMatrixWorld(true);
 const schedule=facts.animations_from_xml.slice(8,47),moving=[...new Set(schedule.flatMap(a=>objects(root,a)))];
 for(const node of moving){root.attach(node);root.updateMatrixWorld(true);}
 // The exporter has baked a translation into the left gear family. Restore its
 // source bilateral rest pose from the right meshes, rather than inventing gear.
 const corrections=[];
 for(const right of moving.filter(n=>n.name.startsWith('i0_Right')&&/Strut|Tire/.test(n.name))){
  const left=labFind(root,right.name.replace('i0_Right','i0_Left'));if(!left)continue;
  const rb=new THREE.Box3().setFromObject(right),lb=new THREE.Box3().setFromObject(left),target=rb.getCenter(new THREE.Vector3());target.z=-target.z;
  const delta=target.sub(lb.getCenter(new THREE.Vector3()));left.position.add(delta);root.updateMatrixWorld(true);
  corrections.push({part:left.name,translation:delta.toArray(),reason:'Bilateral source gear rest pose; exporter left-family translation disagrees with FDM contacts'});
 }
 const corrected=[];
 for(const [sourceIndex,a]of facts.animations_from_xml.entries()){
  if(sourceIndex<8||sourceIndex>46||['spin','translate'].includes(a.type)&&!/compression/.test(a.property))continue;
  if(driver(a,Object.fromEntries(fields.map(k=>[k,0])))==null)continue;
  const nodes=objects(root,a);
  if(sourceIndex===27||sourceIndex===36){
   const side=sourceIndex===27?'Right':'Left';
   for(const suffix of ['InnerStrut','OuterLowerStrut','OuterUpperStrut']){
    const node=labFind(root,'i0_'+side+suffix);if(node&&!nodes.includes(node))nodes.push(node);
   }
  }
  for(const node of nodes){
   const entry={...a,glb_nodes:[node.name],sourceIndex};
   // FCS radian-valued elevator outputs are mislabeled normalized in pack travel.
   if(/HorizonTail/.test(a.objects.join(' ')))entry.travel=[-25,25];
   if(/float\[[56]\]/.test(a.property))entry.travel=[-23,23];
   if(/flap-pos-norm/.test(a.property))entry.travel=[-25,25];
   if(/speedbrake/.test(a.property)){
    const z=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).z;
    entry.glb_center=[a.glb_center[0],a.glb_center[1],Math.sign(z)*Math.abs(a.glb_center[2])];
    corrections.push({part:node.name,from:a.glb_center,to:entry.glb_center,reason:'Poor-fit mapped source brake centre is on the opposite side; snap lateral sign to actual mesh'});
   }
   corrected.push(entry);
  }
 }
 // XML shader rotations replace the commented-out aileron animations in the
 // author's source. Recreate their physical hinge line with its 21.5° mapping.
 for(const side of ['Right','Left']){
  const upper=labFind(root,'i0_'+side+'UpperAileron'),lower=labFind(root,'i0_'+side+'LowerAileron');
  for(const node of [upper,lower].filter(Boolean)){root.attach(node);corrected.push({type:'rotate',objects:[side+'UpperAileron'],glb_nodes:[node.name],property:'source/shader/aileron',labControl:'aileron',factor:21.5,travel:[-21.5,21.5],glb_center:[1.8,.05,(side==='Left'?1:-1)*4.1],glb_axis_dir:[.167,-.039,(side==='Left'?1:-1)*.985],source_xml:source});}
 }
 const properties={...facts.default_properties,'sim/multiplay/generic/int[10]':2,'sim/multiplay/generic/bool[36]':false,'sim/rendering/rembrandt/enabled':0,'sim/variant-id':0};
 // Source selectors target submodel roots, not every similarly named component.
 const sourceConditions=facts.source_conditions.filter(r=>!(r.objects.some(n=>/^(FrontTire|LeftMainTire|RightMainTire)$/.test(n))&&JSON.stringify(r.condition).includes('position-norm')));
 for(const name of facts.node_categories['ground equipment']??[])quarantine(labFind(root,name),'Clean inspection: source ground equipment inactive','equipment',true);
 for(const name of facts.node_categories['external stores']??[])quarantine(labFind(root,name),'YF-16 clean loadout: no payload selected in source set','equipment',true);
 for(const name of ['i2_Pilot_ext','i0_InternalFlame','i0_ExternalFlame'])quarantine(labFind(root,name),'Uncrewed dry-engine inspection; source crew/augmentation layer','equipment',true);
 const body=meshList(root).filter(m=>/^(fuselage[123]Mat|liveries)/.test(m.material?.name??'')&&m.material?.map?.name==='f16').map(m=>m.name);
 const logos=meshList(root).filter(m=>m.material?.map?.name==='f16trans').map(m=>m.name);
 // Avoid a shared paint material recoloring mechanical or cockpit parts.
 for(const name of [...body,...logos]){const node=labFind(root,name);if(node?.isMesh)node.material=node.material.clone();}
 sourceGlass(root,['i0_CanopyForwardInside','i0_CanopyForwardOutside','i0_CanopyBackInside','i0_CanopyBackOutside'],'F-16.xml canopy glass effects');
 const rig=await makeXmlRig(root,animations,{...facts,source_conditions:sourceConditions,animations_from_xml:corrected},{
  fields,driver,properties,stateProperties:s=>Object.fromEntries([0,1,2].map(i=>[`gear/gear[${i}]/position-norm`,s.gear])),
  liveryOptions:{slots:{'sim/model/livery/texture':body,'sim/model/livery-logo/texture':logos}},
  limits:{aileron:21.5,elevator:25,rudder:30,flaps:20,leadingEdgeFlaps:25,canopy:30,speedbrake:60,hook:57.175},
  summary:'Lab F-16: original compound landing gear and PW nozzle, XML 30° canopy / 60° brakes / 57.175° hook, FCS ±25° tailplanes, source prototype paint and 82 named liveries.',
 });
 Object.assign(rig.report,{sourceVariant:'YF-16 set (production-shape source airframe)',corrections,paintSlots:{body,logos},sourceRecovery:facts.source_recovery,sourceLimitNotes:{elevator:source+' ±25° actuator; radians ×57.3 is not ±57.3° travel',flaps:'FCS model mapping; inspection sliders expose mechanical limits, not full FBW simulation',variant:'Selected set is YF-16, but 75-0745 livery and airframe depict pre-production/production development; pack F-16C dimensions are not a YF-16 target'}});
 await rig.liveries.select('YF-16 Prototype');return rig;
}
