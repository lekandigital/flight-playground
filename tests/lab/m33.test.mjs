import assert from 'node:assert/strict';import * as THREE from 'three';
import {fixture} from './fixture.mjs';import {prepareM33Lab} from '../../src/lab/m33.js';import {checkSeaplane,near} from './seaplane-checks.mjs';import {labFind} from '../../src/lab/lab-tools.js';
const f=await fixture('fg-macchi-m33-70f57d9d');f.facts.runtimeTextureLoader=async url=>{const t=new THREE.Texture();t.name=url;t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;return t;};
const rig=await prepareM33Lab(f.root,f.animations,f.facts);
await checkSeaplane({...f,rig},{props:1,textures:21,splitElevator:true,float:'i0_flotteurs',bladeNames:['i0_helice'],discNames:['i0_propdisc'],angle:a=>a.channel==='rudder'?-20:a.channel==='aileron'&&/right-aileron/.test(a.property)?-15:15});
near(rig.spins[0].origin.x,-2.579);assert.notEqual(rig.spins[0].origin.x,f.facts.fdm_geometry.propellers[0].glb[0],'Visual shaft centre differs from thrust point');
rig.configure({engine:.2});assert(labFind(f.root,'i0_propblur').visible,'Source300–900rpm intermediate blur selector');
assert(labFind(f.root,'i0_helice').visible);assert(rig.report.remaining.some(s=>s.includes('dynamo')));
console.log('M33 Lab: original XML hinges/travel and mirrored controls, source shaft/RPM/diameter, fixed hull, water-pose qualification, defaultpaint/blur selectors and pause passed.');
