import * as THREE from 'three';
import {RAD,meshList} from '../rig-tools.js';
import {fdmRotor,quarantine} from './lab-tools.js';
// Preserve source shaft orientation; cyclic changes blade incidence, not the mast.
export function sourceRotor(root,facts,index,name){
 const rotor=fdmRotor(root,facts,{index,name}),p=rotor.spec.source_parameters??{};
 quarantine(rotor.blur,'Generated zero-opacity blur disc unused by source rotor inspection; exclude from geometry bounds','rotor',true);
 const limits={collective:[Number(p.mincollective),Number(p.maxcollective)],cyclicPitch:[Number(p.mincyclicele),Number(p.maxcyclicele)],cyclicRoll:[Number(p.mincyclicail),Number(p.maxcyclicail)]};
 const chord=Number(p.chord);
 if(chord>0){for(const blade of rotor.blades){for(const m of meshList(blade)){const g=m.geometry.clone(),a=g.attributes.position;g.computeBoundingBox();const width=g.boundingBox.max.x-g.boundingBox.min.x,center=(g.boundingBox.max.x+g.boundingBox.min.x)/2;for(let i=0;i<a.count;i++)a.setX(i,(a.getX(i)-center)*chord/width);g.computeVertexNormals();m.geometry=g;}}}
 rotor.setPitch=(collective,pitch=0,roll=0)=>{for(const [i,blade]of rotor.blades.entries()){const azimuth=i*2*Math.PI/rotor.count;blade.rotation.z=(collective+pitch*Math.cos(azimuth)+roll*Math.sin(azimuth))*RAD;}};
 return{...rotor,limits,profileNote:'FDM chord/diameter/count; retained closed procedural section is a renderer approximation, not an authored airfoil'};
}
export function mapRange(value,range){return range[0]+(range[1]-range[0])*value;}
