import {sourceSeaplane} from './seaplane-tools.js';
export async function prepareS6BLab(root,animations,facts){
 return sourceSeaplane(root,animations,facts,{
  groups:{HeliceComplete:['bol','helice','propblur','propdisc']},blades:['helice'],fields:['aileron','elevator','rudder','doors','engine'],
  normalizedProperties:['controls/flight/elevator','controls/flight/rudder'],properties:{'sim/rendering/hdr/hdr-enabled':false},
  limits:{aileron:15,elevator:15,rudder:15,doors:45},variant:'Supermarine S.6B',glassSource:'s6b.xml glassrain effect; standard glass selected, HDR duplicate inactive',
  summary:'Lab S.6B: own XML ±15° controls and 45° cockpit cover; original two-blade Ø2.80m propeller at source hub, 2070rpm; source Schneider blue/silver paint and 4.99° float-contact pose.',
  sourceLimitNotes:{controls:'Pack leaves elevator/rudder travel null. XML uses controls/flight/elevator and rudder normalized−1..1, ×15°; door normalized0..1 ×−45°.',paint:'Original blue/silver, racing markings and fin tricolour agree S1595 Science Museum reference; texture retained rather than repainting aged museum surface.'},
  remaining:['Untrusted YASim float / water-contact pose is not a ground trolley arrangement.','Systems/s6b-base.xml is missing; standard glass chosen from provided model selector.','The imported propeller radius is 1.377m vs1.4m FDM, within3%; original blade geometry retained.'],
 });
}
