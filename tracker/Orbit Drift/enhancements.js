// Orbit Drift progression and run systems. Storage failure never blocks play.
const odUI = id => document.getElementById(id);
const odFinite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
let odSave = { records: { relaxed:0, normal:0, challenge:0 }, achievements:[], guided:false };
try {
  const saved = JSON.parse(localStorage.getItem('orbit-drift-progress-v2') || '{}');
  for (const mode of Object.keys(odSave.records)) odSave.records[mode] = odFinite(saved.records?.[mode]);
  odSave.achievements = Array.isArray(saved.achievements) ? saved.achievements.filter(x => typeof x === 'string') : [];
  odSave.guided = saved.guided === true;
  odSave.records.normal = Math.max(odSave.records.normal, odFinite(Number(localStorage.getItem('orbit_drift_highscore'))));
} catch {}
let odMode='normal', odTheme='nebula', odStyle='classic', odPractice=false, odGuided=false;
let odShield=false, odSlow=0, odMagnet=0, odCollected=0, odSteered=0, odMission=0, odDone=false, odNextPickup=3, odNextRelic=18, odFirstDrone=false;
let odTotals={pickups:0,crashes:0,dodges:0,survival:0,missions:0};
const odSpecs = {
 energy:{value:200,color:'#ffe600',icon:'E',tone:523},
 coin:{value:50,color:'#ffe600',icon:'●',tone:660},
 gem:{value:150,color:'#d898ff',icon:'◆',tone:880},
 relic:{value:500,color:'#ffad66',icon:'★',tone:1100},
 shield:{value:25,color:'#66ddff',icon:'S',tone:440},
 slow:{value:25,color:'#80ffc0',icon:'≪',tone:330},
 magnet:{value:25,color:'#ffa0dc',icon:'M',tone:550}
};
function odPersist(){try{localStorage.setItem('orbit-drift-progress-v2',JSON.stringify(odSave));}catch{}}
function odUnlock(name){if(!odPractice&&!odSave.achievements.includes(name)){odSave.achievements.push(name);odPersist();}}
function odDelta(a,b,size){return ((b-a+size/2)%size+size)%size-size/2;}
function odDistance(a,b){return Math.hypot(odDelta(a.x,b.x,W),odDelta(a.y,b.y,H));}
function odSafePoint(){return {x:(player.x+W/2)%W,y:(player.y+H/2)%H};}
function odSpawnDistance(){return Math.min(320,Math.hypot(W/2,H/2)*.72);}
function odRefresh(){
 odUI('mode-best').textContent=odMode.toUpperCase()+' BEST: '+odSave.records[odMode];
 odUI('ship-style').options[1].disabled=!odSave.achievements.includes('MISSION MASTER');
 odUI('ship-style').options[2].disabled=!odSave.achievements.includes('RELIC HUNTER');
 odUI('unlock-info').textContent='Neon ship + trail: finish a mission. Gold ship + star gems: collect a relic. Achievements: '+odSave.achievements.length;
}
function odMenu(){gameState='START';input.left=input.right=input.nitro=false;startScreen.classList.remove('hidden');gameOverScreen.classList.add('hidden');odUI('od-status').classList.add('hidden');odUI('flight-menu').classList.add('hidden');odRefresh();}
function odInit(){
 odShield=odMode==='relaxed';odSlow=odMagnet=odCollected=odSteered=0;odDone=false;odMission=Math.floor(Math.random()*3);odNextPickup=3;odNextRelic=18;odFirstDrone=false;
 odTotals={pickups:0,crashes:0,dodges:0,survival:0,missions:0};
 highScore=odSave.records[odMode];gravWells=[];input.left=input.right=input.nitro=false;
 for(const gap of [70,120,170]) pickups.push(new Pickup(player.x,(player.y-gap+H)%H,'coin'));
 odUI('od-status').classList.remove('hidden');odUI('flight-menu').classList.remove('hidden');odStatus();
}
function odStatus(){
 const progress=[odCollected,sessionDronesDestroyed,sessionNearMisses][odMission], target=[10,3,3][odMission];
 let guide='';if(odGuided){guide=odSteered<.6?'Hold A/D or left/right to steer':odCollected<3?'Collect 3 glowing artifacts':'Bait a drone into an asteroid, then steer away';if(odSteered>=.6&&odCollected>=3&&sessionDronesDestroyed){odSave.guided=true;odPersist();odGuided=false;guide='Training complete! Menu → Launch for a scored run.';}}
 odUI('od-status').textContent=[odPractice?'TRAINING · NO RECORDS':odMode.toUpperCase(),odDone?'MISSION COMPLETE +500':['Collect artifacts','Destroy drones','Near-miss dodges'][odMission]+' '+progress+'/'+target,odShield?'SHIELD READY':'',odSlow>0?'SLOW '+Math.ceil(odSlow)+'s':'',odMagnet>0?'MAGNET '+Math.ceil(odMagnet)+'s':'',comboTimer>0?'COMBO ×'+(1+Math.floor((comboCount-1)/2)*.5).toFixed(1):'',guide].filter(Boolean).join(' · ');
}
function odSpawnPickup(kind){
 if(pickups.length>=24)return;
 for(let i=0;i<45;i++){
  const a=Math.random()*Math.PI*2, reach=Math.min(240,Math.min(W,H)*.4), d=kind==='relic'?reach:60+Math.random()*Math.max(20,reach-60);
  const x=(player.x+Math.cos(a)*d+W)%W,y=(player.y+Math.sin(a)*d+H)%H, point={x,y};
  if(asteroids.some(o=>odDistance(point,o)<o.radius+50)||gravWells.some(o=>odDistance(point,o)<o.radius+80)||drones.some(o=>odDistance(point,o)<90)||pickups.some(o=>odDistance(point,o)<42))continue;
  pickups.push(new Pickup(x,y,kind));return;
 }
}
function odUpdate(dt){
 odSlow=Math.max(0,odSlow-dt);odMagnet=Math.max(0,odMagnet-dt);if(input.left||input.right)odSteered+=dt;
 if(runTime>=odNextPickup){odNextPickup=runTime+2.5;const kinds=['coin','coin','coin','gem','gem','shield','slow','magnet'];odSpawnPickup(kinds[Math.floor(Math.random()*kinds.length)]);}
 if(runTime>=odNextRelic){odNextRelic=runTime+20;odSpawnPickup('relic');}
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.update(dt);if(p.life<=0){pickups.splice(i,1);continue;}if(odDistance(p,player)>=player.radius+p.radius)continue;
  const spec=odSpecs[p.kind];awardCombo(spec.value,p.kind.toUpperCase(),p.x,p.y,spec.color,'pickups');odCollected++;
  sound.playTone(spec.tone,'triangle',.2,.15,spec.tone*1.5);triggerHaptic(15);
  if(p.kind==='shield')odShield=true;if(p.kind==='slow')odSlow=6;if(p.kind==='magnet')odMagnet=8;if(p.kind==='relic')odUnlock('RELIC HUNTER');
  if(p.kind==='energy'){player.overdriveEnergy+=25;if(player.overdriveEnergy>=100){player.overdriveEnergy=0;player.isOverdrive=true;player.overdriveTimer=5;sound.playOverdrive();}}
  pickups.splice(i,1);
 }
 if(!odDone&&[odCollected>=10,sessionDronesDestroyed>=3,sessionNearMisses>=3][odMission]){odDone=true;score+=500;odTotals.missions+=500;floatingTexts.push(new FloatingText(player.x,player.y-40,'MISSION COMPLETE +500','#80ffc0'));odUnlock('MISSION MASTER');}
 odStatus();
}
function odHit(cause){
 if(odPractice||player.isOverdrive||player.launchShield>0)return false;
 if(odShield){odShield=false;player.launchShield=2.5;floatingTexts.push(new FloatingText(player.x,player.y-35,'SHIELD SAVED YOU!','#66ddff'));sound.playPickup();return false;}
 triggerGameOver(cause);return true;
}
function odFinish(cause){
 const previous=odSave.records[odMode];score=Math.floor(score);
 if(!odPractice){odSave.records[odMode]=Math.max(previous,score);if(runTime>=60)odUnlock('SURVIVOR');odPersist();}
 highScore=odSave.records[odMode];
 odUI('result-cause').textContent=cause+' · '+odMode+(odPractice?' · Training':'');
 odUI('score-breakdown').textContent=Object.entries(odTotals).map(([k,v])=>k+': '+Math.floor(v)).join(' · ');
 odUI('best-gap').textContent=odPractice?'Training — records unchanged':score>previous?'NEW PERSONAL BEST!':(previous-score)+' points to your best';
 odUI('od-status').classList.add('hidden');odUI('flight-menu').classList.add('hidden');odRefresh();
}
odUI('difficulty').addEventListener('change',e=>{odMode=e.target.value;odRefresh();});
odUI('arena-theme').addEventListener('change',e=>odTheme=e.target.value);
odUI('ship-style').addEventListener('change',e=>odStyle=e.target.value);
odUI('training').addEventListener('click',()=>{odPractice=true;odGuided=true;sound.init();initGame();});
odUI('flight-menu').addEventListener('click',odMenu);odUI('result-menu').addEventListener('click',odMenu);
odRefresh();
