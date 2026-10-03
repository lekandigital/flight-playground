import * as THREE from 'three';
import {clamp,RAD} from './rig-tools.js';

const metal=()=>new THREE.MeshStandardMaterial({color:'#7f919c',metalness:.55,roughness:.42});
const bladeMaterials=()=>[new THREE.MeshStandardMaterial({color:'#25333c',roughness:.64,metalness:.12}),new THREE.MeshStandardMaterial({color:'#e8bd53',roughness:.65,metalness:0})];
export function fabricWeave(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,v=128+(x%4===0?18:0)+(y%4===0?18:0);data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}
 const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,8);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
// Closed blade section; local +Z points radially outward, Y is the rotor axis.
function rotorBlade(radius,width){
 const g=new THREE.BoxGeometry(width,.014*radius,radius*.9,1,1,8);g.translate(0,0,radius*.55);const a=g.attributes.position;
 for(let i=0;i<a.count;i++){const t=a.getZ(i)/radius;a.setX(i,a.getX(i)*(1-.25*t)+width*.1*t*t);a.setY(i,a.getY(i)+radius*.018*t*t);}
 g.clearGroups();const index=g.index;
 for(let i=0;i<index.count;i+=3){const z=(a.getZ(index.getX(i))+a.getZ(index.getX(i+1))+a.getZ(index.getX(i+2)))/3;g.addGroup(i,3,z>radius*.92?1:0);}
 g.computeVertexNormals();return g;
}
export function helicopterRotor(root,{name,position,radius,count,tail=false}){
 const mount=new THREE.Group();mount.name='repaired_'+name+'_mount';mount.position.copy(position);if(tail)mount.rotation.x=Math.PI/2;root.add(mount);
 const rotor=new THREE.Group();rotor.name='procedural_'+name;mount.add(rotor);
 const materials=bladeMaterials(),geo=rotorBlade(radius,tail?radius*.12:radius*.058),blades=[];
 for(let i=0;i<count;i++){
  const radial=new THREE.Group();radial.rotation.y=i*Math.PI*2/count;rotor.add(radial);
  const pitch=new THREE.Group();pitch.name=`repaired_${name}_blade_pitch_${i+1}`;radial.add(pitch);
  const mesh=new THREE.Mesh(geo,materials);mesh.name=`procedural_${name}_blade_${i+1}`;mesh.castShadow=true;pitch.add(mesh);blades.push(pitch);
 }
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(radius*.035,radius*.045,radius*.045,20),metal());hub.name='procedural_'+name+'_hub';hub.castShadow=true;rotor.add(hub);
 const blurMaterial=new THREE.MeshBasicMaterial({color:'#758894',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
 const blur=new THREE.Mesh(new THREE.RingGeometry(radius*.14,radius,64),blurMaterial);blur.rotation.x=-Math.PI/2;blur.name='procedural_'+name+'_blur';rotor.add(blur);
 function configure(collective=0,pitch=0,roll=0){
  mount.rotation.z=tail?0:clamp(pitch,-1,1)*6*RAD;mount.rotation.x=tail?Math.PI/2:clamp(roll,-1,1)*6*RAD;
  for(const b of blades)b.rotation.z=clamp(collective,0,1)*(tail?18:12)*RAD;
 }
 function spin(dt,engine){const power=clamp(engine??0,0,1);if(power>0)rotor.rotation.y=(rotor.rotation.y+dt*(tail?90:35)*power)%(Math.PI*2);blurMaterial.opacity=power>.3?(tail?.025:.045):0;}
 return{mount,rotor,blades,blur,configure,spin,radius,count};
}
export function aircraftPropeller(root,{name,position,radius,count,spinnerColor='#aab3af',pusher=false}){
 const rotor=new THREE.Group();rotor.name='procedural_'+name+'_propeller';rotor.position.copy(position);root.add(rotor);
 const materials=bladeMaterials(),positions=[],indices=[],g=new THREE.BufferGeometry(),sections=8,rings=18;
 for(let r=0;r<=rings;r++){
  const t=r/rings,y=radius*(.12+.88*t),width=radius*(.07+.08*Math.sin(Math.PI*t))*(t>.95?.65:1),twist=(28-18*t)*RAD;
  for(let k=0;k<sections;k++){const a=k/sections*Math.PI*2,x=Math.cos(a)*radius*.009,z=Math.sin(a)*width*.5;positions.push(x*Math.cos(twist)+z*Math.sin(twist),y,-x*Math.sin(twist)+z*Math.cos(twist));}
 }
 for(let r=0;r<rings;r++){const start=indices.length;for(let k=0;k<sections;k++){const a=r*sections+k,b=r*sections+(k+1)%sections,c=a+sections,d=b+sections;indices.push(a,b,c,b,d,c);}g.addGroup(start,indices.length-start,r>=rings-2?1:0);}
 for(const r of [0,rings]){const start=indices.length;for(let k=1;k<sections-1;k++)indices.push(r*sections,r*sections+k,r*sections+k+1);g.addGroup(start,indices.length-start,r===rings?1:0);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 for(let i=0;i<count;i++){const blade=new THREE.Mesh(g,materials);blade.rotation.x=i*Math.PI*2/count;blade.name=`procedural_${name}_propeller_blade_${i+1}`;blade.castShadow=true;rotor.add(blade);}
 const spinner=new THREE.Mesh(new THREE.ConeGeometry(pusher?.06:.324,pusher?.12:.52,32),new THREE.MeshStandardMaterial({color:spinnerColor,roughness:.52,metalness:.12}));spinner.rotation.z=pusher?-Math.PI/2:Math.PI/2;spinner.position.x=pusher?.015:-.13;spinner.name='procedural_'+name+'_propeller_spinner';spinner.castShadow=true;rotor.add(spinner);
 function spin(dt,engine){const power=clamp(engine??0,0,1);if(power>0)rotor.rotation.x=(rotor.rotation.x+dt*(4+95*power))%(Math.PI*2);}
 return{rotor,spin,count,radius};
}
