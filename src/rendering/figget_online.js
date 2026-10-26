const solo=require('../sketches/figget_game.js');
let active=null;
const palette={'wood':'#87c897','food':'#e0bb73','ore':'#9cace8'};
const css=`
.fw-root{position:absolute;inset:0;z-index:2;pointer-events:none;color:#e3f0e7;font:12px/1.5 system-ui}.fw-root *{box-sizing:border-box}.fw-root canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;touch-action:none}.fw-root button,.fw-root a{font:inherit;color:#dceee5;background:#173439ed;border:1px solid #8bbaa850;border-radius:8px;padding:8px 11px;min-height:38px;cursor:pointer;touch-action:manipulation;text-decoration:none}.fw-root button:disabled{opacity:.45;cursor:default}.fw-root :focus-visible{outline:2px solid #f0d48b;outline-offset:2px}.fw-root [hidden]{display:none!important}.fw-top{position:absolute;right:max(12px,env(safe-area-inset-right));top:calc(max(12px,env(safe-area-inset-top)) + 2px);display:flex;gap:6px;pointer-events:auto}.fw-status{position:absolute;top:calc(max(12px,env(safe-area-inset-top)) + 58px);left:16px;right:12px;font:11px/1.6 monospace;color:#b8d3cb;text-shadow:0 1px 5px #000}.fw-panel{position:absolute;right:12px;top:calc(max(12px,env(safe-area-inset-top)) + 100px);width:min(340px,calc(100% - 24px));max-height:calc(100% - 125px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;pointer-events:auto;background:#0c2029f5;border:1px solid #8bbaa83a;border-radius:15px;padding:16px;box-shadow:0 20px 60px #0005}.fw-panel{z-index:3}.fw-panel h2{font:26px Georgia,serif;margin:4px 0 10px}.fw-panel p{color:#a8c6bf}.fw-panel button{display:block;text-align:left;width:100%;margin:6px 0}.fw-panel .fw-tabs{display:flex;gap:4px;position:sticky;top:-16px;background:#0c2029;padding:8px 0}.fw-tabs button{width:auto}.fw-panel button[aria-pressed=true]{border-color:#e0c17b;color:#f0d596}.fw-panel small{display:block;color:#88a9a7;font:10px/1.6 monospace}.fw-panel .fw-new{border-left:3px solid #e0c17b}.fw-dock{position:absolute;left:max(10px,env(safe-area-inset-left));bottom:calc(10px + env(safe-area-inset-bottom));width:min(370px,calc(100% - 20px));background:#0d242be8;border:1px solid #84b49e45;border-radius:14px;padding:12px;pointer-events:auto;max-height:44%;overflow:auto;overscroll-behavior:contain}.fw-dock p{margin:3px 0 7px}.fw-actions{display:flex;gap:5px;flex-wrap:wrap}.fw-directions{display:grid;grid-template-columns:repeat(3,38px);gap:4px;float:right;margin:0 0 7px 8px}.fw-directions button{padding:4px}.fw-caption{font:10px monospace;color:#8ab3ab;margin-top:8px!important}.fw-message{color:#efd094}.fw-welcome{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);max-width:430px;width:calc(100% - 32px);max-height:65%;overflow:auto;background:#0c2029f5;border:1px solid #91bda54d;border-radius:18px;padding:24px;pointer-events:auto}.fw-welcome h1{font:34px Georgia,serif;margin:0 0 12px}.fw-welcome p{color:#b2cac4}.fw-welcome button,.fw-welcome a{display:inline-block;margin:4px 4px 4px 0}body[data-figget-mode=online] #figget-explorer{display:none!important}
@media(max-width:600px){.fw-top{top:calc(max(12px,env(safe-area-inset-top)) + 54px)}.fw-top button{padding:6px 8px;font-size:11px}.fw-status{top:calc(max(12px,env(safe-area-inset-top)) + 104px);font-size:10px}.fw-panel{top:calc(max(12px,env(safe-area-inset-top)) + 147px);max-height:calc(100% - 170px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}.fw-welcome{top:52%;padding:20px}.fw-dock{font-size:11px;padding:10px}.fw-actions button{font-size:11px;padding:6px 8px}.fw-dock .fw-caption{font-size:9px}}
`;
function el(tag,text,parent){const n=document.createElement(tag);if(text!==null)n.textContent=text;if(parent)parent.appendChild(n);return n;}
function button(label,parent,fn){const n=el('button',label,parent);n.type='button';n.addEventListener('click',fn);return n;}
function age(t,now){const s=Math.max(0,Math.floor(now-t));return s<60?'just now':s<3600?Math.floor(s/60)+'m ago':s<86400?Math.floor(s/3600)+'h ago':Math.floor(s/86400)+'d ago';}
function storageGet(key){try{return localStorage.getItem(key);}catch(_){return null;}}
function checkpoint(a){if(!a['world'])return;try{localStorage.setItem('figget-visited-'+a['world']['me']['id'],String(a['world']['events'].at(-1)?.['id']||0));}catch(_){}}
function setMessage(a,text){a.message.textContent=text;}
function camera(a,x,y){a.camera={'x':x,'y':y};a.overview=false;}
function requestId(){return crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');}
async function json(a,url,options={}){
 const response=await fetch(url,Object.assign({'credentials':'same-origin','cache':'no-store','signal':a.abort.signal},options));
 const body=await response.json();if(!response.ok)throw new Error(body['message']||'Connection failed ('+response.status+').');return body;
}
function apply(a,result){
 const w=result['world'];if(!w||w['version']!==1||!w['me'])throw new Error('This game needs Figget World plugin version 0.1.');
 if(a['world']&&w['revision']<a['world']['revision'])return;
 if(a.visited===null)a.visited=Number(storageGet('figget-visited-'+w['me']['id']))||0;
 const old=a['world'];a['world']=w;a.received=Date.now();a.warning='';
 if(!old||old['me']['x']!==w['me']['x']||old['me']['y']!==w['me']['y'])camera(a,w['me']['x'],w['me']['y']);
 a.welcome.hidden=true;a.dock.hidden=false;
 if(result['message'])setMessage(a,result['message']);
 sync(a);renderPanel(a);
}
async function send(a,route,body){
 if(a.pending||a.disposed||!a.session||a.menu||document.hidden)return;
 a.pending=true;sync(a);
 try{
  const result=await json(a,a.session['api']+route,{'method':'POST','headers':{'Content-Type':'application/json','X-WP-Nonce':a.session['nonce']},'body':JSON.stringify(body)});
  if(!a.disposed&&a.mode==='online')apply(a,result);
 }catch(e){if(!a.disposed){a.warning='Connection interrupted. Your last action may have completed; refresh before repeating it.';setMessage(a,e.message);}}
 finally{a.pending=false;a.nextPoll=performance.now()+8000;if(!a.disposed)sync(a);}
}
function act(a,type,x=null,y=null){if(a['world'])send(a,'action',{'request':requestId(),'action':{'type':type,'x':x,'y':y}});}
async function connect(a){
 if(a.connecting||a.disposed)return;a.connecting=true;a.connectButton.disabled=true;
 a.connection.textContent='Checking the WordPress world…';
 try{
  const data=await json(a,new URL('/wp-admin/admin-ajax.php?action=figget_session',location.origin));
  if(a.disposed||a.mode!=='online')return;
  if(!data['loggedIn']){
   a.connection.textContent='Use your WordPress account to enter the shared world. Your location and actions will be visible to other players.';
   const link=el('a','Sign in to enter',a.welcome);link.href=data['login'];a.connectButton.textContent='I’m signed in · retry';return;
  }
  const api=new URL(data['api'],location.origin);
  if(api.origin!==location.origin||!(api.pathname.endsWith('/figget/v1/')||(api.searchParams.get('rest_route')||'').endsWith('/figget/v1/')))throw new Error('Invalid game server address.');
  a.session=data;a.mode='online';document.body.dataset['figgetMode']='online';
  await send(a,'sync',{});
  if(!a['world'])a.connection.textContent='The world could not be loaded. Try connecting again.';
 }catch(e){if(!a.disposed)a.connection.textContent='The shared world is not available yet. Try again later, or play the solo expedition.';}
 finally{a.connecting=false;if(!a.disposed)a.connectButton.disabled=false;}
}
function selected(a){return a.selected||{'x':a['world']['me']['x'],'y':a['world']['me']['y']};}
function sync(a){
 const w=a['world'];if(!w||a.mode==='solo'){a.status.textContent=a.mode==='solo'?'SOLO EXPEDITION · saved on this device':'';return;}
 const p=w['me'],online=w['players'].filter(p=>p['online']).length,now=Date.now();
 a.status.textContent=`${a.warning||`${online} online · ${w['players'].length} explorers · synced ${age(a.received/1000,now/1000)}`}\n${p['name']} · ${p['health']} health · Wood ${p['bag']['wood']} / Food ${p['bag']['food']} / Ore ${p['bag']['ore']}`;
 a.status.style.whiteSpace='pre-line';
 const t=selected(a),n=w['nodes'].find(n=>n['x']===t['x']&&n['y']===t['y']),b=w['buildings'].find(b=>b['x']===t['x']&&b['y']===t['y']),visitors=w['players'].filter(p=>p['x']===t['x']&&p['y']===t['y']);
 a.tileInfo.textContent=`${t['x']}, ${t['y']} · ${b?`${b['name']}’s depot · ${b['food']}/30 food`:n?`${n['kind']} · ${n['stock']}/8 remaining${n['kind']==='ore'?' · hazardous':''}`:'Open ground'}${visitors.length?' · '+visitors.map(p=>p['name']).join(', '):''}`;
 const near=Math.abs(p['x']-t['x'])+Math.abs(p['y']-t['y'])<=1;
 a.gather.disabled=a.pending||!near||!n;a.build.disabled=a.pending||!near||!!n||!!b;
 a.deposit.disabled=a.use.disabled=a.pending||!near||!b;a.eat.disabled=a.pending||p['bag']['food']<1||p['health']>=100;
 a.directions.forEach(b=>b.disabled=a.pending);a.walk.disabled=a.pending||(p['x']===t['x']&&p['y']===t['y']);
}
function renderPanel(a){
 if(a.panel.hidden||!a['world'])return;
 const content=a.panelContent,scroll=a.panel.scrollTop;content.replaceChildren();const w=a['world'];
 if(a.tab==='activity'){
  el('h2','The world remembers',content);
  const fresh=w['events'].filter(e=>e['id']>a.visited).length;
  el('p',`${fresh} recent events since your previous visit. Latest 200 events retained. Select an event to find its location.`,content);
  for(const e of [...w['events']].reverse()){
   const b=button(`${e['actor']} ${e['text']}`,content,()=>{a.selected={'x':e['x'],'y':e['y']};camera(a,e['x'],e['y']);a.panel.hidden=true;sync(a);});
   if(e['id']>a.visited)b.className='fw-new';el('small',`${e['x']}, ${e['y']} · ${age(e['time'],w['time'])}`,b);
  }
 }else if(a.tab==='people'){
  el('h2','People & places',content);el('p','Filled mint markers: recently online. Hollow markers: last known positions. Offline characters do not block movement.',content);
  for(const p of [...w['players']].sort((p,q)=>Number(q['online'])-Number(p['online'])||q['seen']-p['seen'])){
   const b=button(`${p['online']?'●':'○'} ${p['name']}${p['id']===w['me']['id']?' · you':''}`,content,()=>{camera(a,p['x'],p['y']);a.selected={'x':p['x'],'y':p['y']};a.panel.hidden=true;sync(a);});
   el('small',`${p['x']}, ${p['y']} · ${p['online']?'online / active within 90s':'last seen '+age(p['seen'],w['time'])}`,b);
  }
  el('h2','Public depots',content);
  for(const b of w['buildings']){const n=button(`${b['name']} · ${b['food']}/30 food`,content,()=>{camera(a,b['x'],b['y']);a.selected={'x':b['x'],'y':b['y']};a.panel.hidden=true;sync(a);});el('small',`${b['x']}, ${b['y']} · built ${age(b['built'],w['time'])}`,n);}
 }else{
  el('h2','A shared frontier',content);
  for(const text of ['This is one persistent world, not a timed match. It refreshes every eight seconds while visible; actions return an immediate update. Nobody needs to stay online to keep buildings and supplies.', 'Select a map tile to inspect it. Arrows / WASD move one tile; Walk towards moves one step towards the selected tile. World map shows all 48 × 48 tiles. Me returns to your character.', 'Green: wood. Gold: food. Blue: ore. Gather beside a node; each holds eight units and regenerates one every two minutes. Carry up to 30 units.', 'Mining costs 15 health per ore. Eat food to recover 30 health. At zero health, respawn at 24, 24 with half your carried resources lost. There is no player combat in this version.', 'Build a public depot beside you for 8 wood and 2 ore. Own up to eight depots. Anyone can supply food or eat from a stocked depot, even while the owner is offline. Contributions are a record, not currency or a competitive score.', 'Player names, last known locations, depot ownership and recent activity are shared with signed-in players. Offline markers are not live locations. There are no hidden players or private depots yet.', 'Buildings persist without decay in this first version. There are no markets, contracts, sieges or autonomous factories yet. This WordPress prototype is for modest populations, not a real-time MMO.'])el('p',text,content);
 }
 a.panel.scrollTop=scroll;
}
function create(host){
 if(active)dispose(active);if(!document.getElementById('figget-online-style')){const s=el('style',css,document.head);s['id']='figget-online-style';}
 const root=el('section',null,host);root.className='fw-root';root.setAttribute('aria-label','Figget shared world');
 const a={root,canvas:el('canvas',null,root),abort:new AbortController(),'world':null,session:null,pending:false,disposed:false,mode:'online',menu:false,camera:{'x':24,'y':24},selected:null,overview:false,nextPoll:Infinity,visited:null,tab:'activity',directions:[]};active=a;document.body.dataset['figgetMode']='online';
 a.ctx=a.canvas.getContext('2d');
 const top=el('div',null,root);top.className='fw-top';
 button('World map',top,()=>{a.overview=!a.overview;});button('Me',top,()=>{if(a['world'])camera(a,a['world']['me']['x'],a['world']['me']['y']);});
 a.activityButton=button('Activity',top,()=>{a.panel.hidden=!a.panel.hidden;renderPanel(a);});a.activityButton.setAttribute('aria-controls','figget-world-panel');
 button('Online / solo',top,()=>{a.welcome.hidden=!a.welcome.hidden;});
 a.status=el('div',null,root);a.status.className='fw-status';
 a.panel=el('section',null,root);a.panel.className='fw-panel';a.panel['id']='figget-world-panel';a.panel.hidden=true;
 const tabs=el('div',null,a.panel);tabs.className='fw-tabs';
 for(const [key,title]of [['activity','Activity'],['people','People'],['guide','Guide']]){const b=button(title,tabs,()=>{a.tab=key;for(const n of tabs.children)n.setAttribute('aria-pressed',String(n===b));renderPanel(a);});b.setAttribute('aria-pressed',String(key===a.tab));}
 button('Close',tabs,()=>a.panel.hidden=true);a.panelContent=el('div',null,a.panel);
 a.dock=el('section',null,root);a.dock.className='fw-dock';a.dock.hidden=true;
 const directions=el('div',null,a.dock);directions.className='fw-directions';
 for(const [label,dx,dy]of [['',0,0],['↑',0,-1],['',0,0],['←',-1,0],['↓',0,1],['→',1,0]]){
  if(!label){el('span',null,directions);continue;}const b=button(label,directions,()=>move(a,dx,dy));b.setAttribute('aria-label',{'↑':'Move north','↓':'Move south','←':'Move west','→':'Move east'}[label]);a.directions.push(b);
 }
 a.tileInfo=el('p',null,a.dock);a.message=el('p','Select a tile to inspect. Use arrows or WASD to walk.',a.dock);a.message.className='fw-message';a.message.setAttribute('role','status');
 const actions=el('div',null,a.dock);actions.className='fw-actions';
 a.walk=button('Walk towards',actions,()=>{const p=a['world']['me'],t=selected(a),dx=t['x']-p['x'],dy=t['y']-p['y'];move(a,Math.abs(dx)>=Math.abs(dy)?Math.sign(dx):0,Math.abs(dy)>Math.abs(dx)?Math.sign(dy):0);});
 a.gather=button('Gather',actions,()=>{const t=selected(a);act(a,'gather',t['x'],t['y']);});a.build=button('Build depot',actions,()=>{const t=selected(a);act(a,'build',t['x'],t['y']);});
 a.deposit=button('Supply food',actions,()=>{const t=selected(a);act(a,'deposit',t['x'],t['y']);});a.use=button('Eat at depot',actions,()=>{const t=selected(a);act(a,'use',t['x'],t['y']);});a.eat=button('Eat carried food',actions,()=>act(a,'eat'));
 const caption=el('p','● wood / ◆ food / ⬡ ore / □ public depot · Mining costs health',a.dock);caption.className='fw-caption';
 a.welcome=el('section',null,root);a.welcome.className='fw-welcome';el('h1','The shared frontier',a.welcome);el('p','Explore, gather and leave something useful for the next person. One persistent world, including when your neighbours are offline.',a.welcome);
 a.connection=el('p','Enter with your WordPress account, or play a separate solo expedition saved on this device.',a.welcome);
 a.connectButton=button('Enter shared world',a.welcome,()=>{if(a.mode==='solo')solo.update(true);a.mode='online';document.body.dataset['figgetMode']='online';a.panel.hidden=true;a.dock.hidden=!a['world'];connect(a);});
 button('Solo expedition',a.welcome,()=>{checkpoint(a);a.mode='solo';document.body.dataset['figgetMode']='solo';a.welcome.hidden=true;a.dock.hidden=true;a.panel.hidden=true;solo.setup();sync(a);});
 button('Close',a.welcome,()=>{if(a['world']||a.mode==='solo')a.welcome.hidden=true;});
 a.canvas.addEventListener('pointerdown',e=>{if(a.menu||!a.welcome.hidden||e.button!==0)return;e.preventDefault();if(a.mode==='solo'){solo.click(e.offsetX,e.offsetY,a.width,a.height);return;}if(!a['world'])return;const t=transform(a),x=Math.floor((e.offsetX-t['ox'])/t['size']),y=Math.floor((e.offsetY-t['oy'])/t['size']);if(x>=0&&y>=0&&x<a['world']['size']&&y<a['world']['size']){a.selected={'x':x,'y':y};sync(a);}});
 for(const type of ['touchmove','touchstart','click','pointerdown','pointerup'])root.addEventListener(type,e=>e.stopPropagation());
 window.addEventListener('keydown',e=>{if(a.menu||!a.welcome.hidden||e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,textarea,select,button,a'))return;const dirs={'ArrowUp':[0,-1],'w':[0,-1],'ArrowDown':[0,1],'s':[0,1],'ArrowLeft':[-1,0],'a':[-1,0],'ArrowRight':[1,0],'d':[1,0]};if(dirs[e.key]){e.preventDefault();if(a.mode==='solo')solo.keypress(e.key);else move(a,...dirs[e.key]);}},{signal:a.abort.signal});
 window.addEventListener('pagehide',()=>checkpoint(a),{signal:a.abort.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)checkpoint(a);else a.nextPoll=0;},{signal:a.abort.signal});
 a.observer=new MutationObserver(()=>{if(!root.isConnected)dispose(a);});a.observer.observe(host,{childList:true});return a;
}
function move(a,dx,dy){if(a['world']&&!a.pending&&a.mode==='online')act(a,'move',a['world']['me']['x']+dx,a['world']['me']['y']+dy);}
function transform(a){const size=a.overview?Math.min((a.width-20)/a['world']['size'],(a.height-190)/a['world']['size']):a.width<600?27:36;return {'size':size,'ox':a.overview?(a.width-a['world']['size']*size)/2:a.width/2-(a.camera['x']+.5)*size,'oy':a.overview?155:a.height*.43-(a.camera['y']+.5)*size};}
function draw(a){
 const c=a.ctx,w=a.width,h=a.height;c.fillStyle='#08191f';c.fillRect(0,0,w,h);
 if(a.mode==='solo'){solo.draw(c,w,h);return;}if(!a['world']){c.strokeStyle='#15333b';for(let x=0;x<w;x+=36){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}return;}
 const world=a['world'],t=transform(a),s=t['size'],point=p=>({'x':t['ox']+(p['x']+.5)*s,'y':t['oy']+(p['y']+.5)*s});
 c.save();c.strokeStyle='#22413e';c.lineWidth=.5;
 for(let y=0;y<world['size'];y++)for(let x=0;x<world['size'];x++){
  const px=t['ox']+x*s,py=t['oy']+y*s;if(px+s<0||py+s<0||px>w||py>h)continue;
  const n=((x*73+y*137)%17)/17;c.fillStyle=n<.25?'#142f32':n>.7?'#193730':'#122b2d';c.fillRect(px,py,s,s);c.strokeRect(px,py,s,s);
 }
 const home=point({'x':24,'y':24});c.fillStyle='#ddcf9133';c.beginPath();c.arc(home['x'],home['y'],s*1.3,0,Math.PI*2);c.fill();
 for(const n of world['nodes']){const p=point(n);c.globalAlpha=n['stock']?1:.23;c.fillStyle=palette[n['kind']];c.beginPath();if(n['kind']==='food'){c.moveTo(p['x'],p['y']-s*.22);c.lineTo(p['x']+s*.2,p['y']);c.lineTo(p['x'],p['y']+s*.22);c.lineTo(p['x']-s*.2,p['y']);c.closePath();}else c.arc(p['x'],p['y'],Math.max(2,s*.16),0,Math.PI*2);c.fill();if(!a.overview&&n['stock']){c.fillStyle='#132529';c.font='9px monospace';c.textAlign='center';c.fillText(n['stock'],p['x'],p['y']+3);}}
 c.globalAlpha=1;
 for(const b of world['buildings']){const p=point(b);c.fillStyle='#e7c58b';c.fillRect(p['x']-s*.26,p['y']-s*.26,s*.52,s*.52);c.strokeStyle='#fff1c0';c.strokeRect(p['x']-s*.3,p['y']-s*.3,s*.6,s*.6);if(!a.overview){c.fillStyle='#152a2c';c.font='10px monospace';c.textAlign='center';c.fillText(b['food'],p['x'],p['y']+3);c.fillStyle='#c3d4c7';c.font='9px system-ui';c.fillText(b['name'],p['x'],p['y']-s*.4);}}
 for(const e of world['events'].slice(-15)){if(world['time']-e['time']>600)continue;const p=point(e);c.strokeStyle='#e7c58b66';c.beginPath();c.arc(p['x'],p['y'],s*(.35+.1*Math.sin(performance.now()/900+e['id'])),0,Math.PI*2);c.stroke();}
 for(const p of world['players']){const pos=point(p),me=p['id']===world['me']['id'];c.globalAlpha=p['online']||me?1:.45;c.strokeStyle=me?'#eeebbc':'#7fe2c6';c.fillStyle=me?'#eeebbc':'#7fe2c6';c.beginPath();c.arc(pos['x'],pos['y'],Math.max(2,s*.15),0,Math.PI*2);if(p['online']||me)c.fill();else c.stroke();if(!a.overview){c.font=(me?'bold ':'')+'11px system-ui';c.textAlign='center';c.fillText(me?'YOU':p['name'],pos['x'],pos['y']+s*.48);}}
 c.globalAlpha=1;if(a.selected){const p=point(a.selected);c.strokeStyle='#f3d98c';c.lineWidth=2;c.strokeRect(p['x']-s*.48,p['y']-s*.48,s*.96,s*.96);}c.restore();
}
function frame(a,width,height,menu){
 if(!a||a.disposed)return;a.menu=menu;a.width=width;a.height=height;a.activityButton.setAttribute('aria-expanded',String(!a.panel.hidden));
 if(a.canvas.width!==width||a.canvas.height!==height){a.canvas.width=width;a.canvas.height=height;}
 if(a.mode==='solo')solo.update(menu||!a.welcome.hidden);
 else if(a.session&&a['world']&&!menu&&!document.hidden&&a.welcome.hidden&&performance.now()>=a.nextPoll)send(a,'sync',{});
 if(!menu&&!document.hidden)draw(a);
}
function dispose(a){if(!a||a.disposed)return;checkpoint(a);if(a.mode==='solo')solo.update(true);a.disposed=true;a.abort.abort();a.observer.disconnect();a.root.remove();document.body.dataset['figgetMode']='online';if(active===a)active=null;}
module.exports={create,frame,dispose};
