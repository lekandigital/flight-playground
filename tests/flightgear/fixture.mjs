import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareP51D} from '../../src/p51d.js';
import {prepareP51DaVinci} from '../../src/p51davinci.js';
import {prepareMustangIII} from '../../src/mustangiii.js';
import {prepareMiG29} from '../../src/mig29.js';
export const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
export const fixtures=[['p51d',prepareP51D],['p51davinci',prepareP51DaVinci],['mustangiii',prepareMustangIII],['mig29',prepareMiG29]];
export async function loadFixture(id,prepare){
 globalThis.self=globalThis;
 globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
 const b=fs.readFileSync(path.join(projectRoot,'dist/flightgear',id,'model.glb'));
 const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const textures=[];
 const rig=prepare(g.scene,{loadTexture:async url=>{
  const file=path.join(projectRoot,'dist',url);if(!fs.existsSync(file))throw new Error('Missing texture '+url);
  const t=new THREE.Texture();t.name=url;t.userData.sourceFile=url;textures.push(url);return t;
 }});
 await rig.ready;
 return {g,rig,textures,bytes:b};
}
export function meshBounds(m,matrix=m.matrix){
 const box=new THREE.Box3(),p=m.geometry.attributes.position,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(matrix));
 return box;
}
