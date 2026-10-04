// Extract only a selected runtime part; never copy an alternate GLB into dist.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const [asset,donor,nodeName,target]=process.argv.slice(2);
if(!target)throw Error('Usage: asset donor nodeName target.json');
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const file=`${homedir()}/Downloads/flight-playground-handoff/${asset}/alternates/${donor}/model.glb`,bytes=await readFile(file);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const node=gltf.scene.getObjectByName(nodeName);if(!node?.isMesh)throw Error('Donor part must be a named mesh');
gltf.scene.updateMatrixWorld(true);const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
const data={provenance:{asset,donor,node:nodeName,authorization:'User confirmed licences sorted and authorized borrowing, 2026-10-03'},geometry:geometry.toJSON()};
await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await writeFile(target,JSON.stringify(data));console.log(target,geometry.attributes.position.count,'vertices');
