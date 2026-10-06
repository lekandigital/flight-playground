import * as THREE from 'three';
import {meshList} from '../rig-tools.js';
import {quarantine} from './lab-tools.js';

// A donor supplies the blade contours; the original aircraft still supplies
// its shaft, spinner, diameter, RPM, visibility rules and paint atlas.
export async function borrowFourBladePropeller(root,facts,original){
 const file='parts/rotol-four-blade.json';
 const data=facts.runtimeGeometryLoader?await facts.runtimeGeometryLoader(file):await fetch(`lab/${facts.asset_id}/${file}`).then(r=>{if(!r.ok)throw Error('Missing cleared donor propeller');return r.json();});
 const geometry=new THREE.BufferGeometryLoader().parse(data.geometry),position=geometry.attributes.position;
 const bounds=new THREE.Box3().setFromBufferAttribute(position),diameter=facts.fdm_geometry.propellers[0].radius_m*2;
 const center=new THREE.Vector3(0,0,(bounds.min.z+bounds.max.z)/2),scale=diameter/(2*Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.y),Math.abs(bounds.max.y)));
 const blades=meshList(original),source=[];root.updateMatrixWorld(true);
 const sourceBox=new THREE.Box3().setFromObject(original),hub=new THREE.Vector3(sourceBox.getCenter(new THREE.Vector3()).x,0,0),inverse=original.matrixWorld.clone().invert();
 for(const blade of blades){const a=blade.geometry.attributes.position,uv=blade.geometry.attributes.uv;for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(blade.matrixWorld);source.push({p,uv:uv?new THREE.Vector2().fromBufferAttribute(uv,i):new THREE.Vector2()});}}
 const uvs=new Float32Array(position.count*2),point=new THREE.Vector3();
 // Reproject the download's paint UVs onto corresponding radial source points.
 // The source mesh is deliberately retained as an independently revealable part.
 for(let i=0;i<position.count;i++){
  point.fromBufferAttribute(position,i).sub(center).multiplyScalar(scale).applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);point.x*=sourceBox.getSize(new THREE.Vector3()).x/((bounds.max.z-bounds.min.z)*scale);point.add(hub);
  let closest=source[0],distance=Infinity;for(const sample of source){const d=(sample.p.y-point.y)**2+(sample.p.z-point.z)**2;if(d<distance){distance=d;closest=sample;}}
  uvs[i*2]=closest.uv.x;uvs[i*2+1]=closest.uv.y;point.applyMatrix4(inverse);position.setXYZ(i,point.x,point.y,point.z);
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,blades[0].material.clone());mesh.name='lab_borrowed_Rotol_four_blade';mesh.userData.labDonor=data.provenance;mesh.userData.inspectorGroup='Engine';mesh.castShadow=true;mesh.receiveShadow=true;
 for(const blade of blades)quarantine(blade,'Replaced by user-cleared donor: '+data.provenance.donor+' / '+data.provenance.node+'; original source paint and spin retained','rotor',true);
 original.add(mesh);return{mesh,provenance:data.provenance,diameter};
}
