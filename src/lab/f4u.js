import * as THREE from 'three';
import {clamp,meshList,visibleBounds,presetState} from '../rig-tools.js';
import {labFind,makeXmlRig} from './lab-tools.js';

// These are the three material-property groups in F4U-1.xml/lwing.xml/rwing.xml.
// Sharing the same atlas does not put the propeller or hub in a livery group.
const body=['fuselage','cowling','verstab','rudder','frontcanopy','canopy','centerwing','centerwing.001','flap1.L','flap2.L','geardoorright.L','geardoorleft.L','geardoorfront.L','oilcoolflap.L','cowlflap1.L','cowlflap2.L','cowlflap3.L','cowlflap4.L','cowlflap5.L','tailwheeldoor.L','flap1.R','flap2.R','geardoorright.R','geardoorleft.R','geardoorfront.R','oilcoolflap.R','cowlflap1.R','cowlflap2.R','cowlflap3.R','cowlflap4.R','cowlflap5.R','tailwheeldoor.R','cowlflap6'];
const liverySlots={
 texture:body.map(n=>'i0_'+n),
 'texture-left':['i0_horstabl','i0_elevator.L','i2_outerwing.L','i2_aileron.L','i2_flap3.L'],
 'texture-right':['i0_horstabr','i0_elevator.R','i7_outerwing.R','i7_aileron.R','i7_flap3.R'],
};
const fields=['gear','fold','canopy','flaps','aileron','elevator','rudder','hook','cowl','engine'];
const signed=new Set(['aileron','elevator','rudder']);
function driver(a,s){
 const p=a.property??'';
 if(/compression/.test(p))return 0; // Uncompressed source rest, independently of extension.
 if(/caster|rollspeed/.test(p))return null;
 if(/tailhook/.test(p))return s.hook;
 if(/cowl-flaps/.test(p))return s.cowl;
 if(/wingfold/.test(p))return s.fold;
 if(/canopy/.test(p))return s.canopy;
 if(/gear.*position-norm/.test(p))return s.gear;
 if(/flap-pos-norm/.test(p))return s.flaps;
 if(/aileron/.test(p))return s.aileron;
 if(/elevator/.test(p))return s.elevator;
 if(/rudder/.test(p))return s.rudder;
 return null;
}
function sourceObjects(root,a){
 const nodes=[...new Set((a.glb_nodes??[]).filter(n=>/^i\d+_/.test(n)).map(n=>labFind(root,n)).filter(Boolean))];
 return nodes.filter(n=>!nodes.some(other=>other!==n&&isAncestor(other,n)));
}
function isAncestor(parent,node){for(let p=node.parent;p;p=p.parent)if(p===parent)return true;return false;}

