import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {fixtures,loadFixture,meshBounds,projectRoot} from './fixture.mjs';

const bare=m=>(m.userData.fg_name||m.name.replace(/^i\d+_/,'' )).replace(/_node(?:_\d+)?$/,'');
const union=(parts,matrix)=>{const box=new T.Box3();for(const m of parts)box.union(meshBounds(m,matrix?matrix.clone().multiply(m.matrix):m.matrix));return box;};
export async function auditAircraft(id,prepare){
 const fixture=await loadFixture(id,prepare),{rig,bytes}=fixture;
 const data=JSON.parse(fs.readFileSync(new URL('../../src/flightgear-data/'+id+'.json',import.meta.url)));
 rig.configure(rig.preset(true));
 const native=rig.physicalBounds().getSize(new T.Vector3());
 const park=new T.Matrix4().makeRotationZ(-rig.groundPitch),parkSize=union(rig.meshes.filter(m=>m.visible&&!m.userData.nonPhysicalEffect),park).getSize(new T.Vector3());
 const reference={length:data.specs.length_m,span:data.specs.span_m,height:data.specs.height_m};
 const actual={length:native.x,span:native.z,height:parkSize.y};
 const dimensions=Object.fromEntries(Object.entries(actual).map(([key,value])=>[key,{actualM:value,referenceM:reference[key],errorPercent:100*(value/reference[key]-1),withinFivePercent:Math.abs(value/reference[key]-1)<=.05}]));
 const contacts=rig.groundContacts.map(v=>v.clone().applyMatrix4(park).y),groundY=-contacts.reduce((a,b)=>a+b,0)/contacts.length;
 const tyreContacts=rig.report.notes.filter(n=>n.type==='tyreContactFit').map(n=>{
  const parts=rig.meshes.filter(m=>n.parts.includes(m.name)),low=union(parts,park).min.y+groundY,target=new T.Vector3(...n.source).applyMatrix4(park).y+groundY;
  return {parts:n.parts,bottomHeightM:low,fdmContactHeightM:target,errorM:low-target};
 });
 let propeller=null;
 if(id!=='mig29'){
  const d=id==='p51davinci'?rig.drivers.find(x=>x.targets.some(m=>m.name==='procedural_Hamilton_Standard_blade_1')):rig.drivers.find(x=>x.a.objects?.includes(id==='p51d'?'propBlade1':'prop'));
  const blades=d.targets.filter(m=>/propBlade|^i0_prop$|procedural_Hamilton_Standard_blade/.test(m.name));let radius=0;
  for(const m of blades){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrix).sub(d.center);radius=Math.max(radius,v.addScaledVector(d.axis,-v.dot(d.axis)).length());}}
  const target=id==='p51davinci'?3.4:id==='p51d'?3.5052:3.5;
  propeller={actualDiameterM:2*radius,targetDiameterM:target,errorPercent:100*(2*radius/target-1),withinThreePercent:Math.abs(2*radius/target-1)<=.03,bladeCount:4,procedural:id==='p51davinci',center:d.center.toArray(),axis:d.axis.toArray()};
 }
 rig.configure(rig.preset(false));
 const names=id==='p51d'?['mainWheelLeft','mainWheelRight','tailWheel']:id==='p51davinci'?['PortTire','StarTire','TailWheel']:id==='mustangiii'?['LeftGearWheel','RightGearWheel','TailGearWheel']:['wheel.L','wheel.R','nosewheels'];
 const bayNames=id==='p51d'?['wheelWells']:id==='p51davinci'?['Wings','WingBottoms']:id==='mustangiii'?['wells']:['fuselage'];
 const mainBay=union(rig.meshes.filter(m=>bayNames.includes(bare(m)))),body=union(rig.meshes.filter(m=>/^(fuselage|Fuselage|fuse|fus)$/.test(bare(m))));
 const gearContainment=names.map((name,i)=>{
  const b=union(rig.meshes.filter(m=>bare(m)===name)),bay=id==='mig29'?union(rig.meshes.filter(m=>m.name.startsWith('procedural_MiG29_'+['GearWellL','GearWellR','nosegeaerwell'][i]+'_'))):i<2?mainBay:body;
  const within=bay.clone().expandByScalar(.005).containsBox(b);
  return {part:name,bounds:[b.min.toArray(),b.max.toArray()],bayBounds:[bay.min.toArray(),bay.max.toArray()],insideBoundingEnvelope:within};
 });
 // Exercise all controls and simultaneous invalid extremes. Include hidden
 // geometry and every driver matrix, not just the visible silhouette.
 const violations=[];
 for(const key of rig.fields)for(const input of [-100,-1,0,.15,.33,.5,.67,1,100,NaN]){
  const state=rig.configure({...rig.preset(true),[key]:input});
  if(state[key]< (rig.signedFields.includes(key)?-1:0)||state[key]>1||!Number.isFinite(state[key]))violations.push(key+' state');
  for(const d of rig.drivers)if(!['spin','wheelSpin'].includes(d.channel)&&(!Number.isFinite(d.output)||d.output<d.limits[0]-1e-9||d.output>d.limits[1]+1e-9))violations.push(key+' '+d.a.objects);
  for(const m of rig.meshes)if(!m.matrix.elements.every(Number.isFinite))violations.push(key+' non-finite '+m.name);
 }
 rig.configure(rig.preset(true));
 return {fixture,data,rig,result:{id,glbSha256:crypto.createHash('sha256').update(bytes).digest('hex'),expectedGlbSha256:data.glbSha256,nativeScale:1,dimensions,parkedPitchDegrees:rig.groundPitch*180/Math.PI,fdmPitchDegrees:data.geometry.parked_pitch_deg_nose_up,contactLevelSpreadM:Math.max(...contacts)-Math.min(...contacts),tyreContacts,propeller,gearContainment,controlViolations:[...new Set(violations)],animationDrivers:rig.drivers.length,liveryCount:rig.liveries.length,notes:rig.report.notes}};
}

export async function runAudit(){const results=[];for(const [id,f]of fixtures)results.push((await auditAircraft(id,f)).result);return results;}
