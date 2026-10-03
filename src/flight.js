export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function createFlight(){return {x:0,y:105,z:350,yaw:0,pitch:0,roll:0,speed:38,throttle:.65,distance:0};}
export function stepFlight(s,input,dt,pace=1,agility=1){
 dt=clamp(dt,0,.05);s.throttle=clamp(s.throttle+(input.throttle||0)*dt*.3,.15,1);
 const target=(22+s.throttle*40)*pace*(input.boost?1.5:1);s.speed+=(target-s.speed)*(1-Math.exp(-dt*1.5));
 s.pitch+=((input.pitch||0)*.58*agility-s.pitch)*(1-Math.exp(-dt*2.4));s.roll+=((input.turn||0)*.65*agility-s.roll)*(1-Math.exp(-dt*3));
 s.yaw+=Math.sin(s.roll)*dt*.7;const d=s.speed*dt;s.x-=Math.sin(s.yaw)*Math.cos(s.pitch)*d;s.z-=Math.cos(s.yaw)*Math.cos(s.pitch)*d;s.y+=Math.sin(s.pitch)*d;s.y=clamp(s.y,1,1500);s.distance+=d;return s;
}
