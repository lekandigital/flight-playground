import {makeXmlRig,defaultDriver,quarantine,labFind,fdmPropeller,placeOnGround,sourceGlass} from './lab-tools.js';
import * as THREE from 'three';
import {meshList} from '../rig-tools.js';

// The Vb shares XML with the naval model, but never folds its wings or deploys a hook.
export async function prepareSpitfireLab(root,animations,facts){
 const propeller=fdmPropeller(root,facts,{useOriginal:true,bladeCount:3});
 const rpm=facts.fdm_geometry.propellers[0].cruise_rpm;
 const exterior=new Set(['Aileron-L','Aileron-R','Elevator-L','Elevator-R','Rudder','Propeller','Spinner','Door-L','Door-R','Leg-Assembly-L','Leg-Assembly-R','Tail-Wheel-Assembly','Canopy-Main','Door','Flap','Flap-Inner-L','Flap-Inner-R','Flap-Outer-L-Inner','Flap-Outer-R-Inner','Flap-Outer-L-Outer','Flap-Outer-R-Outer']);
 const scoped={...facts,source_conditions:facts.source_conditions.filter(a=>/\/(spitfireV_model|rgs-mk2|fuel)\.xml$/.test(a.source_xml)).map(a=>({...a,glb_nodes:a.objects.map(n=>`${a.source_xml.endsWith('rgs-mk2.xml')?'i36':a.source_xml.endsWith('fuel.xml')?'i15':'i0'}_${n}`)}))};
 const rig=await makeXmlRig(root,animations,scoped,{
  animationFilter:a=>a.source_xml?.endsWith('/spitfireV_model.xml')&&exterior.has(a.objects[0])&&!/wing-fold/.test(a.property),
  driver:defaultDriver,
  normalize:s=>({...s,flaps:s.flaps>=.5?1:0,fold:0}),
  fields:['gear','canopy','doors','flaps','cowl','aileron','elevator','rudder','engine'],
  properties:{'controls/gear/chock-left':false,'controls/gear/chock-right':false,'controls/switches/fuel-gauge':false,'controls/switches/gun-sight-main':false},
  stateProperties:s=>({'gear/gear/position-norm':s.gear,'gear/gear[0]/position-norm':s.gear,'gear/gear[1]/position-norm':s.gear,'gear/gear/wow':s.gear===1,'gear/gear[1]/wow':s.gear===1,'engines/engine[0]/rpm':s.engine*rpm/Number(facts.animations_from_xml.find(a=>a.type==='spin').factor)}),
  // FlightGear spin properties are RPM, with factor .477 accounting for gearing.
  rpm:rpm/Number(facts.animations_from_xml.find(a=>a.type==='spin').factor),
  limits:{aileron:20,elevator:15,rudder:15,flaps:86,cowl:70,doors:170},
  summary:'Lab Mk Vb: fixed tail wheel, two-position 86° flaps, XML gear/door sequence, 0.57 m canopy, original three-blade propeller and paint.',
 });
 const propBox=new THREE.Box3().setFromObject(labFind(root,'i0_Propeller'));rig.report.propellerDiameter=2*Math.max(propBox.max.y,-propBox.min.y,propBox.max.z,-propBox.min.z);rig.report.fdmPropellerDiameter=2*propeller.radius;rig.report.propellerBlades=3;
 rig.report.ground=placeOnGround(root,facts);rig.report.variant='Spitfire Mk Vb';
 rig.report.remaining=['Download has no named livery alternatives. Museum comparison is a Mk Vc: use it for common airframe details, not its wing armament or markings.'];
 // These exported overlay objects have no exterior function in this viewer.
 for(const name of ['i0_Pilot','i36_mk1','i36_mount-back']){const node=labFind(root,name);if(node)quarantine(node,name.includes('Pilot')?'Crew display omitted in aircraft inspector':'Source rgs-mk2.xml selects the Mk II sight; legacy Mk I overlay omitted',name.includes('Pilot')?'crew':'variant',true);}
 sourceGlass(root,['i0_Canopy-Main','i0_Canopy-Rear','i0_Canopy-FP','i0_Canopy-F-Stbd','i0_Canopy-F-Port','i0_Armour-Panel'],'spitfireV_model.xml / spitfireglass-uber.eff');
 rig.configure({gear:0,fold:0,engine:0});return rig;
}
