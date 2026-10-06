import * as THREE from 'three';
import {meshList,clamp} from '../rig-tools.js';
import {labFind,makeXmlRig,quarantine,sourceGlass} from './lab-tools.js';
import {sourceRotor,mapRange} from './rotor-tools.js';
const fields=['doors','collective','cyclicPitch','cyclicRoll','rudder','engine'];
const signed=(v,r)=>v<0?-v*r[0]:v*r[1];
function driver(a,s){const p=a.property??'';if(/doors\//.test(p))return s.doors;if(/aileron/.test(p))return s.cyclicRoll;if(/elevator/.test(p))return s.cyclicPitch;if(/flight\/rudder/.test(p))return s.rudder;if(/engine.*throttle/.test(p))return 1-s.collective;if(/tail\/blade\/incidence/.test(p))return mapRange((1-s.rudder)/2,[34.2,-16.8]);return null;}
export async function prepareEc130Lab(root,animations,facts){
 root.traverse(o=>{if(o.name.startsWith('pivot_'))o.quaternion.identity();});root.updateMatrixWorld(true);
 const corrected=[],moving=new Set();
 for(const [sourceIndex,a]of facts.animations_from_xml.entries()){
  if(sourceIndex>60||driver(a,Object.fromEntries(fields.map(f=>[f,0])))==null)continue;
  for(const name of a.objects){if(/_t2$/.test(name))continue;const node=labFind(root,name);if(!node)continue;moving.add(node);
   const domain=/aileron|elevator|flight\/rudder/.test(a.property)?[-1,1]:[0,1];
   corrected.push({...a,glb_nodes:[node.name],sourceIndex,travel:a.travel??(/tail\/blade/.test(a.property)?[-24,12]:domain.map(v=>v*Number(a.factor??1)+Number(a.offset??0)).sort((x,y)=>x-y))});
  }
 }
 for(const node of moving){root.attach(node);root.updateMatrixWorld(true);}
 const main=sourceRotor(root,facts,0,'ec130_lab_main_rotor'),tail=sourceRotor(root,facts,1,'ec130_lab_tail_rotor');
 for(const rotor of [main,tail])for(const blade of rotor.blades)for(const mesh of meshList(blade)){
  const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];mats[0].color.set('#45494e');mats[1]?.color.set('#ccd0d4');for(const m of mats)m.userData.labMaterialReason='EC130 manufacturer reference04: charcoal blades and pale tips; procedural section approximation';
 }
 const properties={};function defaults(n){if(n.op==='property'&&!(n.text.replace(/^\//,'') in facts.default_properties))properties[n.text.replace(/^\//,'')]=0;for(const c of n.children??[])defaults(c);}
 facts.source_conditions.forEach(r=>r.condition&&defaults(r.condition));
 Object.assign(properties,{'sim/model/ec130/interior_passengers':6,'sim/model/ec130/cockpit-windscreen-option':0,'sim/model/variant':1});
 // Duplicate shader/inner panes overlap the ordinary exterior surfaces in the export.
 for(const m of meshList(root))if(/^(?:window[lrb]+\d{3}|windscreen_inside|.*_t2|.*_t2\d{3})$/.test(m.name)&&!m.userData.labPermanentHidden)quarantine(m,'B4 source variant or duplicate FlightGear shader pane; ordinary exterior pane retained','variant',true);
 const glasses=meshList(root).filter(m=>/^(windscreen|windows_roof|windowl|windowl003|windowr|windowbl|windowbr)$/.test(m.name)).map(m=>m.name);
 const rig=await makeXmlRig(root,animations,{...facts,animations_from_xml:corrected},{fields,driver,properties,
  limits:{doors:[-100,100],collective:[.5,16],cyclicPitch:[-12.6,9.9],cyclicRoll:[-7.1,5.53],rudder:[-16.8,34.2]},
  stateProperties:s=>Object.fromEntries([...facts.animations_from_xml.filter(a=>/doors\//.test(a.property??'')).map(a=>[a.property,s.doors]),['rotors/main/rpm',s.engine*386],['rotors/tail/rpm',s.engine*3568]]),
  finishMaterials:()=>sourceGlass(root,glasses,'EC130 source exterior glass effect'),
  configure:s=>{main.setPitch(mapRange(s.collective,main.limits.collective),signed(s.cyclicPitch,main.limits.cyclicPitch),signed(s.cyclicRoll,main.limits.cyclicRoll));tail.setPitch(mapRange((1-s.rudder)/2,tail.limits.collective));},
  spin:(dt,engine)=>{main.spin(dt,engine);tail.spin(dt,engine);},
  flightTargets:(s,active)=>({collective:active?clamp(s.throttle,0,1):0,cyclicPitch:active?clamp(s.pitch/.58,-1,1):0,cyclicRoll:active?clamp(s.roll/.65,-1,1):0,rudder:active?clamp(s.roll/.65,-1,1):0}),
  groundPitch:(facts.fdm_geometry.parked_pitch_deg_nose_up??0)*Math.PI/180,
  summary:'Lab EC130 B4: source B4 configuration and FlightGear paint;10.69m three-blade main rotor /1.0m ten-blade Fenestron.80°/70° front doors,0.85m left passenger slide and100° right swing; original fixed skids.',
  rigExtras:{mainRotor:main,tailRotor:tail,labels:{rudder:'Tail rotor pitch'}},
 });
 // Contact matcher mislabeled fixed skid points as wheel/floats. Ground the actual visible skid geometry.
 rig.groundContacts=[];rig.report.signedRanges={rudder:[-16.8,34.2]};rig.report.normalizedRanges={collective:main.limits.collective};
 Object.assign(rig.report,{sourceVariant:'EC130 B4 (ec130b4-set.xml)',rotorProfile:main.profileNote,sourceLimitNotes:{ground:'Untrusted FDM contacts matched deflated floats, not wheels; fixed skid/body visible vertices used for height, source−0.96° pitch retained',variant:'ec130-base.xml missing; unresolved accessory properties inspect off, passenger seats6, crew views off. No named livery XML supplied; source FlightGear paint retained',hub:'FDM main hub differs from visual XML by0.087m X /0.046m Y, tail by0.185m lateral; FDM locations retained; visual mast/housing discrepancy remains'}});
 return rig;
}
