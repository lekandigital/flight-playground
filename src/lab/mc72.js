import {defaultDriver} from './lab-tools.js';
import {sourceSeaplane} from './seaplane-tools.js';
export async function prepareMC72Lab(root,animations,facts){
 return sourceSeaplane(root,animations,facts,{
  groups:{HeliceComplete1:['bol1','helice1','propblur1','propdisc1'],HeliceComplete2:['bol2','helice2','propblur2','propdisc2']},
  blades:['helice1','helice2'],fields:['aileron','elevator','rudder','doors','engine'],
  driver:(a,s)=>a.objects[0]==='tourvitre'?s.doors:defaultDriver(a,s),normalizedProperties:['sim/multiplay/generic/float[0]'],properties:{'sim/multiplay/generic/bool[2]':false},
  limits:{aileron:15,elevator:15,rudder:15,doors:162},variant:'Macchi-Castoldi M.C.72',glassSource:'mc72.xml glassrain effect; standard glass selected, HDR duplicate inactive',
  summary:'Lab M.C.72: own XML ±15° controls and 162° cockpit cover; two original two-blade Ø2.76m contra-rotating propellers at separate source hubs, 1780rpm; source red/brass/silver paint and 2.04° float-contact pose.',
  sourceLimitNotes:{propellers:'XML shaft axes+X/−X drive opposite directions. Historical four blades means two blades per shaft, not four on each.',door:'XML MPfloat0 ×−162°; supplied Nasal defines normalized crew door. Missing base prevents confirming MP alias; inspector explicitly supplies0..1.',paint:'Source red finish and brass radiator panels agree preserved M.C.72 museum reference.'},
  remaining:['Systems/mc72-base.xml is missing; normalized MPfloat0 door alias and standard-pane initialization cannot be verified.','Untrusted water-contact datum is not a ground trolley arrangement.','No height specification is in pack; length/span compared, no historical height accuracy claimed.'],
 });
}
