import * as THREE from 'three';
import {find,meshList,hinge,visibleBounds,repairMaterials,clamp,RAD,presetState} from '../rig-tools.js';
import {aircraftPropeller,helicopterRotor} from '../rotors.js';

const factCache=new Map(),textureCache=new Map();
export async function loadFacts(assetId){
 if(!factCache.has(assetId))factCache.set(assetId,fetch(`/lab/${assetId}/facts.json`).then(r=>{if(!r.ok)throw new Error(`Missing Lab facts: ${assetId}`);return r.json();}));
 return factCache.get(assetId);
}
export function interp(table,x){
 const points=[...(table??[])].filter(p=>Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))).sort((a,b)=>a[0]-b[0]);
 if(!points.length)return x;if(x<=points[0][0])return Number(points[0][1]);if(x>=points.at(-1)[0])return Number(points.at(-1)[1]);
 for(let i=1;i<points.length;i++)if(x<=points[i][0]){const[a,b]=[points[i-1],points[i]],t=(x-a[0])/(b[0]-a[0]);return Number(a[1])+t*(b[1]-a[1]);}
 return Number(points.at(-1)[1]);
}
export function labFind(root,name){
 const sanitized=THREE.PropertyBinding.sanitizeNodeName(name);let result=find(root,name);
 if(!result)root.traverse(o=>{if(o.userData.originalName===sanitized||o.userData.originalName===name)result??=o;});
 return result;
}
function uniqueRoots(nodes){return[...new Set(nodes)].filter(n=>!nodes.some(other=>other!==n&&isAncestor(other,n)));}
function isAncestor(parent,node){for(let p=node.parent;p;p=p.parent)if(p===parent)return true;return false;}
function vector(value,fallback){return new THREE.Vector3().fromArray(value??fallback);}
export function xmlPivot(root,anim,{frameError=0}={}){
 root.updateMatrixWorld(true);
 const nodes=uniqueRoots((anim.glb_nodes??[]).map(n=>labFind(root,n)).filter(Boolean));
 if(!nodes.length)return null;
 const points=anim.glb_axis_points,axis=points?vector(points[1]).sub(vector(points[0])):vector(anim.glb_axis_dir,[0,0,1]);
 if(axis.lengthSq()<1e-12)throw new Error('Zero XML axis: '+anim.property);
 const origin=vector(anim.glb_center??points?.[0],nodes[0].getWorldPosition(new THREE.Vector3()).applyMatrix4(root.matrixWorld.clone().invert()).toArray());
 // A fitted XML frame is authoritative. Poor-fit external surface pivots use
 // the established geometry hinge technique, retaining XML travel/axis sign.
 if(frameError>.05&&anim.type==='rotate'&&/aileron|elevator|rudder|flap/i.test((anim.objects??[]).join(' '))){
  const span=Math.abs(axis.y)>Math.abs(axis.z)?'y':'z',fitted=hinge(root,nodes,span);
  fitted.axis.copy(axis.normalize());fitted.restPosition=fitted.hinge.position.clone();fitted.anim=anim;fitted.mode='geometry snap';
  fitted.apply=value=>{fitted.hinge.quaternion.copy(fitted.rest).multiply(new THREE.Quaternion().setFromAxisAngle(fitted.axis,value*RAD));fitted.angle=value*RAD;};return fitted;
 }
 const parent=nodes.every(n=>n.parent===nodes[0].parent)?nodes[0].parent:root;
 const pivot=new THREE.Group();pivot.name='lab_xml_'+(anim.objects?.[0]??nodes[0].name)+'_'+parent.children.length;
 parent.add(pivot);root.updateMatrixWorld(true);
 pivot.position.copy(parent.worldToLocal(root.localToWorld(origin.clone())));root.updateMatrixWorld(true);
 for(const node of nodes)pivot.attach(node);
 const parentRotation=parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(root.getWorldQuaternion(new THREE.Quaternion()));
 const localAxis=axis.clone().applyQuaternion(parentRotation),rest=pivot.quaternion.clone(),restPosition=pivot.position.clone();
 const surface={hinge:pivot,axis:localAxis.clone().normalize(),rest,restPosition,origin,anim,mode:frameError>.05?'XML approximate':'XML',angle:0};
 surface.apply=value=>{
  pivot.position.copy(restPosition);pivot.quaternion.copy(rest);
  if(anim.type==='translate')pivot.position.addScaledVector(localAxis,value);
  else pivot.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(surface.axis,value*RAD));
  surface.angle=anim.type==='translate'?value:value*RAD;
 };
 return surface;
}
const signedChannels=new Set(['aileron','elevator','rudder','cyclicPitch','cyclicRoll','wingPitch','wingRoll']);
export function channel(facts,name){
 const animations=(facts.animations_from_xml??[]).filter(a=>a.channel===name&&['rotate','translate'].includes(a.type));
 const signed=signedChannels.has(name),domain=signed?[-1,1]:[0,1];
 return{name,animations,domain,clamp:x=>clamp(Number(x)||0,...domain),evaluate(anim,x){
  return animationValue(anim,clamp(Number(x)||0,...domain));
 }};
}
export function animationValue(anim,input,properties={}){
 const expression=anim.expression?evalExpression(anim.expression,properties):input;
 if(expression==null)return null;
 let value=anim.interpolation?interp(anim.interpolation,expression):Number(anim.factor??1)*expression;
 // Explicit offset-deg / offset-m are applied after the source factor.
 // Legacy <offset> is different; the pack preparer records its tag separately.
 value+=Number(anim.offset??0)*(anim.offsetUnits==='legacy'?Number(anim.factor??1):1);
 if(anim.travel)value=clamp(value,Math.min(...anim.travel),Math.max(...anim.travel));return value;
}
export function quarantine(node,reason,kind='variant',permanent=false){
 node?.traverse(o=>{if(!o.isMesh)return;o.userData.originalName??=o.name;o.userData.labHiddenReason=reason;if(permanent)o.userData.labPermanentHidden=true;o.userData.inspectorGroup=kind==='rotor'?'Original rotor / propeller':kind==='equipment'?'Optional equipment':'Original export variants';if(!o.name.startsWith('original_'))o.name=`original_${kind}_lab_${o.name}`;o.visible=false;});
}
export function sourceGlass(root,names,source){
 for(const name of names)for(const mesh of meshList(labFind(root,name))){const convert=old=>{const glass=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(glass,old);glass.defines={STANDARD:'',PHYSICAL:''};glass.transmission=1;glass.thickness=0;glass.roughness=0;glass.ior=1.5;glass.transparent=true;glass.depthWrite=false;glass.side=THREE.DoubleSide;glass.userData.labMaterialReason=source+'; clear-surface transmission adapts the unsupported FlightGear glass shader';return glass;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);}
}
export function propertyValue(properties,key){return properties[key.replace(/^\//,'')];}
export function evalExpression(node,properties){
 if(!node)return null;const children=node.children??[],args=children.map(c=>evalExpression(c,properties)),op=node.op;
 if(op==='property')return propertyValue(properties,node.text);
 if(['value','constant'].includes(op)){if(node.text==='true')return true;if(node.text==='false')return false;return node.text!==''&&Number.isFinite(Number(node.text))?Number(node.text):node.text;}
 if(op==='condition')return args.length===1?args[0]:args.some(a=>a===false||a===0)?false:args.some(a=>a==null)?null:args.every(Boolean);
 if(op==='expression')return args.length===1?args[0]:null;
 if(op==='and'){if(args.some(a=>a===false||a===0))return false;return args.some(a=>a==null)?null:args.every(Boolean);}
 if(op==='or'){if(args.some(Boolean))return true;return args.some(a=>a==null)?null:false;}
 if(args.some(a=>a==null))return null;
 if(op==='not')return !args[0];
 const equal=(a,b)=>typeof a==='boolean'||typeof b==='boolean'?Number(a)===Number(b):String(a)===String(b);
 if(op==='equals')return equal(args[0],args[1]);if(op==='not-equals')return !equal(args[0],args[1]);
 if(op==='less-than')return args[0]<args[1];if(op==='less-than-equals')return args[0]<=args[1];
 if(op==='greater-than')return args[0]>args[1];if(op==='greater-than-equals')return args[0]>=args[1];
 if(op==='sum')return args.reduce((a,b)=>a+b,0);if(op==='product')return args.reduce((a,b)=>a*b,1);
 if(op==='difference')return args[0]-args[1];if(op==='quotient')return args[1]?args[0]/args[1]:0;
 if(op==='min')return Math.min(...args);if(op==='max')return Math.max(...args);if(op==='abs')return Math.abs(args[0]);
 return null;
}
const conditionCache=new WeakMap();
function conditionNodes(root,rule){
 let cache=conditionCache.get(root);if(!cache){cache=new WeakMap();conditionCache.set(root,cache);}
 if(cache.has(rule))return cache.get(rule);
 if(rule.glb_nodes){const nodes=uniqueRoots(rule.glb_nodes.map(n=>labFind(root,n)).filter(Boolean));cache.set(rule,nodes);return nodes;}
 const names=new Set((rule.objects??[]).map(n=>THREE.PropertyBinding.sanitizeNodeName(n))),nodes=[];
 const patterns=[...names].map(suffix=>new RegExp('^i\\d+_'+suffix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'));
 root.traverse(o=>{const name=o.userData.originalName??o.name;if(names.has(name)||patterns.some(pattern=>pattern.test(name)))nodes.push(o);});const result=uniqueRoots(nodes);cache.set(rule,result);return result;
}
export function hideByCondition(root,facts,state={}){
 const properties={...(facts.default_properties??{}),...state},unresolved=[],decisions=new Map();
 for(const rule of facts.source_conditions??[]){
  if(rule.type!=='select')continue;const show=rule.condition?evalExpression(rule.condition,properties):false;
  if(show==null){unresolved.push(rule);continue;}
  for(const node of conditionNodes(root,rule))for(const mesh of meshList(node)){
   if(mesh.userData.labPermanentHidden)continue;
   const decision=decisions.get(mesh)??{show:true,reasons:[]};decision.show&&=!!show;
   if(!show)decision.reasons.push(`XML select: ${rule.source_xml} (${rule.objects.join(', ')})`);
   decisions.set(mesh,decision);
  }
 }
 for(const[mesh,decision]of decisions){if(decision.show)mesh.visible=true;else quarantine(mesh,decision.reasons.join('; '));}
 return unresolved;
}
export function contactsPitch(facts){
 return (facts.fdm_geometry?.parked_pitch_deg_nose_up??0)*RAD;
}
export function placeOnGround(root,facts,{pitch=contactsPitch(facts)}={}){
 const contacts=(facts.fdm_geometry?.gear_contacts??[]).filter(c=>c.glb&&c.is_wheel!==false),ys=contacts.map(c=>c.glb[1]*Math.cos(pitch)-c.glb[0]*Math.sin(pitch));
 return{pitch,height:ys.length?-Math.min(...ys):0,contacts,trusted:!!facts.fdm_geometry?.gear_contacts_trusted};
}
export function fdmPropeller(root,facts,{index=0,name='lab',useOriginal=false,position,bladeCount,pusher=false}={}){
 const spec=facts.fdm_geometry?.propellers?.[index];if(!spec)throw new Error('Missing FDM propeller dimensions');
 const radius=spec.radius_m??spec.diameter_m/2,blades=bladeCount??spec.blades??Number(facts.real_world_specs?.['prop blade number']);
 if(!Number.isFinite(radius)||!Number.isFinite(blades))throw new Error('Missing authoritative propeller radius/blades');
 const spin=facts.propellers_rotors?.filter(a=>a.type==='spin'&&/rpm|propeller/i.test(a.property??''))[index];
 if(useOriginal)return{radius,count:blades,source:'original',spinAnimation:spin};
 const hub=position??spin?.glb_center;if(!hub)throw new Error('Missing visual propeller hub');
 return{...aircraftPropeller(root,{name,position:vector(hub),radius,count:blades,pusher}),source:'FDM procedural',diameter:radius*2};
}
export function fdmRotor(root,facts,{index=0,name='lab',position}={}){
 const spec=facts.fdm_geometry?.rotors?.[index];if(!spec?.diameter_m||!spec?.blades)throw new Error('Missing FDM rotor dimensions');
 const radius=spec.diameter_m/2,normal=vector(spec.glb_normal,[0,1,0]).normalize(),hub=position??spec.glb;
 if(!hub)throw new Error('Missing FDM rotor hub');
 const rotor=helicopterRotor(root,{name,position:vector(hub),radius,count:spec.blades,tail:false});
 const rest=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal);rotor.mount.quaternion.copy(rest);
 rotor.setPitch=(collective,pitch=0,roll=0)=>{rotor.mount.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(roll*RAD,0,pitch*RAD)));for(const blade of rotor.blades)blade.rotation.z=collective*RAD;};
 const ccw=spec.ccw===true||spec.ccw===1||spec.ccw==='1';
 rotor.spin=(dt,engine)=>{if(!engine)return;rotor.rotor.rotation.y=(rotor.rotor.rotation.y+dt*(spec.rpm??0)*Math.PI/30*engine*(ccw?1:-1))%(Math.PI*2);};
 return{...rotor,spec,diameter:spec.diameter_m,source:'FDM procedural'};
}
async function texture(url){if(!textureCache.has(url))textureCache.set(url,new THREE.TextureLoader().loadAsync(url).then(t=>{t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;return t;}));return textureCache.get(url);}
export async function applyTextures(root,facts,base,{loader=texture}={}){
 const byOriginal=new Map((facts.textures??[]).map(t=>[t.original,t])),applied=[],missing=[];
 for(const binding of facts.texture_by_part??[]){
  if(!binding.has_uv)continue;const item=byOriginal.get(binding.texture);if(!item){if(!binding.texture_in_glb)missing.push(binding);continue;}
  const meshes=(binding.glb_nodes??[]).map(n=>labFind(root,n)).filter(n=>n?.isMesh&&n.geometry.attributes.uv);
  if(!meshes.length)continue;const map=await loader(`${base}/${item.file}`);
  for(const mesh of meshes){for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){material.map=map;material.userData.labTexture=item.file;if(item.cutout_alpha){material.alphaTest=.12;material.transparent=false;}material.needsUpdate=true;}applied.push(mesh.name);}
 }
 return{applied,missing};
}
export function liverySwitch(root,facts,base,{loader=texture,slots={}}={}){
 const options=(facts.livery_names??[]).filter(l=>l.name&&l.slots&&Object.keys(l.slots).length),baseMaps=new Map();
 for(const m of meshList(root))for(const mat of Array.isArray(m.material)?m.material:[m.material])baseMaps.set(mat,mat.map);
 let selected='',selection=0;
 async function select(name){
  selected=name;const generation=++selection;
  if(!name){for(const[mat,map]of baseMaps){mat.map=map;mat.userData.baseMap=map;mat.needsUpdate=true;}return;}
  const option=options.find(l=>l.name===name);if(!option)throw new Error('Unknown source livery '+name);
  const maps=await Promise.all(Object.entries(option.slots).map(async([slot,file])=>[slot,await loader(`${base}/${file}`)]));
  if(generation!==selection)return;
  for(const[slot,map]of maps)for(const nodeName of slots[slot]??[])for(const m of meshList(labFind(root,nodeName)))for(const mat of Array.isArray(m.material)?m.material:[m.material]){mat.map=map;mat.userData.baseMap=map;mat.needsUpdate=true;}
 }
 return{get selected(){return selected;},options:options.map(l=>({value:l.name,label:l.name})),select,defaultLabel:facts.default_properties?.['sim/model/livery/name']??'Original download'};
}
export function defaultDriver(animation,state){
 const p=animation.property??'';
 if(/compression|caster|rollspeed|trim|lever|oil-flow/.test(p))return null;
 if(/cowl-flaps|radiator/.test(p))return state.cowl??0;
 if(/wing-fold/.test(p))return state.fold??0;
 if(/canopy.*position|canopy.*norm/.test(p))return state.canopy??0;
 if(/gear.*position-norm|gear-pos-norm/.test(p))return state.gear??0;
 if(/flap-pos|flight\/flaps/.test(p))return state.flaps??0;
 if(/aileron/.test(p))return /right-aileron/.test(p)?-(state.aileron??0):(state.aileron??0);
 if(/elevator/.test(p))return state.elevator??0;
 if(/rudder/.test(p))return state.rudder??0;
 if(/door.*position|door.*norm/.test(p))return state.doors??0;
 if(/hook.*position|hook.*norm/.test(p))return state.hook??0;
 return null;
}
export async function makeXmlRig(root,animations,facts,options={}){
 repairMaterials(root);root.updateMatrixWorld(true);
 const defaults={...Object.fromEntries((options.fields??[]).map(field=>[field,0])),...presetState(false),...options.defaults};
 const frameError=facts.frame?.fg_to_glb?.median_error_m??0,bindings=[],spins=[],skipped=[];
 for(const animation of facts.animations_from_xml??[]){
  if(options.animationFilter&&!options.animationFilter(animation))continue;
  if(!['rotate','translate','spin'].includes(animation.type))continue;
  const input=(options.driver??defaultDriver)(animation,defaults);
  if(animation.type==='spin'&&!/rpm/.test(animation.property??''))continue;
  if(animation.type!=='spin'&&input==null){skipped.push(animation);continue;}
  const surface=xmlPivot(root,animation,{frameError});if(!surface){skipped.push(animation);continue;}
  if(animation.type==='spin')spins.push({...surface,degrees:0});else bindings.push(surface);
 }
 const defaultProperties={'sim/current-view/view-number':1,'sim/current-view/internal':false,'sim/current-view/name':'Chase View','sim/model/rain/raining-norm':0,...options.properties};
 const baseVisibility=new Map(meshList(root).map(m=>[m,m.visible]));let current={...defaults};
 function configure(state){
  current={...defaults,...state};if(options.normalize)current=options.normalize(current);
  for(const field of options.fields??['gear','canopy','flaps','aileron','elevator','rudder','engine'])current[field]=clamp(Number(current[field])||0,signedChannels.has(field)||field==='wheelSteer'?-1:0,1);
  for(const[m,v]of baseVisibility)m.visible=m.userData.labPermanentHidden?false:v;
  for(const surface of bindings){const a=surface.anim,input=(options.driver??defaultDriver)(a,current),value=animationValue(a,input,{...facts.default_properties,...defaultProperties,...options.stateProperties?.(current)});if(value!=null)surface.apply(value);}
  const props={...defaultProperties,...options.stateProperties?.(current)};hideByCondition(root,facts,props);options.configure?.(current,bindings);
 }
 function spin(dt,engine){
  if(!engine)return;const rpm=options.rpm??facts.fdm_geometry?.propellers?.[0]?.cruise_rpm??0;
  for(const surface of spins){surface.degrees=(surface.degrees+dt*rpm*engine*6*Number(surface.anim.factor??1))%360;surface.apply(surface.degrees);}
  options.spin?.(dt,engine);
 }
 function update(dt,state,active,paused){if(paused)return;const targets=options.flightTargets?.(state,active)??Object.fromEntries(['aileron','elevator','rudder'].map(key=>[key,active?clamp((key==='elevator'?state.pitch/.58:state.roll/.65),-1,1):0]));for(const[key,target]of Object.entries(targets))current[key]=(current[key]??0)+(target-(current[key]??0))*(1-Math.exp(-dt*7));current.engine=active?clamp(state.throttle,0,1):0;configure(current);spin(dt,current.engine);}
 configure(current);
 const testLoader=facts.runtimeTextureLoader?{loader:facts.runtimeTextureLoader}:{};
 const textures=await applyTextures(root,facts,`/lab/${facts.asset_id}`,{...options.textureOptions,...testLoader});
 options.finishMaterials?.(root);
 const liveries=liverySwitch(root,facts,`/lab/${facts.asset_id}`,{...options.liveryOptions,...testLoader});
 const fields=options.fields??['gear','canopy','flaps','aileron','elevator','rudder','engine'];
 const report={originalAnimationDisabled:true,lab:true,frameError,bindings,skipped,textures,eyePoint:facts.eye_point,sounds:facts.sounds_copied,nasalFiles:facts.nasal_files,limitsDegrees:options.limits??{},summary:options.summary??'Lab: original-download XML rig and paint; see progress notes.'};
 return{configure,spin,update,bindings,spins,fields,liveries,report,groundRoot:root,groundContacts:facts.fdm_geometry?.gear_contacts?.filter(c=>c.glb&&c.is_wheel!==false),groundPitch:options.groundPitch??contactsPitch(facts),bounds:()=>visibleBounds(root),isSeaplane:!!options.isSeaplane,...options.rigExtras};
}
