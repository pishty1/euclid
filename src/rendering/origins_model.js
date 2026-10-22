// A bounded, seeded agent ecosystem. No caste or immune-system objective is assigned.
const WIDTH=1000,HEIGHT=700,COLS=64,ROWS=44,DT=0.05,CELL_CAP=320,MICROBE_CAP=650;
const traits=['Speed','Sensing','Engulfment','Sharing','Defence','Adhesion'];
const bounds={'food':[0.2,2],'pressure':[0,2],'mutation':[0,0.3],'defenceCost':[0,2],'sharing':[0,1]};
const defaults={'food':1,'pressure':1,'mutation':0.08,'defenceCost':1,'sharing':0.7};
function settings(values={}){const out={};for(const [key,[min,max]]of Object.entries(bounds)){const n=Number(values[key]);out[key]=Number.isFinite(n)?Math.max(min,Math.min(max,n)):defaults[key];}return out;}
function random(world){let n=world.rng+=0x6D2B79F5;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);world.rng>>>=0;return ((n^(n>>>14))>>>0)/4294967296;}
function wrap(n,size){return (n%size+size)%size;}
function delta(a,b,size){let d=b-a;if(d>size/2)d-=size;if(d<-size/2)d+=size;return d;}
function index(x,y){return (Math.floor(wrap(y,HEIGHT)/HEIGHT*ROWS)*COLS+Math.floor(wrap(x,WIDTH)/WIDTH*COLS));}
function sample(field,x,y){return field[index(x,y)];}
function genes(world){return Float32Array.from({length:6},()=>0.15+random(world)*0.7);}
function brain(world){const b=Float32Array.from({length:32},()=>(random(world)-0.5)*0.8);b[0]+=1.2;b[9]+=1.2;return b;}
function cell(world,x,y,lineage,gene,network,parent=null){return {id:world.nextId++,x:wrap(x,WIDTH),y:wrap(y,HEIGHT),vx:0,vy:0,energy:0.95+random(world)*0.3,age:parent?0:random(world)*35,lineage,genes:gene,brain:network,parent:parent?parent.id:null,generation:parent?parent.generation+1:0,births:0,engulfed:0,shared:0,hurt:0,damageFlash:0,signal:0};}
function microbe(world,x=random(world)*WIDTH,y=random(world)*HEIGHT){return {id:world.nextId++,x,y,angle:random(world)*Math.PI*2,energy:0.25+random(world)*0.15,age:0,alive:true};}
function create(seed=42,values={},control='evolving'){
 const world={seed:Number(seed)>>>0,rng:Number(seed)>>>0,config:settings(values),initial:settings(values),control,step:0,time:0,nextId:1,cells:[],microbes:[],food:new Float32Array(COLS*ROWS),capacity:new Float32Array(COLS*ROWS),signal:new Float32Array(COLS*ROWS),scratch:new Float32Array(COLS*ROWS),effects:[],links:[],history:[],events:[],lineages:[],births:0,deaths:0,engulfed:0,microbeBirths:0,clusterCount:0};
 if(control==='fixed')world.config['mutation']=0;
 if(control==='no-cost')world.config['defenceCost']=0;
 if(control==='no-microbes')world.config['pressure']=0;
 world.initial={...world.config};
 const phase=random(world)*6.28;
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  const value=0.45+0.25*Math.sin(x*0.13+phase)*Math.cos(y*0.17)+0.15*Math.cos(x*0.31-y*0.22);
  world.capacity[y*COLS+x]=value;world.food[y*COLS+x]=value;
 }
 for(let family=0;family<12;family++){
  const base=genes(world),net=brain(world),cx=70+random(world)*(WIDTH-140),cy=70+random(world)*(HEIGHT-140);
  world.lineages.push({id:family,born:10,births:0,deaths:0});
  for(let n=0;n<10;n++)world.cells.push(cell(world,cx+(random(world)-0.5)*150,cy+(random(world)-0.5)*150,family,new Float32Array(base),new Float32Array(net)));
 }
 // Draw the same initial random sequence for every control condition.
 for(let n=0;n<260;n++)world.microbes.push(microbe(world));
 if(control==='no-microbes')world.microbes=[];
 world.initialTraits=[...record(world)['traits']];return world;
}
function mutate(world,source,neural=false){
 const out=new Float32Array(source),rate=world.config['mutation'];
 if(rate<=0)return out;
 for(let i=0;i<out.length;i++)if(random(world)<rate){out[i]=Math.max(neural?-2:0,Math.min(neural?2:1,out[i]+(random(world)-random(world))*(neural?0.5:0.18)));}
 return out;
}
function reproduce(world,parent){
 if(world.cells.length>=CELL_CAP||parent.energy<1.8)return null;
 const angle=random(world)*Math.PI*2;
 const child=cell(world,parent.x+Math.cos(angle)*10,parent.y+Math.sin(angle)*10,parent.lineage,mutate(world,parent.genes),mutate(world,parent.brain,true),parent);
 parent.energy=(parent.energy-0.16)*0.5;child.energy=parent.energy;
 parent.births++;world.births++;world.lineages[parent.lineage].births++;
 world.effects.push({kind:'birth',x:parent.x,y:parent.y,age:0,lineage:parent.lineage});return child;
}
function cost(g,config,speed=1){return 0.04+0.016*g[0]*g[0]*speed+0.045*g[4]*config['defenceCost']+0.008*g[1]+0.005*g[5];}
function hash(agents,size=48){const cols=Math.ceil(WIDTH/size),rows=Math.ceil(HEIGHT/size),buckets=Array.from({length:cols*rows},()=>[]);for(const a of agents)buckets[Math.floor(a.y/HEIGHT*rows)*cols+Math.floor(a.x/WIDTH*cols)].push(a);return {cols,rows,buckets};}
function nearby(grid,x,y){const result=[],cx=Math.floor(x/WIDTH*grid.cols),cy=Math.floor(y/HEIGHT*grid.rows);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)result.push(...grid.buckets[wrap(cy+dy,grid.rows)*grid.cols+wrap(cx+dx,grid.cols)]);return result;}
function diffuse(world){
 const food=world.food,signal=world.signal,out=world.scratch,dt=DT;
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  const i=y*COLS+x,neighbors=[y*COLS+wrap(x-1,COLS),y*COLS+wrap(x+1,COLS),wrap(y-1,ROWS)*COLS+x,wrap(y+1,ROWS)*COLS+x];
  let avg=0;for(const j of neighbors)avg+=food[j]*0.25;
  out[i]=Math.max(0,Math.min(1,food[i]+(avg-food[i])*0.08+0.055*world.config['food']*(world.capacity[i]-food[i])*dt));
 }
 world.food=out;world.scratch=food;
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  const i=y*COLS+x,avg=(signal[y*COLS+wrap(x-1,COLS)]+signal[y*COLS+wrap(x+1,COLS)]+signal[wrap(y-1,ROWS)*COLS+x]+signal[wrap(y+1,ROWS)*COLS+x])*0.25;
  world.scratch[i]=Math.max(0,signal[i]+0.22*(avg-signal[i])-signal[i]*0.5*dt);
 }
 const old=world.signal;world.signal=world.scratch;world.scratch=old;
}
function change(world,key,value,log=true){if(!Object.hasOwn(bounds,key))return;world.config=settings({...world.config,[key]:value});if(log)world.events.push({'step':world.step,'type':'rule','key':key,'value':world.config[key]});}
function intervene(world,tool,x,y,log=true){
 x=wrap(x,WIDTH);y=wrap(y,HEIGHT);
 if(log)world.events.push({'step':world.step,'type':tool,'x':x,'y':y});
 if(tool==='food')for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=index(x+dx*WIDTH/COLS,y+dy*HEIGHT/ROWS);world.food[i]=Math.min(1,world.food[i]+0.5);}
 if(tool==='microbes')for(let n=0;n<24&&world.microbes.length<MICROBE_CAP;n++)world.microbes.push(microbe(world,wrap(x+(random(world)-0.5)*50,WIDTH),wrap(y+(random(world)-0.5)*50,HEIGHT)));
}
function applyEvents(world,replayEvents,log=false){
 if(replayEvents)for(const event of replayEvents)if(event['step']===world.step){if(event['type']==='rule')change(world,event['key'],event['value'],log);else intervene(world,event['type'],event['x'],event['y'],log);}
}
function step(world,replayEvents=null){
 applyEvents(world,replayEvents,true);
 diffuse(world);const dt=DT,grid=hash(world.cells),microGrid=hash(world.microbes);world.links=[];
 const births=[],dead=new Set();
 for(const c of world.cells){
  c.damageFlash=Math.max(0,c.damageFlash-dt);
  const g=c.genes,range=25+g[1]*18;
  const fx=(sample(world.food,c.x+16,c.y)-sample(world.food,c.x-16,c.y))*5,fy=(sample(world.food,c.x,c.y+16)-sample(world.food,c.x,c.y-16))*5;
  let mx=0,my=0,kx=0,ky=0,contacts=0,neighbors=nearby(grid,c.x,c.y);
  for(const other of neighbors){
   if(other.id===c.id)continue;const dx=delta(c.x,other.x,WIDTH),dy=delta(c.y,other.y,HEIGHT),d=Math.hypot(dx,dy);
   if(d<11&&d>0.001){c.vx-=dx/d*(11-d)*0.3;c.vy-=dy/d*(11-d)*0.3;}
   if(other.lineage===c.lineage && d<range){contacts++;kx+=dx/range;ky+=dy/range;
    if(d<20&&c.id<other.id){
     const transfer=(c.energy-other.energy)*Math.min(g[3],other.genes[3])*world.config['sharing']*0.3*dt;
     c.energy-=transfer;other.energy+=transfer;c.shared+=Math.abs(transfer);other.shared+=Math.abs(transfer);
     if(Math.abs(transfer)>0.00004)world.links.push({a:c.id,b:other.id,amount:Math.abs(transfer)});
    }
   }
  }
  const microbes=nearby(microGrid,c.x,c.y);
  for(const m of microbes){if(!m.alive)continue;const dx=delta(c.x,m.x,WIDTH),dy=delta(c.y,m.y,HEIGHT),d=Math.hypot(dx,dy);
   if(d<range){mx+=dx/Math.max(4,d)*0.2;my+=dy/Math.max(4,d)*0.2;}
  }
  const sx=(sample(world.signal,c.x+16,c.y)-sample(world.signal,c.x-16,c.y))*2,sy=(sample(world.signal,c.x,c.y+16)-sample(world.signal,c.x,c.y-16))*2;
  const input=[fx,fy,mx+sx,my+sy,kx/Math.max(1,contacts),ky/Math.max(1,contacts),c.energy-1,1],output=[];
  for(let n=0;n<4;n++){let sum=0;for(let i=0;i<8;i++)sum+=input[i]*c.brain[n*8+i];output.push(Math.tanh(sum));}
  const jitter=(random(world)-0.5)*2;
  c.vx=c.vx*0.86+(output[0]*(0.5+g[1])+jitter*0.35+kx*g[5]*0.08)*2;
  c.vy=c.vy*0.86+(output[1]*(0.5+g[1])+Math.sin(c.age+c.id)*0.25+ky*g[5]*0.08)*2;
  const velocity=Math.hypot(c.vx,c.vy),maxSpeed=6+g[0]*22;
  if(velocity>maxSpeed){c.vx*=maxSpeed/velocity;c.vy*=maxSpeed/velocity;}
  c.x=wrap(c.x+c.vx*dt,WIDTH);c.y=wrap(c.y+c.vy*dt,HEIGHT);
  const i=index(c.x,c.y),uptake=Math.min(world.food[i],world.food[i]*(0.32+g[2]*0.16)*dt);
  world.food[i]=Math.max(0,world.food[i]-uptake*2);c.energy+=uptake;
  c.energy-=cost(g,world.config,Math.hypot(c.vx,c.vy)/maxSpeed)*dt;
  c.signal=Math.max(0,output[3])*(Math.abs(mx)+Math.abs(my));
  world.signal[i]=Math.min(1,world.signal[i]+c.signal*dt*0.3);c.energy-=c.signal*0.01*dt;
  for(const m of microbes){if(!m.alive)continue;const d=Math.hypot(delta(c.x,m.x,WIDTH),delta(c.y,m.y,HEIGHT));
   if(d<8){
    const phagocytosis=(0.4+g[2]*1.6)*(0.5+output[2]*0.5);
    if(random(world)<phagocytosis*dt){m.alive=false;c.energy+=0.21+g[2]*0.15;c.energy-=0.06;c.engulfed++;world.engulfed++;world.effects.push({kind:'engulf',x:c.x,y:c.y,age:0,lineage:c.lineage});}
    else{const damage=0.22*world.config['pressure']*(1-0.82*g[4])*dt;c.energy-=damage;c.hurt+=damage;if(damage>0)c.damageFlash=.6;world.signal[i]=Math.min(1,world.signal[i]+damage*2);}
   }
  }
  c.energy=Math.min(2.4,c.energy);c.age+=dt;
  if(c.energy<=0||c.age>110){dead.add(c.id);world.deaths++;world.lineages[c.lineage].deaths++;world.effects.push({kind:'death',x:c.x,y:c.y,age:0,lineage:c.lineage});}
  else if(world.cells.length+births.length<CELL_CAP){const child=reproduce(world,c);if(child)births.push(child);}
 }
 world.cells=world.cells.filter(c=>!dead.has(c.id)).concat(births);
 const microBirths=[];
 for(const m of world.microbes){if(!m.alive)continue;const dx=sample(world.food,m.x+14,m.y)-sample(world.food,m.x-14,m.y),dy=sample(world.food,m.x,m.y+14)-sample(world.food,m.x,m.y-14);
  m.angle+=(random(world)-0.5)*0.5;m.x=wrap(m.x+(Math.cos(m.angle)*9+dx*25)*dt,WIDTH);m.y=wrap(m.y+(Math.sin(m.angle)*9+dy*25)*dt,HEIGHT);
  const i=index(m.x,m.y),meal=Math.min(world.food[i],world.food[i]*0.13*dt);world.food[i]=Math.max(0,world.food[i]-meal*1.5);m.energy+=meal-0.015*dt;m.age+=dt;
  if(m.energy>0.55 && world.microbes.length+microBirths.length<MICROBE_CAP){m.energy*=0.45;const child=microbe(world,wrap(m.x+4,WIDTH),wrap(m.y+4,HEIGHT));child.energy=m.energy;microBirths.push(child);world.microbeBirths++;}
  if(m.energy<=0||m.age>95)m.alive=false;
 }
 world.microbes=world.microbes.filter(m=>m.alive).concat(microBirths);
 world.effects=world.effects.filter(e=>(e.age+=dt)<1.2).slice(-120);
 world.step++;world.time=world.step*DT;
 if(world.step%20===0)record(world);
 return world;
}
function record(world){
 const mean=new Array(6).fill(0);let generation=0,energy=0;
 for(const c of world.cells){c.genes.forEach((g,i)=>mean[i]+=g);generation=Math.max(generation,c.generation);energy+=c.energy;}
 for(let i=0;i<6;i++)mean[i]/=Math.max(1,world.cells.length);
 const metrics={'time':world.time,'cells':world.cells.length,'microbes':world.microbes.length,'traits':world.cells.length?mean:null,'generation':generation,'births':world.births,'deaths':world.deaths,'engulfed':world.engulfed,'energy':world.cells.length?energy/world.cells.length:null};
 world.history.push(metrics);if(world.history.length>600)world.history.shift();return metrics;
}
function clusters(world){
 const grid=hash(world.cells),visited=new Set(),groups=[];
 for(const first of world.cells){if(visited.has(first.id))continue;const stack=[first],members=[];visited.add(first.id);
  while(stack.length){const c=stack.pop();members.push(c);for(const n of nearby(grid,c.x,c.y))if(n.lineage===c.lineage&&!visited.has(n.id)&&Math.hypot(delta(c.x,n.x,WIDTH),delta(c.y,n.y,HEIGHT))<22){visited.add(n.id);stack.push(n);}}
  if(members.length>=3)groups.push(members);
 }
 return groups;
}
function historyWindow(history,comparison=[]){
 const start=history[0]?.['time']??0,end=Math.max(start+1,history.at(-1)?.['time']??start);
 const visible=data=>data.filter(point=>point['time']>=start&&point['time']<=end);
 return {start,end,current:visible(history),previous:visible(comparison)};
}
function exportData(world){return {'version':1,'model':'Cellular Origins v2','seed':world.seed,'control':world.control,'initialRules':world.initial,'currentRules':world.config,'initialTraits':[...world.initialTraits],'steps':world.step,'events':world.events.map(e=>({...e})),'history':world.history.map(h=>({...h,'traits':h['traits']?[...h['traits']]:null})),'lineages':world.lineages.map(l=>({'id':l.id,'births':l.births,'deaths':l.deaths,'survivors':world.cells.filter(c=>c.lineage===l.id).length}))};}
module.exports={WIDTH,HEIGHT,COLS,ROWS,DT,CELL_CAP,MICROBE_CAP,traits,bounds,defaults,settings,create,random,step,applyEvents,change,intervene,cost,reproduce,mutate,clusters,historyWindow,exportData,delta};
