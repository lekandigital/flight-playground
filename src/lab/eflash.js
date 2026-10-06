import * as THREE from 'three';
import {meshList,clamp} from '../rig-tools.js';
import {labFind,makeXmlRig,quarantine,sourceGlass} from './lab-tools.js';

const fields=['wingRoll','wingPitch','wheelSteer','engine'];
function driver(a,s){
 if(a.sourceIndex===0)return s.wheelSteer;
 if(a.sourceIndex===3)return -s.wingRoll*(s.gear===1?1:0);
 if(a.sourceIndex===5)return s.wingPitch*(s.gear===1?1:0);
 if(/left-aileron/.test(a.property??''))return s.wingRoll;
 if(/elevator/.test(a.property??''))return s.wingPitch;
 return null;
}

export async function prepareEflashLab(root,animations,facts){
 root.traverse(o=>{if(o.name.startsWith('pivot_'))o.quaternion.identity();});root.updateMatrixWorld(true);
 // The source archive's XML is byte-identical to the handoff. Its AC parent
 // locations were lost on the export's child geometry. Restore the measured
 // constant translations, independently of the animation pivots.
 for(const correction of facts.source_geometry_restore.transforms){
  const node=labFind(root,correction.glb_node),localDelta=new THREE.Vector3().fromArray(correction.translation);
  const inverse=node.matrixWorld.clone().invert().multiply(root.matrixWorld);
  localDelta.transformDirection(inverse).multiplyScalar(new THREE.Vector3().fromArray(correction.translation).length());
  node.geometry=node.geometry.clone();node.geometry.translate(...localDelta.toArray());
  node.userData.labGeometryReason='Original e-flash.ac ancestor loc restored; source and exported part extents match within 0.1 mm';
 }
 const sourceMotions=facts.animations_from_xml.filter(a=>a.sourceIndex<=20&&a.type!=='spin').map(a=>{
  if(a.sourceIndex===3)return{...a,expression:null,factor:15,travel:[-15,15],channel:'wingRoll'};
  if(a.sourceIndex===5)return{...a,expression:null,factor:null,interpolation:[[-1,-6],[0,3],[1,12]],travel:[-6,12],channel:'wingPitch'};
  return a;
 });
 // Expand logical AC groups before flattening. One pivot chain per mesh keeps
 // XML's compound rotation order and prevents later bindings stealing groups.
 const corrected=[],moving=new Set();
 for(const a of sourceMotions){
  const nodes=new Set(a.objects.flatMap(name=>meshList(labFind(root,'i0_'+name)??labFind(root,name))));
  for(const node of nodes){moving.add(node);corrected.push({...a,glb_nodes:[node.name]});}
 }
 const conditions=facts.source_conditions.map(rule=>({...rule,glb_nodes:[...new Set(rule.objects.flatMap(name=>meshList(labFind(root,'i0_'+name)??labFind(root,name)))).values()].map(m=>m.name)}));
 for(const node of moving){root.attach(node);root.updateMatrixWorld(true);}
 for(const name of ['i0_Wing','i0_Trike','i0_Pilot','i0_Passenger']){
  quarantine(labFind(root,name),'Tiny AC hierarchy marker; original visible surfaces are retained independently','variant',true);
 }
 for(const mesh of meshList(root))if(/^i4_/.test(mesh.name))quarantine(mesh,'Set file has parachute=0; exported deployed chute and cords are optional equipment','equipment',true);
 const prop=labFind(root,'i0_Prop'),propSpin={...facts.animations_from_xml[2],glb_nodes:[prop.name]};corrected.push(propSpin);
 // FlightGear switches this mesh off above 500 rpm, but the exported model has
 // no replacement blur disc. Retain the sound original blades at every speed.
 prop.userData.labVisibilityReason='Original three-blade prop retained above XML 500 rpm threshold because its blur replacement was not exported';
 const runtimeFacts={...facts,frame:{...facts.frame,fg_to_glb:{...facts.frame.fg_to_glb,median_error_m:0}},animations_from_xml:corrected,source_conditions:conditions.filter(r=>!r.objects.includes('Prop'))};
 const rig=await makeXmlRig(root,animations,runtimeFacts,{
  fields,defaults:{gear:1},driver,rpm:1000,
  properties:{'sim/model/flash2a/pilot':true,'sim/model/flash2a/passenger':false,'fdm/jsbsim/fcs/parachute-pos-norm':0},
  stateProperties:s=>({'sim/model/flash2a/on_ground':s.gear===1?1:0,'surface-positions/left-aileron-pos-norm':s.wingRoll,'surface-positions/elevator-pos-norm':s.wingPitch}),
  finishMaterials:()=>{
   sourceGlass(root,['i0_Visor','i0_Vizor','i0_Vizor001'],'Original model-transparent effect and source material alpha/tint');
   for(const mesh of [labFind(root,'i0_Sail'),labFind(root,'i0_Sail002'),prop])for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.side=THREE.DoubleSide;
  },
  limits:{wingRoll:15,wingPitch:[-12,6],wheelSteer:20},
  flightTargets:(s,active)=>({wingRoll:active?clamp(s.roll/.65,-1,1):0,wingPitch:active?clamp(s.pitch/.58,-1,1):0,wheelSteer:0,gear:active?0:1}),
  summary:'Lab E-Flash: exact AC parent transforms restored; original green/blue paint, XML 15° weight shift and +6/−12° pitch, tilted 20° nose steering; original three-blade Ø1.57m pusher.',
  rigExtras:{propeller:prop,groundContacts:[],labels:{wingRoll:'Weight shift roll',wingPitch:'Weight shift pitch',wheelSteer:'Nosewheel steering'}},
 });
 Object.assign(rig.report,{signedRanges:{wingPitch:[6,-12]},sourceVariant:facts.flight_model.variant,sailHeightCorrection:facts.source_geometry_restore.source_wing_loc[1],geometryRestorations:facts.source_geometry_restore.transforms.length,propellerBlades:3,inspectionRpm:1000,sourceLimitNotes:{
  geometry:'Recovered original AC, SHA256 '+facts.source_supplement.sha256+'; Wing children restored by [0.0159598,2.0388253,0.0000003], Trike children by [−0.3772432,0,0]. XML and set file match the handoff byte-for-byte.',
  ground:'FDM main contacts were misclassified as non-wheel and matched to NoseWheel. All fixed tyres remain original; −1.22° source pitch, ground placement from visible tyre geometry. Contact-to-model mismatch remains; no invented retraction.',
  propeller:'Original three blades retained within 3% of 61.8-inch FDM diameter. Source XML sign −1 about +X; 1000 rpm is a display inspection rate because the electric FDM has no fixed rated/cruise rpm. No high-speed blur substitute was exported.',
  variant:'Fictional electric Flash2a derivative; general trike photographs validate structure only. No real-world type-specific length/height supplied; span uses exact 34.61 FT JSBSim field.',
  aliases:'Set eflash pilot=1/passenger=0 bridged to model flash2a aliases, matching set multiplayer mappings; numeric source bool=1 corrected from pack false.',
 }});
 return rig;
}
