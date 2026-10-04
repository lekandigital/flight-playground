import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {fixtures,meshBounds} from '../scripts/flightgear-fixtures.mjs';
import {auditAircraft} from '../scripts/validate-flightgear.mjs';

const all=new Map();
for(const [id,prepare]of fixtures)all.set(id,await auditAircraft(id,prepare));
for(const [id,{rig,data,result}]of all){
 test(id+' preserves its GLB, verified axes, metre scale and every bounded control',()=>{
  assert.equal(result.glbSha256,result.expectedGlbSha256);assert.equal(rig.nativeScale,true);assert.equal(data.frame.fg_to_glb.trusted,true);assert.equal(data.frame.nose_points,'-x');assert.deepEqual(result.controlViolations,[]);
  for(const d of rig.drivers)if(d.a.glb_axis_dir){const expected=new T.Vector3(...d.a.glb_axis_dir).normalize();assert.ok(d.axis.distanceTo(expected)<1e-8);}
 });
 test(id+' parks at its FDM pitch with three tyre contacts on the floor',()=>{
  assert.ok(Math.abs(result.parkedPitchDegrees-result.fdmPitchDegrees)<1);assert.ok(result.contactLevelSpreadM<.001);
  assert.equal(result.tyreContacts.length,3);for(const x of result.tyreContacts){assert.ok(Math.abs(x.errorM)<1e-5);assert.ok(Math.abs(x.bottomHeightM)<.001);}
 });
 test(id+' stows every tyre in the measured wing or fuselage envelope',()=>{
  assert.equal(result.gearContainment.length,3);for(const x of result.gearContainment)assert.ok(x.insideBoundingEnvelope,x.part+' outside bay');
 });
 test(id+' keeps all hidden parts available and uses sane materials',()=>{
  rig.configure(rig.preset(true));assert.ok(rig.report.hiddenParts().length>0);
  for(const m of rig.meshes){assert.equal(m.parent,rig.root);for(const mat of [m.material].flat()){if('ior'in mat)assert.equal(mat.ior,1.5);if(mat.map&&m.geometry.attributes.uv)assert.equal(mat.map.colorSpace,T.SRGBColorSpace);}}
  const hidden=rig.meshes.find(m=>!m.visible);hidden.visible=true;assert.equal(hidden.visible,true);rig.configure(rig.preset(true));assert.equal(hidden.visible,false);
 });
 if(id!=='mig29')test(id+' has four blades, correct diameter and concentric continuous rotation',()=>{
  assert.equal(result.propeller.bladeCount,4);assert.ok(result.propeller.withinThreePercent,JSON.stringify(result.propeller));
  const d=rig.drivers.find(x=>x.channel==='spin'&&x.targets.some(m=>/propBlade1|^i0_prop$|procedural_Hamilton_Standard_blade_1/.test(m.name)));
  const blade=d.targets[0],point=new T.Vector3().fromBufferAttribute(blade.geometry.attributes.position,0),before=point.clone().applyMatrix4(blade.matrix).sub(d.center).length();
  rig.spin(.137,1);assert.ok(d.phase>=0&&d.phase<360);const after=point.clone().applyMatrix4(blade.matrix).sub(d.center).length();assert.ok(Math.abs(before-after)<1e-8);
  assert.ok(d.center.clone().applyMatrix4(d.matrix).distanceTo(d.center)<1e-8);rig.spin(0,0);assert.ok(d.center.clone().applyMatrix4(d.matrix).distanceTo(d.center)<1e-8);
 });
}
test('P-51D original texture mappings and every available livery change the correct parts',async()=>{
 for(const id of ['p51d','p51davinci']){
  const {rig}=all.get(id);assert.equal(rig.liveries.length,id==='p51d'?4:11);
  const target=rig.meshes.find(m=>(m.userData.fg_name||'')===(id==='p51d'?'fuselage':'Fuselage'));
  const seen=[];
  for(let i=0;i<rig.liveries.length;i++){await rig.setLivery(i);const file=[target.material].flat()[0].map.userData.sourceFile;assert.ok(file.includes(id==='p51d'?'/'+[2,1,4,8][i]+'k/':'/'+rig.liveries[i].name+'/'));seen.push(file);}
  assert.equal(new Set(seen).size,rig.liveries.length);await rig.setLivery(0);
 }
});
test('Mustang III source glass stays transparent while its separate hood frames stay opaque',()=>{
 const {rig}=all.get('mustangiii');for(const name of ['glaze','malc2']){const m=rig.meshes.find(m=>m.userData.fg_name===name);assert.ok(m.material.transparent);assert.ok(m.material.opacity<.3);}
 for(const name of ['malc1out','malc1in'])assert.equal(rig.meshes.find(m=>m.userData.fg_name===name).material.opacity,1);
 assert.equal(rig.fields.includes('canopy'),false);
});
test('MiG-29 uses exact XML gear sequence, bounded taileron mix, brakes, intakes and reheat',()=>{
 const {rig}=all.get('mig29');assert.equal(rig.drivers.length,105);
 const driver=(name,channel)=>rig.drivers.find(d=>d.a.objects?.includes(name)&&(!channel||d.channel===channel));
 rig.configure({...rig.preset(false),gear:.4});assert.equal(driver('fwdgeardoor.L').output,155);assert.equal(driver('fwdgeardoor.R').output,-155);
 rig.configure({...rig.preset(false),gear:0});assert.equal(driver('gear1.L').output,115);assert.equal(driver('gear1.R').output,-115);assert.equal(driver('nosegear1').output,80);
 rig.configure({...rig.preset(false),elevator:1,aileron:1,flaps:1,slats:1,speedbrake:1,wheelSteer:1});
 assert.equal(Math.abs(driver('StabilizerL').output),30);assert.equal(driver('StabilizerR').output,0);
 assert.equal(Math.abs(driver('FlapsL').output),20);assert.equal(Math.abs(driver('SlatsL').output),20);assert.equal(Math.abs(driver('nosewheels','wheelSteer').output),50);
 const brakes=rig.drivers.filter(d=>d.channel==='speedbrake').map(d=>d.output);assert.ok(brakes.includes(-56));assert.ok(brakes.includes(60));
 rig.configure(rig.preset(true));const screens=rig.meshes.filter(m=>/IntakeScreen/.test(m.name));assert.ok(screens.every(m=>m.visible));assert.ok(rig.drivers.filter(d=>d.channel==='groundIntakes').every(d=>Math.abs(d.output)===60));
 const flames=rig.meshes.filter(m=>/Reheat/.test(m.name));assert.ok(flames.every(m=>!m.visible));rig.configure({...rig.preset(false),engine:1});assert.ok(flames.every(m=>m.visible));assert.ok(screens.every(m=>!m.visible));
 for(const m of flames){assert.equal(m.userData.nonPhysicalEffect,true);for(const mat of [m.material].flat()){assert.equal(mat.blending,T.AdditiveBlending);assert.equal(mat.opacity,1);}}
});
test('Native size audit explicitly records the two unresolved height tolerances',()=>{
 const failed=[];for(const [id,{result}]of all)for(const [dimension,r]of Object.entries(result.dimensions))if(!r.withinFivePercent)failed.push(id+':'+dimension);
 assert.deepEqual(failed,['p51davinci:height','mig29:height']);
});
