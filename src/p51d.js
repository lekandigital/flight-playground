import * as T from 'three';
import data from './flightgear-data/p51d.json' with {type:'json'};
import {prepareFlightGear} from './flightgear-runtime.js';

export function prepareP51D(root,options={}) {
 return prepareFlightGear(root,data,{...options,id:'p51d',mainBay:['wheelWells'],fields:['gear','canopy','flaps','aileron','elevator','rudder','rollTrim','pitchTrim','yawTrim','compression','wheelRoll','wheelSteer','cooling','oil','propPitch','engine','stores','lights'],signed:['aileron','elevator','rudder','rollTrim','pitchTrim','yawTrim','wheelSteer'],limits:{flaps:47,aileron:15,elevator:30,rudder:30,rollTrim:10,pitchTrim:25,yawTrim:10,wheelSteer:360,cooling:20,oil:18},labels:{compression:'Gear compression',wheelRoll:'Wheel rotation phase',rollTrim:'Aileron trim',pitchTrim:'Elevator trim',yawTrim:'Rudder trim',wheelSteer:'Tail-wheel castor',cooling:'Coolant outlet',oil:'Oil outlet',propPitch:'Propeller pitch · 23–58°',stores:'External stores',lights:'Navigation lights'},
  liveries:()=>[2048,1024,4096,8192].map(size=>{const path='textures/liveries/Models/Liveries/'+size/1024+'k/';return{name:'Delivery Day · '+size/1024+'K',files:{texturefuselage:path+'DDfuselage.png',texturewing1:path+'DDwing1.png',texturewing2:path+'DDwing2.png',texturespinner:'textures/liveries/Models/Liveries/DDspinner.png'}};}),
  engineRPM:1260/.479, // Engines/P51prop.xml maxrpm / Models/prop.xml spin factor
  augment(ctx){
   // The lab omitted enclosure.xml/mesh. Fit the replacement shell to the
   // original windshield and cockpit opening; dimensions are reference fits.
   const glass=new T.MeshPhysicalMaterial({color:'#a5beca',transparent:true,opacity:.23,roughness:.13,metalness:.08,ior:1.5,depthWrite:false,side:T.DoubleSide});
   const canopyDriver={a:{type:'translate',factor:.65,offset:0},channel:'canopy',axis:new T.Vector3(1,0,0),center:new T.Vector3(),input:[0,1],limits:[0,.65],output:0,matrix:new T.Matrix4(),targets:[]};ctx.drivers.push(canopyDriver);
   // Cross-sections [x, sill y, height, half-width] fit the existing seal at
   // x=2.99 m. A loft keeps the bottom on the cockpit sill rather than floating.
   const fixed=[[2.52,.45,.31,.22],[2.76,.27,.46,.33],[2.96,.22,.56,.375]];
   const moving=[[2.99,.24,.54,.37],[3.45,.29,.65,.35],[3.95,.40,.49,.33],[4.30,.58,.18,.23],[4.52,.63,.004,.01]];
   function loft(stations){
    const positions=[],indices=[],steps=32;
    for(const [x,y,h,w] of stations)for(let j=0;j<=steps;j++){const a=j/steps*Math.PI;positions.push(x,y+Math.sin(a)*h,Math.cos(a)*w);}
    for(let i=0;i<stations.length-1;i++)for(let j=0;j<steps;j++){const a=i*(steps+1)+j,b=a+steps+1;indices.push(a,b,a+1,a+1,b,b+1);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
   }
   const hood=new T.Mesh(loft(moving),glass);hood.name='procedural_P51D_bubble_canopy';ctx.registerProcedural(hood,[canopyDriver],'Missing official enclosure: reference-fitted shell; 0.65 m slide is a daVinci analogue, not supplied official travel');canopyDriver.targets.push(hood);hood.castShadow=false;
   const windshield=new T.Mesh(loft(fixed),glass.clone());windshield.name='procedural_P51D_windscreen';ctx.registerProcedural(windshield);windshield.castShadow=false;
   const frameMaterial=new T.MeshStandardMaterial({color:'#73857b',roughness:.62});
   for(const sign of [-1,1]){
    const curve=new T.CatmullRomCurve3(moving.map(([x,y,,w])=>new T.Vector3(x,y,sign*w)));
    const frame=new T.Mesh(new T.TubeGeometry(curve,48,.008,6,false),frameMaterial);frame.name='procedural_P51D_canopy_sill_'+sign;ctx.registerProcedural(frame,[canopyDriver]);
   }
   const aft=moving[3],points=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(aft[0],aft[1]+Math.sin(a)*aft[2],Math.cos(a)*aft[3]);});
   const frame=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.008,6,false),frameMaterial);frame.name='procedural_P51D_canopy_aft_frame';ctx.registerProcedural(frame,[canopyDriver]);
   ctx.notes.push({type:'referenceFit',part:'Missing canopy enclosure',stationsM:moving,fixedStationsM:fixed,slideM:.65,limitation:'Original enclosure XML/geometry absent. Bubble shell and slide are explicit approximations fitted to original frame meshes and intended-look image.'});
  }
 });
}
