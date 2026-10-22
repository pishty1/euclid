const model=require('./origins_model.js');
let active=null;
const colors=['#79d7ce','#b5a0ef','#e6bf7b','#8fcba1','#e89cae','#8ebce8','#c8d892','#dca9e5','#8ed7e8','#efad83','#a6b7df','#d5c1a4'];
const experiments={'evolving':'Evolving ecosystem','fixed':'Mutation disabled','no-microbes':'No harmful microbes','no-cost':'Defence has no cost'};
const style=`
.co-root{position:absolute;inset:0;z-index:2;color:#e3e7ed;font-family:system-ui,-apple-system,sans-serif;pointer-events:none}.co-root *{box-sizing:border-box}.co-root>canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;pointer-events:auto}
.co-root button,.co-root input,.co-root select{font:inherit;accent-color:#bea8ed}.co-root button,.co-root select{min-height:40px;padding:8px 12px;background:#18202eeb;border:1px solid #c4c6df30;border-radius:9px;color:#e1e5ed;cursor:pointer;touch-action:manipulation}.co-root button:hover{border-color:#bfa7eb80}.co-root :focus-visible{outline:2px solid #c6b1ef;outline-offset:3px}.co-root [hidden]{display:none!important}.co-root button:disabled{opacity:.4;cursor:default}
.co-top{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));display:flex;gap:6px;pointer-events:auto}.co-top .co-experiment{background:#302941eb;color:#ddc9fa}
.co-stats{position:absolute;top:calc(max(12px,env(safe-area-inset-top)) + 58px);left:max(22px,env(safe-area-inset-left));font:11px monospace;color:#aab5c8;letter-spacing:.04em;line-height:1.8;text-shadow:0 1px 6px #000}.co-stats strong{color:#d7e5e3;font-weight:400}.co-stats .co-dot{color:#f0928e}
.co-title{position:absolute;left:max(22px,env(safe-area-inset-left));bottom:calc(78px + env(safe-area-inset-bottom));max-width:450px;text-shadow:0 2px 12px #080d16}.co-title small{font:9px monospace;letter-spacing:.22em;color:#b7a3ce}.co-title h1{font:400 clamp(30px,4vw,50px) Georgia,serif;letter-spacing:-.035em;margin:9px 0 8px}.co-title p{font:11px monospace;line-height:1.6;color:#aebacc;margin:0;max-width:340px}.co-title .co-live{color:#d6c9e8;margin-top:8px}
.co-bottom{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:calc(12px + env(safe-area-inset-bottom));display:flex;justify-content:space-between;align-items:center;gap:12px}.co-tools{display:flex;gap:4px;padding:4px;background:#131b29e6;border:1px solid #bec4e52b;border-radius:12px;pointer-events:auto;backdrop-filter:blur(12px)}.co-tools button{font-size:12px;padding:6px 12px;border-color:transparent;background:transparent}.co-tools button[aria-pressed=true]{background:#393148;border-color:#bca1dd88;color:#ebd9ff}.co-view{font-size:12px!important;pointer-events:auto;max-width:150px}
.co-panel,.co-inspect{position:absolute;right:max(12px,env(safe-area-inset-right));top:calc(max(12px,env(safe-area-inset-top)) + 54px);width:320px;max-height:calc(100% - 140px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;pointer-events:auto;border:1px solid #beb1d735;border-radius:16px;background:#101927f5;padding:20px;backdrop-filter:blur(18px);box-shadow:0 16px 60px #0004}.co-panel h2,.co-inspect h2{font:400 24px Georgia,serif;margin:0 0 8px}.co-panel p,.co-inspect p{font-size:11px;line-height:1.6;color:#a8b1c3;margin:0 0 14px}.co-panel label{display:block;font-size:12px;margin-top:15px}.co-panel label output{float:right;color:#d5bee9;font:11px monospace}.co-panel label small{display:block;font-size:10px;color:#97a2b8;line-height:1.5;margin:4px 0}.co-panel input[type=range]{display:block;width:100%;height:28px;touch-action:pan-y;margin:4px 0}.co-panel select,.co-panel input[type=number]{width:100%;margin-top:7px;padding:10px;background:#192232;border:1px solid #bec6de30;border-radius:8px;color:#e6e7ec;font-size:12px}.co-panel input[type=number]{user-select:text;-webkit-user-select:text}.co-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:14px 0}.co-actions button{font-size:11px;padding:8px 5px}.co-panel details{border-top:1px solid #bec6de20;padding-top:12px;margin-top:16px;font-size:11px;color:#aeb9cb}.co-panel summary{cursor:pointer;color:#d8c8e9;margin-bottom:10px}.co-panel .co-chart{width:100%;height:100px;border:1px solid #bec6de20;border-radius:8px;background:#080f1b;margin:4px 0 8px}.co-chart-legend{font:10px monospace!important}.co-inspect .co-close{float:right;min-width:34px;min-height:34px;padding:4px;font-size:20px}.co-trait{display:grid;grid-template-columns:86px 1fr 32px;gap:8px;align-items:center;margin:10px 0;font-size:11px}.co-trait i{height:4px;background:#2b3549;border-radius:3px;overflow:hidden}.co-trait b{display:block;height:100%;background:#c9aedf}.co-trait output{font:10px monospace;color:#b7a6ca}.co-inspect .co-energy{height:5px;border-radius:4px;background:#26354a;margin:10px 0 14px;overflow:hidden}.co-energy i{display:block;height:100%;background:#88ccbd}.co-inspect .co-cell-detail{font:11px monospace;line-height:1.8;color:#c0cbdc}.co-toast{position:absolute;left:50%;top:calc(max(12px,env(safe-area-inset-top)) + 100px);transform:translateX(-50%);padding:10px 15px;background:#2a273bf5;border:1px solid #bea2e74d;border-radius:20px;font-size:12px;max-width:80%;text-align:center;z-index:3}
@media(max-width:600px){.co-top{top:calc(max(12px,env(safe-area-inset-top)) + 54px)}.co-top button{font-size:12px;padding:8px 10px}.co-stats{top:calc(max(12px,env(safe-area-inset-top)) + 56px);left:16px;font-size:10px;max-width:52%}.co-title{left:16px;bottom:calc(116px + env(safe-area-inset-bottom));max-width:calc(100% - 32px)}.co-title h1{font-size:32px}.co-title p{font-size:10px;max-width:280px}.co-bottom{left:8px;right:8px;flex-wrap:wrap;gap:6px}.co-tools{width:100%;justify-content:space-between}.co-tools button{flex:1;padding:6px;min-width:0}.co-view{width:100%;max-width:none;min-height:34px!important}.co-panel,.co-inspect{left:8px;right:8px;width:auto;top:calc(max(12px,env(safe-area-inset-top)) + 104px);max-height:calc(100% - 224px - env(safe-area-inset-top) - env(safe-area-inset-bottom));padding:16px}.co-inspect{max-height:calc(100% - 230px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}}
@media(max-height:500px){.co-top{top:12px}.co-panel,.co-inspect{left:auto;top:64px;width:300px;max-height:calc(100% - 132px)}.co-title{bottom:74px}.co-title h1{font-size:28px}.co-title small,.co-title>p:not(.co-live){display:none}.co-stats{top:68px}.co-bottom{flex-wrap:nowrap}.co-tools{width:auto}.co-view{width:auto;max-width:150px}}
`;
function el(tag,cls,text,parent){const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;if(parent)parent.appendChild(e);return e;}
function button(text,parent,fn){const e=el('button','',text,parent);e.type='button';e.addEventListener('click',fn);return e;}
function say(app,text){app.toast.textContent=text;app.toast.hidden=false;app.toastUntil=performance.now()+4000;}
function dispose(app){if(!app||app.stopped)return;app.stopped=true;app.abort.abort();app.observer.disconnect();app.root.remove();if(active===app)active=null;}
function sync(app){
 for(const [key,{input,output}]of Object.entries(app.sliders)){input.value=app.world.config[key];output.textContent=app.world.config[key].toFixed(2);input.disabled=(app.world.control==='fixed'&&key==='mutation')||(app.world.control==='no-cost'&&key==='defenceCost')||(app.world.control==='no-microbes'&&key==='pressure');}
 app.tools['microbes'].disabled=app.world.control==='no-microbes';
 if(app.tool==='microbes'&&app.tools['microbes'].disabled)selectTool(app,'inspect');
}
function selectTool(app,tool){if(!app.tools[tool]||app.tools[tool].disabled)return;app.tool=tool;for(const [key,e]of Object.entries(app.tools))e.setAttribute('aria-pressed',String(key===tool));}
function run(app,replay=false){
 const old=app.world,seed=Math.max(0,Math.min(4294967295,Math.floor(Number(app.seedInput.value)||0)));app.seedInput.value=String(seed);
 if(replay){const data=model.exportData(old);app.world=model.create(data['seed'],data['initialRules'],data['control']);app.replay=data['events'];app.replayEnd=data['steps'];say(app,'Replaying the same seed and recorded interventions.');}
 else{app.comparison=old.history.map(h=>({...h}));app.world=model.create(seed,app.baseline,app.controlInput.value);app.replay=null;say(app,'Matched starting world. The previous run stays on the history chart.');}
 app.selected=null;app.inspect.hidden=true;app.accumulator=0;app.last=0;app.paused=false;app.pause.textContent='Pause';app.pause.setAttribute('aria-pressed','false');sync(app);
}
function live(app){if(app.replay){app.replay=null;say(app,'Live experiment resumed. New interventions will be recorded.');}}
function download(app){const blob=new Blob([JSON.stringify(model.exportData(app.world),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cellular-origins-${app.world.seed}-${app.world.step}.json`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);say(app,'Experiment exported: seed, rules, interventions, lineage totals and recent history.');}
function panel(app){
 app.panel=el('section','co-panel',null,app.root);app.panel.id='origins-experiment';app.panel.hidden=true;app.panel.setAttribute('aria-label','Evolution experiment');
 el('h2','','Change the pressures',app.panel);el('p','','Every cell inherits traits and a tiny neural controller. Its energy budget decides whether it survives and reproduces.',app.panel);
 const labels={
  'food':['Food renewal','Higher replenishes nutrients faster; scarcity rewards efficient foraging.'],
  'pressure':['Microbial harm','Damage from close microbial contact; defence reduces it.'],
  'defenceCost':['Defence cost','Energy paid continuously for defence, even when no microbe is nearby.'],
  'sharing':['Kin resource sharing','How much inherited sharing behaviour can transfer energy to nearby relatives.'],
  'mutation':['Mutation probability','Chance of changing each inherited trait or controller weight at birth.']
 };app.sliders={};
 for(const [key,[name,hint]]of Object.entries(labels)){const label=el('label','',name,app.panel),output=el('output','',null,label),input=el('input','',null,label);input.type='range';input.min=model.bounds[key][0];input.max=model.bounds[key][1];input.step='0.01';input.setAttribute('aria-label',name);el('small','',hint,label);app.sliders[key]={input,output};input.addEventListener('input',()=>{live(app);model.change(app.world,key,input.value);sync(app);});}
 const timeLabel=el('label','','Time flow',app.panel),time=el('input','',null,timeLabel);time.type='range';time.min=1;time.max=6;time.step=1;time.value=2;time.setAttribute('aria-label','Time flow');time.addEventListener('input',()=>app.speed=Number(time.value));el('small','','Simulation uses fixed steps. Time flow only changes how quickly you watch them.',timeLabel);
 const viewLabel=el('label','','Next matched experiment',app.panel);app.controlInput=el('select','',null,viewLabel);app.controlInput.setAttribute('aria-label','Matched control');for(const [key,name]of Object.entries(experiments)){const option=el('option','',name,app.controlInput);option.value=key;}
 const seedLabel=el('label','','Random seed',app.panel);app.seedInput=el('input','',null,seedLabel);app.seedInput.type='number';app.seedInput.min=0;app.seedInput.max=4294967295;app.seedInput.step=1;app.seedInput.value=42;app.seedInput.setAttribute('aria-label','Random seed');el('small','','Start matched run uses this seed and the original starting rules. A single run is an observation, not evidence of a general result.',seedLabel);
 const actions=el('div','co-actions',null,app.panel);button('Start matched run',actions,()=>run(app));button('Replay current run',actions,()=>run(app,true));button('Restart with live rules',actions,()=>{app.baseline={...app.world.config};run(app);});button('Export experiment',actions,()=>download(app));
 el('label','','Population history',app.panel);app.chart=el('canvas','co-chart',null,app.panel);app.chart.width=560;app.chart.height=190;app.chart.setAttribute('role','img');app.chart.setAttribute('aria-label','Population history: cells, microbes and previous-run cells');el('p','co-chart-legend','Mint: cells · coral: microbes · grey: previous run',app.panel);
 app.historyRange=el('p','co-chart-legend',null,app.panel);app.trend=el('p','',null,app.panel);
 const details=el('details','',null,app.panel);el('summary','','What is actually evolving?',details);
 el('p','','Six inherited traits affect movement, sensing, engulfment, sharing, defence and adhesion. A heritable 8-input, 4-output controller steers movement, engulfment and signalling. There is no lifetime learning or reward for being an immune cell.',details);
 el('p','','Birth requires energy. Offspring inherit the parent’s lineage, traits and controller with small mutations. Costs, feeding, microbial contact and ageing determine survival. Related neighbours can adhere and share resources; displayed kin clusters are connected groups of at least three relatives.',details);
 el('p','','Microbes compete for nutrients and damage nearby cells. Engulfment removes a microbe and supplies energy. Defence reduces contact damage but has an ongoing cost. Extinctions are allowed; there is no automatic reseeding.',details);
 el('p','','Controls share initial cells and seed. Mutation disabled keeps inherited values fixed; no microbes removes that pressure; no defence cost tests the trade-off. Live edits and feeding interventions are recorded. Replay runs to the same step and pauses. Export retains up to 10 minutes of metrics.',details);
 el('p','','This is an artificial evolutionary model, not a biological reconstruction. Protective specialisation is a possible outcome to investigate, not a promised stage.',details);
 sync(app);
}
function inspector(app){app.inspect=el('section','co-inspect',null,app.root);app.inspect.hidden=true;app.inspect.setAttribute('aria-label','Selected cell');const close=button('×',app.inspect,()=>{app.selected=null;app.inspect.hidden=true;});close.className='co-close';close.setAttribute('aria-label','Close cell inspector');app.inspectTitle=el('h2','',null,app.inspect);app.inspectDetails=el('p','co-cell-detail',null,app.inspect);const bar=el('div','co-energy',null,app.inspect);app.energy=el('i','',null,bar);app.energyTrack=bar;app.traitRows=[];for(const trait of model.traits){const row=el('div','co-trait',trait,app.inspect),track=el('i','',null,row),fill=el('b','',null,track),output=el('output','',null,row);app.traitRows.push({row,fill,output});}el('p','','Colour identifies a founding lineage. Higher defence is an investment, not a preassigned cell type.',app.inspect);}
function inspect(app){if(app.selected===null)return;const c=app.world.cells.find(c=>c.id===app.selected);if(!c){app.inspectTitle.textContent='Cell no longer alive';app.inspectDetails.textContent='Its lineage may continue through surviving relatives. Tap another cell to inspect.';app.energyTrack.hidden=true;for(const {row} of app.traitRows)row.hidden=true;return;}app.energyTrack.hidden=false;for(const {row} of app.traitRows)row.hidden=false;app.inspectTitle.textContent=`Lineage ${c.lineage+1} · Cell ${c.id}`;app.inspectDetails.textContent=`Generation ${c.generation} · Parent ${c.parent??'founder'}\nEnergy ${c.energy.toFixed(2)} · Age ${c.age.toFixed(1)}s\nOffspring ${c.births} · Engulfed ${c.engulfed}\nShared energy ${c.shared.toFixed(2)}`;app.inspectDetails.style.whiteSpace='pre-line';app.energy.style.width=`${Math.min(100,c.energy/1.8*100)}%`;c.genes.forEach((g,i)=>{app.traitRows[i].fill.style.width=`${g*100}%`;app.traitRows[i].output.textContent=g.toFixed(2);});}
function interaction(app,event){
 const r=app.canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*model.WIDTH,y=(event.clientY-r.top)/r.height*model.HEIGHT;
 if(app.tool==='inspect'){
  let closest=null,best=22;for(const c of app.world.cells){const d=Math.hypot((x-c.x)*r.width/model.WIDTH,(y-c.y)*r.height/model.HEIGHT);if(d<best){best=d;closest=c;}}
  app.selected=closest?closest.id:null;app.inspect.hidden=!closest;if(closest){app.panel.hidden=true;app.experiment.setAttribute('aria-expanded','false');inspect(app);}return;
 }
 if(app.world.control==='no-microbes'&&app.tool==='microbes')return;
 live(app);model.intervene(app.world,app.tool,x,y);app.pulse={x,y,age:0,tool:app.tool};
}
function create(host){
 dispose(active);const root=el('div','co-root',null,host);el('style','',style,root);const canvas=el('canvas','',null,root);canvas.setAttribute('aria-label','Cellular Origins ecosystem. Tap a cell to inspect; choose Feed or Inoculate to intervene.');
 const app={root,canvas,ctx:canvas.getContext('2d'),world:model.create(42),baseline:model.settings(),paused:false,menu:false,last:0,accumulator:0,speed:2,tool:'inspect',tools:{},selected:null,stopped:false,abort:new AbortController(),comparison:null,replay:null,lastInfo:-1,lastChart:-1,toastUntil:0,pointer:null};active=app;
 const top=el('div','co-top',null,root);app.pause=button('Pause',top,()=>{app.paused=!app.paused;app.pause.textContent=app.paused?'Resume':'Pause';app.pause.setAttribute('aria-pressed',String(app.paused));app.last=0;});app.pause.setAttribute('aria-pressed','false');app.experiment=button('Experiment',top,()=>{app.panel.hidden=!app.panel.hidden;app.inspect.hidden=true;app.experiment.setAttribute('aria-expanded',String(!app.panel.hidden));});app.experiment.className='co-experiment';app.experiment.setAttribute('aria-expanded','false');app.experiment.setAttribute('aria-controls','origins-experiment');
 app.stats=el('div','co-stats','',root);const title=el('div','co-title',null,root);el('small','','A WORLD WITHOUT ASSIGNED ROLES',title);el('h1','','Cellular Origins',title);el('p','','Feed. Inherit. Mutate. See which lineages last.',title);app.liveLabel=el('p','co-live','',title);
 const bottom=el('div','co-bottom',null,root),tools=el('div','co-tools',null,bottom);tools.setAttribute('role','group');tools.setAttribute('aria-label','Ecosystem tools');for(const [key,name]of [['inspect','Inspect'],['food','Feed'],['microbes','Inoculate']]){const b=button(name,tools,()=>selectTool(app,key));app.tools[key]=b;b.setAttribute('aria-pressed',String(key==='inspect'));}
 const view=el('select','co-view',null,bottom);view.setAttribute('aria-label','Ecosystem view');for(const [key,name]of [['lineages','Lineages'],['defence','Defence investment'],['signals','Chemical signals']]){const option=el('option','',name,view);option.value=key;}app.view='lineages';view.addEventListener('change',()=>app.view=view.value);
 app.toast=el('div','co-toast',null,root);app.toast.hidden=true;app.toast.setAttribute('role','status');panel(app);inspector(app);
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0||app.menu||app.pointer)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);app.pointer={id:event.pointerId,x:event.clientX,y:event.clientY};interaction(app,event);});
 canvas.addEventListener('pointermove',event=>{if(app.pointer?.id!==event.pointerId||app.menu||app.tool!=='food')return;if(Math.hypot(event.clientX-app.pointer.x,event.clientY-app.pointer.y)<12)return;event.preventDefault();app.pointer.x=event.clientX;app.pointer.y=event.clientY;interaction(app,event);});
 const finish=event=>{if(app.pointer?.id!==event.pointerId)return;app.pointer=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);};for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,finish);
 for(const type of ['click','pointerdown','pointerup','touchstart','touchmove','touchend'])root.addEventListener(type,event=>event.stopPropagation());
 window.addEventListener('keydown',event=>{if(app.menu||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,select,button,summary'))return;if(event.code==='Space'){event.preventDefault();app.pause.click();}const tool={'1':'inspect','2':'food','3':'microbes'}[event.key];if(tool)selectTool(app,tool);},{signal:app.abort.signal});
 app.observer=new MutationObserver(()=>{if(!root.isConnected)dispose(app);});app.observer.observe(host,{childList:true});return app;
}
function cellShape(ctx,c,color,selected,sx,sy){
 const radius=5.4+Math.min(2,c.energy*0.7),angle=Math.atan2(c.vy*sy,c.vx*sx),motion=Math.min(1,Math.hypot(c.vx,c.vy)/18);
 ctx.save();ctx.translate(c.x*sx,c.y*sy);ctx.rotate(angle);ctx.scale(1+motion*0.18,1-motion*0.06);
 if(selected){ctx.beginPath();ctx.arc(0,0,radius+8,0,Math.PI*2);ctx.strokeStyle='#f0e7cb';ctx.lineWidth=0.9;ctx.stroke();}
 ctx.beginPath();for(let i=0;i<=16;i++){const a=i/16*Math.PI*2,r=radius*(1+Math.sin(a*3+c.age*2+c.id)*0.08+Math.sin(a*5-c.age)*0.035),x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fillStyle=color+'30';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=0.8;ctx.stroke();
 ctx.beginPath();ctx.ellipse(-1,-0.8,2.2,1.7,0.4,0,Math.PI*2);ctx.fillStyle=color+'90';ctx.fill();
 if(c.damageFlash>0){ctx.fillStyle='#f29e9450';ctx.beginPath();ctx.arc(2,2,1.3,0,6.28);ctx.fill();}
 ctx.restore();
}
function draw(app,width,height){
 const ctx=app.ctx,w=app.world,sx=width/model.WIDTH,sy=height/model.HEIGHT;
 ctx.fillStyle='#0b111c';ctx.fillRect(0,0,width,height);ctx.save();ctx.scale(sx,sy);
 // Nutrients and signals are actual local fields, never decorative flow forces.
 for(let y=0;y<model.ROWS;y++)for(let x=0;x<model.COLS;x++){const i=y*model.COLS+x,food=w.food[i],signal=w.signal[i];
  if(app.view==='signals'&&signal>0.005){ctx.fillStyle=`rgba(205,126,210,${Math.min(.35,signal*.6)})`;ctx.fillRect(x*model.WIDTH/model.COLS,y*model.HEIGHT/model.ROWS,model.WIDTH/model.COLS+1,model.HEIGHT/model.ROWS+1);}
  if(food>0.06){ctx.fillStyle=`rgba(99,151,146,${food*.23})`;ctx.beginPath();ctx.arc((x+.5)*model.WIDTH/model.COLS,(y+.5)*model.HEIGHT/model.ROWS,0.6+food*.8,0,6.28);ctx.fill();}
 }
 const ids=new Map(w.cells.map(c=>[c.id,c]));ctx.lineWidth=0.65;
 for(const link of w.links){const a=ids.get(link.a),b=ids.get(link.b);if(!a||!b||Math.abs(a.x-b.x)>30||Math.abs(a.y-b.y)>30)continue;ctx.strokeStyle=colors[a.lineage]+'50';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 ctx.restore();
 for(const m of w.microbes){ctx.save();ctx.translate(m.x*sx,m.y*sy);ctx.rotate(Math.atan2(Math.sin(m.angle)*sy,Math.cos(m.angle)*sx));ctx.strokeStyle='#ee9893';ctx.fillStyle='#e67e7f30';ctx.lineWidth=0.7;ctx.beginPath();ctx.ellipse(0,0,2.6,1.5,0,0,6.28);ctx.fill();ctx.stroke();ctx.restore();}
 for(const c of w.cells){let color=colors[c.lineage];if(app.view==='defence'){const g=c.genes[4];color=`#${Math.round(120+g*110).toString(16).padStart(2,'0')}${Math.round(210-g*40).toString(16).padStart(2,'0')}${Math.round(205-g*100).toString(16).padStart(2,'0')}`;}cellShape(ctx,c,color,c.id===app.selected,sx,sy);}
 for(const e of w.effects){const t=e.age/1.2;ctx.strokeStyle=(e.kind==='birth'?'#c1ead5':e.kind==='engulf'?'#edc1a3':'#9a9cb7')+Math.round((1-t)*140).toString(16).padStart(2,'0');ctx.lineWidth=0.7;ctx.beginPath();ctx.arc(e.x*sx,e.y*sy,(e.kind==='engulf'?8:5)+t*15,0,6.28);ctx.stroke();}
 if(app.pulse){app.pulse.age+=0.04;if(app.pulse.age>1.2)app.pulse=null;else{ctx.strokeStyle='#bdb6df60';ctx.lineWidth=1;ctx.beginPath();ctx.arc(app.pulse.x*sx,app.pulse.y*sy,15+app.pulse.age*30,0,6.28);ctx.stroke();}}
}
function chart(app){
 const ctx=app.chart.getContext('2d'),width=app.chart.width,height=app.chart.height;ctx.clearRect(0,0,width,height);
 const window=model.historyWindow(app.world.history,app.comparison||[]),maxPop=model.MICROBE_CAP;
 for(const [data,key,color]of [[window.previous,'cells','#818ca280'],[window.current,'microbes','#e99a93'],[window.current,'cells','#8ed7c7']]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2;data.forEach((point,i)=>{const x=8+(point['time']-window.start)/(window.end-window.start)*(width-16),y=height-8-point[key]/maxPop*(height-16);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}
 app.chart.setAttribute('aria-label',`Population history from ${window.start.toFixed(0)} to ${window.end.toFixed(0)} seconds. Now: ${app.world.cells.length} cells and ${app.world.microbes.length} microbes.`);
 app.historyRange.textContent=`${window.start.toFixed(0)}–${window.end.toFixed(0)}s · 0–${maxPop} per population${app.comparison&&!window.previous.length?' · previous run has no samples in this window':''}`;
 const initial=app.world.initialTraits,last=window.current.at(-1);
 if(last)app.trend.textContent=last['traits']?`Mean defence, start → now: ${initial[4].toFixed(2)} → ${last['traits'][4].toFixed(2)} · sharing ${initial[3].toFixed(2)} → ${last['traits'][3].toFixed(2)}. Compare several seeds before drawing a conclusion.`:'No surviving cells. Trait averages are unavailable after extinction.';

}
function frame(app,width,height,menu){
 if(!app||app.stopped)return;if(!app.root.isConnected){dispose(app);return;}
 const now=performance.now(),elapsed=app.last?Math.min(.15,(now-app.last)/1000):0;app.last=now;app.menu=menu;
 if(app.canvas.width!==width||app.canvas.height!==height){app.canvas.width=width;app.canvas.height=height;}
 if(!app.paused&&!menu&&!document.hidden){app.accumulator=Math.min(model.DT*12,app.accumulator+elapsed*app.speed);let n=0;while(app.accumulator>=model.DT&&n++<12){
  if(app.replay&&app.world.step>=app.replayEnd){model.applyEvents(app.world,app.replay,true);app.replay=null;app.paused=true;app.pause.textContent='Resume';app.pause.setAttribute('aria-pressed','true');say(app,'Replay complete at the original simulation step.');break;}
  model.step(app.world,app.replay);app.accumulator-=model.DT;
 }}else app.accumulator=0;
 draw(app,width,height);
 if(now-app.lastInfo>250){app.lastInfo=now;const w=app.world,last=w.history.at(-1),groups=model.clusters(w);app.stats.textContent=`${w.cells.length} CELLS · ${w.microbes.length} MICROBES\nGEN ${last['generation']} · ${groups.length} KIN CLUSTERS`;app.stats.style.whiteSpace='pre-line';app.liveLabel.textContent=w.cells.length===0?'Cells extinct · change the conditions and start a matched run':`${app.paused?'Paused':app.replay?'Replaying':experiments[w.control]} · ${w.time.toFixed(1)}s · ${w.births} births`;inspect(app);sync(app);}
 if(now-app.lastChart>800&&!app.panel.hidden){app.lastChart=now;chart(app);}
 if(now>app.toastUntil)app.toast.hidden=true;
}
module.exports={create,frame,dispose};
