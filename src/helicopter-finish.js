import * as THREE from 'three';
import {toCreasedNormals,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {meshList,find,RAD} from './rig-tools.js';

// The imported paint/UVs remain the source of the livery. Microtexture affects
// reflected light only; no photographic reference is pasted onto the aircraft.
function surfaceTexture(){
 const size=128,data=new Uint8Array(size*size*4);let seed=613;
 for(let i=0;i<size*size;i++){seed=(1664525*seed+1013904223)>>>0;const v=236+(seed>>>28);data.set([v,v,v,255],i*4);}
 const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(10,10);texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
function glazing(name){return new THREE.MeshPhysicalMaterial({name,color:'#708782',roughness:.075,metalness:0,transparent:true,opacity:.58,depthWrite:false,side:THREE.DoubleSide,clearcoat:1,clearcoatRoughness:.055,ior:1.46,specularIntensity:1,envMapIntensity:1.25});}
function physical(source){
 const m=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(m,source);m.userData={...source.userData};return m;
}

// Thin gasket strips follow actual imported door edges. Merge into one draw
// call per door; attach to its mesh so they follow the complete door assembly.
function doorGasket(mesh){
 if(!mesh?.isMesh)return;
 const edge=new THREE.EdgesGeometry(mesh.geometry,48),p=edge.attributes.position,pieces=[];
 for(let i=0;i<p.count;i+=2){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),length=a.distanceTo(b);if(length<.09||length>2.2)continue;
  const geo=new THREE.CylinderGeometry(.0032,.0032,length,5);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());geo.applyQuaternion(q);geo.translate(...a.add(b).multiplyScalar(.5).toArray());pieces.push(geo);
 }
 edge.dispose();if(!pieces.length)return;
 const geo=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());mesh.updateWorldMatrix(true,false);const center=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());const outward=new THREE.Vector3(0,0,Math.sign(center.z)||1).transformDirection(mesh.matrixWorld.clone().invert()).multiplyScalar(.0045);geo.translate(...outward.toArray());
 const seal=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#273035',roughness:.8,metalness:0}));seal.name='procedural_door_seal_'+mesh.name;seal.castShadow=true;mesh.add(seal);
}
function lens(root,name,color){
 const mesh=find(root,name);if(!mesh?.isMesh)return;
 mesh.material=new THREE.MeshPhysicalMaterial({name:'repaired_'+name+'_lens',color,emissive:color,emissiveIntensity:.65,roughness:.16,metalness:0,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1});
}
export function finishHelicopter(root,id){
 const micro=surfaceTexture();let smooth=0;
 for(const mesh of meshList(root)){
  if(mesh.name.startsWith('original_'))continue;
  const name=mesh.name.toLowerCase(),array=Array.isArray(mesh.material),source=array?mesh.material:[mesh.material];
  if(/glass|vitre|windscreen|windshield|window/.test(name)&&!/_frame|frame_|wiper|original_/.test(name)){
   mesh.material=glazing('repaired_'+mesh.name+'_glass');
  }else{
   const materials=source.map(old=>{
    const m=physical(old),n=m.name.toLowerCase();m.envMapIntensity=.85;
    if(/glass|colored_glas/.test(n))return glazing('repaired_'+m.name);
    if(/tyre|tire|rubber/.test(n)||/roue|sock_/.test(name)){m.color.set('#242a2d');m.roughness=.85;m.metalness=0;}
    else if(/seat|upholstery|interior|floor|belt/.test(n+' '+name)){m.roughness=.83;m.metalness=0;if(!m.map&&/seat|upholstery/.test(n+' '+name))m.color.set('#3e4950');}
    else if(/exhaust/.test(n+' '+name)){m.color.set(/inner|_int|_i$/.test(n+' '+name)?'#262e33':'#8c8172');m.metalness=.78;m.roughness=.38;}
    else if(/chrome|aluminum|metal|rail|rod|skid|rotoraxis|grip|buckle/.test(n+' '+name)){m.metalness=.72;m.roughness=.32;}
    else if(/black|frame|wiper/.test(n)){m.color.set('#252c31');m.roughness=.6;m.metalness=.12;}
    else{m.roughness=.34;m.metalness=.04;m.clearcoat=.8;m.clearcoatRoughness=.15;m.roughnessMap=micro;}
    if(id==='bo105'&&/^yellow/.test(n)){m.color.set('#e7ba46');m.roughness=.32;m.metalness=.04;m.clearcoat=.85;m.clearcoatRoughness=.14;}
    // This export's eight-pixel livery is a black/white placeholder, not paint.
    if(id==='bo105'&&m.map?.name==='livery')m.map=null;
    return m;
   });mesh.material=array?materials:materials[0];
  }
  if(/fuselage|^i0_tail$|^i0_nez$|door|porte|glass|vitre|windscreen|windshield|skid|roue|windshield_frame/.test(name)&&mesh.geometry.attributes.position&&mesh.geometry.attributes.position.count>20){mesh.geometry=toCreasedNormals(mesh.geometry.clone(),48*RAD);mesh.geometry.computeBoundingSphere();smooth++;}
 }
 const doorNames=id==='bo105'?['i0_door_front_L','i0_door_front_R','i0_door_back_L','i0_door_back_R','i0_reardoor_L','i0_reardoor_R']:id==='ec130'?['frontdoorl_t2','frontdoorr_t2','backdoorl_t2','backdoorr_t2']:['i0_portecrewG','i0_portecrewD','i0_porteAG','i0_porteAD','i0_porteBG','i0_porteBD'];
 for(const name of doorNames)doorGasket(find(root,name));
 if(id==='bo105'){lens(root,'i0_nav_off_L','#ec5149');lens(root,'i0_nav_off_R','#49cf99');lens(root,'i0_beacon_off_T','#ee453e');lens(root,'i0_beacon_off_B','#ee453e');}
 return{smoothedMeshes:smooth,paintClearcoat:true,placeholderLiveryRemoved:id==='bo105',doorSeals:doorNames.length};
}
