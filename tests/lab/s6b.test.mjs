import assert from 'node:assert/strict';import * as THREE from 'three';
import {fixture} from './fixture.mjs';import {prepareS6BLab} from '../../src/lab/s6b.js';import {checkSeaplane,near} from './seaplane-checks.mjs';import {labFind} from '../../src/lab/lab-tools.js';
const f=await fixture('man-supermarine-s-6b-366f4f6d');f.facts.runtimeTextureLoader=async url=>{const t=new THREE.Texture();t.name=url;t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;return t;};
const rig=await prepareS6BLab(f.root,f.animations,f.facts);
await checkSeaplane({...f,rig},{props:1,textures:19,float:'i0_floteurs',bladeNames:['i0_helice'],discNames:['i0_propdisc'],angle:a=>a.channel==='door'?-45:a.channel==='aileron'&&/right-aileron/.test(a.property)?-15:15});
near(rig.spins[0].origin.x,-3.075);rig.configure({doors:1,engine:0});const canopy=rig.bindings.find(b=>b.anim.channel==='door');near(canopy.angle*180/Math.PI,-45);assert(labFind(f.root,'i0_vitres').visible);assert(!labFind(f.root,'i0_HDRvitres').visible);assert(labFind(f.root,'i0_vitres').material.isMeshPhysicalMaterial);
for(const channel of ['elevator','rudder'])assert(rig.bindings.find(b=>b.anim.channel===channel).anim.travel_source.includes('omitted by pack builder'));
console.log('S6B Lab: source ±15° controls,45° cover, original2.80m two-blade shaft/RPM, sourceSchneiderpaint/glass, fixedfloats, pose/proportions/clamps/pause passed.');
