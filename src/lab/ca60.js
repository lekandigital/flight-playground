import * as THREE from 'three';
import {prepareCaproni} from '../caproni.js';
import {meshList,clamp} from '../rig-tools.js';
import {quarantine} from './lab-tools.js';

export async function prepareCa60Lab(root,animations,facts){
 const benchmark=prepareCaproni(root);
 const nativeSize=benchmark.bounds().getSize(new THREE.Vector3());
 // Flight's contemporary span supplies a uniform calibration, never an axis
 // stretch to force inconsistent overall-length figures to agree.
 const scale=facts.runtime_notes.scale.span_m/nativeSize.z;
 root.getObjectByName('ca60_axis_correction').scale.setScalar(scale);
 root.updateMatrixWorld(true);
 for(const mesh of meshList(root))if(!mesh.visible)quarantine(mesh,'Exploded merged export or duplicate wing variant; intact source wing banks and recovered interplane rudders retained','export',true);
 const neutral={aileron:0,elevator:0,rudder:0};
 function configure(){benchmark.configure(neutral);}
 function spin(dt,engine){benchmark.spin(dt,clamp(engine??0,0,1));}
 function update(dt,state,active,paused){if(paused)return;configure();spin(dt,active?state.throttle:.05);}
 configure();
 const measured=benchmark.bounds().getSize(new THREE.Vector3()).toArray();
 return {...benchmark,configure,spin,update,fields:['engine'],labels:{engine:'Propeller display speed'},waterDraft:benchmark.waterDraft*scale,groundPitch:0,groundRoot:root,groundContacts:[],
  report:{...benchmark.report,lab:true,limitsDegrees:{},status:'partial',uniformScale:scale,measuredSize:measured,sourceVariant:'Caproni Ca.60 Transaereo',
   summary:'Lab Ca.60: intact benchmark geometry and museum-guided silver/navy/ivory finish; eight tractor/pusher propellers and four interplane rudders. Uniform period-span calibration. Surfaces held neutral: historical travel is unknown; propeller speed is visual only.',
   sourceLimitNotes:{scale:facts.runtime_notes.scale.qualification,controls:facts.runtime_notes.controls,propeller:facts.runtime_notes.propeller_rate,paint:facts.runtime_notes.paint,water:'Water draft retained as a visual benchmark datum; no loaded waterline or contact source supplied.'},
   eyePoint:null,sounds:[],nasalFiles:[],originalAnimationDisabled:true},
 };
}