export async function prepareF4uLab(root,animations,facts){
 // The converter incorrectly puts whole assemblies under single-object baked
 // pivots. Rebuild only moving objects, retaining each source mesh and rest pose.
 root.traverse(o=>{if(o.name.startsWith('pivot_'))o.quaternion.identity();});
 root.updateMatrixWorld(true);
 const schedule=facts.animations_from_xml??[],moving=[...new Set(schedule.flatMap(a=>sourceObjects(root,a)))];
 const wings=[labFind(root,'i2_leftwing'),labFind(root,'i7_rightwing')].filter(Boolean);
 for(const wing of wings){root.attach(wing);root.updateMatrixWorld(true);}
 for(const object of moving){
  if(wings.includes(object))continue;
  const family=object.name.startsWith('i2_')?wings[0]:object.name.startsWith('i7_')?wings[1]:root;
  (family??root).attach(object);root.updateMatrixWorld(true);
 }
 const sourceProp=labFind(root,'i0_prop');
 const propAnimation=schedule.find(a=>a.type==='spin'&&a.objects?.includes('prop'));
 const ratio=Math.abs(Number(propAnimation?.factor)),propSpec=facts.fdm_geometry?.propellers?.[0];
 const engineRpm=propSpec.takeoff_rpm/ratio;
 const corrected=[];
 for(const [sourceIndex,a]of schedule.entries()){
  if(a.type==='spin'&&!/rpm/.test(a.property??''))continue;
  for(const object of sourceObjects(root,a)){
   const entry={...a,glb_nodes:[object.name],sourceIndex,sourceFactor:a.factor};
   if(a.type==='spin')entry.factor=Number(a.factor); // Shared helper converts RPM to degrees/sec.
   if(a.objects?.includes('hook')&&a.channel==='hook'){
    // XML has an erroneous lateral offset of 1.626m. The source YASim hook
    // (x=-8.522,y=0,z=-.405) and source hook mesh agree on the centreline.
    entry.glb_center=[a.glb_center[0],a.glb_center[1],0];
    corrected.push({sourceIndex,field:'glb_center',from:a.glb_center,to:entry.glb_center,reason:'Source YASim hook y=0 and imported hook mesh centreline'});
   }
   if(a.channel==='aileron'&&!entry.travel)entry.travel=[-Math.abs(Number(a.factor)),Math.abs(Number(a.factor))];
   corrected.push(entry);
  }
 }
 const rigFacts={...facts,fdm_geometry:{...facts.fdm_geometry,gear_contacts:facts.fdm_geometry.gear_contacts.slice(0,3)},animations_from_xml:corrected.filter(a=>a.type)};
 const normalize=s=>{const result={...s};for(const key of fields)result[key]=clamp(Number(s[key])||0,signed.has(key)?-1:0,1);return result;};
 const properties={
  'sim/failure/left-wing-torn':false,'sim/failure/right-wing-torn':false,
  'sim/model/logo/display':2,'controls/armament/trigger':0,
  ...Object.fromEntries(Array.from({length:5},(_,i)=>[`sim/weight[${i}]/selected`,'none'])),
  ...Object.fromEntries(Array.from({length:5},(_,i)=>[`controls/armament/station[${i}]/release`,i<3?false:4])),
 };
 const rig=await makeXmlRig(root,animations,rigFacts,{
  driver,normalize,properties,rpm:engineRpm,fields,
  stateProperties:s=>({
   'engines/engine[0]/rpm':s.engine*engineRpm,
   ...Object.fromEntries([0,1,2].map(i=>[`gear/gear[${i}]/position-norm`,s.gear])),
  }),
  liveryOptions:{slots:liverySlots},
  limits:{aileron:18,elevator:[-30,20],rudder:30,fold:95,flaps:50,cowl:30,hook:70,canopyMetres:.7},
  summary:'Lab F4U-1: original three-blade propeller, 86° gear with 90° wheel twist, 95° wing fold, 50° flaps, 30° cowl/rudder and asymmetric elevators. Source US Marines / US Navy liveries; restored hook.',
 });
 // Transparent.xml names only these panes; opaque canopy framing stays painted.
 for(const name of ['i16_frontglass','i16_canopyglas']){
  const mesh=labFind(root,name);if(!mesh?.isMesh)continue;
  mesh.material=new THREE.MeshPhysicalMaterial({color:mesh.material.color,roughness:.18,metalness:.1,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
  mesh.material.userData.labMaterialReason='transparent.xml chrome panes; Three.js transparency adaptation';
 }
 for(const name of ['i15_spdisk','i15_fpdisk'])for(const mesh of meshList(labFind(root,name))){
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   material.transparent=true;material.opacity=.16;material.depthWrite=false;material.side=THREE.DoubleSide;
   material.userData.labMaterialReason='pdisk.xml RPM-selected original blur texture; translucent rendering';
  }
 }
 root.updateMatrixWorld(true);
 let measuredRadius=0;
 if(sourceProp)for(let i=0;i<sourceProp.geometry.attributes.position.count;i++){
  const p=new THREE.Vector3().fromBufferAttribute(sourceProp.geometry.attributes.position,i).applyMatrix4(sourceProp.matrixWorld);
  measuredRadius=Math.max(measuredRadius,Math.hypot(p.y,p.z));
 }
 Object.assign(rig.report,{
  sourceVariant:'F4U-1',propellerBlades:3,propellerRadius:propSpec.radius_m,
  measuredPropellerRadius:measuredRadius,propellerSource:'Original solid source mesh; FDM radius 2.03m',
  corrections:corrected.filter(a=>a.reason),engineRpm,
  sourceLimitNotes:{aileron:'controls/flight/aileron normalized −1..1 × source factor18',glass:'Material values adapt chrome shader; do not recolor opaque frame',ground:'Only first three source wheel contacts; pack belly contacts are not tyres',variant:'Pack specifications describe F4U-4; this source is F4U-1'},
 });
 const baseConfigure=rig.configure;let current={...presetState(false),hook:0};
 rig.configure=state=>{current=normalize({...presetState(false),hook:0,...state});baseConfigure(current);};
 rig.update=(dt,state,active,paused)=>{
  if(paused)return;
  const smoothing=1-Math.exp(-dt*9);
  for(const key of ['aileron','elevator','rudder']){
   const target=active?clamp((key==='elevator'?state.pitch/.58:state.roll/.65),-1,1):0;
   current[key]+=(target-current[key])*smoothing;
  }
  current.engine=active?clamp(state.throttle,0,1):0;
  baseConfigure(current);rig.spin(dt,current.engine);
 };
 rig.propeller=sourceProp;rig.bounds=()=>visibleBounds(root);root.userData.f4uLab=rig.report;
 await rig.liveries.select('US Marines');
 return rig;
}
