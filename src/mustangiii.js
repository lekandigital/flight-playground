import data from './flightgear-data/mustangiii.json' with {type:'json'};
import {prepareFlightGear} from './flightgear-runtime.js';
export function prepareMustangIII(root,options={}) {
 return prepareFlightGear(root,data,{...options,id:'mustangiii',mainBay:['wells'],fields:['gear','flaps','aileron','elevator','rudder','compression','engine','lights'],limits:{flaps:47,aileron:15,elevator:30,rudder:30},labels:{compression:'Main gear compression',lights:'Navigation lights'},
  // P51-MustangIII.xml explicitly lists these as transparent surfaces.
  // malc1in/out are the opaque Malcolm-hood frames and retain their paint.
  glass:['glaze','iglaze','malc2','gusightglass'],
  augment(ctx){ctx.notes.push({type:'factConflict',field:'fdm_geometry.gear_contacts[2].retracts',chosen:'retracts per 85° exterior XML animation',reason:'Visual source XML and retracting P-51 tail-wheel bay disagree with FDM false flag.'});}
 });
}
