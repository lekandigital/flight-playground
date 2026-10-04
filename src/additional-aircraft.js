import * as THREE from 'three';
import {find,meshList,hinge,deflect,groupParts,flattenVisibility,visibleBounds,clamp,RAD,presetState,parkingPitch} from './rig-tools.js';
import {aircraftPropeller,helicopterRotor,fabricWeave} from './rotors.js';
import {finishHelicopter} from './helicopter-finish.js';

// Keep hidden import variants independently revealable, without playing mixed clips.
function hide(node,id,kind='variant'){
 node?.traverse(o=>{if(!o.isMesh)return;o.visible=false;o.userData.originalName??=o.name;if(!o.name.startsWith('original_'))o.name=`original_${kind}_${id}_${o.name}`;});
}
function glass(mesh){mesh.material=new THREE.MeshStandardMaterial({color:'#608699',roughness:.22,metalness:.05,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide});}
function restRotation(node){return{node,q:node.quaternion.clone(),p:node.position.clone()};}
function turn(rest,axis,degrees){rest.node.quaternion.copy(rest.q).multiply(new THREE.Quaternion().setFromAxisAngle(axis,degrees*RAD));}
const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0);
function resetVisibility(baseline){for(const[m,v]of baseline)m.visible=v;}
function flightUpdate(configure,spin,defaults,targets){
 const current={...defaults};return(dt,state,active,paused)=>{if(paused)return;const target=targets(state,active);for(const key of Object.keys(target))current[key]+=(target[key]-current[key])*(1-Math.exp(-dt*7));configure(current);spin(dt,active?state.throttle:.05);};
}

