const model=require('./garden_model.js');
const gpu=require('./garden_gpu.js');
let active=null;
const storageKey='euclid-emergence-discoveries-v1';
const css=`
.eg-root{position:absolute;inset:0;z-index:2;color:#dfebe1;font-family:system-ui,-apple-system,sans-serif;pointer-events:none}
.eg-root *{box-sizing:border-box}.eg-root canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;touch-action:none;cursor:crosshair}
.eg-root button,.eg-root select,.eg-root input{font:inherit;accent-color:#b5d787}.eg-root button,.eg-root select{min-height:40px;border:1px solid #a6c8b42b;border-radius:9px;background:#11282ae8;color:#dfebe1;padding:8px 12px;cursor:pointer;touch-action:manipulation}
.eg-root button:hover{border-color:#b5d78788}.eg-root :focus-visible{outline:2px solid #d6c088;outline-offset:3px}.eg-root [hidden]{display:none!important}
.eg-top{position:absolute;top:max(14px,env(safe-area-inset-top));right:max(14px,env(safe-area-inset-right));display:flex;gap:6px;pointer-events:auto}
.eg-top .eg-rules-button{color:#d7e4b3;background:#21382bec}.eg-top button[aria-pressed=true],.eg-tools button[aria-pressed=true]{border-color:#c2d997;color:#e9f7bb;background:#314833ed}
.eg-caption{position:absolute;left:max(22px,env(safe-area-inset-left));bottom:calc(78px + env(safe-area-inset-bottom));max-width:min(500px,calc(100% - 40px));text-shadow:0 2px 12px #061012}
.eg-eyebrow{font:10px monospace;letter-spacing:.23em;color:#b9cea4;margin:0 0 10px}.eg-caption h1{font:400 clamp(30px,4vw,54px) Georgia,serif;letter-spacing:-.035em;margin:0 0 8px}.eg-caption p{font-size:12px;color:#9eb6ad;margin:0;line-height:1.6}
.eg-caption .eg-state{margin-top:8px;color:#d2dbbd;font:11px monospace}.eg-status{position:absolute;top:calc(max(14px,env(safe-area-inset-top)) + 56px);left:max(22px,env(safe-area-inset-left));font:10px monospace;letter-spacing:.08em;color:#9ab8ad;text-shadow:0 1px 4px #000;max-width:65%}
.eg-bottom{position:absolute;left:max(14px,env(safe-area-inset-left));right:max(14px,env(safe-area-inset-right));bottom:calc(12px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none}
.eg-tools{display:flex;gap:4px;padding:4px;border:1px solid #9bbca22b;border-radius:12px;background:#0c1c20d9;backdrop-filter:blur(12px);pointer-events:auto}.eg-tools button{border-color:transparent;background:transparent;min-width:52px;font-size:12px;padding:6px 10px}.eg-view{pointer-events:auto;font-size:12px!important;max-width:145px}
.eg-panel{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(max(14px,env(safe-area-inset-top)) + 54px);width:318px;max-height:calc(100% - 142px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;padding:20px;border:1px solid #b7cba333;border-radius:16px;background:#0e2024f2;backdrop-filter:blur(20px);box-shadow:0 12px 60px #0004;pointer-events:auto}
.eg-panel h2{font:400 23px Georgia,serif;margin:0 0 8px}.eg-panel p{font-size:11px;line-height:1.65;color:#a3b8b0;margin:0 0 16px}.eg-panel label{display:block;font-size:12px;margin:15px 0 0}.eg-panel label output{float:right;font:11px monospace;color:#cddcae}.eg-panel label small{display:block;font-size:10px;line-height:1.45;color:#8aa69e;margin:5px 0}.eg-panel input[type=range]{display:block;width:100%;height:28px;margin:2px 0;touch-action:pan-y}.eg-panel select{width:100%;font-size:12px}.eg-panel input[type=text]{width:100%;margin-top:7px;padding:10px;border:1px solid #a6c8b42b;border-radius:8px;background:#0a171b;color:#dfebe1;user-select:text;-webkit-user-select:text}.eg-panel .eg-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:16px}.eg-panel .eg-actions button{font-size:11px;padding:8px 5px}.eg-panel details{font-size:11px;border-top:1px solid #9bbca225;margin-top:18px;padding-top:12px;color:#a3b8b0}.eg-panel summary{cursor:pointer;color:#d4dec9;margin-bottom:8px}.eg-panel details p{margin:0 0 8px}.eg-panel a{color:#c4dba8}.eg-toast{position:absolute;left:50%;top:calc(max(14px,env(safe-area-inset-top)) + 60px);transform:translateX(-50%);padding:9px 14px;border:1px solid #bbd49540;border-radius:20px;background:#1c302bf0;font-size:12px;text-align:center;max-width:80%;z-index:3}
@media(max-width:600px){.eg-top{top:calc(max(12px,env(safe-area-inset-top)) + 54px);right:12px}.eg-top button{font-size:12px;padding:8px 10px}.eg-status{top:calc(max(12px,env(safe-area-inset-top)) + 57px);left:16px;max-width:55%;line-height:1.6}.eg-caption{left:16px;bottom:calc(118px + env(safe-area-inset-bottom))}.eg-caption h1{font-size:32px}.eg-caption p{max-width:250px;font-size:11px}.eg-bottom{left:8px;right:8px;gap:6px;flex-wrap:wrap}.eg-tools{width:100%;justify-content:space-between}.eg-tools button{flex:1;min-width:0}.eg-view{width:100%;max-width:none;min-height:34px!important;font-size:11px!important}.eg-panel{left:8px;right:8px;width:auto;top:calc(max(12px,env(safe-area-inset-top)) + 104px);max-height:calc(100% - 224px - env(safe-area-inset-top) - env(safe-area-inset-bottom));padding:16px}.eg-toast{top:calc(max(12px,env(safe-area-inset-top)) + 106px)} }
@media(max-height:500px){.eg-caption{bottom:74px}.eg-caption h1{font-size:28px}.eg-caption .eg-eyebrow,.eg-caption>p:not(.eg-state){display:none}.eg-panel{top:64px;max-height:calc(100% - 132px);width:300px;left:auto}.eg-top{top:12px}.eg-status{top:70px}.eg-bottom{flex-wrap:nowrap}.eg-tools{width:auto}.eg-view{width:auto;max-width:145px}.eg-caption .eg-state{font-size:10px}}
`;
function element(tag,cls,text,parent){const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;if(parent)parent.appendChild(el);return el;}
function button(text,parent,callback){const el=element('button','',text,parent);el.type='button';el.addEventListener('click',callback);return el;}
function dimensions(width,height){const long=window.matchMedia('(pointer:coarse)').matches?192:256;return width>=height?[long,Math.max(64,Math.round(long*height/width))]:[Math.max(64,Math.round(long*width/height)),long];}
function dispose(app){if(!app||app.stopped)return;app.stopped=true;app.abort.abort();app.observer.disconnect();gpu.dispose(app.gpu);app.root.remove();if(active===app)active=null;}
function say(app,message){app.toast.textContent=message;app.toast.hidden=false;app.toastUntil=performance.now()+3500;}
function encode(data){const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
function decode(saved){
  if(saved['version']!==1||!Number.isInteger(saved['width'])||!Number.isInteger(saved['height'])||saved['width']<16||saved['height']<16||saved['width']>512||saved['height']>512)throw new Error('Invalid world');
  const raw=atob(saved['cells']);if(raw.length!==saved['width']*saved['height']*16)throw new Error('Invalid cells');
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const data=new Float32Array(bytes.buffer);
  for(let i=0;i<data.length;i++)if(!Number.isFinite(data[i])||data[i]<0||data[i]>1)throw new Error('Invalid cell values');
  return data;
}
function settingsUI(app){
  const panel=element('section','eg-panel',null,app.root);panel.id='garden-rules';panel.hidden=true;panel.setAttribute('aria-label','Cell interaction rules');app.panel=panel;
  element('h2','', 'Shape the conditions',panel);
  element('p','', 'No colony shapes are scripted. Change what each cell does, then watch what its neighbours make of it.',panel);
  const presetLabel=element('label','','Starting rules',panel);
  const presets=element('select','',null,presetLabel);presets.setAttribute('aria-label','Starting rules');app.presetChoice=presets;
  for(const [key,preset] of Object.entries(model.presets)){const option=element('option','',preset.name,presets);option.value=key;}
  const custom=element('option','','Your rules',presets);custom.value='custom';
  presets.addEventListener('change',()=>{if(model.presets[presets.value]){app.rule=model.rules(model.presets[presets.value]);syncRules(app);say(app,'Rules changed. The existing field keeps evolving.');}});
  const descriptions={
    'feed':['Nutrient renewal','More replenishes food faster. Too much can flood the field.'],
    'decay':['Activity decay','More makes growth harder to sustain; too much clears the field.'],
    'spread':['Activity spreading','How strongly activity diffuses to neighbouring cells.'],
    'supply':['Available nutrients','The background food level each cell replenishes toward.'],
    'growth':['Cooperative growth','Activity needs activity nearby to consume food and grow.']
  };
  app.sliders={};
  for(const [key,[title,hint]] of Object.entries(descriptions)){
    const label=element('label','',title,panel),output=element('output','',null,label);
    const slider=element('input','',null,label);slider.type='range';slider.min=model.bounds[key][0];slider.max=model.bounds[key][1];slider.step=key==='feed'||key==='decay'?'0.0005':'0.01';slider.setAttribute('aria-label',title);
    element('small','',hint,label);app.sliders[key]={slider,output};
    slider.addEventListener('input',()=>{app.rule=model.rules({...app.rule,[key]:Number(slider.value)});presets.value='custom';syncRules(app);});
  }
  const speedLabel=element('label','','Time flow',panel),speed=element('input','',null,speedLabel);speed.type='range';speed.min=1;speed.max=6;speed.value=6;app.speedSlider=speed;speed.step=1;speed.setAttribute('aria-label','Time flow');speed.addEventListener('input',()=>app.speed=Number(speed.value));
  element('small','','Updates per frame. Lower this on a warm or slow device.',speedLabel);
  const radiusLabel=element('label','','Brush size',panel),radius=element('input','',null,radiusLabel);radius.type='range';radius.min=2;radius.max=14;radius.value=4;radius.setAttribute('aria-label','Brush size');radius.addEventListener('input',()=>app.radius=Number(radius.value));
  const nameLabel=element('label','','Discovery name · optional',panel);app.discoveryName=element('input','',null,nameLabel);app.discoveryName.type='text';app.discoveryName.maxLength=40;app.discoveryName.placeholder='Name a pattern worth keeping';app.discoveryName.setAttribute('aria-label','Discovery name');
  const actions=element('div','eg-actions',null,panel);
  button('Mutate rules',actions,()=>{app.rule=model.rules({...app.rule,'feed':app.rule['feed']+(Math.random()-0.5)*0.004,'decay':app.rule['decay']+(Math.random()-0.5)*0.003,'spread':app.rule['spread']+(Math.random()-0.5)*0.04});presets.value='custom';syncRules(app);say(app,'Small rule variation applied. Keep it, tune it, or restore a discovery.');});
  button('New seeds',actions,()=>{resetField(app,false);say(app,'New seed clusters, same rules.');});
  button('Clear field',actions,()=>{resetField(app,true);say(app,'Blank field. Paint a seed to begin.');});
  app.saveButton=button('Save discovery',actions,()=>save(app));
  const savedLabel=element('label','','Your discoveries · this device',panel);app.savedChoice=element('select','',null,savedLabel);app.savedChoice.setAttribute('aria-label','Saved discoveries');
  const restoreButton=button('Restore selected discovery',panel,()=>restore(app));restoreButton.style.cssText='width:100%;margin-top:8px;font-size:12px';app.restoreButton=restoreButton;
  const info=element('details','',null,panel);element('summary','','How the cells work',info);
  element('p','','Each cell stores nutrients and activity. Both diffuse to eight neighbours. Activity consumes nutrients to create more activity, while decay removes it. Barriers reflect diffusion; outer edges wrap around.',info);
  element('p','','This is a Gray–Scott reaction–diffusion garden, not a trained neural model. Shapes are emergent patterns, not organisms with genomes. “Mutate rules” changes the world’s rules; it does not evolve inherited traits.',info);
  element('p','','Seeds add activity. Feed restores local nutrients. Erase removes activity and barriers. Walls block exchange. New seeds keeps your rules. Saving stores the field and rules together. Quiet or extinct worlds are allowed: seed again or try another rule.',info);
  element('p','','Keyboard: Space pauses, 1–4 choose tools, R replants. Drawing works with a mouse, pen or one finger.',info);
  syncRules(app);refreshSaved(app);
}
function syncRules(app){for(const [key,{slider,output}] of Object.entries(app.sliders)){slider.value=app.rule[key];output.textContent=app.rule[key].toFixed(key==='feed'||key==='decay'?4:2);}}
function readSaves(){try{const value=JSON.parse(window.localStorage.getItem(storageKey)||'[]');return Array.isArray(value)?value.filter(item=>item && item['version']===1 && typeof item['name']==='string' && typeof item['cells']==='string').slice(0,3):[];}catch(_){return [];}}
function refreshSaved(app){const items=readSaves();app.savedChoice.textContent='';for(let i=0;i<items.length;i++){const option=element('option','',items[i]['name'],app.savedChoice);option.value=String(i);}if(!items.length){const option=element('option','','No discoveries saved yet',app.savedChoice);option.value='';}app.restoreButton.disabled=!items.length;}
async function currentField(app){return app.gpu?gpu.snapshot(app.gpu):new Float32Array(app.data);}
async function save(app){
  if(app.busy)return;app.busy=true;app.saveButton.disabled=true;
  const epoch=app.epoch,rule={...app.rule},generation=app.generation;
  try {
    const data=await currentField(app);if(app.stopped||epoch!==app.epoch)return;
    const items=readSaves();const saved={'version':1,'name':app.discoveryName.value.trim()||`Discovery ${new Date().toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})}`,'width':app.width,'height':app.height,'rule':rule,'generation':generation,'cells':encode(data)};
    items.unshift(saved);window.localStorage.setItem(storageKey,JSON.stringify(items.slice(0,3)));refreshSaved(app);say(app,'Field and rules saved. Your last 3 discoveries stay on this device.');
  }catch(_){say(app,'Could not save. Device storage may be unavailable or full.');}
  finally{app.busy=false;app.saveButton.disabled=false;}
}
async function restore(app){
  const saved=readSaves()[Number(app.savedChoice.value)];if(!saved)return;
  try {const data=decode(saved);await replaceField(app,data,saved['width'],saved['height']);app.rule=model.rules(saved['rule']||{});app.generation=Number.isFinite(saved['generation'])?saved['generation']:0;app.presetChoice.value='custom';syncRules(app);say(app,'Discovery restored: same cells and rules.');}
  catch(_){say(app,'This discovery could not be restored.');}
}
async function replaceField(app,data,width,height){
  app.epoch++;app.data=data;app.scratch=new Float32Array(data.length);app.width=width;app.height=height;app.brushes=[];
  if(app.gpu && (app.gpu.width!==width||app.gpu.height!==height)){gpu.dispose(app.gpu);app.gpu=null;app.gpuCanvas.hidden=true;app.backend='CPU';}
  if(app.gpu)gpu.upload(app.gpu,data);
  else if(!app.initializing&&!app.gpuAttempted)startGPU(app);
}
function resetField(app,empty){app.generation=0;replaceField(app,empty?model.field(app.width,app.height):model.seed(app.width,app.height),app.width,app.height);}
async function startGPU(app){
  app.initializing=true;app.gpuAttempted=true;
  try {
    const r=await gpu.create(app.gpuCanvas,app.data,app.width,app.height);
    if(!r)return;
    if(app.stopped||r.width!==app.width||r.height!==app.height){gpu.dispose(r);return;}
    gpu.upload(r,app.data);app.gpu=r;app.gpuCanvas.hidden=false;app.backend='WebGPU';app.speedSlider.max=16;
  }catch(error){app.backend='CPU';app.gpuError=String(error.message);}
  finally{app.initializing=false;}
}
function paintAt(app,event){
  const bounds=app.canvas.getBoundingClientRect();
  const x=Math.max(0,Math.min(0.999,(event.clientX-bounds.left)/bounds.width));
  const y=Math.max(0,Math.min(0.999,(event.clientY-bounds.top)/bounds.height));
  const previous=app.pointer?.last;
  const distance=previous?Math.hypot((x-previous.x)*app.width,(y-previous.y)*app.height):0;
  const count=Math.max(1,Math.ceil(distance/Math.max(1,app.radius*0.6)));
  for(let n=1;n<=count;n++)app.brushes.push({x:previous?previous.x+(x-previous.x)*n/count:x,y:previous?previous.y+(y-previous.y)*n/count:y,radius:app.radius,tool:app.tool});
  if(app.pointer)app.pointer.last={x,y};
}
function create(host){
  dispose(active);
  const root=element('div','eg-root',null,host),style=element('style','',css,root);
  const canvas=element('canvas','',null,root),gpuCanvas=element('canvas','',null,root);
  canvas.setAttribute('aria-label','Emergence Garden. Draw seeds, nutrients or barriers with the selected brush.');gpuCanvas.setAttribute('aria-hidden','true');gpuCanvas.style.pointerEvents='none';gpuCanvas.hidden=true;
  const [width,height]=dimensions(window.innerWidth,window.innerHeight);
  const app={root,canvas,gpuCanvas,ctx:canvas.getContext('2d'),width,height,data:model.seed(width,height),scratch:new Float32Array(width*height*4),rule:model.rules(model.presets['reef']),speed:6,radius:4,tool:'seed',view:0,paused:false,menu:false,generation:0,epoch:0,brushes:[],backend:'CPU',gpu:null,initializing:false,stopped:false,abort:new AbortController(),lastFrame:0,lastStats:0,measuring:false,toastUntil:0};
  active=app;
  // Let colonies start to establish, while all subsequent evolution remains live.
  for(let n=0;n<100;n++){model.step(app.data,app.scratch,width,height,app.rule);[app.data,app.scratch]=[app.scratch,app.data];}app.generation=100;
  app.offscreen=document.createElement('canvas');app.offscreen.width=width;app.offscreen.height=height;app.offctx=app.offscreen.getContext('2d');
  const top=element('div','eg-top',null,root);
  app.pauseButton=button('Pause',top,()=>{app.paused=!app.paused;app.pauseButton.textContent=app.paused?'Resume':'Pause';app.pauseButton.setAttribute('aria-pressed',String(app.paused));});app.pauseButton.setAttribute('aria-pressed','false');
  app.rulesButton=button('Rules',top,()=>{app.panel.hidden=!app.panel.hidden;app.rulesButton.setAttribute('aria-expanded',String(!app.panel.hidden));});app.rulesButton.className='eg-rules-button';app.rulesButton.setAttribute('aria-expanded','false');app.rulesButton.setAttribute('aria-controls','garden-rules');
  app.status=element('div','eg-status','LOCAL CELLS / LIVE RULES',root);
  const caption=element('div','eg-caption',null,root);element('div','eg-eyebrow','A SMALL WORLD, LEFT TO ITSELF',caption);element('h1','','Emergence Garden',caption);element('p','','Paint a seed. Change a rule. See what holds together.',caption);app.stateLabel=element('p','eg-state','Establishing…',caption);
  const bottom=element('div','eg-bottom',null,root),tools=element('div','eg-tools',null,bottom);tools.setAttribute('role','group');tools.setAttribute('aria-label','Garden brushes');app.toolButtons={};
  for(const [key,title] of [['seed','Seed'],['feed','Feed'],['erase','Erase'],['wall','Wall']]){const el=button(title,tools,()=>selectTool(app,key));el.setAttribute('aria-pressed',String(key==='seed'));app.toolButtons[key]=el;}
  const view=element('select','eg-view',null,bottom);view.setAttribute('aria-label','Field view');for(const [value,title] of [['0','Living field'],['1','Activity'],['2','Nutrients']]){const option=element('option','',title,view);option.value=value;}view.addEventListener('change',()=>app.view=Number(view.value));
  app.toast=element('div','eg-toast',null,root);app.toast.hidden=true;app.toast.setAttribute('role','status');
  settingsUI(app);
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0||app.menu||app.pointer)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);app.pointer={id:event.pointerId};paintAt(app,event);});
  canvas.addEventListener('pointermove',event=>{if(app.pointer?.id!==event.pointerId||app.menu)return;event.preventDefault();paintAt(app,event);});
  const finish=event=>{if(app.pointer?.id!==event.pointerId)return;app.pointer=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,finish);
  for(const type of ['click','pointerdown','pointerup','touchstart','touchmove','touchend'])root.addEventListener(type,event=>event.stopPropagation());
  window.addEventListener('keydown',event=>{
    if(app.menu||event.ctrlKey||event.metaKey||event.altKey||event.target?.closest?.('input,select,button,summary'))return;
    if(event.repeat)return;
    if(event.code==='Space'){event.preventDefault();app.pauseButton.click();}
    if(event.key==='r'||event.key==='R')resetField(app,false);
    const tool={'1':'seed','2':'feed','3':'erase','4':'wall'}[event.key];if(tool)selectTool(app,tool);
  },{signal:app.abort.signal});
  app.observer=new MutationObserver(()=>{if(!root.isConnected)dispose(app);});app.observer.observe(host,{childList:true});
  startGPU(app);return app;
}
function selectTool(app,key){app.tool=key;for(const [name,el] of Object.entries(app.toolButtons))el.setAttribute('aria-pressed',String(name===key));}
function renderCPU(app,width,height){
  if(app.offscreen.width!==app.width||app.offscreen.height!==app.height){app.offscreen.width=app.width;app.offscreen.height=app.height;}
  const image=app.offctx.createImageData(app.width,app.height),pixels=image.data;
  for(let i=0;i<app.data.length;i+=4){
    const u=app.data[i],v=app.data[i+1],wall=app.data[i+3]>0.5;
    const ink=Math.max(0,Math.min(1,(v-0.025)/0.355)),rim=Math.exp(-Math.pow((v-0.19)*16,2)),core=Math.max(0,Math.min(1,(v-0.25)/0.3));
    let r=6+ink*14+rim*46+core*191,g=14+ink*58+rim*161+core*140,b=16+ink*49+rim*122+core*66;
    if(app.view===1){const heat=Math.min(1,app.data[i+2]*150);r=6+249*heat;g=14+108*heat;b=16+48*heat;}
    if(app.view===2){r=10+66*u;g=23+138*u;b=31+158*u;}
    if(wall){r=41;g=56;b=61;}
    pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b;pixels[i+3]=255;
  }
  app.offctx.putImageData(image,0,0);app.ctx.imageSmoothingEnabled=true;app.ctx.drawImage(app.offscreen,0,0,width,height);
}
function updateStats(app,now){
  if(now-app.lastStats<1500||app.measuring)return;app.lastStats=now;app.measuring=true;
  const epoch=app.epoch;
  currentField(app).then(data=>{
    if(app.stopped||epoch!==app.epoch)return;
    if(app.gpu)app.data=data; // Recovery checkpoint if GPU access is lost.
    const stats=model.measure(data),coverage=Math.round(stats.coverage*100);
    app.status.textContent=`${app.backend} · ${app.width} × ${app.height} CELLS · ${app.generation.toLocaleString()} STEPS`;
    app.stateLabel.textContent=app.paused?'Paused · paint or adjust the rules':stats.coverage<0.001?'Quiet field · paint a seed or change the rules':`${coverage}% coverage · ${stats.activity<0.00002?'Settling':stats.activity<0.0004?'Slowly changing':'Growing & rearranging'}`;
  }).catch(()=>{}).finally(()=>app.measuring=false);
}
function frame(app,width,height,menuOpen){
  if(!app||app.stopped)return;
  if(!app.root.isConnected){dispose(app);return;}
  app.menu=menuOpen;if(menuOpen){app.pointer=null;app.brushes=[];}
  const now=performance.now();if(app.gpu?.pending)return;if(now-app.lastFrame<30)return;app.lastFrame=now;
  if(app.canvas.width!==width||app.canvas.height!==height){app.canvas.width=width;app.canvas.height=height;app.gpuCanvas.width=width;app.gpuCanvas.height=height;}
  const paused=app.paused||menuOpen||document.hidden;
  const brushes=app.brushes.splice(0,96),steps=paused?0:Math.min(app.speed,app.gpu?16:6);
  try {
    if(app.gpu){
      gpu.frame(app.gpu,app.rule,steps,app.view,brushes);
    }else{
      for(const brush of brushes)model.paint(app.data,app.width,app.height,brush.x,brush.y,brush.radius,brush.tool);
      for(let n=0;n<steps;n++){model.step(app.data,app.scratch,app.width,app.height,app.rule);[app.data,app.scratch]=[app.scratch,app.data];}
      renderCPU(app,width,height);
    }
    app.generation+=steps;
  }catch(error){app.gpuError=String(error.message)+(app.gpu?.error?' / '+app.gpu.error:'');gpu.dispose(app.gpu);app.gpu=null;app.gpuCanvas.hidden=true;app.backend='CPU';app.speedSlider.max=6;app.speed=Math.min(6,app.speed);app.speedSlider.value=app.speed;say(app,'GPU unavailable. Continuing from the last cell checkpoint.');renderCPU(app,width,height);}
  if(now>app.toastUntil)app.toast.hidden=true;updateStats(app,now);
}
module.exports={create,frame,dispose};
