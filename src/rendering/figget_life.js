const model=require('./figget_life_model.js');
const workerSource=require('./figget_worker_source.js');
let active=null,closing=Promise.resolve();
const DB='figget-life-v1',KEY='world-v2';
const names={'forage':'seeking food','harvest':'harvesting timber','mine':'mining ore','build':'building','supply':'supplying a depot','raid':'hunting a rival','recover':'recovering','explore':'exploring','home':'returning home','manage':'managing stores and repairs'};
const colors={'food':'#e8c780','wood':'#94d3a0','ore':'#aaa7e8'};
const css=`
.fl-root{position:absolute;inset:0;z-index:2;color:#e3eee3;font:12px/1.5 system-ui,-apple-system,sans-serif;pointer-events:none}.fl-root *{box-sizing:border-box}.fl-root>canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;touch-action:none}.fl-root button,.fl-root select,.fl-root input{font:inherit}.fl-root button,.fl-root select{min-height:38px;padding:7px 11px;border:1px solid #acc6ab38;border-radius:9px;color:#dfeadc;background:#18332fec;cursor:pointer;touch-action:manipulation}.fl-root button:hover{border-color:#c6dc9a88}.fl-root :focus-visible{outline:2px solid #edce82;outline-offset:2px}.fl-root button:disabled{opacity:.4;cursor:default}.fl-root [hidden]{display:none!important}.fl-top{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));display:flex;gap:6px;pointer-events:auto}.fl-status{position:absolute;top:calc(max(12px,env(safe-area-inset-top)) + 56px);left:18px;font:11px/1.7 monospace;white-space:pre-line;color:#a9c8bc;text-shadow:0 2px 5px #031a17}.fl-status strong{color:#f3ddb0}.fl-title{position:absolute;left:18px;top:calc(max(12px,env(safe-area-inset-top)) + 108px);color:#8bafa0;font:9px monospace;letter-spacing:.18em}.fl-title b{display:block;font:400 28px Georgia,serif;letter-spacing:-.025em;color:#dfe9d6;margin-top:4px}.fl-dock{position:absolute;left:max(12px,env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));width:min(390px,calc(100% - 24px));max-height:40%;overflow:auto;overscroll-behavior:contain;pointer-events:auto;border:1px solid #a1be9e40;border-radius:15px;padding:12px;background:#0b2424ec;backdrop-filter:blur(12px)}.fl-dock p{margin:0 0 7px}.fl-message{color:#ead3a1;min-height:18px}.fl-controls{display:flex;gap:5px;flex-wrap:wrap}.fl-controls button{font-size:11px;min-height:36px;padding:6px 9px}.fl-directions{float:right;display:grid;grid-template-columns:repeat(3,36px);gap:4px;margin-left:10px;margin-bottom:8px}.fl-directions button{padding:4px}.fl-inventory{clear:both;margin-top:8px}.fl-inventory summary{cursor:pointer;color:#d5d9b5}.fl-inventory select{margin:6px 0;max-width:130px}.fl-caption{clear:both;color:#8dada0;font:9px/1.5 monospace;margin-top:8px!important;margin-bottom:0!important}.fl-panel{position:absolute;z-index:3;right:max(12px,env(safe-area-inset-right));top:calc(max(12px,env(safe-area-inset-top)) + 53px);width:min(355px,calc(100% - 24px));max-height:calc(100% - 78px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;padding:16px;border:1px solid #abc19b3d;border-radius:15px;background:#102a27f8;pointer-events:auto;box-shadow:0 18px 60px #0005}.fl-panel h2{font:26px Georgia,serif;margin:8px 0}.fl-panel p{font-size:11px;color:#afc5b5}.fl-tabs{position:sticky;top:-16px;background:#102a27;display:flex;gap:4px;padding:8px 0;z-index:1}.fl-tabs button{padding:6px 9px;font-size:11px}.fl-tabs button[aria-pressed=true]{border-color:#e2c88b;color:#ead6a1}.fl-item{display:block;text-align:left;width:100%;margin:5px 0}.fl-item small{display:block;font:10px/1.6 monospace;color:#9ab6a3}.fl-panel label{display:block;margin:14px 0;color:#cfddc7}.fl-panel select{display:block;margin-top:6px;width:100%}.fl-panel input[type=checkbox]{accent-color:#e2c88b;width:18px;height:18px;vertical-align:middle}.fl-panel .fl-chart{width:100%;height:72px;background:#071e1c;border:1px solid #a1ba9626;border-radius:8px}.fl-alert{color:#edba87!important}.fl-inspect{border-left:2px solid #c8d798;padding-left:10px;margin-bottom:12px}.fl-bar{height:4px;background:#28433b;margin:5px 0}.fl-bar i{display:block;height:100%;background:#d3d88c}.fl-loading{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font:26px Georgia,serif;color:#d7dec8;max-width:80%;text-align:center}
@media(max-width:600px){.fl-top{top:calc(max(12px,env(safe-area-inset-top)) + 54px)}.fl-top button{font-size:11px;padding:6px 9px}.fl-status{top:calc(max(12px,env(safe-area-inset-top)) + 101px);font-size:10px;left:14px}.fl-title{display:none}.fl-panel{top:calc(max(12px,env(safe-area-inset-top)) + 103px);max-height:calc(100% - 125px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}.fl-dock{left:8px;bottom:calc(8px + env(safe-area-inset-bottom));width:calc(100% - 16px);padding:10px;font-size:11px;max-height:35%}.fl-directions{grid-template-columns:repeat(3,34px);gap:4px}.fl-directions button{min-height:34px}.fl-controls button{font-size:10px;min-height:34px}.fl-caption{font-size:8px}.fl-message{min-height:16px}}
`;
function el(tag,text,parent){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(parent)parent.appendChild(n);return n;}
function button(text,parent,fn){const n=el('button',text,parent);n.type='button';n.addEventListener('click',fn);return n;}
function botName(a){return a['id']===0?'You':`Bot ${a['id']} · G${a['generation']}`;}
function colour(a){return a['id']===0?'#f6ebbc':model.COLORS[(a['lineage']-1)%8];}
function age(time,now){const s=Math.max(0,Math.floor(now-time));return s<60?s+'s ago':Math.floor(s/60)+'m ago';}
function openDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('IndexedDB unavailable'));return;}const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore('saves');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Storage is blocked'));});}
async function load(a){try{await closing;if(a.disposed)return null;a.db=await openDB();return await new Promise((resolve,reject)=>{const tx=a.db.transaction('saves'),store=tx.objectStore('saves'),req=store.get(KEY),legacy=store.get('world'),settings=store.get('settings-v2');settings.onsuccess=()=>{if(typeof settings.result?.['auto']==='boolean')a.auto=settings.result['auto'];};tx.oncomplete=()=>resolve(req.result||legacy.result||null);tx.onerror=()=>reject(tx.error);});}catch(_){a.saveStatus='Storage unavailable · this session only';return null;}}
function saveSettings(a){if(a.db)try{a.db.transaction('saves','readwrite').objectStore('saves').put({'auto':a.auto},'settings-v2');}catch(_){}}
function persist(a,w){
 if(a.disposed)return;a.saved=w;if(!a.db)return;
 try{const tx=a.db.transaction('saves','readwrite');tx.objectStore('saves').put(w,KEY);tx.oncomplete=()=>{if(!a.disposed){a.saveStatus='Saved on this device';a.lastSaved=Date.now();}};tx.onerror=()=>{a.saveStatus='Save failed · keep this tab open';};}catch(_){a.saveStatus='Save failed · keep this tab open';}
}
function send(a,data){
 if(a.disposed||!a.started)return;data['run']=a.run;
 if(a.worker){a.worker.postMessage(data);return;}
 if(data['type']==='pause'){a.suspended=!!data['value'];a.pendingTime=0;a.lastFrame=null;if(a.suspended)persist(a,structuredClone(a.local));}
 else if(data['type']==='action'&&!a.suspended){a.message.textContent=model.playerAction(a.local,data['action']);snapshot(a,model.view(a.local));}
 else if(data['type']==='population'){model.setPopulation(a.local,data['count']);snapshot(a,model.view(a.local));}
 else if(data['type']==='pressure'){model.setPressure(a.local,data['value']);snapshot(a,model.view(a.local));}
 else if(data['type']==='evolution'){a.local['evolution']=!!data['value'];snapshot(a,model.view(a.local));}
 else if(data['type']==='learning'){a.local['learning']=!!data['value'];for(const b of a.local['bots'])b['pending']=null;snapshot(a,model.view(a.local));}
 else if(data['type']==='save')persist(a,structuredClone(a.local));
}
function suspend(a){const stopped=a.paused||a.menu||document.hidden;a.suspended=stopped;if(a.started)send(a,{'type':'pause','value':stopped});a.pause.textContent=a.paused?'Resume':'Pause';}
function action(a,type,extra={}){const now=performance.now();if(a.paused||a.menu||document.hidden||!a.view)return;if(now<a.nextAction){a.message.textContent='Ready in a moment…';return;}a.nextAction=now+(type==='move'?500:1000);a.follow=true;send(a,{'type':'action','action':Object.assign({'type':type},extra)});}
function target(a){return a.selected||{'x':a.view['player']['x'],'y':a.view['player']['y']};}
function locate(a,p){a.inspectId=p['id']??p['actor']??null;a.camera={'x':p['x'],'y':p['y']};a.selected={'x':p['x'],'y':p['y']};a.follow=false;a.overview=false;a.panel.hidden=true;sync(a);}
function snapshot(a,v){
 if(a.disposed)return;a.previous=a.view;a.received=performance.now();a.view=v;
 if(a.follow)a.camera={'x':v['player']['x'],'y':v['player']['y']};
 a.loading.hidden=true;a.dock.hidden=false;
 sync(a);if(!a.panel.hidden&&a.tab!=='rules'&&performance.now()-a.lastPanel>1000)renderPanel(a);
}
function start(a,saved){
 if(a.disposed)return;
 const hadSave=!!saved;saved=model.restore(saved);
 const valid=!!saved;if(hadSave&&!valid)a.message.textContent='The saved world was invalid. Starting a new local world; older solo saves are unchanged.';
 if(valid&&saved['migratedFrom']===1)a.message.textContent='Your world is preserved. Inventory tools and updated learning rules are ready.';
 const count=valid?saved['bots'].length:a.initialCount;
 a.started=true;a.targetCount=count;a.saved=valid?saved:null;
 try{
  if(typeof Worker==='undefined')throw new Error('No workers');
  const url=URL.createObjectURL(new Blob([workerSource],{'type':'application/javascript'}));a.worker=new Worker(url);URL.revokeObjectURL(url);
  a.worker.onmessage=event=>{const d=event.data;if(a.disposed||d['run']!==a.run)return;
   if(d['type']==='view'){a.stepMs=d['stepMs'];if(d['message'])a.message.textContent=d['message'];snapshot(a,d['view']);}
   else if(d['type']==='save')persist(a,d['world']);
  };
  a.worker.onerror=event=>{event.preventDefault();if(!a.disposed)fallback(a,a.saved,'Worker unavailable · local fallback kept your world and recovered the latest checkpoint.');};
  a.worker.postMessage({'type':'init','run':a.run,'world':valid?saved:null,'seed':42,'count':count,'paused':a.paused||a.menu||document.hidden});
 }catch(_){fallback(a,valid?saved:null,'Worker unavailable · local fallback kept the world. Larger populations may run slowly.');}
}
function fallback(a,saved,message){
 if(a.worker){a.worker.terminate();a.worker=null;}a.local=model.restore(saved)?structuredClone(model.restore(saved)):model.fresh(42,a.initialCount);
 a.targetCount=a.local['bots'].length;a.suspended=a.paused||a.menu||document.hidden;a.pendingTime=0;a.lastFrame=null;a.message.textContent=message;snapshot(a,model.view(a.local));
}
function sync(a){
 if(!a.view)return;const v=a.view,p=v['player'],t=target(a),near=Math.abs(p['x']-t['x'])+Math.abs(p['y']-t['y'])<=1;
 const n=v['nodes'].find(n=>n['x']===t['x']&&n['y']===t['y']),b=v['buildings'].find(b=>b['x']===t['x']&&b['y']===t['y']),actors=v['bots'].filter(b=>b['x']===t['x']&&b['y']===t['y']);a.inspected=v['bots'].find(b=>b['id']===a.inspectId)||actors[0]||null;
 a.status.textContent=`${v['bots'].length} RIVALS · GENERATION ${v['generation']} · ${Math.floor(v['time']/60)}m ${Math.floor(v['time']%60)}s\nHealth ${Math.ceil(p['health'])} · Wood ${p['wood']} / Food ${p['food']} / Ore ${p['ore']} · Shots ${p['charges']}${a.paused?' · PAUSED':''}`;
 a.tile.textContent=`${t['x']}, ${t['y']} · ${n?`${n['kind']} ${n['stock']}/${n['capacity']}`:b?`Depot · F${b['food']} W${b['wood']} O${b['ore']} · ${b['expires']-v['time']<60?Math.max(0,Math.ceil(b['expires']-v['time']))+'s':Math.ceil((b['expires']-v['time'])/60)+'m'} left · ${b['owner']===0?'your building':b['owner']>0?'built by Bot '+b['owner']:'earlier Bot '+(-b['owner']-1)}`:'Open ground'}${actors.length?' · '+actors.map(botName).join(', '):''}`;
 const stopped=a.paused||a.menu;
 for(const button of a.actionButtons)button.disabled=stopped;
 a.gather.disabled=stopped||!near||!n||!n['stock'];a.supply.disabled=stopped||!near||!b;a.attack.disabled=stopped||!near||!actors.length;a.eat.disabled=stopped||!model.canEat(v,p,model.index(v));
 a.repair.disabled=stopped||!near||!b||p['wood']<1||(b['expires']-v['time']>240);a.store.disabled=a.take.disabled=stopped||!near||!b;a.discard.disabled=stopped;
 a.walk.disabled=stopped||(p['x']===t['x']&&p['y']===t['y']);
 a.pause.textContent=a.paused?'Resume':'Pause';a.pause.setAttribute('aria-pressed',String(a.paused));a.panelButton.setAttribute('aria-expanded',String(!a.panel.hidden));
}
function renderPanel(a){
 if(!a.view)return;a.lastPanel=performance.now();const content=a.content,v=a.view,scroll=a.panel.scrollTop;content.replaceChildren();
 if(a.tab==='activity'){
  el('h2','The living frontier',content);el('p',`${v['updates'].toLocaleString()} learning updates · ${v['stats']['services']} shared meals · ${v['stats']['meals']?Math.round(v['stats']['healing']/v['stats']['meals']):0}/30 average healing · ${a.saveStatus}`,content);
  if(a.inspected){const b=a.inspected,box=el('div',null,content);box.className='fl-inspect';el('strong',botName(b),box);el('p',`${names[b['intent']]} · ${Math.ceil(b['health'])} health · ${b['updates']} learned transitions · ${b['gathers']} gathered · ${b['delivered']} deliveries · ${b['kills']} kills / ${b['deaths']} deaths`,box);}
  el('p','Select an event to visit its location. Latest 100 events; the world pauses when you leave this sketch.',content);
  for(const e of [...v['events']].reverse()){
   const b=button(`${e['actor']===0?'You':'Bot '+e['actor']} · ${e['text']}`,content,()=>locate(a,e));b.className='fl-item';el('small',`${age(e['time'],v['time'])} · ${e['x']}, ${e['y']}`,b);
  }
 }else if(a.tab==='bots'){
  el('h2','Rival lineages',content);el('p','Each bot learns independently. Colour identifies its lineage; descendants can cooperate through public depots and avoid attacking their own lineage.',content);
  const groups=new Map();for(const b of v['bots'])groups.set(b['lineage'],(groups.get(b['lineage'])||0)+1);
  for(const [lineage,n]of groups){const row=el('p',`● Lineage ${lineage} · ${n} bots`,content);row.style.color=model.COLORS[(lineage-1)%8];}
  const sorted=[...v['bots']].sort((b,c)=>c['fitness']-b['fitness']);
  for(const b of sorted.slice(0,80)){const n=button(`${botName(b)} · ${names[b['intent']]}`,content,()=>locate(a,b));n.className='fl-item';n.style.borderLeftColor=colour(b);n.style.borderLeftWidth='3px';el('small',`${b['x']}, ${b['y']} · fitness ${b['fitness'].toFixed(1)} · ${b['updates']} updates · ${b['gathers']} gathered`,n);}
  if(sorted.length>80)el('p','Showing the top 80 learners. All bots remain visible on the map.',content);
 }else{
  el('h2','Shape the world',content);
  const label=el('label','Rival population',content),select=el('select',null,label);select.setAttribute('aria-label','Rival population');
  for(const value of ['32','64','128','256','512']){const n=el('option',value,select);n.value=value;}select.value=String(a.targetCount);
  select.addEventListener('change',()=>{a.targetCount=Number(select.value);send(a,{'type':'population','count':a.targetCount});});
  el('p','Population changes are your choice. Resource capacity scales with the population; performance adjustments keep every bot and its learned policy.',content);
  const pressureLabel=el('label','Resource pressure',content),pressure=el('select',null,pressureLabel);pressure.setAttribute('aria-label','Resource pressure');for(const [value,text]of [['0.75','Abundant'],['1','Balanced'],['1.5','Scarce']]){const o=el('option',text,pressure);o.value=value;}pressure.value=String(v['pressure']);pressure.addEventListener('change',()=>send(a,{'type':'pressure','value':Number(pressure.value)}));
  for(const [key,title]of [['learning','Learning'],['evolution','Evolution']]){const label=el('label',null,content),check=el('input',null,label);check.type='checkbox';check.checked=v[key];check.setAttribute('aria-label',title);el('span',' '+title,label);check.addEventListener('change',()=>send(a,{'type':key,'value':check.checked}));}
  const adaptiveLabel=el('label',null,content),adaptive=el('input',null,adaptiveLabel);adaptive.type='checkbox';adaptive.checked=a.auto;adaptive.setAttribute('aria-label','Adaptive rendering');el('span',' Adaptive rendering',adaptiveLabel);adaptive.addEventListener('change',()=>{a.auto=adaptive.checked;saveSettings(a);});
  el('p',`${a.worker?'Worker simulation':'Main-thread fallback'} · ${a.stepMs.toFixed(1)}ms/step. Adaptive rendering reduces drawing frequency when necessary, without retiring bots.`,content);
  for(const text of ['Move with arrows/WASD or the direction pad. Movement takes half a second; work and attacks take one second. Select a tile, then Walk towards to take one step. Your pack holds 30 units.', 'Open Inventory to store or take any material at a public depot, or discard five unwanted items to free space. A depot costs 6 wood + 1 ore. Supply adds food; Repair spends 1 timber to add four minutes, even when all stores are full. Repair is available when four minutes or less remain.', 'Food heals 30. Eat when missing at least 25 health, or 10 with a vulnerable rival nearby. Suppliers gain credit for useful meals others actually eat, not for filling unused stores. Health slowly drains over time, including in sanctuary. Pause when away. Mining costs 8 health.', 'One ore loads three shots; each shot deals 20 damage. Attacks take one second for you and bots. Movement remains quicker for you. Kills loot up to two of each carried item, within pack space. Death loses all carried ore and loaded shots, plus half your food and wood; sanctuary and respawn protection prevent attacks.', 'Rich and poor regions differ in density and regrowth. Resource capacity scales with the population. Resource pressure lets you choose scarcity independently of your device performance.', 'Each bot uses 576 local observations and ten behaviour choices. Pack capacity, ore and timber availability affect its observations. Unavailable actions are masked. Decisions value useful supplies, health, actual public meals and maintaining working depots. Stored food grants credit to its original supplier only when used.', 'Every three simulated minutes, mature low-performing bots can be replaced by resource-funded descendants of successful parents. Parents provide the child’s materials and consume food for reproduction. Children have unique identities; old depots remain public monuments to their original builders. Learning and evolution can be controlled separately.', 'World and policy saves stay on this device. Earlier worlds are migrated with inventories, buildings and learned preferences preserved; the original save is kept. Hidden tabs and menus pause time. No server or WordPress plugin is used.'])el('p',text,content);
  const chart=el('canvas',null,content);chart.className='fl-chart';chart.width=300;chart.height=72;const ctx=chart.getContext('2d'),history=v['history'];if(history.length>1){const max=Math.max(1,...history.map(p=>p['healing']||0));ctx.strokeStyle='#d5d496';ctx.beginPath();history.forEach((p,i)=>{const x=i/(history.length-1)*300,y=65-(p['healing']||0)/max*60;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();}el('p','Useful healing over the last 20 simulated minutes.',content);
  const reset=button('New local world',content,()=>{const was=a.paused;a.paused=true;suspend(a);if(window.confirm('Replace this local world and its learned bot population? Earlier solo saves are kept.')){a.run++;a.view=null;a.selected=null;a.follow=true;a.paused=was;
   if(a.worker)a.worker.postMessage({'type':'reset','run':a.run,'seed':42,'count':a.targetCount,'paused':a.paused||a.menu||document.hidden});else{a.local=model.fresh(42,a.targetCount);snapshot(a,model.view(a.local));persist(a,structuredClone(a.local));}
  }else a.paused=was;suspend(a);});reset.className='fl-item';
 }
 a.panel.scrollTop=scroll;
}
function create(host){
 if(active)dispose(active);
 if(!document.getElementById('figget-life-style')){const s=el('style',css,document.head);s.id='figget-life-style';}
 const root=el('section',null,host);root.className='fl-root';root.setAttribute('aria-label','Figget-A-Balls evolving world');
 const a={root,canvas:el('canvas',null,root),view:null,previous:null,received:0,camera:{'x':48,'y':48},follow:true,overview:false,selected:null,paused:false,menu:false,suspended:false,worker:null,local:null,run:1,started:false,disposed:false,abort:new AbortController(),db:null,saved:null,saveStatus:'Loading local save…',lastSaved:0,initialCount:128,targetCount:128,auto:true,stepMs:0,paintMs:0,frameMs:33,nextProbe:performance.now()+10000,nextSave:performance.now()+15000,nextAction:0,nextPaint:0,lastPanel:0,tab:'activity',actionButtons:[]};active=a;a.ctx=a.canvas.getContext('2d');
 const top=el('div',null,root);top.className='fl-top';a.pause=button('Pause',top,()=>{a.paused=!a.paused;suspend(a);sync(a);});button('Map',top,()=>a.overview=!a.overview);button('Me',top,()=>{a.follow=true;a.overview=false;if(a.view)a.camera={'x':a.view['player']['x'],'y':a.view['player']['y']};});a.panelButton=button('World',top,()=>{a.panel.hidden=!a.panel.hidden;sync(a);if(!a.panel.hidden)renderPanel(a);});a.panelButton.setAttribute('aria-controls','figget-life-panel');
 a.status=el('div',null,root);a.status.className='fl-status';const title=el('div','LEARN / INHERIT / ADAPT',root);title.className='fl-title';el('b','The living frontier',title);
 a.panel=el('section',null,root);a.panel.id='figget-life-panel';a.panel.className='fl-panel';a.panel.hidden=true;const tabs=el('div',null,a.panel);tabs.className='fl-tabs';
 for(const [key,label]of [['activity','Activity'],['bots','Bots'],['rules','Rules']]){const b=button(label,tabs,()=>{a.tab=key;for(const n of tabs.children)n.setAttribute('aria-pressed',String(n===b));renderPanel(a);});b.setAttribute('aria-pressed',String(key===a.tab));}button('Close',tabs,()=>{a.panel.hidden=true;sync(a);});a.content=el('div',null,a.panel);
 a.dock=el('section',null,root);a.dock.className='fl-dock';a.dock.hidden=true;const directions=el('div',null,a.dock);directions.className='fl-directions';
 for(const [label,dx,dy,name]of [['',0,0,''],['↑',0,-1,'north'],['',0,0,''],['←',-1,0,'west'],['↓',0,1,'south'],['→',1,0,'east']]){if(!label){el('span',null,directions);continue;}const b=button(label,directions,()=>action(a,'move',{'dx':dx,'dy':dy}));b.setAttribute('aria-label','Move '+name);a.actionButtons.push(b);}
 a.tile=el('p',null,a.dock);a.message=el('p','Gather, build and survive. Select a bot to inspect it in World → Activity.',a.dock);a.message.className='fl-message';a.message.setAttribute('role','status');const actions=el('div',null,a.dock);actions.className='fl-controls';
 a.walk=button('Walk towards',actions,()=>{if(!a.view)return;const p=a.view['player'],t=target(a),dx=t['x']-p['x'],dy=t['y']-p['y'];action(a,'move',{'dx':Math.abs(dx)>=Math.abs(dy)?Math.sign(dx):0,'dy':Math.abs(dy)>Math.abs(dx)?Math.sign(dy):0});});
 a.gather=button('Gather',actions,()=>action(a,'gather',target(a)));a.build=button('Build depot',actions,()=>action(a,'build'));a.supply=button('Supply',actions,()=>action(a,'supply',target(a)));a.attack=button('Attack',actions,()=>action(a,'attack',Object.assign({},target(a),a.inspected?{'target':a.inspected['id']}:{})));a.eat=button('Eat',actions,()=>action(a,'eat'));a.actionButtons.push(a.walk,a.gather,a.build,a.supply,a.attack,a.eat);
 const caption=el('p','GOLD food · GREEN timber · VIOLET ore · SQUARE depots · COLOURED rival lineages',a.dock);caption.className='fl-caption';
 const inventory=el('details',null,a.dock);inventory.className='fl-inventory';el('summary','Inventory & depot',inventory);const material=el('select',null,inventory);material.setAttribute('aria-label','Inventory material');for(const kind of ['wood','food','ore']){const o=el('option',kind,material);o.value=kind;}
 const inventoryButtons=el('div',null,inventory);inventoryButtons.className='fl-controls';a.store=button('Store 5',inventoryButtons,()=>action(a,'store',Object.assign({'kind':material.value},target(a))));a.take=button('Take 5',inventoryButtons,()=>action(a,'take',Object.assign({'kind':material.value},target(a))));a.discard=button('Discard 5',inventoryButtons,()=>action(a,'discard',{'kind':material.value}));a.repair=button('Repair',inventoryButtons,()=>action(a,'repair',target(a)));a.actionButtons.push(a.store,a.take,a.discard,a.repair);
 a.loading=el('div','Waking the frontier…',root);a.loading.className='fl-loading';
 a.canvas.addEventListener('pointerdown',event=>{if(a.menu||!a.view||event.button!==0)return;event.preventDefault();const t=transform(a),r=a.canvas.getBoundingClientRect(),x=Math.floor((event.clientX-r.left-t.ox)/t.size),y=Math.floor((event.clientY-r.top-t.oy)/t.size);if(x<0||y<0||x>=model.SIZE||y>=model.SIZE)return;a.selected={'x':x,'y':y};a.inspectId=a.view['bots'].find(b=>b['x']===x&&b['y']===y)?.['id']??null;sync(a);if(!a.panel.hidden)renderPanel(a);});
 for(const type of ['touchmove','touchstart','click','pointerdown','pointerup'])root.addEventListener(type,event=>event.stopPropagation());
 window.addEventListener('keydown',event=>{if(a.menu||event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,select,textarea')||(event.code==='Space'&&event.target?.closest?.('button')))return;
  const dir={'ArrowUp':[0,-1],'w':[0,-1],'ArrowDown':[0,1],'s':[0,1],'ArrowLeft':[-1,0],'a':[-1,0],'ArrowRight':[1,0],'d':[1,0]}[event.key];
  if(dir){event.preventDefault();action(a,'move',{'dx':dir[0],'dy':dir[1]});}else if(event.code==='Space'&&!event.repeat){event.preventDefault();a.pause.click();}
 },{signal:a.abort.signal});
 document.addEventListener('visibilitychange',()=>{suspend(a);if(document.hidden)send(a,{'type':'save'});},{signal:a.abort.signal});window.addEventListener('pagehide',()=>{suspend(a);send(a,{'type':'save'});},{signal:a.abort.signal});
 a.observer=new MutationObserver(()=>{if(!root.isConnected)dispose(a);});a.observer.observe(host,{childList:true});load(a).then(saved=>{if(a.disposed){a.db?.close();return;}start(a,saved);});return a;
}
function transform(a){const size=a.overview?Math.min((a.width-20)/model.SIZE,(a.height-175)/model.SIZE):a.width<600?24:30;return {size,ox:a.overview?(a.width-model.SIZE*size)/2:a.width/2-(a.camera['x']+.5)*size,oy:a.overview?150:a.height*.43-(a.camera['y']+.5)*size};}
function draw(a){
 const c=a.ctx,w=a.width,h=a.height;c.fillStyle='#09201f';c.fillRect(0,0,w,h);if(!a.view)return;
 const v=a.view,t=transform(a),s=t.size,point=p=>({x:t.ox+(p['x']+.5)*s,y:t.oy+(p['y']+.5)*s});
 const minX=Math.max(0,Math.floor(-t.ox/s)),maxX=Math.min(model.SIZE-1,Math.ceil((w-t.ox)/s)),minY=Math.max(0,Math.floor(-t.oy/s)),maxY=Math.min(model.SIZE-1,Math.ceil((h-t.oy)/s));
 c.lineWidth=.5;c.strokeStyle='#86af8c12';
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const r=model.region(x,y);c.fillStyle=r>.7?'#183b30':r<.3?'#182d29':'#102d2a';c.fillRect(t.ox+x*s,t.oy+y*s,s,s);if(s>6)c.strokeRect(t.ox+x*s,t.oy+y*s,s,s);
 }
 const home=point({'x':48,'y':48});c.fillStyle='#ecdfa21a';c.beginPath();c.arc(home.x,home.y,s*3.2,0,Math.PI*2);c.fill();c.strokeStyle='#e6df9b55';c.stroke();
 for(const n of v['nodes']){const p=point(n);if(p.x<0||p.y<0||p.x>w||p.y>h)continue;c.globalAlpha=n['stock']?(.4+.6*n['stock']/n['capacity']):.12;c.fillStyle=colors[n['kind']];c.beginPath();
  if(n['kind']==='wood'){c.moveTo(p.x,p.y-s*.23);c.lineTo(p.x+s*.18,p.y+s*.16);c.lineTo(p.x-s*.18,p.y+s*.16);c.closePath();}else if(n['kind']==='ore'){c.moveTo(p.x,p.y-s*.2);c.lineTo(p.x+s*.16,p.y);c.lineTo(p.x,p.y+s*.2);c.lineTo(p.x-s*.16,p.y);c.closePath();}else c.arc(p.x,p.y,Math.max(1.2,s*.13),0,Math.PI*2);c.fill();}
 c.globalAlpha=1;
 for(const b of v['buildings']){const p=point(b);if(p.x<-s||p.y<-s||p.x>w+s||p.y>h+s)continue;const color=b['owner']===0?'#f6ebbc':model.COLORS[(b['lineage']-1)%8];c.strokeStyle=color;c.fillStyle=color+'40';c.fillRect(p.x-s*.28,p.y-s*.28,s*.56,s*.56);c.strokeRect(p.x-s*.28,p.y-s*.28,s*.56,s*.56);if(s>12){c.font='9px monospace';c.textAlign='center';c.fillStyle=color;c.fillText(b['food'],p.x,p.y+3);}}
 const progress=Math.min(1,(performance.now()-a.received)/400),old=new Map((a.previous?.['bots']||[]).map(b=>[b['id'],b]));
 for(const b of v['bots']){
  const previous=old.get(b['id']),p=point(b);if(previous&&Math.abs(previous['x']-b['x'])+Math.abs(previous['y']-b['y'])<=2){p.x+=(previous['x']-b['x'])*s*(1-progress);p.y+=(previous['y']-b['y'])*s*(1-progress);}
  if(p.x<-s||p.y<-s||p.x>w+s||p.y>h+s)continue;
  c.fillStyle=colour(b);c.beginPath();c.arc(p.x,p.y,Math.max(1.5,s*.15),0,Math.PI*2);c.fill();
  if(s>16){c.strokeStyle=colour(b)+'65';c.beginPath();c.arc(p.x,p.y,s*.24,-Math.PI/2,-Math.PI/2+Math.PI*2*b['health']/100);c.stroke();if(b===a.inspected){c.font='9px monospace';c.textAlign='center';c.fillText('#'+b['id'],p.x,p.y-s*.35);}}
 }
 const p=point(v['player']);c.shadowColor='#e5edb7';c.shadowBlur=12;c.fillStyle='#f6ebbc';c.beginPath();c.moveTo(p.x,p.y-s*.24);c.lineTo(p.x+s*.2,p.y+s*.19);c.lineTo(p.x-s*.2,p.y+s*.19);c.closePath();c.fill();c.shadowBlur=0;if(s>12){c.font='10px monospace';c.textAlign='center';c.fillText('YOU',p.x,p.y-s*.4);}
 for(const e of v['events'].slice(-12)){if(v['time']-e['time']>5)continue;const p=point(e),r=s*(.3+(v['time']-e['time'])/5);c.strokeStyle='#e7c57c44';c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.stroke();}
 if(a.selected){const p=point(a.selected);c.strokeStyle='#f0d597';c.lineWidth=1.5;c.strokeRect(p.x-s*.48,p.y-s*.48,s*.96,s*.96);}
}
function frame(a,width,height,menu){
 if(!a||a.disposed)return;const now=performance.now();a.width=width;a.height=height;
 if(a.canvas.width!==width||a.canvas.height!==height){a.canvas.width=width;a.canvas.height=height;}
 if(a.menu!==menu){a.menu=menu;suspend(a);sync(a);}
 if(!a.worker&&a.local){
  const delta=a.lastFrame===null?0:(now-a.lastFrame>1000?0:Math.max(0,(now-a.lastFrame)/1000));a.lastFrame=now;
  if(!a.suspended){a.pendingTime+=delta;let steps=0;while(a.pendingTime>=model.DT&&steps<2){const start=performance.now();model.step(a.local);a.stepMs=a.stepMs*.9+(performance.now()-start)*.1;a.pendingTime-=model.DT;steps++;}if(steps)snapshot(a,model.view(a.local));}
 }
 if(!menu&&!document.hidden&&now>=a.nextPaint){const start=performance.now();draw(a);a.paintMs=a.paintMs*.9+(performance.now()-start)*.1;a.nextPaint=now+(a.auto&&a.paintMs>9?60:0);}
 if(a.started&&now>=a.nextSave){send(a,{'type':'save'});a.nextSave=now+15000;}

}
function dispose(a){
 if(!a||a.disposed)return;
 if(a.local)persist(a,structuredClone(a.local));
 const worker=a.worker,db=a.db;
 a.disposed=true;a.abort.abort();a.observer.disconnect();a.root.remove();if(active===a)active=null;
 if(worker){closing=new Promise(resolve=>{let finished=false;const finish=world=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();
   if(db&&world){try{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(world,KEY);tx.oncomplete=resolve;tx.onerror=resolve;tx.onabort=resolve;}catch(_){resolve();}}else resolve();db?.close();};
  const timer=setTimeout(()=>finish(a.saved),1000);worker.onmessage=event=>{if(event.data['type']==='save'&&event.data['run']===a.run)finish(event.data['world']);};worker.onerror=()=>finish(a.saved);
  worker.postMessage({'type':'pause','value':true,'run':a.run});worker.postMessage({'type':'save','run':a.run});
 });}else db?.close();
}
module.exports={create,frame,dispose};
