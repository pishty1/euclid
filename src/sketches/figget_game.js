const world = require('./figget_world.js');
const siege = require('./figget_siege_ui.js');
const SAVE='figget-exploration-v1';
const colors={grass:'#163c37',ridge:'#38434c',pond:'#22566e',garden:'#6da478',mineral:'#d6af66',camp:'#f0dcc0',workshop:'#b69bd2',tower:'#84c8d8',haven:'#d6d995'};
let state, panel, status, message, journal, saveNote='', cachedSeen, seen;
const css=`
#figget-explorer{display:none;position:fixed;z-index:15;left:16px;bottom:16px;width:min(410px,calc(100vw - 32px));box-sizing:border-box;padding:16px;background:#0b1b20f2;border:1px solid #88b8a64a;border-radius:14px;color:#dce9df;font:12px/1.5 system-ui;box-shadow:0 12px 50px #0005}
body[data-sketch='Figget-A-Balls'] #figget-explorer{display:block}
#figget-explorer h2{font-size:11px;letter-spacing:.2em;color:#9ac9b0;margin:0 0 8px}#figget-explorer p{margin:8px 0}#figget-explorer .actions{display:flex;gap:6px;flex-wrap:wrap}#figget-explorer button{font:inherit;background:#203d40;border:1px solid #8cbdaa55;color:#e2efe3;border-radius:7px;padding:8px 11px;cursor:pointer;touch-action:manipulation}#figget-explorer button:hover{background:#31575a}#figget-explorer button:focus-visible{outline:2px solid #f1cd86}#figget-explorer small{color:#9aaca9}#figget-explorer details{margin-top:8px}#figget-explorer ol{max-height:110px;overflow:auto;padding-left:20px}#figget-explorer .directions{float:right;display:grid;grid-template-columns:repeat(3,32px);gap:3px;margin-left:10px}#figget-explorer .directions button{padding:4px}#figget-message{min-height:36px} @media(max-height:560px){#figget-explorer{padding:9px;bottom:8px}#figget-explorer details,#figget-explorer .help{display:none}}
`;
function element(tag,text,parent) { const el=document.createElement(tag);if(text)el.textContent=text;if(parent)parent.appendChild(el);return el; }
function save() {
  try {localStorage.setItem(SAVE,JSON.stringify(state));saveNote='Saved on this device';}
  catch(_) {saveNote='Storage unavailable — progress lasts this session only';}
}
function dispatch(action) {state=world.act(state,action);save();sync();}
function button(text,action,parent) {const b=element('button',text,parent);b.type='button';b.onclick=()=>dispatch(action);return b;}
function setup() {
  state=world.fresh();saveNote='Saved on this device';
  try {const raw=localStorage.getItem(SAVE);if(raw){const loaded=JSON.parse(raw);if(world.valid(loaded))state=loaded;else saveNote='Old or invalid save ignored';}}
  catch(_) {saveNote='Save unavailable — starting a new expedition';}
  if(!document.getElementById('figget-explorer')) {
    element('style',css,document.head);
    panel=element('section',null,document.body);panel.id='figget-explorer';panel.setAttribute('aria-label','Exploration controls');
    element('h2','FIGGET-A-BALLS / THE QUIET ATLAS',panel);
    const directions=element('div',null,panel);directions.className='directions';
    element('span','',directions);button('↑',{type:'move',dx:0,dy:-1},directions).setAttribute('aria-label','Move north');element('span','',directions);
    button('←',{type:'move',dx:-1,dy:0},directions).setAttribute('aria-label','Move west');button('↓',{type:'move',dx:0,dy:1},directions).setAttribute('aria-label','Move south');button('→',{type:'move',dx:1,dy:0},directions).setAttribute('aria-label','Move east');
    status=element('p','',panel);
    message=element('p','',panel);message.id='figget-message';message.setAttribute('aria-live','polite');
    const actions=element('div',null,panel);actions.className='actions';
    [['Investigate','investigate'],['Rest','rest'],['Eat fruit','eat'],['Mark place','mark']].forEach(([label,type])=>button(label,{type},actions));
    const encounter=element('button','Play vs bot',actions);encounter.type='button';encounter.onclick=()=>siege.open();
    const help=element('p','Tap terrain to step towards it · Arrows / WASD move · E investigates',panel);help.className='help';
    const details=element('details',null,panel);element('summary','Field journal & map key',details);
    element('p','Gold: ore · Green: orchard · Blue: water · Rings: places · Diamond: your marker. No other players are connected in this local prototype.',details);
    journal=element('ol',null,details);
    const reset=element('button','New expedition',details);reset.type='button';reset.onclick=()=>{if(window.confirm('Erase your local expedition and start again?')){state=world.fresh();save();sync();}};
    element('small','',panel).id='figget-save';
  }
  sync();return {};
}
function sync() {
  status.textContent=`${state.x}, ${state.y} · Energy ${state.energy} · Ore ${state.ore} · Fruit ${state.fruit}${state.scanner?' · Scanner ✓':''}`;
  message.textContent=state.message;
  journal.replaceChildren();state.journal.forEach(text=>element('li',text,journal));
  document.getElementById('figget-save').textContent=`Solo expedition · ${saveNote}`;
}
function layout(w,h) {return {size:w<600?23:29,cx:w/2,cy:Math.max(100,(h-(panel?panel.offsetHeight:230))/2+30)};}
function draw(ctx,w,h) {
  if(!state||!ctx)return;
  const {size,cx,cy}=layout(w,h);
  ctx.fillStyle='#08191f';ctx.fillRect(0,0,w,h);
  if(cachedSeen!==state.seen){cachedSeen=state.seen;seen=new Set(state.seen);}
  const rx=Math.ceil(w/size/2)+1,ry=Math.ceil(h/size)+1;
  for(let dy=-ry;dy<=ry;dy++)for(let dx=-rx;dx<=rx;dx++) {
    const x=state.x+dx,y=state.y+dy,px=cx+dx*size,py=cy+dy*size;
    if(x<0||y<0||x>=world.SIZE||y>=world.SIZE||py<0||py>h)continue;
    const known=seen.has(world.key(x,y));
    if(!known){ctx.fillStyle='#10252b';ctx.fillRect(px-1,py-1,2,2);continue;}
    const t=world.tile(x,y),near=dx*dx+dy*dy<=(state.scanner?49:16);
    ctx.globalAlpha=near?1:.42;
    ctx.fillStyle=colors[t.type];
    const special=!['grass','ridge','pond'].includes(t.type);
    if(special){ctx.fillRect(px-4,py-4,8,8);if(['camp','workshop','tower','haven'].includes(t.type)){ctx.strokeStyle=colors[t.type];ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.stroke();}}
    else ctx.fillRect(px-size/2+1,py-size/2+1,size-2,size-2);
    ctx.globalAlpha=1;
  }
  ctx.strokeStyle='#f3d28c';state.markers.forEach(p=>{const x=cx+(p.x-state.x)*size,y=cy+(p.y-state.y)*size;ctx.beginPath();ctx.moveTo(x,y-10);ctx.lineTo(x+10,y);ctx.lineTo(x,y+10);ctx.lineTo(x-10,y);ctx.closePath();ctx.stroke();});
  ctx.shadowColor='#c3ffe4';ctx.shadowBlur=16;ctx.fillStyle='#edfff4';ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.font='11px monospace';ctx.textAlign='center';ctx.fillStyle='#dce9df';ctx.fillText('YOU',cx,cy-15);
  ctx.textAlign='right';ctx.fillStyle='#8eb2ac';ctx.fillText('THE QUIET ATLAS',w-18,85);ctx.fillText(`${state.seen.length} tiles charted / 262,144`,w-18,103);
  ctx.textAlign='left';ctx.fillStyle='#9ac9b0';ctx.fillText('N ↑',18,100);
}
function click(x,y,w,h) {
  if(document.querySelector('#figget-siege[open]'))return;
  const target=document.elementFromPoint(x,y);
  if(target&&target.closest('#figget-explorer,#euclid-nav,#euclid-menu'))return;
  const {size,cx,cy}=layout(w,h);const dx=Math.round((x-cx)/size),dy=Math.round((y-cy)/size);
  dispatch(dx||dy?{type:'move',dx,dy}:{type:'investigate'});
}
function keypress(key) {
  if(document.querySelector('#figget-siege[open]'))return;
  if(document.activeElement&&document.activeElement.closest('#figget-explorer,#euclid-nav,#euclid-menu'))return;
  const keys={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  if(keys[key])dispatch({type:'move',dx:keys[key][0],dy:keys[key][1]});
  else if(key==='e')dispatch({type:'investigate'});
}
module.exports={setup,draw,click,keypress};
