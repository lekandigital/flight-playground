import * as THREE from 'three';
import {clamp,RAD} from './rig-tools.js';

const metal=()=>new THREE.MeshStandardMaterial({color:'#7f919c',metalness:.55,roughness:.42});
const bladeMaterials=()=>[new THREE.MeshStandardMaterial({color:'#25333c',roughness:.64,metalness:.12}),new THREE.MeshStandardMaterial({color:'#e8bd53',roughness:.65,metalness:0})];
export function fabricWeave(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,v=128+(x%4===0?18:0)+(y%4===0?18:0);data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}
 const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(8,8);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
// Closed NACA-style airfoil. Thin trailing edge, twisted span and rounded tip.
// Local +Z is radial; +Y is the rotor axis. Caps have separate vertices/normals.
function rotorBlade(radius,width,{tail=false,enclosed=false}={}){
 const sections=24,spans=30,positions=[],indices=[],g=new THREE.BufferGeometry();
 for(let r=0;r<=spans;r++){
  const t=r/spans,z=radius*((enclosed?.26:.12)+(enclosed?.69:.88)*t);
  const taper=t>.96?Math.sqrt(Math.max(.025,1-((t-.96)/.04)**2)):1;
  const chord=width*(.83+.17*Math.sin(Math.PI*t))*(1-.13*t)*taper;
  const twist=(tail?12-6*t:8-10*t)*RAD;
  for(let k=0;k<sections;k++){
   const a=k/sections*Math.PI*2,u=(1-Math.cos(a))/2;
   const thickness=5*.11*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)*Math.sign(Math.sin(a));
   const x=(u-.25)*chord,sweep=enclosed?radius*.06*t*t:radius*.016*Math.max(0,(t-.82)/.18)**2;
   const y=thickness*chord;
   positions.push(x*Math.cos(twist)+y*Math.sin(twist)+sweep,-x*Math.sin(twist)+y*Math.cos(twist),z);
  }
 }
 for(let r=0;r<spans;r++){
  for(let k=0;k<sections;k++){const a=r*sections+k,b=r*sections+(k+1)%sections,c=a+sections,d=b+sections;indices.push(a,c,b,b,c,d);}
 }
 const tipStart=(spans-1)*sections*6;g.addGroup(0,enclosed?indices.length:tipStart,0);if(!enclosed)g.addGroup(tipStart,sections*6,1);
 for(const r of [0,spans]){
  const first=positions.length/3;for(let k=0;k<sections;k++)positions.push(...positions.slice((r*sections+k)*3,(r*sections+k)*3+3));
  const start=indices.length;for(let k=1;k<sections-1;k++)indices.push(...(r===0?[first,first+k,first+k+1]:[first,first+k+1,first+k]));g.addGroup(start,indices.length-start,r===spans&&!enclosed?1:0);
 }
 if(enclosed){g.clearGroups();g.addGroup(0,indices.length,0);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function rotorMesh(parent,geometry,material,name,position){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;if(position)m.position.set(...position);parent.add(m);return m;}
function link(parent,a,b,radius,material,name){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),m=rotorMesh(parent,new THREE.CylinderGeometry(radius,radius,av.distanceTo(bv),12),material,name);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return m;}
export function helicopterRotor(root,{name,position,radius,count,tail=false,enclosed=false,shaftLength=.45}){
 const mount=new THREE.Group();mount.name='repaired_'+name+'_mount';mount.position.copy(position);if(tail)mount.rotation.x=Math.PI/2;root.add(mount);
 const fixed=new THREE.Group();fixed.name='repaired_'+name+'_stationary';fixed.position.copy(position);if(tail)fixed.rotation.x=Math.PI/2;root.add(fixed);
 const rotor=new THREE.Group();rotor.name='procedural_'+name;mount.add(rotor);
 const steel=new THREE.MeshStandardMaterial({color:'#a6afb3',metalness:.82,roughness:.27,envMapIntensity:1});
 const darkMetal=new THREE.MeshStandardMaterial({color:'#414c53',metalness:.68,roughness:.4,envMapIntensity:.8});
 const materials=[new THREE.MeshPhysicalMaterial({color:tail?'#798488':'#303b41',roughness:.4,metalness:.18,clearcoat:.22,clearcoatRoughness:.25}),new THREE.MeshStandardMaterial({color:tail?'#e5e7df':'#d8bc67',roughness:.47,metalness:.05})];
 const geo=rotorBlade(radius,tail?radius*(enclosed?.19:.14):radius*.054,{tail,enclosed}),blades=[],droop=[];
 const scale=radius/5,hardwarePrefix='procedural_'+name+'_';
 const shaft=rotorMesh(fixed,new THREE.CylinderGeometry(tail?radius*.075:.048,tail?radius*.08:.058,tail?radius*.2:shaftLength,32),steel,hardwarePrefix+'mast',[0,tail?0:-shaftLength/2,0]);
 if(!tail){
  for(const [y,r,h] of [[-.12,.15,.045],[-.21,.19,.045],[-.27,.12,.065]])rotorMesh(fixed,new THREE.CylinderGeometry(r*scale,r*scale,h*scale,32),darkMetal,hardwarePrefix+'swashplate_'+y,[0,y*scale,0]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;link(fixed,[Math.cos(a)*.12,-shaftLength+.08,Math.sin(a)*.12],[Math.cos(a)*.15,-.2,Math.sin(a)*.15],.012,steel,hardwarePrefix+'stationary_servo_'+i);}
 }
 for(let i=0;i<count;i++){
  const radial=new THREE.Group();radial.rotation.y=i*Math.PI*2/count;rotor.add(radial);
  const flex=new THREE.Group();radial.add(flex);droop.push(flex);
  const pitch=new THREE.Group();pitch.name=`repaired_${name}_blade_pitch_${i+1}`;flex.add(pitch);
  const mesh=new THREE.Mesh(geo,materials);mesh.name=`procedural_${name}_blade_${i+1}`;mesh.castShadow=true;pitch.add(mesh);blades.push(pitch);
  if(!tail){
   link(radial,[0,0,.07],[0,0,radius*.12],.038*scale,darkMetal,hardwarePrefix+'grip_'+i);
   rotorMesh(pitch,new THREE.BoxGeometry(radius*.05,.052*scale,radius*.075),steel,hardwarePrefix+'root_cuff_'+i,[0,0,radius*.12]);
   link(radial,[-.115*scale,-.205*scale,.12*scale],[-.115*scale,-.015*scale,.34*scale],.011*scale,steel,hardwarePrefix+'pitch_link_'+i);
   for(const z of [.29,.41])rotorMesh(radial,new THREE.CylinderGeometry(.025*scale,.025*scale,.072*scale,6),darkMetal,hardwarePrefix+'root_bolt_'+i+'_'+z,[0,.022*scale,z*scale]);
  }
 }
 const hub=rotorMesh(rotor,new THREE.CylinderGeometry(radius*(tail?.12:.025),radius*(tail?.13:.034),radius*(tail?.13:.024),32),steel,hardwarePrefix+'hub');
 const cap=rotorMesh(rotor,new THREE.SphereGeometry(radius*(tail?.13:.036),32,12),darkMetal,hardwarePrefix+'hub_cap',[0,radius*(tail?.05:.014),0]);cap.scale.y=.24;
 if(enclosed){
  // Keep the imported shroud; add its missing stationary gearbox support vanes.
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.3,g=new THREE.Group();g.rotation.y=a;fixed.add(g);rotorMesh(g,new THREE.BoxGeometry(radius*.05,radius*.04,radius*.72),darkMetal,hardwarePrefix+'stator_'+i,[0,-radius*.10,radius*.60]);}
 }
 const blurMaterial=new THREE.MeshBasicMaterial({color:'#758894',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
 const blur=new THREE.Mesh(new THREE.RingGeometry(radius*.14,radius,64),blurMaterial);blur.rotation.x=-Math.PI/2;blur.name='procedural_'+name+'_blur';rotor.add(blur);
 function configure(collective=0,pitch=0,roll=0){
  mount.rotation.z=tail?0:clamp(pitch,-1,1)*6*RAD;mount.rotation.x=tail?Math.PI/2:clamp(roll,-1,1)*6*RAD;
  for(const b of blades)b.rotation.z=clamp(collective,0,1)*(tail?18:12)*RAD;
 }
 function spin(dt,engine){const power=clamp(engine??0,0,1);if(power>0)rotor.rotation.y=(rotor.rotation.y+dt*(tail?90:35)*power)%(Math.PI*2);for(const b of droop)b.rotation.x=tail?0:(.55-power*1.7)*RAD;blurMaterial.opacity=power>.3?(tail?.025:.04):0;}
 spin(0,0);return{mount,fixed,rotor,blades,blur,configure,spin,radius,count,enclosed,shaft};
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
