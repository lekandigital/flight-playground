import data from './flightgear-data/mig29.json' with {type:'json'};
import {prepareFlightGear,interpolate} from './flightgear-runtime.js';
export function prepareMiG29(root,options={}) {
 return prepareFlightGear(root,data,{...options,id:'mig29',fields:['gear','flaps','slats','aileron','elevator','rudder','speedbrake','wheelSteer','groundIntakes','engine','lights'],signed:['aileron','elevator','rudder','wheelSteer'],limits:{flaps:20,slats:20,aileron:25,elevator:30,rudder:25,speedbrake:60,wheelSteer:50,groundIntakes:60},labels:{slats:'Leading-edge slats',elevator:'Taileron pitch · ±30°',aileron:'Roll / taileron mix',wheelSteer:'Nose-wheel steering · ±50°',groundIntakes:'Ground intakes / louvers',engine:'Throttle / reheat above 90%',lights:'Navigation lights'},glass:['Canopy','Windscreen','IRglass'],
  augment(ctx){
   // The supplied well meshes are partial surfaces: the nose roof is shallower
   // than a tyre diameter, and the main roofs intersect tyres at XML stow.
   // Keep the verified gear angles. Fit open-bottom interiors to the union of
   // each original opening and the actual stowed tyre vertices instead.
   const material=new T.MeshStandardMaterial({color:'#303c3f',roughness:.74,metalness:.12,side:T.DoubleSide});
   const name=m=>m.userData.fg_name||m.name;
   function bounds(parts,stowed=false){
    const box=new T.Box3(),point=new T.Vector3();
    for(const m of parts){const matrix=new T.Matrix4();
     if(stowed)for(const d of ctx.bindings.get(m)||[]){
      if(d.channel!=='gear')continue;
      const amount=d.a.interpolation?interpolate(d.a.interpolation,0):d.a.offset;
      const rot=new T.Matrix4().makeRotationAxis(d.axis,amount*Math.PI/180);rot.setPosition(d.center.clone().sub(d.center.clone().applyMatrix4(rot)));matrix.multiply(rot);
     }
     matrix.multiply(ctx.bases.get(m));const p=m.geometry.attributes.position;
     for(let i=0;i<p.count;i++)box.expandByPoint(point.fromBufferAttribute(p,i).applyMatrix4(matrix));
    }return box;
   }
   for(const [well,wheel]of [['GearWellL','wheel.L'],['GearWellR','wheel.R'],['nosegeaerwell','nosewheels']]){
    const originals=ctx.meshes.filter(m=>name(m)===well),tyres=ctx.meshes.filter(m=>name(m)===wheel),opening=bounds(originals),clearance=bounds(tyres,true).expandByScalar(.025),box=opening.clone().union(clearance),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
    if(box.isEmpty())continue;
    for(const m of originals)ctx.hide(m,'Original partial gear-well surface intersects the XML-stowed tyre; fitted procedural bay interior replaces it');
    const panels=[['roof',size.x,size.z,[center.x,box.max.y,center.z],[-Math.PI/2,0,0]],['left',size.x,size.y,[center.x,center.y,box.min.z],[0,0,0]],['right',size.x,size.y,[center.x,center.y,box.max.z],[0,0,0]],['front',size.z,size.y,[box.min.x,center.y,center.z],[0,Math.PI/2,0]],['rear',size.z,size.y,[box.max.x,center.y,center.z],[0,Math.PI/2,0]]];
    for(const [part,w,h,position,rotation]of panels){const m=new T.Mesh(new T.PlaneGeometry(w,h),material);m.name='procedural_MiG29_'+well+'_'+part;m.position.set(...position);m.rotation.set(...rotation);ctx.registerProcedural(m,[],'Bay repair fitted to original opening + XML-stowed tyre vertices, with 0.025 m clearance');}
    ctx.notes.push({type:'proceduralBayInterior',part:well,wheel,originalBounds:[opening.min.toArray(),opening.max.toArray()],repairedBounds:[box.min.toArray(),box.max.toArray()],clearanceM:.025,xmlAnglesUnchanged:true});
   }
  },
  afterConfigure({state,meshes}){
   // Mig-29_Reheat.xml: x-scale 0..1 about x=13.739; blend is
   // transparency=1-throttle. Convert it to Three.js opacity=throttle.
   const scale=new T.Matrix4().makeTranslation(13.739,0,0).multiply(new T.Matrix4().makeScale(state.engine,1,1)).multiply(new T.Matrix4().makeTranslation(-13.739,0,0));
   for(const m of meshes)if(/Reheat/.test(m.userData.fg_name||m.name)){
    m.matrix.premultiply(scale);m.matrixWorldNeedsUpdate=true;
    for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.opacity=state.engine;
   }
  }
 });
}
import * as T from 'three';
