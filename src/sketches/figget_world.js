// Deterministic, action-based world. No DOM or network dependencies.
const SIZE = 2048;
const START = 256;
const key = (x, y) => `${x},${y}`;
function noise(x, y) {
  let n = Math.imul(x + 71, 374761393) ^ Math.imul(y + 137, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const landmarks = [
  {x:256,y:256,type:'camp',name:'First light camp'},
  {x:260,y:254,type:'pond',name:'Stillwater'},
  {x:252,y:253,type:'mineral',name:'Whispering stones'},
  {x:262,y:259,type:'workshop',name:'The abandoned workshop'},
  {x:248,y:260,type:'garden',name:'Wild orchard'},
  {x:267,y:248,type:'tower',name:'The listening tower'},
  {x:273,y:242,type:'haven',name:'Hidden hollow'}
];
function tile(x,y) {
  const known = landmarks.find(p => p.x === x && p.y === y);
  if (known) return known;
  const region = noise(Math.floor(x/7), Math.floor(y/7));
  const r = noise(x,y);
  const type = r > .997 ? 'camp' : r > .988 ? 'mineral' : r > .974 ? 'garden' : region < .27 ? 'pond' : region > .72 ? 'ridge' : 'grass';
  return {x,y,type,name:({camp:'Forgotten camp',mineral:'Buried deposit',garden:'Wild orchard',pond:'Wetlands',ridge:'High ground',grass:'Meadow'})[type]};
}
function reveal(s) {
  const seen = new Set(s.seen);
  const radius = s.scanner ? 10 : 7;
  for(let dy=-radius;dy<=radius;dy++) for(let dx=-radius;dx<=radius;dx++) {
    const x=s.x+dx,y=s.y+dy;
    if(x>=0 && y>=0 && x<SIZE && y<SIZE && dx*dx+dy*dy<=radius*radius) seen.add(key(x,y));
  }
  s.seen=[...seen];
  return s;
}
function fresh() {
  return reveal({version:1,x:START,y:START,energy:100,ore:0,fruit:0,turn:0,scanner:false,tower:false,
    seen:[],sites:{},markers:[],journal:['You arrived at First light camp. Investigate the stones northwest; find the workshop southeast.'],
    message:'Welcome, wanderer. Tap nearby ground or use arrow keys to move. Investigate your current tile.'});
}
function tell(s,message) { s.message=message; return s; }
function log(s,message) { s.journal=[message,...s.journal].slice(0,12); return tell(s,message); }
function act(state,action) {
  const s={...state,sites:{...state.sites},markers:[...state.markers]};
  const here=tile(s.x,s.y), id=key(s.x,s.y);
  if(action.type==='move') {
    const dx=Math.sign(action.dx),dy=Math.sign(action.dy);
    if(!dx&&!dy) return state;
    if(s.energy<2) return tell(s,'Rest here to recover. You can never become stranded.');
    s.x=Math.max(0,Math.min(SIZE-1,s.x+dx)); s.y=Math.max(0,Math.min(SIZE-1,s.y+dy));
    s.energy-=2;s.turn++;
    return tell(reveal(s),`${tile(s.x,s.y).name} · ${s.x}, ${s.y}`);
  }
  if(action.type==='rest') {
    s.energy=Math.min(100,s.energy+(here.type==='camp'||here.type==='pond'?40:20));s.turn++;
    return tell(s,'You rest. Energy returns; the world waits for you.');
  }
  if(action.type==='eat') {
    if(!s.fruit) return tell(s,'Find an orchard and gather fruit first.');
    s.fruit--;s.energy=Math.min(100,s.energy+35);return tell(s,'A little sweetness. +35 energy.');
  }
  if(action.type==='mark') {
    if(!s.markers.some(p=>p.x===s.x&&p.y===s.y)) s.markers.push({x:s.x,y:s.y});
    return tell(s,'A personal marker now remembers this place.');
  }
  if(action.type!=='investigate') return state;
  s.turn++;
  switch(here.type) {
    case 'camp':return log(s,'A quiet camp. Rest here for extra energy. Your discoveries are saved on this device.');
    case 'pond':s.energy=Math.min(100,s.energy+25);return tell(s,'You find clear water among the reeds. +25 energy.');
    case 'mineral': {
      const depth=s.sites[id]||0;
      if(depth>=3) return tell(s,'This deposit is exhausted. More stones lie beyond the familiar trails.');
      if(!s.scanner && !s.sites[id+'-studied']) {
        s.sites[id+'-studied']=true;
        return log(s,'You study the stone: thin bright seams reveal the deposit. Investigate again to extract ore. A scanner would identify it immediately.');
      }
      s.sites[id]=depth+1;s.ore++;
      return log(s,'You extract one ore. Two ore can restore the workshop and build a scanner.');
    }
    case 'garden': {
      const last=s.sites[id];
      if(last!==undefined && s.turn-last<12) return tell(s,`Leave the orchard to regrow for ${12-(s.turn-last)} more actions.`);
      s.sites[id]=s.turn;s.fruit+=2;return log(s,'You gather two fruit, leaving the roots intact. The orchard will regrow.');
    }
    case 'workshop':
      if(s.scanner) return tell(s,'Your restored workshop hums. The scanner reveals a wider circle; seek the listening tower northeast.');
      if(s.ore<2) return tell(s,'Two empty sockets. Bring two ore from the stones northwest of camp to restore this machine.');
      s.ore-=2;s.scanner=true;return log(reveal(s),'The workshop wakes. You build a scanner: your sight expands. A signal calls from 267, 248.');
    case 'tower':
      if(!s.scanner) return tell(s,'Faint pulses vanish into static. The abandoned workshop might help you understand them.');
      s.tower=true;return log(s,'Your scanner resolves the signal: a sheltered hollow at 273, 242. Find it and leave a marker.');
    case 'haven':
      if(!s.tower) return tell(s,'A sheltered hollow. An old symbol resembles a tower; perhaps it has a story.');
      return log(s,'You found Hidden hollow. Your first expedition is complete! Mark this haven, then explore beyond: the world spans a 2,048 × 2,048 tile atlas.');
    default:return tell(s,here.type==='ridge'?'From this ridge you watch the quiet land. Mark it as a landmark.':'You study the meadow. Look for blue water, gold deposits, green orchards, and outlined structures.');
  }
}
function valid(s) {
  return s && s.version===1 && Number.isInteger(s.x)&&s.x>=0&&s.x<SIZE && Number.isInteger(s.y)&&s.y>=0&&s.y<SIZE &&
    ['energy','ore','fruit','turn'].every(k=>Number.isFinite(s[k])&&s[k]>=0) && s.energy<=100 &&
    typeof s.scanner==='boolean' && typeof s.tower==='boolean' && Array.isArray(s.seen)&&s.seen.every(k=>typeof k==='string') &&
    s.sites&&typeof s.sites==='object' && Array.isArray(s.markers)&&s.markers.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)) &&
    Array.isArray(s.journal)&&s.journal.every(x=>typeof x==='string') && typeof s.message==='string';
}
module.exports={SIZE,key,tile,fresh,act,valid,landmarks};
