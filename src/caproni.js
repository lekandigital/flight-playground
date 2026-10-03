import * as THREE from 'three';
import {find,meshList,flattenVisibility,presetState,clamp,deflect} from './rig-tools.js';

// Work in the original model's coordinates: +Z bow, X span, Y up.
function worldGeometry(root,mesh){
 root.updateMatrixWorld(true);
 const transform=root.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
 const geometry=mesh.geometry.clone().applyMatrix4(transform);
 if(transform.determinant()<0){const index=geometry.index?.array;if(index)for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];}
 geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
function subset(geometry,triangles){
 const names=Object.keys(geometry.attributes),arrays=Object.fromEntries(names.map(n=>[n,[]])),index=geometry.index,remap=new Map(),indices=[];
 for(const tri of triangles)for(const corner of tri){const id=index?index.getX(corner):corner;if(!remap.has(id)){remap.set(id,remap.size);for(const name of names){const a=geometry.attributes[name];for(let k=0;k<a.itemSize;k++)arrays[name].push(a.getComponent(id,k));}}indices.push(remap.get(id));}
 const out=new THREE.BufferGeometry();for(const name of names)out.setAttribute(name,new THREE.Float32BufferAttribute(arrays[name],geometry.attributes[name].itemSize));out.setIndex(indices);out.computeVertexNormals();out.computeBoundingBox();out.computeBoundingSphere();return out;
}
function linenTexture(){
 const width=512,height=64,data=new Uint8Array(width*height*4);let seed=27;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  seed=(seed*1664525+1013904223)>>>0;const grain=(seed>>>28)-8;
  const rib=(x%23===0?-12:x%23===1?-5:0),i=(y*width+x)*4;
  data[i]=222+grain+rib;data[i+1]=209+grain+rib;data[i+2]=183+grain+rib;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,width,height);texture.name='caproni_linen';texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
