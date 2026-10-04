// Recover exterior bindings omitted by the pack builder's400-record cutoff.
import {readFileSync,writeFileSync,readdirSync,copyFileSync,mkdirSync,rmSync} from 'node:fs';import path from 'node:path';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
const asset=process.argv[2],pack=path.join('/Users/lekan/Downloads/flight-playground-handoff',asset),target=path.join('dist/lab',asset),facts=JSON.parse(readFileSync(path.join(target,'facts.json'))),original=JSON.parse(readFileSync(path.join(pack,'facts.json')));
const bytes=readFileSync(path.join('dist/models',asset+'.glb')),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const existing=new Set(facts.texture_by_part.flatMap(b=>b.glb_nodes??[]));const textures=new Map(facts.textures.map(t=>[t.original,t]));let recovered=0;
gltf.scene.traverse(o=>{if(!o.isMesh||!o.geometry.attributes.uv||existing.has(o.name))return;const m=Array.isArray(o.material)?o.material[0]:o.material;if(!m.map?.name)return;
 const texture=original.textures.find(t=>path.basename(t.file??'').replace(/\.[^.]+$/,'').toLowerCase()===m.map.name.toLowerCase());if(!texture)return;
 const destination=path.join(target,texture.file);mkdirSync(path.dirname(destination),{recursive:true});copyFileSync(path.join(pack,texture.file),destination);textures.set(texture.original,texture);
 facts.texture_by_part.push({ac_object:o.name,glb_nodes:[o.name],texture:texture.original,has_uv:true,texture_in_glb:true,binding_source:'Embedded GLB image name matched to original pack texture filename; UV retained'});recovered++;
});
const used=new Set(facts.texture_by_part.filter(b=>b.has_uv&&b.glb_nodes?.length).map(b=>b.texture));const slots=new Set(facts.livery_names.flatMap(l=>Object.values(l.slots??{})));
facts.textures=[...textures.values()].filter(t=>used.has(t.original)||slots.has(t.file));const files=new Set(facts.textures.map(t=>t.file));
function trim(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())trim(file);else if(!files.has(path.relative(target,file)))rmSync(file);}}
trim(path.join(target,'textures'));facts.runtime_notes.push(`${recovered} omitted UV texture bindings recovered from embedded GLB image names; unused runtime texture copies removed.`);writeFileSync(path.join(target,'facts.json'),JSON.stringify(facts));console.log(asset,{recovered,textures:facts.textures.length});
