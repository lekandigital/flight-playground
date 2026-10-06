import * as THREE from 'three';
import {meshList,visibleBounds} from '../rig-tools.js';
import {defaultDriver,labFind,makeXmlRig,sourceGlass} from './lab-tools.js';

// The converter flattens named XML groups into baked pivots. Rebuild only
// groups explicitly named in the source, retaining the author's blade shapes.
export async function sourceSeaplane(root,animations,facts,options){
 root.traverse(o=>{if(o.name.startsWith('pivot_'))o.quaternion.identity();});root.updateMatrixWorld(true);
 const schedule=facts.animations_from_xml.map(a=>{
  const group=options.groups[a.objects?.[0]],copy={...a};
  if(group)copy.glb_nodes=group.map(name=>'i0_'+name).filter(name=>labFind(root,name));
  else copy.glb_nodes=(a.glb_nodes??[]).filter(name=>labFind(root,name)?.isMesh);
  if(!copy.travel&&copy.type==='rotate'&&options.normalizedProperties?.includes(copy.property)){
   const signed=/controls\/flight\/(elevator|rudder)$/.test(copy.property);
   const factor=Number(copy.factor);copy.travel=signed?[-Math.abs(factor),Math.abs(factor)]:[Math.min(0,factor),Math.max(0,factor)];
   copy.travel_source='Source normalized control/door domain × XML factor; omitted by pack builder';
  }
  return copy;
 });
 const moving=new Set(schedule.flatMap(a=>a.glb_nodes.map(name=>labFind(root,name))).filter(Boolean));
 for(const node of moving){root.attach(node);root.updateMatrixWorld(true);}
 const propSpecs=facts.fdm_geometry.propellers;
 const stateProperties=s=>Object.fromEntries(propSpecs.map((spec,index)=>[`engines/engine[${index}]/rpm`,s.engine*spec.cruise_rpm]));
 const bodyPaint=(facts.texture_by_part??[]).filter(b=>/\/texture\.png$/.test(b.texture)&&b.has_uv).flatMap(b=>b.glb_nodes??[]).filter(n=>labFind(root,n)?.isMesh);
 const rig=await makeXmlRig(root,animations,{...facts,animations_from_xml:schedule},{
  fields:options.fields,driver:options.driver??defaultDriver,properties:options.properties,stateProperties,
  limits:options.limits,isSeaplane:true,liveryOptions:{slots:{'sim/model/livery/texture':[...new Set(bodyPaint)]}},
  finishMaterials:()=>sourceGlass(root,options.glass??['i0_vitres'],options.glassSource),
  summary:options.summary,
 });
 rig.configure(Object.fromEntries(options.fields.map(field=>[field,0])));root.updateMatrixWorld(true);
 const propellerMeasurements=rig.spins.map((spin,index)=>{
  const name=options.blades[index],mesh=labFind(root,'i0_'+name),p=new THREE.Vector3(),inverse=root.matrixWorld.clone().invert(),axis=new THREE.Vector3().fromArray(spin.anim.glb_axis_dir).normalize(),hub=spin.origin;
  let radius=0;
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){
   p.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse).sub(hub);
   radius=Math.max(radius,p.clone().addScaledVector(axis,-p.dot(axis)).length());
  }
  return{source:'Original source blade geometry',name,count:2,radius,diameter:radius*2,fdmDiameter:propSpecs[index].radius_m*2,hub:hub.toArray(),axis:axis.toArray(),rpm:propSpecs[index].cruise_rpm};
 });
 const size=visibleBounds(root).getSize(new THREE.Vector3()).toArray();
 Object.assign(rig.report,{sourceVariant:options.variant,propellerBlades:propellerMeasurements.map(p=>p.count),propellers:propellerMeasurements,
  geometryMeasurements:{levelFlight:{size}},borrowedParts:[],remaining:options.remaining,
  sourceLimitNotes:{ground:'YASim water-contact points and source pitch retained. Contacts are untrusted buoyancy / water datum points, not tyre-bottom geometry; no invented retractable gear.',...options.sourceLimitNotes}});
 rig.labels=options.labels??{};
 return rig;
}