function rotor(radius,material,metal,name,bladeCount){
 const group=new THREE.Group();group.name=name;
 const outline=new THREE.Shape();outline.moveTo(-.009,.02);outline.bezierCurveTo(-.035,.055,-.031,radius*.8,-.015,radius);outline.quadraticCurveTo(0,radius+.006,.016,radius);outline.bezierCurveTo(.03,radius*.7,.014,.06,.009,.02);outline.closePath();
 const geometry=new THREE.ExtrudeGeometry(outline,{depth:.006,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1,curveSegments:10});geometry.translate(0,0,-.003);
 for(let i=0;i<bladeCount;i++){const blade=new THREE.Mesh(geometry,material);blade.name=name+'_blade_'+i;blade.rotation.z=i*Math.PI*2/bladeCount;blade.userData.inspectorGroup='New propeller';blade.castShadow=true;group.add(blade);}
 const hub=new THREE.Mesh(new THREE.SphereGeometry(.024,12,8),metal);hub.name=name+'_hub';hub.scale.z=1.35;hub.userData.inspectorGroup='New propeller';group.add(hub);return group;
}
function components(geometry){
 const p=geometry.attributes.position,parent=Array.from({length:p.count},(_,i)=>i),seen=new Map();
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{parent[root(a)]=root(b);};
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');if(seen.has(key))join(i,seen.get(key));else seen.set(key,i);}
 const indices=geometry.index?.array??Array.from({length:p.count},(_,i)=>i);
 for(let i=0;i<indices.length;i+=3){join(indices[i],indices[i+1]);join(indices[i],indices[i+2]);}
 const parts=new Map();for(let i=0;i<indices.length;i+=3){const key=root(indices[i]);if(!parts.has(key))parts.set(key,[]);parts.get(key).push([indices[i],indices[i+1],indices[i+2]]);}const unindexed=geometry.clone();unindexed.setIndex(null);return [...parts.values()].map(t=>subset(unindexed,t));
}
function exactBounds(root){
 root.updateMatrixWorld(true);const box=new THREE.Box3(),point=new THREE.Vector3();root.traverseVisible(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)box.expandByPoint(point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});return box;
}
export function prepareCaproni(root){
 const cloth=new THREE.MeshStandardMaterial({color:'#ffffff',map:linenTexture(),roughness:.88,metalness:0,side:THREE.DoubleSide,envMapIntensity:.25});
 const wood=new THREE.MeshStandardMaterial({color:'#75503a',roughness:.68,metalness:0});
 const metal=new THREE.MeshStandardMaterial({color:'#3b4a4c',roughness:.58,metalness:.35});
 const brass=new THREE.MeshStandardMaterial({color:'#b39157',roughness:.5,metalness:.5});
 const glass=new THREE.MeshStandardMaterial({color:'#263b48',roughness:.28,metalness:.08,side:THREE.DoubleSide});
 const template=find(root,'Plane002');if(!template?.isMesh)throw new Error('Missing Ca.60 wing template');
 const wingGeometry=worldGeometry(root,template),position=wingGeometry.attributes.position,index=wingGeometry.index;
 const fixed=[],moving=Array.from({length:6},()=>[]),v=new THREE.Vector3();
 for(let k=0;k<(index?.count??position.count);k+=3){v.set(0,0,0);for(let j=0;j<3;j++)v.add(new THREE.Vector3().fromBufferAttribute(position,index?index.getX(k+j):k+j));v.multiplyScalar(1/3);const tier=clamp(Math.round((v.y-.215)/.284),0,2);if(Math.abs(v.x)>.93&&v.z<.665)moving[tier*2+(v.x>0?0:1)].push([k,k+1,k+2]);else fixed.push([k,k+1,k+2]);}
 const surfaces={},banks=[],aileronSurfaces=[];
 for(const [bank,offsetZ,offsetY]of [['aft',0,.01],['middle',.985,-.035],['forward',1.975,-.01]]){
  const group=new THREE.Group();group.name=`repaired_ca60_wing_bank_${bank}`;group.position.set(0,offsetY,offsetZ);root.add(group);banks.push(group);
  const wing=new THREE.Mesh(subset(wingGeometry,fixed),cloth);wing.name=`repaired_ca60_wings_${bank}`;wing.castShadow=wing.receiveShadow=true;group.add(wing);
  for(let tier=0;tier<3;tier++)for(let side=0;side<2;side++){
   const geometry=subset(wingGeometry,moving[tier*2+side]);if(!geometry.attributes.position.count)continue;
   const box=geometry.boundingBox,origin=box.getCenter(new THREE.Vector3());origin.z=box.max.z;geometry.translate(-origin.x,-origin.y,-origin.z);
   const pivot=new THREE.Group();pivot.name=`repaired_ca60_${side?'right':'left'}_aileron_${bank}_${tier+1}`;pivot.position.copy(origin);group.add(pivot);
   const mesh=new THREE.Mesh(geometry,cloth);mesh.name=pivot.name;mesh.castShadow=mesh.receiveShadow=true;pivot.add(mesh);
   const surface={hinge:pivot,axis:new THREE.Vector3(1,0,0),rest:pivot.quaternion.clone(),angle:0,bank,side:side?-1:1};surfaces[`${side?'right':'left'}Aileron_${bank}_${tier+1}`]=surface;aileronSurfaces.push(surface);
  }
 }
 // The merged object includes repeated parts more than 80 model units away.
 // Keep originals available in the inspector; don't let them affect normalization.
 for(const name of ['static_merged','Plane','Plane001','Plane002','Plane003','Plane004','Plane005','Plane006','Plane007']){
  find(root,name)?.traverse(o=>{if(o.isMesh){o.visible=false;o.userData.inspectorGroup='Imported / quarantined';}});
 }
 root.updateMatrixWorld(true);
 const originalHull=meshList(find(root,'Cube'));
 const hullColors=[new THREE.Color('#d6ceba'),glass.color,new THREE.Color('#263943'),wood.color,glass.color,new THREE.Color('#4d5556')];
 for(let i=0;i<originalHull.length;i++){
  const mesh=originalHull[i];if(i===0){mesh.geometry=mesh.geometry.clone();const p=mesh.geometry.attributes.position,colors=[];const top=hullColors[0],bottom=new THREE.Color('#594737'),point=new THREE.Vector3();for(let j=0;j<p.count;j++){point.fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld);const color=point.y<-.035?bottom:top;colors.push(color.r,color.g,color.b);}mesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));mesh.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.74,metalness:0,side:THREE.DoubleSide});mesh.name='ca60_hull_cream_and_blue';}
  else{mesh.material=new THREE.MeshStandardMaterial({color:hullColors[i]??hullColors[0],roughness:i===1||i===4?.3:.74,metalness:0,side:THREE.DoubleSide});mesh.name=`ca60_${i===1||i===4?'window_glass':'hull_detail'}_${i}`;}
 }
 for(const mesh of meshList(root)){
  if(/^Cylinder\d*$/.test(mesh.name)){const n=mesh.name==='Cylinder'?0:Number(mesh.name.slice(8));mesh.material=n<72?wood:metal;mesh.name=n<72?`ca60_bracing_strut_${n+1}`:`ca60_metal_detail_${n}`;}
  else if(/^NurbsPath/.test(mesh.name)){mesh.material=metal;mesh.name='ca60_bracing_wire_'+mesh.name;}
  else if(mesh.name==='Cube001'||mesh.name==='Cube002'){mesh.material=metal;mesh.name='ca60_engine_nacelle_'+mesh.name;}
  else if(mesh.name==='Cube003'){mesh.material=new THREE.MeshStandardMaterial({color:'#594737',roughness:.75});mesh.name='ca60_outrigger_floats';}
 }
 const props=[];for(const [i,p]of [[-.354,.43,2.989],[.344,.43,2.989],[-.354,.43,.486],[.344,.43,.486],[0,.37,2.974],[0,.39,2.446],[0,.37,.50],[0,.39,1.02]].entries()){
  const prop=rotor(i<4?.135:.12,wood,brass,`procedural_caproni_propeller_${i+1}`,i<4?2:4);prop.position.set(...p);root.add(prop);props.push(prop);
 }
 // Recover the intact lower rudder panels from the exploded merged mesh.
 // Period photographs show a pair in each rear interplane gap. Duplicate the
 // source panels one wing interval upward, instead of placing fins above it.
 const merged=find(root,'static_merged'),rudders=[];
 const panels=components(worldGeometry(root,merged)).filter(g=>{const b=g.boundingBox,d=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());return d.x<.025&&d.y>.20&&d.y<.32&&d.z>.20&&d.z<.3&&Math.abs(Math.abs(c.x)-.575)<.02&&c.z<1&&b.max.y<.6;});
 if(panels.length!==2)throw new Error('Caproni rudder donor topology changed: '+panels.length);
 for(const [side,panel]of panels.entries())for(let tier=0;tier<2;tier++){
  const geometry=panel.clone();geometry.translate(0,tier*.284,0);geometry.computeBoundingBox();const box=geometry.boundingBox,origin=box.getCenter(new THREE.Vector3());origin.z=box.max.z;geometry.translate(-origin.x,-origin.y,-origin.z);
  const pivot=new THREE.Group();pivot.position.copy(origin);pivot.name=`repaired_caproni_rudder_${side}_${tier}_hinge`;root.add(pivot);const mesh=new THREE.Mesh(geometry,cloth);mesh.name=`repaired_caproni_rudder_${side}_${tier}`;mesh.userData.inspectorGroup='Control surfaces';mesh.castShadow=true;pivot.add(mesh);
  const surface={hinge:pivot,axis:new THREE.Vector3(0,1,0),rest:pivot.quaternion.clone(),angle:0};rudders.push(surface);surfaces[`rudder_${side}_${tier}`]=surface;
 }
 for(const mesh of meshList(root)){
  if(mesh.userData.inspectorGroup==='Imported / quarantined')continue;
  if(/repaired_ca60_wings/.test(mesh.name))mesh.userData.inspectorGroup='Canvas wings';
  else if(/aileron/.test(mesh.name))mesh.userData.inspectorGroup='Control surfaces';
  else if(/ca60_bracing/.test(mesh.name))mesh.userData.inspectorGroup='Bracing';
  else if(/ca60_engine|ca60_metal_detail/.test(mesh.name))mesh.userData.inspectorGroup='Engine nacelles';
  else if(/ca60_window/.test(mesh.name))mesh.userData.inspectorGroup='Cabin glazing';
  else if(/ca60_hull|ca60_outrigger/.test(mesh.name))mesh.userData.inspectorGroup='Boat hull';
 }
 // Align this +Z-forward export with the other aircraft's -X-forward convention.
 const native=new THREE.Group();native.name='ca60_axis_correction';for(const child of [...root.children])native.add(child);native.rotation.y=-Math.PI/2;root.add(native);
 const baseline=flattenVisibility(root);let current=presetState(false);
 function configure(s){for(const[m,v]of baseline)m.visible=v;const a=clamp(s.aileron??0,-1,1),e=clamp(s.elevator??0,-1,1),r=clamp(s.rudder??0,-1,1);for(const surface of aileronSurfaces){const pitch=surface.bank==='aft'?-e*8:surface.bank==='forward'?e*8:0;deflect(surface,clamp(surface.side*a*12+pitch,-16,16));}for(const surface of rudders)deflect(surface,r*10);}
 function spin(dt,engine){const throttle=clamp(engine??0,0,1);if(!throttle)return;for(let i=0;i<props.length;i++)props[i].rotation.z=(props[i].rotation.z+dt*(4+70*throttle)*(i<4?1:-1))%(Math.PI*2);}
 function update(dt,state,active,paused){if(paused)return;for(const key of ['aileron','elevator','rudder']){const target=active?clamp((key==='elevator'?state.pitch/.58:state.roll/.65),-1,1):0;current[key]+=(target-current[key])*(1-Math.exp(-dt*5));}configure(current);spin(dt,active?state.throttle:.05);}
 configure(current);const report={limitsDegrees:{aileron:12,elevator:8,rudder:10,combinedSurface:16},originalAnimationDisabled:true,wingBanks:3,propellerCount:8,summary:'Preserved wing edges, cabin, bracing and engine geometry. Eight tractor/pusher propellers and four rudders between the rear wings; cream linen, wood and dark boat hull.'};return{configure,spin,update,surfaces,rotors:props.map(rotor=>({rotor})),wingGroups:banks.map(assembly=>({assembly})),waterDraft:.085,isSeaplane:true,bounds:()=>exactBounds(root),fields:['aileron','elevator','rudder','engine'],labels:{elevator:'Fore / aft pitch controls'},report};
}
