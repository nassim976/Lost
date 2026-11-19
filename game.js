(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let W=0,H=0,dpr=1, running=false, paused=false, won=false, last=0, toastTimer;
const world={w:1500,h:1500};
const player={x:750,y:1120,vx:0,vy:0,dir:0,walk:0};
let camera={x:0,y:0},coins=[],keys=[],trees=[],rocks=[],particles=[];
let collected=0,keysFound=0, joystick={x:0,y:0,active:false}, keysDown={};
const coinSpots=[[590,1030],[870,990],[1030,850],[690,760],[460,870],[1120,1080],[900,590],[360,600],[1240,700],[740,450]];
const keySpots=[[390,390],[1110,440],[1080,1190]];
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();
function reset(){
 player.x=750;player.y=1120;player.vx=player.vy=0;player.walk=0;
 collected=0;keysFound=0;won=false;particles=[];
 coins=coinSpots.map(([x,y],i)=>({x,y,t:i*.7,got:false}));
 keys=keySpots.map(([x,y],i)=>({x,y,t:i,got:false}));
 trees=[];rocks=[];
 for(let i=0;i<75;i++){let x=70+Math.random()*1360,y=100+Math.random()*1300;if(Math.hypot(x-750,y-1120)>100)trees.push({x,y,s:.75+Math.random()*.7})}
 for(let i=0;i<18;i++){rocks.push({x:130+Math.random()*1240,y:170+Math.random()*1190,s:8+Math.random()*12})}
 updateUI();cameraFollow();
}
function showToast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1900)}
function updateUI(){
 $('coins').textContent=collected;$('keys').textContent=keysFound+'/3';
 $('missionText').textContent=collected<5?'استكشف الجزيرة واجمع 5 عملات':keysFound<3?'ابحث عن المفاتيح الثلاثة لفتح المعبد':'اقترب من بوابة المعبد وافتح الكنز';
 const p=collected<5?collected/5*100:keysFound/3*100;$('progressBar').style.width=p+'%';
}
function cameraFollow(){camera.x=player.x-W/2;camera.y=player.y-H*.57;camera.x=Math.max(0,Math.min(world.w-W,camera.x));camera.y=Math.max(0,Math.min(world.h-H,camera.y))}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function drawGround(){
 ctx.fillStyle='#27734f';ctx.fillRect(0,0,world.w,world.h);
 // soft grass patches and winding sandy trail
 for(let i=0;i<95;i++){let x=(i*173)%world.w,y=(i*293)%world.h;ellipse(x,y,22+(i%4)*7,9+(i%3)*4,i%2?'#2d8058':'#317e55')}
 ctx.strokeStyle='#b8a06a';ctx.lineWidth=100;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(760,1500);ctx.bezierCurveTo(650,1200,980,1050,760,850);ctx.bezierCurveTo(570,650,820,470,750,180);ctx.stroke();
 ctx.strokeStyle='#d2b77b';ctx.lineWidth=3;ctx.setLineDash([8,17]);ctx.stroke();ctx.setLineDash([]);
 // distant water edge
 ctx.fillStyle='#247e85';ctx.fillRect(0,0,world.w,55);ctx.fillRect(0,0,45,world.h);ctx.fillRect(world.w-45,0,45,world.h);
 for(let i=0;i<30;i++){ctx.strokeStyle='#ffffff20';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(65+i*46,20+(i%3)*8);ctx.lineTo(95+i*46,20+(i%3)*8);ctx.stroke()}
}
function drawTree(t){
 const x=t.x,y=t.y,s=t.s;ellipse(x,y+9*s,23*s,9*s,'#153e35aa');
 ctx.fillStyle='#805538';ctx.beginPath();ctx.moveTo(x-7*s,y+5*s);ctx.lineTo(x-4*s,y-35*s);ctx.lineTo(x+5*s,y-35*s);ctx.lineTo(x+9*s,y+5*s);ctx.closePath();ctx.fill();
 const leaves=[[-15,-43,23], [12,-49,25],[-2,-65,24],[0,-29,21]];
 leaves.forEach(([dx,dy,r],i)=>{ellipse(x+dx*s,y+dy*s,r*s,r*.76*s,['#1c6847','#287d4e','#328c55','#236f49'][i]);});
 ellipse(x-9*s,y-51*s,7*s,5*s,'#55a96b');
}
function drawRock(r){ellipse(r.x,r.y+3,r.s*1.2,r.s*.55,'#174b3c88');ctx.fillStyle='#879a83';ctx.beginPath();ctx.moveTo(r.x-r.s,r.y);ctx.lineTo(r.x-r.s*.4,r.y-r.s*.8);ctx.lineTo(r.x+r.s*.5,r.y-r.s);ctx.lineTo(r.x+r.s,r.y-r.s*.2);ctx.lineTo(r.x+r.s*.7,r.y+r.s*.3);ctx.closePath();ctx.fill();ctx.fillStyle='#b8c3a1';ctx.beginPath();ctx.moveTo(r.x-r.s*.4,r.y-r.s*.7);ctx.lineTo(r.x+r.s*.5,r.y-r.s);ctx.lineTo(r.x+r.s*.2,r.y-r.s*.2);ctx.closePath();ctx.fill()}
function drawCoin(c,time){if(c.got)return;let bob=Math.sin(time*3+c.t)*4;ctx.save();ctx.translate(c.x,c.y-15+bob);ctx.rotate(Math.sin(time*2+c.t)*.18);ellipse(0,14,12,4,'#163c3180');ctx.fillStyle='#e8a92f';ctx.beginPath();ctx.ellipse(0,0,8,12,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffe58b';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff0a9';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('$',0,4);ctx.restore()}
function drawKey(k,time){if(k.got)return;let bob=Math.sin(time*2+k.t)*5;ctx.save();ctx.translate(k.x,k.y-18+bob);ellipse(0,17,12,4,'#143a3180');ctx.strokeStyle='#ffe18a';ctx.lineWidth=5;ctx.beginPath();ctx.arc(-3,0,7,0,Math.PI*2);ctx.moveTo(4,0);ctx.lineTo(17,0);ctx.lineTo(17,6);ctx.moveTo(12,0);ctx.lineTo(12,4);ctx.stroke();ctx.restore()}
function drawTemple(){let x=750,y=180;ellipse(x,y+75,100,28,'#153f3680');ctx.fillStyle='#a99a72';ctx.fillRect(x-78,y-5,156,72);ctx.fillStyle='#c5b58a';ctx.beginPath();ctx.moveTo(x-95,y-5);ctx.lineTo(x,y-48);ctx.lineTo(x+95,y-5);ctx.closePath();ctx.fill();for(let i=0;i<4;i++){ctx.fillStyle='#d6c69b';ctx.fillRect(x-62+i*40,y+5,15,60)}ctx.fillStyle=keysFound===3?'#ffd76a':'#584d38';ctx.fillRect(x-17,y+27,34,40);ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText(keysFound===3?'✨':'🔒',x,y+22)}
function drawPlayer(time){
 let x=player.x,y=player.y;let bob=Math.abs(Math.sin(player.walk))*3;
 ellipse(x,y+13,18,7,'#123d32aa');
 // shadow / legs
 ctx.strokeStyle='#294d38';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-5,y-5);ctx.lineTo(x-7+Math.sin(player.walk)*4,y+8);ctx.moveTo(x+5,y-5);ctx.lineTo(x+7-Math.sin(player.walk)*4,y+8);ctx.stroke();
 // backpack
 ctx.fillStyle='#9a633c';ctx.beginPath();ctx.roundRect(x-13,y-35-bob,26,29,7);ctx.fill();
 // body and head
 ctx.fillStyle='#e6a34d';ctx.beginPath();ctx.roundRect(x-11,y-39-bob,22,25,7);ctx.fill();
 ctx.fillStyle='#d99867';ctx.beginPath();ctx.arc(x,y-49-bob,10,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#4b3529';ctx.beginPath();ctx.arc(x,y-53-bob,10,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle='#233a31';ctx.beginPath();ctx.arc(x+3,y-49-bob,1.5,0,7);ctx.fill();
 // direction marker
 ctx.fillStyle='#fff4c6';ctx.beginPath();ctx.moveTo(x,y-65-bob);ctx.lineTo(x-4,y-59-bob);ctx.lineTo(x+4,y-59-bob);ctx.fill();
}
function drawParticles(dt){particles.forEach(p=>{p.y-=dt*25;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.font='bold 15px sans-serif';ctx.fillText(p.text,p.x,p.y)});ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0)}
function loop(ts){
 const time=ts/1000,dt=Math.min((ts-last)/1000||0,.033);last=ts;
 if(running&&!paused&&!won)update(dt);
 ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(-camera.x,-camera.y);
 drawGround();drawTemple();
 rocks.forEach(drawRock);
 trees.sort((a,b)=>a.y-b.y);
 // sort world objects by depth
 let objs=[...trees.map(o=>({...o,type:'tree'})),...coins.filter(c=>!c.got).map(o=>({...o,type:'coin'})),...keys.filter(k=>!k.got).map(o=>({...o,type:'key'})),{x:player.x,y:player.y,type:'player'}];
 objs.sort((a,b)=>a.y-b.y);
 objs.forEach(o=>{if(o.type==='tree')drawTree(o);else if(o.type==='coin')drawCoin(o,time);else if(o.type==='key')drawKey(o,time);else drawPlayer(time)});
 drawParticles(dt);ctx.restore();
 if(running&&!paused&&!won)requestAnimationFrame(loop);else requestAnimationFrame(loop);
}
function update(dt){
 let ax=joystick.x,ay=joystick.y;
 if(keysDown.ArrowLeft||keysDown.a)ax-=1;if(keysDown.ArrowRight||keysDown.d)ax+=1;if(keysDown.ArrowUp||keysDown.w)ay-=1;if(keysDown.ArrowDown||keysDown.s)ay+=1;
 const mag=Math.hypot(ax,ay);if(mag>1){ax/=mag;ay/=mag}
 const speed=190;player.vx+=(ax*speed-player.vx)*Math.min(1,dt*9);player.vy+=(ay*speed-player.vy)*Math.min(1,dt*9);
 player.x=Math.max(85,Math.min(world.w-85,player.x+player.vx*dt));player.y=Math.max(100,Math.min(world.h-80,player.y+player.vy*dt));
 if(Math.abs(player.vx)+Math.abs(player.vy)>8){player.walk+=dt*11;player.dir=Math.atan2(player.vy,player.vx)}
 cameraFollow();
 coins.forEach(c=>{if(!c.got&&Math.hypot(player.x-c.x,player.y-c.y)<34){c.got=true;collected++;particles.push({x:c.x,y:c.y-20,text:'+1 🪙',life:1,color:'#ffe18a'});showToast('جميل! حصلت على عملة ذهبية');updateUI()}});
 keys.forEach(k=>{if(!k.got&&Math.hypot(player.x-k.x,player.y-k.y)<38){k.got=true;keysFound++;particles.push({x:k.x,y:k.y-25,text:'مفتاح!',life:1.2,color:'#fff0a9'});showToast('عثرت على مفتاح قديم!');updateUI()}});
 if(keysFound===3&&Math.hypot(player.x-750,player.y-245)<65){won=true;$('winScreen').classList.remove('hidden')}
}
function interact(){
 if(!running||paused)return;
 if(keysFound===3&&Math.hypot(player.x-750,player.y-245)<100){won=true;$('winScreen').classList.remove('hidden');return}
 const near=[...coins.filter(c=>!c.got),...keys.filter(k=>!k.got)].some(o=>Math.hypot(player.x-o.x,player.y-o.y)<65);
 showToast(near?'اقترب أكثر لالتقاط العنصر':'استمر في الاستكشاف وابحث عن اللمعان!');
}
function start(){reset();$('startScreen').classList.add('hidden');$('pauseScreen').classList.add('hidden');$('winScreen').classList.add('hidden');running=true;paused=false;last=0;showToast('اجمع 5 عملات ثم ابحث عن المفاتيح الثلاثة');}
$('startBtn').onclick=start;$('restartBtn').onclick=start;$('playAgainBtn').onclick=start;
$('pauseBtn').onclick=()=>{if(!running)return;paused=true;$('pauseScreen').classList.remove('hidden')};
$('resumeBtn').onclick=()=>{paused=false;$('pauseScreen').classList.add('hidden');last=0};
$('actionBtn').onclick=interact;
addEventListener('keydown',e=>{keysDown[e.key]=true;if(e.key==='Escape'&&running){paused=!paused;$('pauseScreen').classList.toggle('hidden',!paused)}});
addEventListener('keyup',e=>keysDown[e.key]=false);
const joy=$('joystick'),knob=$('joyKnob');let pointer=null;
function joyMove(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=35,len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max}joystick.x=dx/max;joystick.y=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`}
joy.addEventListener('pointerdown',e=>{pointer=e.pointerId;joy.setPointerCapture(pointer);joystick.active=true;joyMove(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===pointer)joyMove(e)});
function joyEnd(e){if(e.pointerId!==pointer)return;pointer=null;joystick.x=joystick.y=0;joystick.active=false;knob.style.transform='translate(0,0)'}
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
reset();requestAnimationFrame(loop);
})();