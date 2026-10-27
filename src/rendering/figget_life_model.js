// Browser-only, seeded economy and independent tabular Q-learning agents.
// Save/message fields are quoted so advanced compilation cannot rename them.
const SIZE=96, DT=.25, MAX_BOTS=512, STATES=144;
const ACTIONS=['forage','harvest','mine','build','supply','raid','recover','explore','home'];
const COLORS=['#e4b37e','#a6c9ff','#b6df99','#dab0ed','#ed9fac','#91d7d5','#dbd387','#bca996'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(x,y)=>y*SIZE+x;
const distance=(a,b)=>Math.abs(a['x']-b['x'])+Math.abs(a['y']-b['y']);
function random(w){let n=w['rng']|0;n^=n<<13;n^=n>>>17;n^=n<<5;w['rng']=n>>>0;return w['rng']/4294967296;}
function hash(x,y){let n=Math.imul(x+137,374761393)^Math.imul(y+71,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function region(x,y){return hash(Math.floor(x/12),Math.floor(y/12));}
function actor(id,x,y,lineage=0){return {'id':id,'x':x,'y':y,'homeX':x,'homeY':y,'lineage':lineage,'generation':1,'health':100,'wood':4,'food':2,'ore':1,'fitness':0,'age':0,'kills':0,'deaths':0,'gathers':0,'delivered':0,'built':0,'last':-1,'shield':5,'intent':'explore','epsilon':.2,'alpha':.14,'gamma':.9,'aggression':1,'q':id?new Float32Array(STATES*ACTIONS.length):null,'updates':0,'pending':null,'visited':[]};}
function event(w,a,text,x=a['x'],y=a['y']){w['events'].push({'id':++w['eventId'],'time':w['time'],'actor':a['id'],'lineage':a['lineage'],'generation':a['generation'],'text':text,'x':x,'y':y});if(w['events'].length>100)w['events'].shift();}
function initBrain(a){
 for(let stateIndex=0;stateIndex<STATES;stateIndex++){
  const health=Math.floor(stateIndex/48),food=Math.floor(stateIndex/24)%2,build=Math.floor(stateIndex/12)%2;
  a['q'][stateIndex*9]=food?0:.8; a['q'][stateIndex*9+1]=.35;a['q'][stateIndex*9+2]=.18;
  a['q'][stateIndex*9+3]=build?.5:-.2;a['q'][stateIndex*9+4]=.1;
  a['q'][stateIndex*9+5]=health===2?.05:-.7;a['q'][stateIndex*9+6]=health<2&&food?1.2:-.3;
  a['q'][stateIndex*9+7]=.12;a['q'][stateIndex*9+8]=-.3;
 }
}
function spawn(w,id){
 const clan=1+(id-1)%8,angle=(clan-1)*Math.PI/4,r=17+((clan*7)%15);
 const hx=clamp(Math.round(48+Math.cos(angle)*r),5,90),hy=clamp(Math.round(48+Math.sin(angle)*r),5,90);
 const a=actor(id,clamp(hx+Math.floor(random(w)*13)-6,1,94),clamp(hy+Math.floor(random(w)*13)-6,1,94),clan);
 a['homeX']=hx;a['homeY']=hy;a['epsilon']=.12+random(w)*.2;a['aggression']=.6+random(w)*.8;initBrain(a);return a;
}
function fresh(seed=42,count=96){
 const w={'version':1,'rng':(seed>>>0)||42,'seed':seed>>>0,'time':0,'tick':0,'player':actor(0,48,48),'bots':[],'nodes':[],'buildings':[],'events':[],'eventId':0,'nextId':1,'generation':1,'nextEvolution':180,'learning':true,'history':[],'nextHistory':0,'retired':0,'totalUpdates':0};
 for(let y=2;y<SIZE-1;y+=3)for(let x=2;x<SIZE-1;x+=3){
  if(Math.abs(x-48)+Math.abs(y-48)<5)continue;
  const r=region(x,y);if(hash(x,y)<(r<.3?.6:.12))continue;
  const kind=hash(x+202,y+91)<.45?'food':hash(x+67,y+11)<.7?'wood':'ore';
  const interval=(kind==='food'?18:kind==='wood'?25:55)/(r<.3?.45:r>.7?1.6:1);
  w['nodes'].push({'x':x,'y':y,'kind':kind,'stock':5,'next':interval,'interval':interval,'soil':1});
 }
 setPopulation(w,count);event(w,w['player'],'arrived at the sanctuary');return w;
}
function setPopulation(w,count){
 count=clamp(Math.round(Number(count)||32),8,MAX_BOTS);
 while(w['bots'].length<count)w['bots'].push(spawn(w,w['nextId']++));
 if(w['bots'].length>count){w['retired']+=w['bots'].length-count;w['bots'].length=count;}
 return w['bots'].length;
}
function index(w){
 const agents=new Map(),nodes=new Map(),buildings=new Map();
 for(const a of [w['player'],...w['bots']]){const k=key(a['x'],a['y']);if(!agents.has(k))agents.set(k,[]);agents.get(k).push(a);}
 for(const n of w['nodes'])nodes.set(key(n['x'],n['y']),n);
 for(const b of w['buildings'])buildings.set(key(b['x'],b['y']),b);
 return {agents,nodes,buildings};
}
function safe(a){return Math.abs(a['x']-48)+Math.abs(a['y']-48)<=3||a['shield']>0;}
function enemy(a,b){return a['id']!==b['id']&&(a['id']===0||b['id']===0||a['lineage']!==b['lineage']);}
function nearest(map,a,predicate,radius=12){
 for(let r=0;r<=radius;r++){
  let best=null,score=Infinity;
  for(let dx=-r;dx<=r;dx++)for(const dy of (r-Math.abs(dx)===0?[0]:[r-Math.abs(dx),-(r-Math.abs(dx))])){
   const x=a['x']+dx,y=a['y']+dy;if(x<0||y<0||x>=SIZE||y>=SIZE)continue;
   const entry=map.get(key(x,y));if(!entry)continue;
   for(const p of (Array.isArray(entry)?entry:[entry]))if(predicate(p)){
    const s=distance(a,p);if(s<score){score=s;best=p;}
   }
  }
  if(best)return best;
 }
 return null;
}
function move(w,a,dx,dy,idx){
 if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
 const x=a['x']+dx,y=a['y']+dy;if(x<0||y<0||x>=SIZE||y>=SIZE)return false;
 // Small overlap capacity avoids impassable bot crowds; no teleporting through actors.
 const dest=idx.agents.get(key(x,y))||[];if(dest.length>=4)return false;
 const old=idx.agents.get(key(a['x'],a['y']));if(old){const i=old.indexOf(a);if(i>=0)old.splice(i,1);}
 a['x']=x;a['y']=y;dest.push(a);idx.agents.set(key(x,y),dest);return true;
}
function towards(w,a,target,idx){
 const dx=target['x']-a['x'],dy=target['y']-a['y'];if(!dx&&!dy)return true;
 const choices=Math.abs(dx)>=Math.abs(dy)?[[Math.sign(dx),0],[0,Math.sign(dy)]]:[[0,Math.sign(dy)],[Math.sign(dx),0]];
 for(const [x,y]of choices)if((x||y)&&move(w,a,x,y,idx))return true;
 return false;
}
function respawn(w,a,idx){
 const old=idx.agents.get(key(a['x'],a['y']));if(old){const i=old.indexOf(a);if(i>=0)old.splice(i,1);}
 event(w,a,'died and respawned');a['health']=100;a['deaths']++;a['fitness']-=4;
 for(const k of ['wood','food','ore'])a[k]=Math.floor(a[k]/2);
 a['x']=a['homeX'];a['y']=a['homeY'];a['shield']=8;
 const k=key(a['x'],a['y']);if(!idx.agents.has(k))idx.agents.set(k,[]);idx.agents.get(k).push(a);
}
function gather(w,a,n){
 if(!n||distance(a,n)>1||n['stock']<1||a['wood']+a['food']+a['ore']>=30)return {reward:-.08,message:'Stand beside a stocked resource; your pack holds 30 units.'};
 n['stock']--;n['soil']=Math.max(.45,n['soil']-.06);a[n['kind']]++;a['gathers']++;a['fitness']+=.12;if(a['id']!==0&&a['gathers']%12===1)event(w,a,'gathered '+n['kind']);
 if(n['kind']==='ore')a['health']-=8;
 return {reward:.3,message:'Gathered '+n['kind']+(n['kind']==='ore'?' · −8 health.':'.')};
}
function build(w,a,idx){
 const own=w['buildings'].filter(b=>b['owner']===a['id']).length;
 if(a['wood']<6||a['ore']<1||own>=4||w['buildings'].length>=1024||Math.abs(a['x']-48)+Math.abs(a['y']-48)<=3||idx.nodes.has(key(a['x'],a['y']))||idx.buildings.has(key(a['x'],a['y'])))return {reward:-.1,message:'Build on open ground outside sanctuary: 6 wood + 1 ore; four depots per character.'};
 a['wood']-=6;a['ore']--;a['built']++;a['fitness']+=1;
 const b={'x':a['x'],'y':a['y'],'owner':a['id'],'lineage':a['lineage'],'food':0,'expires':w['time']+480,'generation':a['generation']};
 w['buildings'].push(b);idx.buildings.set(key(b['x'],b['y']),b);event(w,a,'built a depot');return {reward:.7,message:'Depot built. Stock it with food and wood to keep it alive.'};
}
function supply(w,a,b){
 if(!b||distance(a,b)>1||a['food']<1||a['wood']<1||b['food']>=12)return {reward:-.08,message:'Supply an adjacent depot with 1 food + 1 wood (holds 12 food).'};
 a['food']--;a['wood']--;b['food']++;b['expires']=w['time']+480;a['delivered']++;a['fitness']+=.6;
 if(a['id']===0||a['delivered']%4===1)event(w,a,'supplied a depot',b['x'],b['y']);
 return {reward:.5,message:'Delivered food and repaired the depot. Anyone can eat here.'};
}
function eat(w,a,b){
 if(a['health']>=99)return {reward:-.05,message:'You are already healthy.'};
 if(a['food']>0)a['food']--;else if(b&&distance(a,b)<=1&&b['food']>0)b['food']--;else return {reward:-.08,message:'Gather food or find a stocked depot.'};
 const restored=Math.min(30,100-a['health']);a['health']+=restored;a['fitness']+=restored*.008;return {reward:restored*.02,message:'Recovered '+Math.round(restored)+' health.'};
}
function attack(w,a,target,idx){
 if(!target||distance(a,target)>1||!enemy(a,target))return {reward:-.1,message:'Stand next to a rival to attack.'};
 if(safe(a)||safe(target))return {reward:-.1,message:'Sanctuary and newly spawned characters are protected.'};
 if(a['ore']<1)return {reward:-.08,message:'An attack costs one ore.'};
 a['ore']--;target['health']-=20;target['fitness']-=.4;let reward=.2*a['aggression'];
 event(w,a,'attacked '+(target['id']===0?'you':'bot '+target['id']),target['x'],target['y']);
 if(target['health']<=0){for(const kind of ['food','wood','ore']){const loot=Math.min(2,target[kind],30-a['food']-a['wood']-a['ore']);a[kind]+=loot;target[kind]-=loot;}a['kills']++;a['fitness']+=2;reward+=2;respawn(w,target,idx);}
 return {reward,message:'Hit rival · −20 health, cost 1 ore.'};
}
function state(w,a,idx){
 const h=a['health']<35?0:a['health']<75?1:2,food=a['food']>0?1:0,ready=a['wood']>=6&&a['ore']>=1?1:0;
 const n=nearest(idx.nodes,a,n=>n['stock']>0,1),b=nearest(idx.buildings,a,()=>true,1);
 const tile=b?(b['lineage']===a['lineage']?4:5):n?({'food':1,'wood':2,'ore':3}[n['kind']]):0;
 const rival=nearest(idx.agents,a,b=>enemy(a,b)&&!safe(b),2)?1:0;
 return (((h*2+food)*2+ready)*6+tile)*2+rival;
}
function choose(w,a,s){
 if(random(w)<a['epsilon'])return Math.floor(random(w)*ACTIONS.length);
 let best=-Infinity,chosen=0,ties=0;for(let k=0;k<9;k++){const v=a['q'][s*9+k];if(v>best+1e-6){best=v;chosen=k;ties=1;}else if(Math.abs(v-best)<1e-6&&random(w)<1/(++ties))chosen=k;}
 return chosen;
}
function learn(a,s,action,reward,next,terminal=false){
 if(!Number.isInteger(s)||s<0||s>=STATES||!Number.isInteger(next)||next<0||next>=STATES||action<0||action>=9)return;
 let max=-Infinity;for(let i=0;i<9;i++)max=Math.max(max,a['q'][next*9+i]);
 const i=s*9+action;a['q'][i]=clamp(a['q'][i]+a['alpha']*(reward+(terminal?0:a['gamma']*max)-a['q'][i]),-20,20);a['updates']++;
}
function wander(w,a,idx){const dir=Math.floor(random(w)*4),dirs=[[1,0],[-1,0],[0,1],[0,-1]];return move(w,a,...dirs[dir],idx);}
function macro(w,a,choice,idx){
 const name=ACTIONS[choice];a['intent']=name;
 if(choice<3){const kind=['food','wood','ore'][choice],n=nearest(idx.nodes,a,n=>n['kind']===kind&&n['stock']>0);
  if(!n){wander(w,a,idx);return -.025;}if(distance(a,n)<=1)return gather(w,a,n).reward;
  return towards(w,a,n,idx)?.025:-.06;
 }
 if(name==='build'){
  if(a['wood']<6||a['ore']<1)return -.08;
  const blocked=idx.nodes.has(key(a['x'],a['y']))||idx.buildings.has(key(a['x'],a['y']));if(blocked){wander(w,a,idx);return -.02;}return build(w,a,idx).reward;
 }
 if(name==='supply'){
  if(a['food']<1||a['wood']<1)return -.08;
  const b=nearest(idx.buildings,a,b=>b['food']<12);if(!b){wander(w,a,idx);return -.04;}
  return distance(a,b)<=1?supply(w,a,b).reward:towards(w,a,b,idx)?.025:-.06;
 }
 if(name==='raid'){
  const target=nearest(idx.agents,a,b=>enemy(a,b)&&!safe(b),8);if(!target||a['ore']<1||safe(a))return -.08;
  return distance(a,target)<=1?attack(w,a,target,idx).reward:towards(w,a,target,idx)?.015:-.06;
 }
 if(name==='recover'){
  if(a['food']>0)return eat(w,a,null).reward;
  const b=nearest(idx.buildings,a,b=>b['food']>0);if(!b)return -.08;
  return distance(a,b)<=1?eat(w,a,b).reward:towards(w,a,b,idx)?.025:-.06;
 }
 if(name==='home'){
  if(a['x']===a['homeX']&&a['y']===a['homeY'])return -.04;
  return towards(w,a,{'x':a['homeX'],'y':a['homeY']},idx)?.005:-.06;
 }
 const k=key(a['x'],a['y']),novel=!a['visited'].includes(k);a['visited'].push(k);if(a['visited'].length>32)a['visited'].shift();
 return wander(w,a,idx)?novel?.025:-.015:-.06;
}
function evolve(w){
 if(!w['learning']||w['bots'].length<8)return;
 const mature=w['bots'].filter(a=>a['age']>=90);if(mature.length<8)return;
 const ranked=mature.sort((a,b)=>b['fitness']-a['fitness']),parents=ranked.slice(0,Math.max(2,Math.ceil(ranked.length*.25))),n=Math.max(1,Math.floor(ranked.length*.125));
 for(const old of ranked.slice(-n)){
  const parent=parents[Math.floor(random(w)*parents.length)],child=spawn(w,old['id']);child['q']=new Float32Array(parent['q']);
  child['lineage']=parent['lineage'];child['homeX']=parent['homeX'];child['homeY']=parent['homeY'];child['x']=clamp(child['homeX']+Math.floor(random(w)*9)-4,0,95);child['y']=clamp(child['homeY']+Math.floor(random(w)*9)-4,0,95);
  child['generation']=parent['generation']+1;child['epsilon']=clamp(parent['epsilon']+(random(w)-.5)*.04,.05,.4);child['aggression']=clamp(parent['aggression']+(random(w)-.5)*.15,.3,1.8);
  for(let i=0;i<child['q'].length;i++)if(random(w)<.02)child['q'][i]=clamp(child['q'][i]+(random(w)-.5)*.2,-20,20);
  const at=w['bots'].indexOf(old);w['bots'][at]=child;
 }
 for(const a of w['bots'])a['fitness']*=.5;
 w['generation']++;event(w,w['player'],'new bot generation: '+n+' learners inherited successful policies');
}
function step(w){
 w['time']+=DT;w['tick']++;
 for(const n of w['nodes']){
  n['soil']=Math.min(1,n['soil']+.0005);
  if(w['time']>=n['next']){n['stock']=Math.min(5,n['stock']+1);n['next']=w['time']+n['interval']/n['soil'];}
 }
 w['buildings']=w['buildings'].filter(b=>b['expires']>w['time']);
 const idx=index(w);
 for(const a of [w['player'],...w['bots']]){
  a['age']+=DT;a['shield']=Math.max(0,a['shield']-DT);a['health']-=.00625;
  if(a['health']<=0)respawn(w,a,idx);
 }
 for(const a of w['bots']){
  // Stagger decisions across four ticks: each bot acts once per simulated second.
  if(a['id']%4!==w['tick']%4)continue;
  const s=state(w,a,idx),prior=a['pending'];
  if(prior&&w['learning']){learn(a,prior['state'],prior['choice'],prior['reward']-Math.max(0,prior['health']-a['health'])*.02-(a['deaths']-prior['deaths'])*4,s,a['deaths']!==prior['deaths']);w['totalUpdates']++;}
  const choice=choose(w,a,s),health=a['health'],deaths=a['deaths'];
  let reward=macro(w,a,choice,idx)-.008;
  if(a['health']<=0)respawn(w,a,idx);
  reward-=Math.max(0,health-a['health'])*.015;
  if(a['deaths']!==deaths){if(w['learning']){learn(a,s,choice,reward-4,state(w,a,idx),true);w['totalUpdates']++;}a['pending']=null;}
  else a['pending']=w['learning']?{'state':s,'choice':choice,'reward':reward,'health':a['health'],'deaths':a['deaths']}:null;
 }
 if(w['time']>=w['nextEvolution']){evolve(w);w['nextEvolution']+=180;}
 if(w['time']>=w['nextHistory']){
  w['history'].push({'time':w['time'],'updates':w['totalUpdates'],'gathers':w['bots'].reduce((n,a)=>n+a['gathers'],0),'depots':w['buildings'].length,'generation':w['generation']});if(w['history'].length>120)w['history'].shift();w['nextHistory']=w['time']+10;
 }
 return w;
}
function playerAction(w,command){
 const a=w['player'];if(w['time']-a['last']<.25)return 'Wait a moment between actions.';
 const idx=index(w),type=command['type'];let result;
 if(type==='move')result={message:move(w,a,command['dx'],command['dy'],idx)?'Moved.':'That route is blocked.'};
 else if(type==='gather')result=gather(w,a,idx.nodes.get(key(command['x'],command['y'])));
 else if(type==='build')result=build(w,a,idx);
 else if(type==='supply')result=supply(w,a,idx.buildings.get(key(command['x'],command['y'])));
 else if(type==='eat')result=eat(w,a,nearest(idx.buildings,a,b=>b['food']>0,1));
 else if(type==='attack'){
  const targets=idx.agents.get(key(command['x'],command['y']))||[];result=attack(w,a,targets.find(b=>enemy(a,b)),idx);
 }else return 'Choose a valid action.';
 if(a['health']<=0)respawn(w,a,idx);a['last']=w['time'];
 if(type!=='move')event(w,a,result.message);
 return result.message;
}
function view(w){
 const strip=a=>{const {'q':q,'visited':visited,'pending':pending,...rest}=a;return rest;};
 return {'version':1,'time':w['time'],'seed':w['seed'],'player':strip(w['player']),'bots':w['bots'].map(strip),'nodes':w['nodes'],'buildings':w['buildings'],'events':w['events'],'generation':w['generation'],'learning':w['learning'],'updates':w['totalUpdates'],'history':w['history']};
}
function valid(w){
 if(!w||typeof w['learning']!=='boolean'||!Array.isArray(w['history'])||w['history'].length>120||!['tick','seed','nextId','generation','nextEvolution','totalUpdates','eventId','nextHistory'].every(k=>Number.isFinite(w[k]))||w['version']!==1||!Number.isFinite(w['time'])||w['time']<0||!Number.isInteger(w['rng'])||!Number.isInteger(w['nextId'])||!Array.isArray(w['bots'])||w['bots'].length>MAX_BOTS||!Array.isArray(w['nodes'])||w['nodes'].length>1100||!Array.isArray(w['buildings'])||w['buildings'].length>1024||!Array.isArray(w['events'])||w['events'].length>100)return false;
 const point=p=>p&&Number.isInteger(p['x'])&&Number.isInteger(p['y'])&&p['x']>=0&&p['x']<SIZE&&p['y']>=0&&p['y']<SIZE;
 const agent=a=>point(a)&&Number.isInteger(a['id'])&&['health','food','wood','ore','age','fitness','epsilon','alpha','gamma','aggression','shield','last','homeX','homeY','generation','updates','gathers','deaths','kills','built','delivered'].every(k=>Number.isFinite(a[k]))&&a['health']>0&&a['health']<=100&&a['food']>=0&&a['wood']>=0&&a['ore']>=0&&a['food']+a['wood']+a['ore']<=30&&a['homeX']>=0&&a['homeX']<SIZE&&a['homeY']>=0&&a['homeY']<SIZE&&a['epsilon']>=0&&a['epsilon']<=1&&a['alpha']>0&&a['alpha']<=1&&Number.isInteger(a['homeX'])&&Number.isInteger(a['homeY'])&&['food','wood','ore'].every(k=>Number.isInteger(a[k]))&&(a['pending']===null||(a['pending']&&['state','choice','reward','health','deaths'].every(k=>Number.isFinite(a['pending'][k]))&&Number.isInteger(a['pending']['state'])&&a['pending']['state']>=0&&a['pending']['state']<STATES&&Number.isInteger(a['pending']['choice'])&&a['pending']['choice']>=0&&a['pending']['choice']<9))&&Array.isArray(a['visited'])&&a['visited'].length<=32;
 if(!agent(w['player'])||w['player']['id']!==0||!w['bots'].every(a=>agent(a)&&a['q'] instanceof Float32Array&&a['q'].length===STATES*9&&a['id']>0&&a['q'].every(n=>Number.isFinite(n)&&Math.abs(n)<=20)))return false;
 if(new Set(w['bots'].map(a=>a['id'])).size!==w['bots'].length)return false;
 if(!w['events'].every(e=>e&&typeof e['text']==='string'&&e['text'].length<1000&&['id','time','actor','x','y'].every(k=>Number.isFinite(e[k])))||!w['history'].every(p=>p&&['time','updates','gathers','depots','generation'].every(k=>Number.isFinite(p[k]))))return false;
 return w['nodes'].every(n=>point(n)&&['food','wood','ore'].includes(n['kind'])&&Number.isInteger(n['stock'])&&n['stock']>=0&&n['stock']<=5&&Number.isFinite(n['interval'])&&n['interval']>0&&Number.isFinite(n['next'])&&Number.isFinite(n['soil'])&&n['soil']>=.45&&n['soil']<=1)&&w['buildings'].every(b=>point(b)&&Number.isFinite(b['expires'])&&Number.isInteger(b['food'])&&b['food']>=0&&b['food']<=12);
}
module.exports={SIZE,DT,MAX_BOTS,STATES,ACTIONS,COLORS,fresh,step,playerAction,setPopulation,view,valid,learn,evolve,index,state,random,region};
