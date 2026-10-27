// Appended to the model by scripts/generate-figget-worker.mjs.
let world=null,paused=true,clock=null,last=0,pending=0,lastView=0,stepMs=0,run=0;
function publish(message=''){
 self.postMessage({'type':'view','run':run,'view':engine.view(world),'message':message,'stepMs':stepMs});lastView=performance.now();
}
function checkpoint(){self.postMessage({'type':'save','run':run,'world':world});}
self.onmessage=function(event){
 const data=event.data;
 if(data['type']==='init'||data['type']==='reset'){
  run=data['run'];world=engine.valid(data['world'])?data['world']:engine.fresh(data['seed'],data['count']);
  paused=!!data['paused'];pending=0;last=performance.now();publish();checkpoint();
  if(!clock)clock=setInterval(()=>{
   if(!world)return;const now=performance.now(),delta=now-last;last=now;
   if(paused||delta>1000){pending=0;return;}
   pending+=Math.max(0,delta)/1000;let steps=0;
   while(pending>=engine.DT&&steps<4){const start=performance.now();engine.step(world);stepMs=stepMs*.9+(performance.now()-start)*.1;pending-=engine.DT;steps++;}
   if(steps&&now-lastView>=400)publish();
  },50);
  return;
 }
 if(!world||data['run']!==run)return;
 if(data['type']==='pause'){paused=!!data['value'];pending=0;last=performance.now();publish();if(paused)checkpoint();}
 else if(data['type']==='action'&&!paused)publish(engine.playerAction(world,data['action']));
 else if(data['type']==='population'){engine.setPopulation(world,data['count']);publish();}
 else if(data['type']==='learning'){world['learning']=!!data['value'];for(const a of world['bots'])a['pending']=null;publish();}
 else if(data['type']==='save')checkpoint();
};
