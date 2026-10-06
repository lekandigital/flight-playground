import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {sourceRotor} from '../../src/lab/rotor-tools.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} vs ${b}`);
for(const asset of ['fg-dauphin-ea380a4c','fg-ec130-9797aa83','fg-bo105-5f1245bd']){
 const facts=JSON.parse(readFileSync(new URL(`../../dist/lab/${asset}/facts.json`,import.meta.url)));
 const main=sourceRotor(new THREE.Group(),facts,0,asset),shaft=main.mount.quaternion.clone();
 main.setPitch(5,3,0);near(main.blades[0].rotation.z*180/Math.PI,8);
 // A fixed-world cyclic pitch reaches mean pitch a quarter turn later,
 // opposite incidence after half a turn, and repeats after a full turn.
 const quarter=15/main.spec.rpm;
 main.spin(quarter,1);near(main.blades[0].rotation.z*180/Math.PI,5);
 main.spin(quarter,1);near(main.blades[0].rotation.z*180/Math.PI,2);
 main.spin(quarter*2,1);near(main.blades[0].rotation.z*180/Math.PI,8);
 assert(main.mount.quaternion.equals(shaft),'Cyclic never tilts the fixed shaft');
 main.setPitch(7);main.spin(quarter,1);for(const blade of main.blades)near(blade.rotation.z*180/Math.PI,7);
 const phase=main.rotor.rotation.y,pitch=main.blades.map(b=>b.rotation.z);main.spin(quarter,0);near(main.rotor.rotation.y,phase);assert.deepEqual(main.blades.map(b=>b.rotation.z),pitch);
}
console.log('Lab rotors: cyclic incidence follows rotating azimuth while its world direction and shaft stay fixed; collective is phase-independent; stopped rotors retain pose.');
