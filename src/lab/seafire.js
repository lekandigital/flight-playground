import {borrowFourBladePropeller} from './donor-parts.js';
import * as THREE from 'three';
import {clamp,meshList,presetState,visibleBounds} from '../rig-tools.js';
import {makeXmlRig,labFind,quarantine,fdmPropeller,interp,sourceGlass} from './lab-tools.js';

const controls=new Set(['Aileron-L','Aileron-R','Flap-Inner-L','Flap-Inner-R','Flap-Outer-L-Inner','Flap-Outer-L-Outer','Flap-Outer-R-Inner','Flap-Outer-R-Outer','Elevator-L','Elevator-R','Rudder-Assmbly','Propeller','Spinner','Door-L','Door-R','Leg-Assembly-L','Leg-Assembly-R','Flap','Canopy-Main','Door','Wing-R-Outer','Wing-L-Outer','Wing-Tip-T-R','Wing-Tip-T-L','Arrester-Hook']);
const describeBox=box=>({min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()});

// The naval source supplies the four solid blades, two-stage folds and hook.
// Its cockpit gauges share heuristic channels with exterior parts: only these
// exact exterior properties are driven by the aircraft inspector.
export async function prepareSeafireLab(root,animations,facts){
 root.updateMatrixWorld(true);
 const imported=describeBox(visibleBounds(root));
 const propellerNode=labFind(root,'i0_Propeller'),spinner=labFind(root,'i0_Spinner');
 const propBox=new THREE.Box3().setFromObject(propellerNode),propRadius=Math.max(propBox.max.y,-propBox.min.y,propBox.max.z,-propBox.min.z);
 const sourceProp=fdmPropeller(root,facts,{useOriginal:true,bladeCount:Number(facts.real_world_specs['prop blade number'])});
 // Source conditions choose the Mk II gunsight, but empty select elements do
 // not have a Boolean AST. Keep the inactive Mk I parts revealable.
 for(const name of ['i36_mk1','i36_mount-back'])quarantine(labFind(root,name),'Source rgs-mk2.xml: empty select disables the alternate Mk I gunsight.');
 const exteriorFacts={...facts,source_conditions:(facts.source_conditions??[]).filter(rule=>/\/(?:seafire_model|rgs-mk2|fuel)\.xml$/.test(rule.source_xml)).map(rule=>({...rule,glb_nodes:(rule.objects??[]).map(name=>`${/rgs-mk2\.xml$/.test(rule.source_xml)?'i36':/fuel\.xml$/.test(rule.source_xml)?'i15':'i0'}_${THREE.PropertyBinding.sanitizeNodeName(name)}`)})),animations_from_xml:(facts.animations_from_xml??[]).map(animation=>({
  ...animation,
  // Navigation light submodels are empty unsupported shader markers. The
  // visible i0 lights already inherit their source wing/tip/rudder assembly.
  glb_nodes:(animation.glb_nodes??[]).filter(name=>!/^i(?:38|39|40)_/.test(name))
 }))};
 function driver(animation,state){
  const p=(animation.property??'').replace(/^\//,'');
  if(/compression|caster|rollspeed/.test(p))return null;
  if(p==='gear/tailhook/position-norm')return state.hook;
  if(p==='controls/flight/door-position-norm')return state.doors;
  if(p==='engines/engine/cowl-flaps-norm')return state.cowl;
  if(p==='surface-positions/wing-fold-pos-norm')return state.fold;
  if(p==='gear/canopy/position-norm')return state.canopy;
  if(/^gear\/gear(?:\[\d+\])?\/position-norm$/.test(p))return state.gear;
  if(p==='surface-positions/flap-pos-norm')return state.flaps;
  if(p==='surface-positions/left-aileron-pos-norm')return state.aileron;
  if(p==='surface-positions/right-aileron-pos-norm')return -state.aileron;
  if(p==='surface-positions/elevator-pos-norm')return state.elevator;
  if(p==='surface-positions/rudder-pos-norm')return state.rudder;
  return null;
 }
 const travelFor=object=>(facts.animations_from_xml??[]).find(a=>a.objects?.[0]===object&&a.travel)?.travel??[0,0];
 const maxTravel=object=>Math.max(...travelFor(object).map(Math.abs));
 const fields=['gear','fold','hook','canopy','doors','flaps','cowl','aileron','elevator','rudder','engine'];
 const rig=await makeXmlRig(root,animations,exteriorFacts,{
  animationFilter:a=>controls.has(a.objects?.[0])&&(!/compression|caster|rollspeed/.test(a.property??'')),
  driver,fields,defaults:{hook:0,doors:0,cowl:0},
  normalize:state=>{
   const normalized={...state};for(const key of fields)normalized[key]=clamp(Number(state[key])||0,['aileron','elevator','rudder'].includes(key)?-1:0,1);
   // The source flap lever has up/down detents; aerodynamic blow-back is not
   // simulated by this static inspector.
   normalized.flaps=normalized.flaps>=.5?1:0;return normalized;
  },
  rpm:facts.fdm_geometry.propellers[0].cruise_rpm/.477,
  stateProperties:state=>({'engines/engine[0]/rpm':state.engine*facts.fdm_geometry.propellers[0].cruise_rpm/.477,'sim/model/spitfire/show-pilot':true,'controls/gear/chock-left':false,'controls/gear/chock-right':false}),
  limits:{aileron:maxTravel('Aileron-L'),elevator:maxTravel('Elevator-L'),rudder:maxTravel('Rudder-Assmbly'),flaps:maxTravel('Flap-Inner-L'),fold:maxTravel('Wing-L-Outer'),hook:maxTravel('Arrester-Hook'),doors:maxTravel('Door'),cowl:maxTravel('Flap')},
  summary:'Lab: source Seafire naval paint and four donor propeller blades at the source diameter; 110° wing and tip folds, visible 60° arrester hook, fixed tail wheel, XML gear sequence and 86° split flaps.'
 });
 const donorProp=await borrowFourBladePropeller(root,facts,propellerNode);
 rig.report.borrowedParts=[donorProp.provenance];rig.report.propellerSource='cleared donor blade contours / source paint and XML shaft';
 sourceGlass(root,['i0_Canopy-Main','i0_Canopy-Rear','i0_Canopy-FP','i0_Canopy-F-Stbd','i0_Canopy-F-Port','i0_Armour-Panel'],'seafire_model.xml / spitfireglass-uber.eff');
 rig.configure(presetState(false));root.updateMatrixWorld(true);
 const corrected=describeBox(visibleBounds(root));
 const geometryMeasurements={imported,lab:corrected,reference:{length:facts.real_world_specs.length_m,span:facts.real_world_specs.span_m,height:facts.real_world_specs.height_m},propellerRadius:propRadius};
 const surfaces={};for(const binding of rig.bindings){const object=binding.anim.objects[0];if(/Aileron|Elevator|Rudder/.test(object))surfaces[object]=binding;}
 const hidden=meshList(root).filter(mesh=>!mesh.visible).map(mesh=>({name:mesh.userData.originalName??mesh.name,reason:mesh.userData.labHiddenReason??'Imported source visibility'}));
 Object.assign(rig,{propeller:rig.spins.find(s=>s.anim.objects[0]==='Propeller')?.hinge,originalPropeller:propellerNode,originalSpinner:spinner,surfaces});
 Object.assign(rig.report,{propellerBlades:sourceProp.count,propellerSource:'cleared donor blade contours / source paint and XML shaft',propellerDiameter:donorProp.diameter,fdmPropellerDiameter:sourceProp.radius*2,canopyTravelMeters:maxTravel('Canopy-Main'),mainGearTravelDegrees:maxTravel('Leg-Assembly-L'),gearDoorTravelDegrees:maxTravel('Door-L'),tailWheelRetracts:false,splitFlapsTwoPosition:true,geometryMeasurements,hiddenParts:hidden,packCorrections:['Seafire rudder is ±30° in XML/facts, rather than ±15° in the task overview.','Pack intended-look images depict Spitfire IIa; use Seafire source textures.','Category heuristics include structural covers and instrument dials; only source conditions quarantine parts.','FDM thrust point and arbitrary X-axis spin centre are not visual propeller hub positions.']});
 rig.report.remaining=['Level flight height is 6.5% below the reference specification after fitting the propeller to FDM diameter; blade phase and retracted gear affect this measurement. Length/span and FDM wheel contacts agree; no anisotropic airframe rescaling.'];
 rig.report.travelByPart=Object.fromEntries(rig.bindings.map(binding=>[binding.anim.objects[0],binding.anim.travel]));
 rig.report.gearSequence=rig.bindings.filter(binding=>/Leg-Assembly|^Door-[LR]$/.test(binding.anim.objects[0])).map(binding=>({object:binding.anim.objects[0],table:binding.anim.interpolation}));
 rig.report.evaluateGear=(object,input)=>interp(rig.report.gearSequence.find(a=>a.object===object)?.table,input);
 return rig;
}