function prepareSpitfire(root,id){
 const naval=id==='seafire';
 for(const mesh of meshList(root)){
  if(/Rain|Propeller|Spinner|Chocks/i.test(mesh.name))hide(mesh,id,/Propeller|Spinner/i.test(mesh.name)?'rotor':/Chocks/i.test(mesh.name)?'equipment':'variant');
  else if(/^i0_Canopy/.test(mesh.name))glass(mesh);
 }
 hide(find(root,'i0_Pilot'),id,'crew');hide(find(root,'i36_mk1'),id);
 const wings=['L','R'].map(side=>find(root,`i0_Wing-${side}-Outer`)),wingPivots=wings.map(wing=>restRotation(wing.parent));
 const surfaces={leftAileron:hinge(root,['i0_Aileron-L'],'z',wings[0]),rightAileron:hinge(root,['i0_Aileron-R'],'z',wings[1]),leftElevator:hinge(root,['i0_Elevator-L']),rightElevator:hinge(root,['i0_Elevator-R']),rudder:hinge(root,[naval?'i0_Rudder-Assmbly':'i0_Rudder'],'y')};
 const flaps=[];for(const side of ['L','R'])for(const suffix of ['Inner-'+side,'Outer-'+side+'-Inner','Outer-'+side+'-Outer']){
  const n=find(root,'i0_Flap-'+suffix);if(n)flaps.push(hinge(root,[n],'z',suffix.endsWith('-Outer')?wings[side==='L'?0:1]:root));
 }
 const gear=[],doors=[];
 for(const [i,side]of ['L','R'].entries()){
  const anchor=new THREE.Vector3(2.48,-.767,i===0?.65:-.65);
  gear.push(groupParts(root,[`i0_Leg-Assembly-${side}`],anchor,'repaired_'+id+'_main_gear_'+side));
  doors.push(groupParts(root,[`i0_Door-${side}`],anchor,'repaired_'+id+'_gear_door_'+side));
 }
 const tail=groupParts(root,['i0_Tail-Wheel-Assembly'],new THREE.Vector3(8.49,-.37,0),'repaired_'+id+'_tail_gear');
 const canopy=find(root,'i0_Canopy-Main'),canopyRest=restRotation(canopy.parent);
 const prop=aircraftPropeller(root,{name:id,position:new THREE.Vector3(.4,0,0),radius:1.68,count:naval?4:3,spinnerColor:naval?'#abb8b7':'#62715e'});
 const hook=find(root,'i0_Arrester-Hook');if(hook)hide(hook,id,'equipment');
 const baseline=flattenVisibility(root);
 function configure(s){
  s={...presetState(false),...s};resetVisibility(baseline);const g=clamp(s.gear,0,1),fold=naval?clamp(s.fold,0,1):0;
  wingPivots.forEach((r,i)=>turn(r,X,(i===0?-1:1)*82*fold));
  gear.forEach((group,i)=>{group.rotation.x=(i===0?1:-1)*85*(1-g)*RAD;for(const m of meshList(group))m.visible=(baseline.get(m)??true)&&g>.015;});
  doors.forEach((group,i)=>group.rotation.x=(i===0?1:-1)*78*g*RAD);
  tail.rotation.z=-65*(1-g)*RAD;for(const m of meshList(tail))m.visible=(baseline.get(m)??true)&&g>.015;
  canopyRest.node.position.copy(canopyRest.p).addScaledVector(X,.65*clamp(s.canopy,0,1));
  deflect(surfaces.leftAileron,clamp(s.aileron,-1,1)*16);deflect(surfaces.rightAileron,-clamp(s.aileron,-1,1)*16);
  deflect(surfaces.leftElevator,clamp(s.elevator,-1,1)*12);deflect(surfaces.rightElevator,clamp(s.elevator,-1,1)*12);deflect(surfaces.rudder,-clamp(s.rudder,-1,1)*12);
  for(const f of flaps)deflect(f,-clamp(s.flaps,0,1)*25);
 }
 const spin=prop.spin,update=flightUpdate(configure,spin,presetState(false),(s,active)=>({aileron:active?clamp(s.roll/.65,-1,1):0,elevator:active?clamp(s.pitch/.58,-1,1):0,rudder:active?clamp(s.roll/.65,-1,1):0}));
 configure(presetState(true));const groundPitch=parkingPitch(root,['i0_tyre-l','i0_tyre'],['i0_Tyre']);configure(presetState(false));
 return{configure,spin,update,surfaces,propeller:prop.rotor,gear,groundPitch,bounds:()=>visibleBounds(root),fields:['gear',...(naval?['fold']:[]),'canopy','flaps','aileron','elevator','rudder','engine'],report:{originalAnimationDisabled:true,limitsDegrees:{aileron:16,elevator:12,rudder:12,flaps:25,fold:naval?82:0},propellerBlades:prop.count}};
}

