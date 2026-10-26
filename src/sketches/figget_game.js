const world = require('./figget_frontier.js');
const {createClock}=require('./figget_clock.js');
const clock=createClock();
let paused=false,dirty=false,lastSave=0,pauseButton,lastJournal;
const actionButtons=[];
const SAVE='figget-exploration-v1';
const colors={grass:'#163c37',ridge:'#38434c',pond:'#22566e',garden:'#6da478',mineral:'#d6af66',camp:'#f0dcc0',workshop:'#b69bd2',tower:'#84c8d8',haven:'#d6d995'};
const friendly='#a8e9c3',enemy='#f3a06a';
let state,panel,status,message,journal,botStatus,help,saveNote='',cachedSeen,seen,mode='walk',zoom=29,inspection='',structureCache,liberties=new Map();
const modeButtons=new Map(),directionButtons=[];
const css=`
#figget-explorer{display:none;position:fixed;z-index:15;left:16px;bottom:16px;width:min(440px,calc(100vw - 32px));height:min(400px,48dvh);max-height:48dvh;overflow:auto;box-sizing:border-box;padding:14px;background:#0b1b20f5;border:1px solid #88b8a64a;border-radius:14px;color:#dce9df;font:12px/1.45 system-ui;box-shadow:0 12px 50px #0005}
body[data-sketch='Figget-A-Balls'] #figget-explorer{display:block}
#figget-explorer h2{font-size:10px;letter-spacing:.17em;color:#9ac9b0;margin:0 0 8px}#figget-explorer p{margin:7px 0}#figget-explorer .actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}#figget-explorer button{font:inherit;background:#203d40;border:1px solid #8cbdaa55;color:#e2efe3;border-radius:7px;padding:7px 9px;cursor:pointer;touch-action:manipulation}#figget-explorer button:hover{background:#31575a}#figget-explorer button:disabled{opacity:.45;cursor:default}#figget-explorer button[aria-pressed=true]{background:#b5dbbf;color:#112d25;border-color:#d6f4d9}#figget-explorer button:focus-visible{outline:2px solid #f1cd86;outline-offset:1px}#figget-explorer small{color:#9aaca9}#figget-explorer details{margin-top:8px}#figget-explorer ol{max-height:100px;overflow:auto;padding-left:20px}#figget-explorer .directions{float:right;display:grid;grid-template-columns:repeat(3,32px);gap:3px;margin-left:8px}#figget-explorer .directions button{padding:5px}#figget-message{min-height:34px;color:#e4d3a8}#figget-bot-status{color:#f3b58e;font-size:11px}#figget-explorer .help{font-size:11px;color:#a8c5b4}#figget-explorer button.urgent{background:#753a2e;border-color:#f3b58e}
@media(max-height:550px){#figget-explorer{max-height:43dvh;padding:9px;bottom:8px}#figget-explorer details{display:none}}
`;
function element(tag,text,parent){const el=document.createElement(tag);if(text)el.textContent=text;if(parent)parent.appendChild(el);return el;}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state));saveNote='Saved on this device';}catch(_){saveNote='Storage unavailable — this session only';}dirty=false;lastSave=performance.now();}
function inactive(){return paused||document.hidden||document.body.dataset.sketch!=='Figget-A-Balls'||!!document.querySelector('dialog[open]');}
function dispatch(action){
  if(inactive())return;
  const next=world.act(state,action);if(next===state)return;
  inspection='';state=next;save();sync();
}
function update(suspended=false){
  if(!state)return;
  const stopped=suspended||inactive(),now=performance.now();
  const steps=clock.advance(now,stopped);
  if(stopped){if(dirty)save();return;}
  const oldStructures=state.frontier.structures;
  for(let i=0;i<steps;i++)state=world.step(state);
  if(oldStructures!==state.frontier.structures)inspection='';
  if(steps){dirty=true;if(now-lastSave>=2000)save();sync();}
}
function confirmAction(text){clock.reset();const accepted=window.confirm(text);clock.reset();return accepted;}
function togglePause(){paused=!paused;clock.reset();save();sync();}
function button(text,fn,parent){const b=element('button',text,parent);b.type='button';b.onclick=fn;return b;}
function tool(value){mode=value;inspection='';sync();}
function useTile(x,y){
  if(mode==='inspect'){
    const structures=state.frontier.structures,p=structures.find(p=>p.x===x&&p.y===y);
    const known=state.seen.includes(world.key(x,y));
    inspection=p?`${p.owner===1?'Your':'Bot'} ${p.kind} at ${x}, ${y}${p.kind==='outpost'?` · ${world.group(structures,p).liberties.length} group liberties`: ' · public route, no movement energy cost'}`:known?`${world.tile(x,y).name} · ${x}, ${y}`:'Unexplored ground. Walk closer to discover it.';
    sync();return;
  }
  if(mode==='walk')dispatch(x===state.x&&y===state.y?{type:'investigate'}:{type:'move',dx:x-state.x,dy:y-state.y});
  else dispatch(mode==='dismantle'?{type:'dismantle',x,y}:{type:'build',kind:mode,x,y});
}
function setup(){
  state=world.fresh();mode='walk';inspection='';saveNote='Local save ready';paused=false;dirty=false;clock.reset();lastSave=performance.now();
  try{const raw=localStorage.getItem(SAVE);if(raw){const loaded=JSON.parse(raw);if(world.valid(loaded)){state=world.upgrade(loaded);saveNote='Resumed saved world';}else saveNote='Invalid save ignored';}}
  catch(_){saveNote='Save unavailable — starting a new expedition';}
  if(!document.getElementById('figget-explorer')){
    element('style',css,document.head);
    panel=element('section',null,document.body);panel.id='figget-explorer';panel.setAttribute('aria-label','Exploration and building controls');
    element('h2','FIGGET-A-BALLS / REALTIME FRONTIER',panel);
    pauseButton=button('Pause',togglePause,panel);pauseButton.id='figget-pause';
    const directions=element('div',null,panel);directions.className='directions';
    for(const [label,dx,dy,name] of [['',0,0,''],['↑',0,-1,'north'],['',0,0,''],['←',-1,0,'west'],['↓',0,1,'south'],['→',1,0,'east']]){
      if(!label){element('span','',directions);continue;}
      const b=button(label,()=>useTile(state.x+dx,state.y+dy),directions);directionButtons.push({b,name});
    }
    status=element('p','',panel);message=element('p','',panel);message.id='figget-message';message.setAttribute('aria-live','polite');
    botStatus=element('p','',panel);botStatus.id='figget-bot-status';
    const tools=element('div',null,panel);tools.className='actions';tools.setAttribute('role','group');tools.setAttribute('aria-label','Map tool');
    for(const [label,value] of [['Walk','walk'],['Outpost · 2 wood','outpost'],['Path · 1 wood','path'],['Inspect','inspect'],['Remove','dismantle']])modeButtons.set(value,button(label,()=>tool(value),tools));
    help=element('p','',panel);help.className='help';
    const actions=element('div',null,panel);actions.className='actions';
    for(const [label,type] of [['Gather wood','gather'],['Rest','rest'],['Investigate','investigate'],['Eat fruit','eat']]){
      const b=button(label,()=>dispatch({type}),actions);actionButtons.push(b);if(type==='rest')b.id='figget-rest';
    }
    actionButtons.push(button('Retreat to camp',()=>{if(confirmAction('Return to your safe camp and lose half your timber?'))dispatch({type:'retreat'});},actions));
    const details=element('details',null,panel);element('summary','Rules, journal & map controls',details);
    element('p','You are mint; the orange dot is one local bot. It acts independently every 1.5 seconds, even when you stand still. Pause freezes both characters. The sketch menu, hidden tabs and other sketches pause automatically, with no offline catch-up. Arrows/WASD always walk; map taps and on-screen directions use the selected tool.',details);
    element('p','Movement has a 0.25s cooldown; building and gathering take 1.5s between actions. You can inspect and choose tools while waiting. Build only beside your character (north/south/east/west). Outposts cost 2 wood; paths cost 1. Gather salvages 3 wood anywhere, up to 30. Everyone can use paths to travel without spending energy. Enemy outposts block movement; friendly ones do not.',details);
    element('p','Connected outposts share liberties: empty orthogonal neighbors. Zero liberties captures the group. Diagonals do not connect. Paths do not form walls. New outposts cannot be suicidal. Inspect shows exact liberty counts.',details);
    element('p','A character with no walkable route out of an enemy fence is besieged. After 12 seconds continuously trapped, it is defeated and respawns at its own camp with half its wood. Both camps and their four entrances are protected refuges: enemies cannot enter or build there. Your discoveries and other resources survive. Retreat is always available.',details);
    element('p','The bot follows you when nearby, tries to close exits, and expands near its camp otherwise. It has the same building costs. Terrain is procedural, not imported city data. This prototype has a 256-structure total limit and no shared online world yet.',details);
    const mapActions=element('div',null,details);mapActions.className='actions';
    button('Zoom out',()=>{zoom=Math.max(14,zoom-5);},mapActions);button('Zoom in',()=>{zoom=Math.min(49,zoom+5);},mapActions);
    button('Mark place',()=>dispatch({type:'mark'}),mapActions);
    button('New expedition',()=>{if(confirmAction('Erase your local world, buildings and discoveries?')){state=world.fresh();mode='walk';inspection='';paused=false;clock.reset();save();sync();}},mapActions);
    journal=element('ol','',details);element('small','',panel).id='figget-save';
    const suspend=()=>{clock.reset();if(state&&dirty)save();};
    document.addEventListener('visibilitychange',suspend);
    window.addEventListener('pagehide',suspend);
    new MutationObserver(()=>{if(document.body.dataset.sketch!=='Figget-A-Balls')suspend();}).observe(document.body,{attributes:true,attributeFilter:['data-sketch']});
    document.addEventListener('keydown',event=>{
      if(document.body.dataset.sketch==='Figget-A-Balls'&&!document.querySelector('dialog[open]')&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)&&!event.target.closest('input,textarea,select'))event.preventDefault();
    });
  }
  sync();return {};
}
function text(node,value){if(node.textContent!==value)node.textContent=value;}
function sync(){
  const f=state.frontier;
  text(pauseButton,paused?'Resume':'Pause');pauseButton.setAttribute('aria-pressed',String(paused));
  actionButtons.forEach(b=>{b.disabled=paused;});
  text(status,`${state.x}, ${state.y} · Energy ${state.energy} · Wood ${f.timber}/30 · Ore ${state.ore} · Fruit ${state.fruit} · ${f.cooldownMs?`Ready in ${(f.cooldownMs/1000).toFixed(1)}s`:'Ready'}`);
  text(message,f.siege?`SURROUNDED: ${Math.ceil((world.SIEGE_MS-f.siege)/1000)}s until defeat. Escape or retreat to camp.`:inspection||state.message);
  text(botStatus,`${paused?'PAUSED':'LIVE'} · ${Math.floor(f.elapsedMs/1000)}s · ${f.botMessage}${f.botSiege?` Bot surrounded: ${Math.ceil((world.SIEGE_MS-f.botSiege)/1000)}s left.`:''} Captured: you ${f.captures}, bot ${f.botCaptures}. Defeats: you ${f.defeats}, bot ${f.botDefeats}.`);
  const instructions={walk:'Tap to step towards a tile. Select Outpost or Path to build beside yourself.',outpost:'BUILD OUTPOST: tap one tile beside YOU, or use the direction buttons. Costs 2 wood.',path:'BUILD PATH: tap one tile beside YOU, or use the direction buttons. Costs 1 wood.',inspect:'Tap any structure to inspect its shared liberties. The bot keeps acting while you inspect; use Pause to plan safely.',dismantle:'Tap your current or adjacent structure to dismantle it and recover 1 wood.'};
  help.textContent=paused?'PAUSED — both characters are frozen. Resume to move or build.':instructions[mode];
  modeButtons.forEach((b,m)=>b.setAttribute('aria-pressed',String(mode===m)));
  for(const {b,name} of directionButtons){b.disabled=paused&&mode!=='inspect';b.setAttribute('aria-label',`${mode==='walk'?'Move':mode==='outpost'?'Build outpost':mode==='path'?'Build path':mode==='inspect'?'Inspect':'Remove'} ${name}`);}
  const rest=document.getElementById('figget-rest');rest.classList.toggle('urgent',state.energy<2);rest.textContent=state.energy<2?'Rest — exhausted':'Rest';
  if(lastJournal!==state.journal){journal.replaceChildren();state.journal.forEach(text=>element('li',text,journal));lastJournal=state.journal;}
  document.getElementById('figget-save').textContent=`You + 1 bot · ${saveNote}`;
}
function layout(w,h){return {size:w<600?Math.min(zoom,24):zoom,cx:w/2,cy:Math.max(130,(h-(panel?panel.offsetHeight:300))/2+25)};}
function draw(ctx,w,h){
  if(!state||!ctx)return;
  const {size,cx,cy}=layout(w,h),f=state.frontier;
  const screen=p=>({x:cx+(p.x-state.x)*size,y:cy+(p.y-state.y)*size});
  ctx.fillStyle='#08191f';ctx.fillRect(0,0,w,h);
  if(cachedSeen!==state.seen){cachedSeen=state.seen;seen=new Set(state.seen);}
  const rx=Math.ceil(w/size/2)+1,ry=Math.ceil(h/size)+1;
  for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++){
    const x=state.x+dx,y=state.y+dy,px=cx+dx*size,py=cy+dy*size;
    if(x<0||y<0||x>=world.SIZE||y>=world.SIZE||py<0||py>h)continue;
    if(!seen.has(world.key(x,y))){ctx.fillStyle='#10252b';ctx.fillRect(px-1,py-1,2,2);continue;}
    const t=world.tile(x,y),near=dx*dx+dy*dy<=(state.scanner?100:49);
    ctx.globalAlpha=near?1:.42;ctx.fillStyle=colors[t.type];
    if(!['grass','ridge','pond'].includes(t.type)){
      ctx.fillRect(px-3,py-3,6,6);
      if(['camp','workshop','tower','haven'].includes(t.type)){ctx.strokeStyle=colors[t.type];ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);ctx.stroke();}
    }else ctx.fillRect(px-size/2+1,py-size/2+1,size-2,size-2);
    ctx.globalAlpha=1;
  }
  if(structureCache!==f.structures){
    structureCache=f.structures;liberties=new Map();
    for(const p of f.structures)if(p.kind==='outpost'&&!liberties.has(world.key(p.x,p.y))){const g=world.group(f.structures,p);for(const stone of g.stones)liberties.set(world.key(stone.x,stone.y),g.liberties.length);}
  }
  // All local tactical objects remain visible, even on uncharted terrain.
  for(const p of f.structures){
    const pos=screen(p);if(pos.x<-size||pos.x>w+size||pos.y<-size||pos.y>h+size)continue;
    ctx.strokeStyle=p.owner===1?friendly:enemy;ctx.lineWidth=p.kind==='path'?2:3;
    if(p.kind==='path'){
      ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(pos.x-size/3,pos.y);ctx.lineTo(pos.x+size/3,pos.y);ctx.stroke();ctx.setLineDash([]);
    }else{
      ctx.fillStyle=p.owner===1?'#285c46':'#70442c';ctx.fillRect(pos.x-size*.34,pos.y-size*.34,size*.68,size*.68);ctx.strokeRect(pos.x-size*.34,pos.y-size*.34,size*.68,size*.68);
      if(size>=22){const n=liberties.get(world.key(p.x,p.y));ctx.fillStyle=n===1?'#ffdf6b':'#f1f6eb';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText(String(n),pos.x,pos.y+3);}
    }
  }
  ctx.lineWidth=1;
  for(const [home,color,label] of [[f.home,friendly,'YOUR CAMP'],[f.botHome,enemy,'BOT CAMP']]){
    const p=screen(home);ctx.strokeStyle=color;ctx.strokeRect(p.x-size*.45,p.y-size*.45,size*.9,size*.9);ctx.fillStyle=color;ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(label,p.x,p.y+size*.8);
  }
  if(['outpost','path','dismantle'].includes(mode)){
    ctx.strokeStyle='#e8d18c';ctx.setLineDash([3,3]);
    for(const n of world.neighbors(state)){const p=screen(n);ctx.strokeRect(p.x-size*.45,p.y-size*.45,size*.9,size*.9);}ctx.setLineDash([]);
  }
  ctx.strokeStyle='#f3d28c';for(const p of state.markers){const pos=screen(p);ctx.beginPath();ctx.moveTo(pos.x,pos.y-9);ctx.lineTo(pos.x+9,pos.y);ctx.lineTo(pos.x,pos.y+9);ctx.lineTo(pos.x-9,pos.y);ctx.closePath();ctx.stroke();}
  for(const [actor,color,label,siege] of [[f.bot,enemy,'BOT',f.botSiege],[state,friendly,'YOU',f.siege]]){
    const p=screen(actor);ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(label+(siege?` · SIEGE ${Math.ceil((world.SIEGE_MS-siege)/1000)}s`:''),p.x,p.y-13);
  }
  ctx.font='10px monospace';ctx.textAlign='right';ctx.fillStyle='#a4c3b9';ctx.fillText(paused?'PAUSED':'REALTIME · YOU + ONE BOT',w-15,82);ctx.fillText(`${state.seen.length} charted / ${(world.SIZE*world.SIZE).toLocaleString()} tiles`,w-15,98);
  const dx=f.bot.x-state.x,dy=f.bot.y-state.y;ctx.fillStyle=enemy;ctx.fillText(`BOT ${Math.abs(dx)}${dx<0?'W':'E'} ${Math.abs(dy)}${dy<0?'N':'S'} · ${f.structures.length}/${world.MAX_STRUCTURES} structures`,w-15,114);
  ctx.textAlign='left';ctx.fillStyle='#9ac9b0';ctx.fillText('N ↑',16,98);
}
function click(x,y,w,h){
  if(document.querySelector('dialog[open]'))return;
  const target=document.elementFromPoint(x,y);if(target&&target.closest('#figget-explorer,#euclid-nav,#euclid-menu'))return;
  const {size,cx,cy}=layout(w,h);useTile(state.x+Math.round((x-cx)/size),state.y+Math.round((y-cy)/size));
}
function keypress(key){
  if(document.querySelector('dialog[open]'))return;
  if(document.activeElement&&document.activeElement.closest('input,textarea,select,#euclid-nav,#euclid-menu'))return;
  const keys={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  if(keys[key])dispatch({type:'move',dx:keys[key][0],dy:keys[key][1]});
  else if(key==='e')dispatch({type:'investigate'});
  else if(key==='b')tool(mode==='outpost'?'walk':'outpost');
}
module.exports={setup,update,draw,click,keypress};
