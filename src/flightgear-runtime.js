import * as T from 'three';
import {clamp, RAD, meshList} from './rig-tools.js';

export function interpolate(table, x) {
 const t=[...table].sort((a,b)=>a[0]-b[0]);
 if(x<=t[0][0])return t[0][1];
 for(let i=1;i<t.length;i++)if(x<=t[i][0]){
  const [a,b]=[t[i-1],t[i]];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
 }
 return t.at(-1)[1];
}
const clean=s=>s.replace(/_node(?:_\d+)?$/,'');
const baseName=s=>s.split('/').at(-1).replace(/\.(png|jpg|jpeg|rgb)$/i,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const boxOf=(mesh,matrix=mesh.matrix)=>{
 const box=new T.Box3(),p=mesh.geometry.attributes.position,v=new T.Vector3();
 for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(matrix));return box;
};
const numerical=s=>s==='true'?1:s==='false'?0:Number.isFinite(Number(s))?Number(s):0;

// All transforms remain in the verified GLB frame. Each mesh gets the ordered
// XML transform product. This repairs overlapping/split AC3D objects without
// inheriting the lab exporter's inverted/nested animation groups.
export function prepareFlightGear(root,data,options={}) {
 root.updateMatrixWorld(true);
 const inv=root.matrixWorld.clone().invert(),originalNodes=[];
 root.traverse(o=>originalNodes.push(o));
 const meshes=meshList(root),bases=new Map(),ancestors=new Map();
 for(const m of meshes){
  // GLTFLoader splits multi-primitive meshes into unnamed child meshes.
  // Recover their AC3D identity before discarding the exporter hierarchy.
  if(!m.userData.fg_name)for(let p=m.parent;p&&p!==root;p=p.parent){
   if(p.userData.fg_name){m.userData={...m.userData,fg_name:p.userData.fg_name,fg_instance:p.userData.fg_instance};break;}
  }
  bases.set(m,inv.clone().multiply(m.matrixWorld));
  const names=[];for(let p=m;p&&p!==root;p=p.parent)names.push(p.userData.fg_name||p.name);
  ancestors.set(m,names);
 }
 root.clear();
 for(const m of meshes){m.clear();root.add(m);m.matrixAutoUpdate=false;m.matrix.copy(bases.get(m));m.visible=true;m.frustumCulled=false;m.castShadow=m.receiveShadow=true;}
 const bindings=new Map(meshes.map(m=>[m,[]])),drivers=[],permanent=new Map(),notes=[],stowFits=new Map();
 const nameOf=m=>m.userData.fg_name||m.name.replace(/^i\d+_/,'');
 const matches=(m,objects)=>objects.some(n=>clean(nameOf(m))===n||nameOf(m)===n);
 const descendantTargets=objects=>meshes.filter(m=>matches(m,objects)||ancestors.get(m)?.some(n=>objects.includes(n)));
 const hide=(m,reason)=>{permanent.set(m,reason);m.userData.hiddenReason=reason;};
 const fields=options.fields, signed=options.signed||['aileron','elevator','rudder'];
 // FDM cruise RPM is propeller RPM. XML blade factors convert engine RPM;
 // normalize the demo throttle to that cruise value rather than inventing it.
 const bladeSpin=data.animations.find(a=>a.type==='spin'&&a.objects.some(n=>/^(prop|Prop|propBlade1)$/.test(n)));
 const engineRPM=options.engineRPM??(data.geometry.propellers[0]?.cruise_rpm?data.geometry.propellers[0].cruise_rpm/Math.abs(bladeSpin?.factor||1):0);
 let state={};
 function preset(parked){return {gear:parked?1:0,flaps:0,slats:0,aileron:0,elevator:0,rudder:0,speedbrake:0,canopy:0,engine:parked?0:.6,groundIntakes:parked?1:0,compression:0,rollTrim:0,pitchTrim:0,yawTrim:0,cooling:0,oil:0,propPitch:0,wheelSteer:0,stores:0,lights:0,...options.preset?.(parked)};}
 function resolveAlias(p){p=p.replace(/^\//,'');const seen=new Set();while(data.aliases[p]&&!seen.has(p)){seen.add(p);p=data.aliases[p].replace(/^\//,'');}return p;}
 function channel(a){
  const p=a.property, resolved=resolveAlias(p);
  if(p==='params/blade-angle')return 'propPitch';
  if(/roll-trim/.test(resolved))return 'rollTrim';
  if(/pitch-trim/.test(resolved))return 'pitchTrim';
  if(/yaw-trim/.test(resolved))return 'yawTrim';
  if(p==='params/doors/coolant')return 'cooling';
  if(p==='params/doors/oil')return 'oil';
  if(/left-elevon/.test(resolved))return 'leftElevon';
  if(/right-elevon/.test(resolved))return 'rightElevon';
  if(/compression-norm/.test(resolved))return 'compression';
  if(/\/wow\/?$/.test(resolved))return 'groundIntakes';
  if(/gear.*position-norm/.test(resolved))return 'gear';
  if(/throttle/.test(resolved))return 'engine';
  if(/flap-pos/.test(resolved))return 'flaps';
  if(a.type==='spin'&&(/rollspeed/.test(resolved)||options.id==='p51davinci'&&/float\[(9|10|11)\]/.test(p)))return 'wheelSpin';
  if(/slat-pos/.test(resolved))return 'slats';
  if(/speedbrake/.test(resolved))return 'speedbrake';
  if(/aileron/.test(resolved))return 'aileron';
  if(/elevator/.test(resolved))return 'elevator';
  if(/rudder/.test(resolved))return options.id==='mig29'&&a.objects.includes('nosewheels')?'wheelSteer':'rudder';
  if(p==='sim/multiplay/generic/float[0]')return options.id==='p51d'?'innerDoors':options.id==='p51davinci'?'canopy':null;
  if(p==='sim/multiplay/generic/float[5]'&&options.id==='p51d')return 'wheelSteer';
  if(p==='sim/multiplay/generic/float[16]'&&options.id==='p51davinci')return 'castor';
  if(/rpm|params\/rpm/.test(p)&&a.type==='spin')return 'spin';
  if(a.channel==='canopy')return 'canopy';
  return null;
 }
 function value(c){
  if(c==='leftElevon')return clamp(state.elevator+state.aileron,-1,1);
  if(c==='rightElevon')return clamp(state.elevator-state.aileron,-1,1);
  if(c==='innerDoors')return state.gear>=.999&&state.engine===0?1:state.gear<1/3?state.gear*3:state.gear<2/3?1:(1-state.gear)*3;
  if(c==='propPitch')return 23+state.propPitch*35; // Engines/P51prop.xml minpitch/maxpitch
  if(c==='castor')return 0; // Ground steering is the XML's separate ±30° rudder driver.
  if(c==='wheelSteer'&&options.id==='p51d')return state.wheelSteer*360; // JSBSim max_steer
  return state[c]??0;
 }
 // Pair repeated nozzle-object names with their own instance's verified hinge.
 const nozzleUsed=new Set();
 for(const a of data.animations){
  if(!a.glb_nodes?.length)continue;
  const c=channel(a);if(!c)continue;
  if(a.type==='spin'&&!['spin','wheelSpin'].includes(c))continue;
  let targets=meshes.filter(m=>matches(m,a.objects));
  const center=a.glb_center?new T.Vector3(...a.glb_center):a.glb_axis_points?new T.Vector3(...a.glb_axis_points[0]).add(new T.Vector3(...a.glb_axis_points[1])).multiplyScalar(.5):new T.Vector3();
  const axis=a.glb_axis_dir?new T.Vector3(...a.glb_axis_dir):a.glb_axis_points?new T.Vector3(...a.glb_axis_points[1]).sub(new T.Vector3(...a.glb_axis_points[0])):new T.Vector3(1,0,0);
  axis.normalize();
  if(options.id==='mig29'&&/nozzle/i.test(a.objects.join(' '))){
   targets=targets.filter(m=>!nozzleUsed.has(m)).sort((x,y)=>boxOf(x,bases.get(x)).getCenter(new T.Vector3()).distanceTo(center)-boxOf(y,bases.get(y)).getCenter(new T.Vector3()).distanceTo(center)).slice(0,1);
   targets.forEach(m=>nozzleUsed.add(m));
  }
  if(!targets.length)continue;
  let input=signed.includes(c)||['leftElevon','rightElevon','rollTrim','pitchTrim','yawTrim','wheelSteer'].includes(c)?[-1,1]:[0,1];
  if(c==='propPitch')input=[23,58];
  if(c==='wheelSteer'&&options.id==='p51d')input=[-360,360];
  const limits=a.travel||a.interpolation?.length?[...(a.travel||[Math.min(...a.interpolation.map(x=>x[1])),Math.max(...a.interpolation.map(x=>x[1]))])]:[Math.min(a.factor*input[0]+a.offset,a.factor*input[1]+a.offset),Math.max(a.factor*input[0]+a.offset,a.factor*input[1]+a.offset)];
  const driver={a,channel:c,center,axis,input,limits,matrix:new T.Matrix4(),output:0,targets};
  drivers.push(driver);for(const m of targets)bindings.get(m).push(driver);
 }
 // Model names in conditions often refer to a parent/instance, not a mesh.
 const rules=data.conditions.filter(c=>c.condition).map(c=>({...c,targets:descendantTargets(c.objects)}));
 function property(path){
  const p=path.replace(/^\//,'');
  if(/gear\/gear\[\d+\]\/position-norm/.test(p))return state.gear;
  if(/\/wow\/?$/.test(p))return state.groundIntakes??(state.gear===1?1:0);
  if(/rpm/.test(p)||p==='params/rpm')return state.engine*engineRPM;
  if(/out-of-fuel/.test(p))return 0;
  if(options.id==='mig29'&&/float\[[23]\]/.test(p))return state.engine>=.9?1:0;
  // Mig-29.nas copies the navigation-light control to this multiplayer
  // channel; both the on-lamps and the complementary off-lamps use it.
  if(options.id==='mig29'&&p==='sim/multiplay/generic/float[4]')return state.lights;
  if(/lighting|lights|landing-light|params\/lighting/.test(p))return state.lights;
  if(/params\/securing/.test(p)||/tiedown|pitot-cover/.test(p))return 0;
  if(/params\/stores|payload|armament|bomb|tank|rocket/.test(p))return state.stores;
  if(p==='sim/current-view/view-number')return 1; // External camera
  if(p==='sim/rendering/rembrandt/enabled')return 0;
  if(p==='sim/rendering/shaders/skydome')return 0;
  const alias=resolveAlias(p);if(alias!==p)return property(alias);
  return numerical(data.defaults[p]||'0');
 }
 function evaluate(ast){
  const v=ast.children.map(evaluate);
  switch(ast.op){
   case 'property':return property(ast.value||ast.attrs.alias||'');
   case 'value':return numerical(ast.value);
   case 'condition':case 'and':return v.every(Boolean);
   case 'or':return v.some(Boolean);
   case 'not':return !v[0];
   case 'less-than':return v[0]<v[1];case 'less-than-equals':return v[0]<=v[1];
   case 'greater-than':return v[0]>v[1];case 'greater-than-equals':return v[0]>=v[1];
   case 'equals':return v[0]===v[1];case 'not-equals':return v[0]!==v[1];
   default:return v.length?v.every(Boolean):numerical(ast.value);
  }
 }
 // Texture restoring is asynchronous and injectable for CPU QA, which reads
 // exactly the same external files without a browser or GPU.
 const textureCache=new Map(),loadTexture=options.loadTexture||((url)=>new T.TextureLoader().loadAsync(url));
 async function texture(file){
  if(!textureCache.has(file))textureCache.set(file,loadTexture('/flightgear/'+options.id+'/'+file).then(t=>{
   t.name=file;t.userData.sourceFile='/flightgear/'+options.id+'/'+file;t.colorSpace=T.SRGBColorSpace;t.flipY=false;t.anisotropy=8;return t;
  }).catch(e=>{textureCache.delete(file);throw e;}));
  return textureCache.get(file);
 }
 for(const m of meshes){
  const list=(Array.isArray(m.material)?m.material:[m.material]).map(x=>x.clone());
  for(const mat of list){
   mat.ior=1.5;mat.specularIntensity=.28;mat.specularColor?.set('#ffffff');mat.envMapIntensity=.5;
   mat.roughness=clamp(mat.roughness??.65,.42,.9);mat.metalness=clamp(mat.metalness??0,0,.3);
   mat.side=T.FrontSide;
   const glass=options.glass?.includes(nameOf(m))||/^(CanopyGlass|WindscreenGlass|GunsightGlass|gusightglass|WindScreen|IRglass)$/.test(nameOf(m));
   if(glass){mat.color.set('#a5beca');mat.transparent=true;mat.opacity=.24;mat.roughness=.14;mat.metalness=.08;mat.depthWrite=false;mat.side=T.DoubleSide;m.castShadow=false;}
   if(options.id==='mig29'&&!m.geometry.attributes.uv&&!glass){
    if(/fuselage|Wing[LR]|Vstabs|Stabilizer|Slats|Flaps|Rudder|Aileron|AirBrake|CanopyFrame|Nosecone/i.test(nameOf(m))){
     mat.color.set(/Nosecone/i.test(nameOf(m))?'#59666c':/CanopyFrame/i.test(nameOf(m))?'#788887':'#8d9998');
     mat.roughness=.73;mat.metalness=.08;
     if(!/Nosecone|CanopyFrame/i.test(nameOf(m))){
      if(!m.userData.referencePaint){
       m.geometry=m.geometry.clone();const p=m.geometry.attributes.position,colors=[],point=new T.Vector3();
       for(let i=0;i<p.count;i++){
        point.fromBufferAttribute(p,i).applyMatrix4(bases.get(m));
        const dark=Math.sin(point.x*.74+Math.sin(point.z*.63)*1.1)+Math.cos(point.z*.93-point.x*.27)>.72;
        const color=new T.Color(point.y<-.22?'#bec8c8':dark?'#798b88':'#9da9a8');colors.push(color.r,color.g,color.b);
       }
       m.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
       m.userData.referencePaint='Supplied MiG-29 photos 08/09/10: grey upper camouflage / light underside';
      }
      mat.map=null;mat.color.set('#ffffff');mat.vertexColors=true;
     }
    }else if(/wheel/i.test(nameOf(m))){mat.color.set('#242b2f');mat.roughness=.9;mat.metalness=0;}
    else if(/gear/i.test(nameOf(m))){mat.color.set('#9ba4a4');mat.roughness=.46;mat.metalness=.38;}
    else if(/nozzle|Engine|Combustion|Flameholder/i.test(nameOf(m))){mat.color.set('#46484a');mat.roughness=.58;mat.metalness=.5;}
   }
   // Alpha, UV orientation and material slots are maintained per primitive.
   if(mat.map){mat.map.colorSpace=T.SRGBColorSpace;mat.map.anisotropy=8;}
  }
  m.material=Array.isArray(m.material)?list:list[0];
 }
 const materialSlots=[];
 for(const m of meshes){
  const rows=data.textureParts.filter(p=>p.glb_nodes.includes(m.name)||clean(nameOf(m))===p.ac_object);
  for(const mat of Array.isArray(m.material)?m.material:[m.material]){
   const mapKey=baseName(mat.map?.name||'');
   const row=rows.find(p=>p.file&&baseName(p.texture)===mapKey)||(rows.filter(p=>p.file).length===1?rows.find(p=>p.file):null);
   if(row?.file&&m.geometry.attributes.uv){
    const sw=data.materialSwitches?.find(s=>matches(m,s.objects));
    materialSlots.push({mesh:m,mat,file:row.file,key:sw?baseName(sw.property):mapKey||baseName(row.texture)});
   }
  }
 }
 async function restoreTextures(){
  const results=await Promise.allSettled(materialSlots.map(async slot=>{
   slot.mat.map=await texture(slot.file);const image=data.textures.find(t=>t.file===slot.file);
   if(image?.cutout_alpha){slot.mat.alphaTest=.12;slot.mat.transparent=false;slot.mat.depthWrite=true;}
   // Textured paint uses the original authored diffuse multiplier.
   slot.mat.needsUpdate=true;
  }));
  const errors=results.filter(r=>r.status==='rejected');if(errors.length)throw new Error(errors.length+' FlightGear textures failed to load');
 }
 const liveries=options.liveries?.(data)||[];let liveryIndex=0,liveryRequest=0;
 async function setLivery(index){
  if(!liveries[index])throw new Error('Unknown livery');const request=++liveryRequest,l=liveries[index];
  const changes=await Promise.all(materialSlots.map(async slot=>{
   const file=l.files[slot.key];return file?{slot,map:await texture(file)}:null;
  }));
  if(request!==liveryRequest)return;
  for(const c of changes.filter(Boolean)){c.slot.mat.map=c.map;c.slot.mat.userData.baseMap=c.map;c.slot.mat.needsUpdate=true;}
  liveryIndex=index;
 }
 function registerProcedural(m,chain=[],reason='Procedural repair'){
  root.add(m);m.updateMatrix();m.matrixAutoUpdate=false;bases.set(m,m.matrix.clone());bindings.set(m,chain);meshes.push(m);m.userData.repairReason=reason;m.castShadow=m.receiveShadow=true;
 }
 options.augment?.({root,data,meshes,bases,bindings,drivers,hide,registerProcedural,notes});
 // Restore model-scope conditions omitted from the flattened facts summary.
 if(options.id==='p51d')for(const m of meshes){
  if(['i73','i74','i75','i76','i77'].includes(m.userData.fg_instance))hide(m,'FlightGear securing equipment disabled (cover/tiedown condition); revealable in inspector');
 }
 // Colourless/opaque billboard light effects are not physical wing/fin geometry.
 if(options.id==='mig29')for(const m of meshes){
  if(/Glow/.test(nameOf(m)))hide(m,'FlightGear light billboard requires additive camera-facing shader; replaced by physical lamp material');
   if(/Reheat/.test(nameOf(m))){
   m.userData.nonPhysicalEffect=true;m.castShadow=false;
   for(const mat of Array.isArray(m.material)?m.material:[m.material]){mat.transparent=true;mat.opacity=.3;mat.depthWrite=false;mat.side=T.DoubleSide;mat.blending=T.AdditiveBlending;mat.emissive?.set('#b45022');mat.emissiveIntensity=.5;}
   }
  }
 // Preserve the FlightGear RPM visibility switches for original propellers.
 // The billboards require alpha blending; the imported opaque material did not.
 for(const m of meshes)if(/pdisk|PropellerDisk/.test(nameOf(m))){
  m.userData.nonPhysicalEffect=true;m.castShadow=false;
  for(const mat of Array.isArray(m.material)?m.material:[m.material]){mat.transparent=true;mat.opacity=.14;mat.depthWrite=false;mat.side=T.DoubleSide;mat.alphaTest=.01;}
 }
 function configure(next={}){
  state={...preset(next.gear===1),...state,...next};
  for(const key of new Set([...fields,...signed,'groundIntakes','compression','rollTrim','pitchTrim','yawTrim','propPitch','lights','stores']))state[key]=clamp(Number(state[key])||0,signed.includes(key)?-1:0,1);
  for(const d of drivers){
   const {a}=d;if(d.channel==='spin')d.output=d.phase??0;
   else if(d.channel==='wheelSpin')d.output=(state.wheelRoll??0)*360*(Math.sign(a.factor)||1);
   else {const x=clamp(value(d.channel),...d.input);d.output=clamp(a.interpolation?interpolate(a.interpolation,x):x*a.factor+a.offset,...d.limits);}
   if(a.type==='translate')d.matrix.makeTranslation(d.axis.clone().multiplyScalar(d.output));
   else {d.matrix.makeRotationAxis(d.axis,d.output*RAD);const p=d.center.clone().sub(d.center.clone().applyMatrix4(d.matrix));d.matrix.setPosition(p);}
  }
  for(const m of meshes){
   const tr=new T.Matrix4();for(const d of bindings.get(m)||[])tr.multiply(d.matrix);m.matrix.copy(tr.multiply(bases.get(m)));m.matrixWorldNeedsUpdate=true;m.visible=!permanent.has(m);
   if(stowFits.has(m))m.matrix.premultiply(new T.Matrix4().makeTranslation(stowFits.get(m).clone().multiplyScalar(clamp((.33-state.gear)/.33,0,1))));
   if(permanent.has(m))m.userData.hiddenReason=permanent.get(m);else delete m.userData.hiddenReason;
  }
  for(const r of rules)if(!evaluate(r.condition))for(const m of r.targets){m.visible=false;m.userData.hiddenReason='FlightGear condition: '+r.xml+' / '+r.objects.join(', ');}
  options.afterConfigure?.({state,meshes,drivers,bindings,bases,permanent});
  root.updateMatrixWorld(true);return {...state};
 }
 function physicalBounds(){
  const box=new T.Box3();for(const m of meshes)if(m.visible&&!m.userData.nonPhysicalEffect)box.union(boxOf(m,m.matrix));return box;
 }
 // Every tyre surface (including lab material splits) moves with the same XML
 // channel. Contact correction is a local visual fit, never a change to pitch.
 function alignTyres(){
  configure(preset(true));const park=new T.Matrix4().makeRotationZ(-data.geometry.parked_pitch_deg_nose_up*RAD);
  for(const contact of data.geometry.gear_contacts){
   const name=clean(contact.nearest_gear_node.replace(/^i\d+_/,'')),parts=meshes.filter(m=>clean(nameOf(m))===name);
   if(!parts.length)continue;
   let low=Infinity;for(const m of parts){const p=m.geometry.attributes.position,tr=park.clone().multiply(m.matrix);for(let i=0;i<p.count;i++)low=Math.min(low,new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(tr).y);}
   const target=new T.Vector3(...contact.glb).applyMatrix4(park).y,dy=(target-low)/Math.cos(data.geometry.parked_pitch_deg_nose_up*RAD);
   for(const m of parts)bases.get(m).premultiply(new T.Matrix4().makeTranslation(0,dy,0));
   notes.push({type:'tyreContactFit',parts:parts.map(m=>m.name),verticalOffsetM:dy,source:contact.glb});
  }
  configure(preset(true));
 }
 alignTyres();
 // Fit material-split tyres against the actual well, keeping XML angles.
 // The correction vanishes while deployed, so FDM contacts stay unchanged.
 if(options.mainBay){
  configure(preset(false));const bay=new T.Box3();
  for(const m of meshes.filter(m=>options.mainBay.includes(nameOf(m))))bay.union(boxOf(m,bases.get(m)));
  if(!bay.isEmpty())for(const contact of data.geometry.gear_contacts.slice(0,2)){
   const name=clean(contact.nearest_gear_node.replace(/^i\d+_/,'')),parts=meshes.filter(m=>clean(nameOf(m))===name),wheel=new T.Box3();
   for(const m of parts)wheel.union(boxOf(m,m.matrix));
   const offset=new T.Vector3();for(const k of ['x','y','z']){
    if(wheel.max[k]-wheel.min[k]<=bay.max[k]-bay.min[k])offset[k]=wheel.min[k]<bay.min[k]?bay.min[k]-wheel.min[k]+.002:wheel.max[k]>bay.max[k]?bay.max[k]-wheel.max[k]-.002:0;
   }
   if(offset.length()>0){for(const m of parts)stowFits.set(m,offset);notes.push({type:'stowedWheelMeshFit',source:'Actual '+options.mainBay.join('/')+' mesh bounds',parts:parts.map(m=>m.name),offsetM:offset.toArray(),xmlAnglesUnchanged:true});}
  }
  configure(preset(true));
 }
 const initialBounds=physicalBounds();
 const report={id:options.id,glbSha256:data.glbSha256,nativeScale:1,parkedPitchDegrees:data.geometry.parked_pitch_deg_nose_up,limitsDegrees:options.limits||{},notes,source:'facts.json + original XML',hiddenParts:()=>meshes.filter(m=>!m.visible).map(m=>({name:m.name,reason:m.userData.hiddenReason})),animationCount:drivers.length};
 const ready=restoreTextures().then(()=>liveries.length?setLivery(0):undefined).then(()=>{
  for(const m of meshes)for(const mat of Array.isArray(m.material)?m.material:[m.material]){mat.userData.baseMap=mat.map||null;mat.userData.baseColor=mat.color.clone();mat.userData.baseVertexColors=mat.vertexColors;}
 });
 return {fields,signedFields:signed,labels:options.labels||{},isSeaplane:false,groundPitch:data.geometry.parked_pitch_deg_nose_up*RAD,nativeScale:true,groundContacts:data.geometry.gear_contacts.map(c=>new T.Vector3(...c.glb)),root,drivers,bindings,bases,meshes,report,ready,liveries,setLivery,getLivery:()=>liveryIndex,preset,configure,getState:()=>({...state}),bounds:()=>initialBounds.clone(),physicalBounds,
  spin(dt,engine){state.engine=clamp(Number(engine)||0,0,1);for(const d of drivers)if(d.channel==='spin')d.phase=(((d.phase??0)+dt*state.engine*engineRPM*6*d.a.factor)%360+360)%360;configure(state);},
  formatValue(key,v){if(key==='engine')return Math.round(v*100)+'%';if(key==='propPitch')return (23+v*35).toFixed(0)+'°';const ds=drivers.filter(d=>d.channel===key||key==='elevator'&&/Elevon/.test(d.channel)||key==='aileron'&&/Elevon/.test(d.channel));if(ds.some(d=>d.a.type==='rotate'))return [...new Set(ds.filter(d=>d.a.type==='rotate').map(d=>Math.round(d.output)+'°'))].slice(0,2).join(' / ');if(key==='canopy')return (v*.65).toFixed(2)+' m';return Math.round(v*100)+'%';},
  update(dt,flight,active,paused){if(paused)return;if(active)configure({...preset(false),engine:flight.throttle,aileron:clamp(-flight.roll*1.1,-1,1),elevator:clamp(flight.pitch*2,-1,1),rudder:clamp(-flight.roll*.3,-1,1)});this.spin(dt,active?flight.throttle:.15);}
 };
}

// Original, procedural geometry; no shape or pixels are taken from reference
// models. Hamilton Standard proportions are fitted to the existing hub.
export function addHamiltonPropeller(context,diameter,center,axis,originalNames){
 const {meshes,hide,registerProcedural,drivers}=context;
 for(const m of meshes)if(originalNames.includes(m.userData.fg_name)||/pdisk|3blade/i.test(m.name))hide(m,'Original propeller/blur is undersized; procedural Hamilton Standard at documented diameter');
 const originalSpin=context.data.animations.find(a=>a.type==='spin'&&a.objects.some(n=>originalNames.includes(n)));
 const c=new T.Vector3(...center),ax=new T.Vector3(...axis).normalize(),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),ax),driver={a:{type:'spin',factor:originalSpin?.factor||1},channel:'spin',center:c,axis:ax,input:[0,1],limits:[0,360],output:0,matrix:new T.Matrix4(),targets:[]};drivers.push(driver);
 const r=diameter/2;
 for(let blade=0;blade<4;blade++){
  const shape=new T.Shape();shape.moveTo(.15*r,-.045*r);shape.bezierCurveTo(.35*r,-.105*r,.79*r,-.08*r,.995*r,-.012*r);shape.quadraticCurveTo(r,0,.995*r,.012*r);shape.bezierCurveTo(.8*r,.075*r,.36*r,.115*r,.15*r,.045*r);shape.closePath();
  const geo=new T.ExtrudeGeometry(shape,{depth:.012*r,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008*r,bevelThickness:.007*r,curveSegments:20});
  // Shape x is radial and y is chord; orient into the plane normal to x.
  const matrix=new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0));geo.applyMatrix4(matrix);geo.rotateY(.22);geo.rotateX(blade*Math.PI/2);geo.applyQuaternion(rotation);geo.translate(...center);
  const m=new T.Mesh(geo,new T.MeshPhysicalMaterial({color:'#1c2428',roughness:.49,metalness:.15,clearcoat:.16}));m.name='procedural_Hamilton_Standard_blade_'+(blade+1);registerProcedural(m,[driver]);driver.targets.push(m);
  const tipGeo=new T.BoxGeometry(.023*r,.06*r,.09*r);tipGeo.translate(0,.947*r,0);tipGeo.rotateX(blade*Math.PI/2);tipGeo.applyQuaternion(rotation);tipGeo.translate(...center);
  const tip=new T.Mesh(tipGeo,new T.MeshStandardMaterial({color:'#dfbc54',roughness:.62}));tip.name='procedural_propeller_yellow_tip_'+blade;registerProcedural(tip,[driver]);driver.targets.push(tip);
 }
 context.notes.push({type:'proceduralPropeller',diameterM:diameter,blades:4,center,axis,source:'verified spin centre / FDM or documented real-spec conflict'});
}
