import {sourceSeaplane} from './seaplane-tools.js';
export async function prepareM33Lab(root,animations,facts){
 return sourceSeaplane(root,animations,facts,{
  groups:{HeliceComplete:['bol','helice','propblur','propdisc']},blades:['helice'],fields:['aileron','elevator','rudder','engine'],
  limits:{aileron:15,elevator:15,rudder:20},variant:'Macchi M.33 racing flying boat',glassSource:'m33.xml glass shader on vitres; clear transmission adaptation',
  summary:'Lab M.33: own XML ±15° ailerons/elevators and ±20° rudder; original two-blade Ø1.74m propeller at source visual hub, 2500rpm; original red livery and 1.7° water-contact pose.',
  sourceLimitNotes:{elevator:'Both mapped XML point-axis lines run toward−z; identical +15 factors correctly move both elevator halves together.',propeller:'HeliceComplete expanded from source bol/helice/discs; FDM thrust point−1.605m is not visual shaft centre−2.579m.'},
  remaining:['Source red livery follows author thumbnail; monochrome period photos do not establish an exact red shade.','Water-contact datum lacks verified float/hull contact fitting.','Wind-driven dynamo spin depends on indicated airspeed; retained static until instrument/airspeed integration.','M33 set include m33-yasim-cnf.xml and imported cockpit/pilot texture bindings are missing; no guessed geometry added.'],
 });
}