// Some exporter locator nodes carry a tiny mesh as well as useful children.
function groupAnchor(root,node,id){
 if(!node.isMesh)return node;const group=new THREE.Group();group.copy(node,false);node.parent.add(group);
 for(const child of [...node.children])group.add(child);
 const marker=new THREE.Mesh(node.geometry,node.material);marker.name=node.name;group.add(marker);hide(marker,id);node.removeFromParent();return group;
}
function prepareEflash(root){
 const id='eflash';hide(find(root,'i4_Parachute001'),id,'equipment');hide(find(root,'i4_Canopy'),id,'equipment');
 for(const mesh of meshList(root))if(/^i4_/.test(mesh.name))hide(mesh,id,'equipment');
 hide(find(root,'i0_Pilot'),id,'crew');hide(find(root,'i0_Passenger'),id,'crew');hide(find(root,'i0_Prop'),id,'rotor');
 const trike=find(root,'i0_Trike');root.updateMatrixWorld(true);root.attach(trike);
 const wing=groupAnchor(root,find(root,'i0_Wing'),id);root.updateMatrixWorld(true);root.attach(wing);wing.position.y+=2.04;
 const topNames=['i0_ControlBar','i0_ControlBar2','i0_ControlBarBolt1','i0_ControlBarBolt2','i0_ControlBarStrap','i0_HangStrap','i0_KingPost','i0_Rudder','i0_WingKeel'];
 const weightShift=groupParts(root,[wing,...topNames],new THREE.Vector3(1.55,2.04,0),'repaired_eflash_weight_shift');
 const weave=fabricWeave();
 for(const m of meshList(root)){
  if(/original_/.test(m.name))continue;
  const materials=Array.isArray(m.material)?m.material:[m.material];
  for(const mat of materials){const n=mat.name.toLowerCase();if(/pink/.test(n)){mat.color.set('#db903d');mat.roughness=.76;mat.metalness=0;}else if(/whitewing/.test(n)){mat.color.set('#e9edf0');mat.side=THREE.DoubleSide;mat.roughness=.86;mat.bumpMap=weave;mat.bumpScale=.004;}else if(/alu|batten/.test(n)){mat.color.set('#79929e');mat.roughness=.55;mat.metalness=.35;}else if(/perspex/.test(n))glass(m);if(/Wire|Luffline/.test(m.name)){mat.color.set('#4b6472');mat.roughness=.78;}}
 }
 const prop=aircraftPropeller(root,{name:id,position:new THREE.Vector3(2.635,.55,0),radius:.70,count:3,pusher:true,spinnerColor:'#93a9b2'});
 const baseline=flattenVisibility(root),steering=restRotation(find(root,'i0_NoseWheel'));
 function configure(s){resetVisibility(baseline);weightShift.rotation.set(clamp(s.wingRoll??0,-1,1)*6*RAD,0,clamp(s.wingPitch??0,-1,1)*5*RAD);turn(steering,Y,clamp(s.wheelSteer??0,-1,1)*20);}
 const defaults={wingRoll:0,wingPitch:0,wheelSteer:0},spin=prop.spin,update=flightUpdate(configure,spin,defaults,(s,active)=>({wingRoll:active?clamp(s.roll/.65,-1,1):0,wingPitch:active?clamp(s.pitch/.58,-1,1):0,wheelSteer:0}));
 configure(defaults);return{configure,spin,update,propeller:prop.rotor,weightShift,bounds:()=>visibleBounds(root),fields:['wingRoll','wingPitch','wheelSteer','engine'],report:{originalAnimationDisabled:true,sailHeightCorrection:2.04,propellerBlades:3,limitsDegrees:{wingRoll:6,wingPitch:5,wheelSteer:20}}};
}

