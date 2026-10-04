import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
export async function fixture(asset){
 const bytes=readFileSync(new URL(`../../dist/models/${asset}.glb`,import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const facts=JSON.parse(readFileSync(new URL(`../../dist/lab/${asset}/facts.json`,import.meta.url)));
 facts.runtimeTextureLoader=async()=>{const t=new THREE.Texture();t.flipY=false;t.colorSpace=THREE.SRGBColorSpace;return t;};
 return{...gltf,root:gltf.scene,facts};
}
