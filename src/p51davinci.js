import data from './flightgear-data/p51davinci.json' with {type:'json'};
import {prepareFlightGear,addHamiltonPropeller} from './flightgear-runtime.js';
export function prepareP51DaVinci(root,options={}) {
 return prepareFlightGear(root,data,{...options,id:'p51davinci',fields:['gear','canopy','flaps','aileron','elevator','rudder','compression','wheelRoll','engine'],limits:{flaps:40,aileron:12,elevator:20,rudder:20},labels:{compression:'Main gear compression',wheelRoll:'Wheel rotation phase'},
  glass:['CanopyGlass','WindscreenGlass','GunsightGlass'],
  liveries:d=>[...d.liveries].sort((a,b)=>(b.name==='Default')-(a.name==='Default')).map(l=>({name:l.name,files:Object.fromEntries(['fuselage','wingtops','wingbottoms','horizstabs'].map((key,i)=>[key,'textures/liveries/Models/Liveries/'+l.name+'/Mustang_'+(i+1)+'_t.png']))})),
  augment(ctx){
   // FDM radius 1.4 gives 2.8 m; existing blades are ~2.6 m. Both disagree
   // with the supplied real-world 3.40 m Hamilton Standard specification.
   addHamiltonPropeller(ctx,3.4,[.579,.434,0],[1,0,0],['Prop']);
   ctx.notes.push({type:'factConflict',field:'fdm_geometry.propellers[0].radius_m',fdmDiameterM:2.8,chosenDiameterM:3.4,source:'real_world_specs.prop_dia_m',reason:'FDM and original blades are undersized; historical propeller diameter used instead.'});
  }
 });
}