function prepareHelicopter(root,id){
 const ec=id==='ec130',bo=id==='bo105';
 if(ec){
  for(const name of ['fuselage','fuselage_air_in','frontdoorl','backdoorl','doorfr','doorbr','windowl002','windowl003','windscreen_inside','windscreen_inside_shader'])hide(find(root,name),id);
  for(const name of ['basket_left','basket_right','floats_deflated','snowshoes','hoist','hook_lowpart','FLIR','stretcher'])hide(find(root,name),id,'equipment');
  for(const mesh of meshList(root))if(/basket|hoist|hook_|searchlight|slight_|Plane005X/.test(mesh.name))hide(mesh,id,'equipment');
  for(const name of ['navlight_left','navlight_right','navlight_back','antenna_roof_frontl_tilt'])hide(find(root,name),id);
 }else if(bo){
  for(const mesh of meshList(root)){
   if(/blade|disc|shadow|star_hub|pitch_link|pitch_horn|rotoraxis|swashplate|coll_ctrl_fork|fake_axis|tailpitchlink|tailsleeve/i.test(mesh.name))hide(mesh,id,'rotor');
   else if(/halo/i.test(mesh.name))hide(mesh,id);
   else if(/pilot|i0_h[cp]_|ear_[LR]|ear_hole/i.test(mesh.name))hide(mesh,id,'crew');
   else if(/gatling|barrel|rail_[LR]|^i0_hot$|wire_cutter|^i0_shield$/i.test(mesh.name))hide(mesh,id,'equipment');
  }
 }else{
  hide(find(root,'i5_all-mainrotor'),id,'rotor');hide(find(root,'i11_all-tailrotor'),id,'rotor');
  hide(find(root,'i0_nez2'),id);for(const mesh of meshList(root)){if(/^i(?:[6-9]|1\d|2[0-3])_(?:blade|rotor|propblur|propdisc)/i.test(mesh.name))hide(mesh,id,'rotor');else if(/HDR|propblur|propdisc/i.test(mesh.name))hide(mesh,id);}
 }
 // FlightGear exported these animation pivots at +/-170 degrees. Identity
 // restores the authored closed geometry, including the two cargo doors.
 if(bo)for(const name of ['pivot_043_door_front_R','pivot_044_door_front_L','pivot_049_reardoor_R','pivot_050_reardoor_L'])find(root,name).quaternion.identity();
 const finish=finishHelicopter(root,id);
 const specs=bo?{main:[2.744,1.65,0],radius:5.0,count:4,tail:[8.642,1.524,.424],tailRadius:.96,tailCount:2}:ec?{main:[-2.80,1.40,0],radius:5.0,count:3,tail:[4.44,.106,.04],tailRadius:.43,tailCount:10}:{main:[-1.785,1.72,0],radius:5.90,count:4,tail:[5.294,-.083,.02],tailRadius:.49,tailCount:11};
 const main=helicopterRotor(root,{name:id+'_main_rotor',position:new THREE.Vector3(...specs.main),radius:specs.radius,count:specs.count,shaftLength:ec?.64:bo?.45:.42});
 const tail=helicopterRotor(root,{name:id+'_tail_rotor',position:new THREE.Vector3(...specs.tail),radius:specs.tailRadius,count:specs.tailCount,tail:true,enclosed:!bo});
 if(ec)for(const [name,pos,color]of [['left',[2.9,-.22,1.47],'#ed4b42'],['right',[2.9,-.22,-1.47],'#48d698'],['tail',[5.326,1.85,-.07],'#eff7ff']]){
  const lens=new THREE.Mesh(new THREE.SphereGeometry(.027,16,10),new THREE.MeshPhysicalMaterial({color,emissive:color,emissiveIntensity:.65,roughness:.15,clearcoat:1}));lens.name='procedural_ec130_nav_light_'+name;lens.position.set(...pos);root.add(lens);
 }
 const doors=[],sliders=[],cargoDoors=[],gear=[];
 if(bo){
  for(const [side,sign]of [['L',-1],['R',1]]){
   const n=find(root,`i0_door_front_${side}`)?.parent;if(n)doors.push({surface:hinge(root,[n],'y'),sign});
   const back=find(root,`i0_door_back_${side}`)?.parent;if(back)sliders.push(restRotation(back));
  }
  for(const [name,sign]of [['pivot_049_reardoor_R',1],['pivot_050_reardoor_L',-1]]){
   const node=find(root,name);cargoDoors.push({rest:restRotation(node),axis:new THREE.Vector3(.535215,.841932,sign*.068522).normalize(),sign});
  }
 }else if(ec){
  for(const [name,sign]of [['doorfl',-1],['doorfr_t2',1],['doorbl',-1],['doorbr_t2',1]]){const n=find(root,name);if(n)doors.push({surface:hinge(root,[n],'y'),sign});}
 }else{
  // Crew glazing was exported outside the animated door pivots.
  root.updateMatrixWorld(true);
  for(const side of ['G','D'])find(root,side==='G'?'pivot_013_portecrewG':'pivot_014_portecrewD').attach(find(root,'i0_vitrescrew'+side));
  for(const [name,sign]of [['pivot_013_portecrewG',-1],['pivot_014_portecrewD',1],['pivot_015_porteAG',-1],['pivot_016_porteAD',1]]){const n=find(root,name);if(n)doors.push({rest:restRotation(n),sign});}
  for(const name of ['pivot_017_porteBG','pivot_020_porteBD']){const n=find(root,name);if(n)sliders.push(restRotation(n));}
  for(const [names,anchor]of [[['i0_axeAB','i0_axeAH','i0_roueA','i0_verinA'],[-4.88,-1.31,0]],[['i0_axeG1','i0_axeG2','i0_axeG3','i0_axeGB','i0_axeGH','i0_roueG'],[-.85,-1.17,.76]],[['i0_axeD1','i0_axeD2','i0_axeD3','i0_axeDB','i0_axeDH','i0_roueD'],[-.85,-1.17,-.76]]])gear.push(groupParts(root,names,new THREE.Vector3(...anchor),'repaired_dauphin_gear_'+gear.length));
 }
 const gearDoors=!ec&&!bo?['pivot_000_porteG','pivot_001_porteD'].map(n=>restRotation(find(root,n))):[];
 const baseline=flattenVisibility(root),defaults={...presetState(false),collective:0,cyclicPitch:0,cyclicRoll:0,doors:0,cargoDoors:0};
 function configure(s){s={...defaults,...s};resetVisibility(baseline);main.configure(s.collective,s.cyclicPitch,s.cyclicRoll);tail.configure(clamp((s.rudder+1)/2,0,1));
  for(const d of doors){const angle=d.sign*clamp(s.doors,0,1)*35;if(d.surface)deflect(d.surface,angle);else turn(d.rest,Y,angle);}
  for(const r of sliders)r.node.position.copy(r.p).addScaledVector(X,clamp(s.doors,0,1)*.55);
  for(const d of cargoDoors)turn(d.rest,d.axis,d.sign*clamp(s.cargoDoors,0,1)*55);
  gear.forEach((g,i)=>{g.rotation.z=(i===0?-1:1)*(1-clamp(s.gear,0,1))*75*RAD;for(const m of meshList(g))m.visible=s.gear>.015;});
  gearDoors.forEach((r,i)=>turn(r,X,(i===0?-1:1)*65*clamp(s.gear,0,1)));
 }
 const spin=(dt,engine)=>{main.spin(dt,engine);tail.spin(dt,engine);};
 const update=flightUpdate(configure,spin,defaults,(s,active)=>({doors:0,cargoDoors:0,collective:active?clamp(s.throttle,0,1):0,cyclicPitch:active?clamp(s.pitch/.58,-1,1):0,cyclicRoll:active?clamp(s.roll/.65,-1,1):0,rudder:active?clamp(s.roll/.65,-1,1):0}));
 configure({...defaults,gear:1});const groundPitch=!ec&&!bo?parkingPitch(root,['i0_roueA'],['i0_roueG','i0_roueD']):0;configure(defaults);
 return{configure,spin,update,mainRotor:main,tailRotor:tail,gear,doors,cargoDoors,groundPitch,bounds:()=>visibleBounds(root),labels:{rudder:'Tail rotor pitch',cargoDoors:'Rear clamshell doors'},fields:[...(!ec&&!bo?['gear']:[]),'doors',...(bo?['cargoDoors']:[]),'collective','cyclicPitch','cyclicRoll','rudder','engine'],report:{originalAnimationDisabled:true,mainRotorBlades:specs.count,tailRotorBlades:specs.tailCount,finish,rearDoorsClosed:bo,limitsDegrees:{doors:35,cargoDoors:55,collective:12,cyclicPitch:6,cyclicRoll:6,rudder:9}}};
}

export function prepareAdditionalAircraft(root,id){
 if(id==='spitfire'||id==='seafire')return prepareSpitfire(root,id);
 if(id==='eflash')return prepareEflash(root);
 if(['bo105','dauphin','ec130'].includes(id))return prepareHelicopter(root,id);
 throw new Error('No runtime configuration for '+id);
}
