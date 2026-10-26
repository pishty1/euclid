// Shared-world characters, construction and Go-inspired encirclement.
// One successful explorer action advances the bot once. No wall-clock simulation.
const world = require('./figget_world.js');
const HUMAN=1, BOT=2, MAX_STRUCTURES=256, MAX_TIMBER=30;
const key=p=>world.key(p.x,p.y);
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const inside=p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<world.SIZE&&p.y<world.SIZE;
const neighbors=p=>[{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}].filter(inside);
const same=(a,b)=>a.x===b.x&&a.y===b.y;
function upgrade(s) {
  if(s.frontier)return s;
  const home={x:s.x,y:s.y}, botHome={x:s.x+(s.x<world.SIZE-12?6:-6),y:s.y};
  return {...s,frontier:{version:1,home,botHome,bot:{...botHome},structures:[],timber:12,botTimber:12,tick:0,
    siege:0,botSiege:0,captures:0,botCaptures:0,defeats:0,botDefeats:0,
    botMessage:'An orange rival has made camp six tiles away. It moves and builds after your actions.'}};
}
function fresh(){return upgrade(world.fresh());}
function index(structures){return new Map(structures.filter(p=>p.kind==='outpost').map(p=>[key(p),p]));}
function group(structures,start) {
  const walls=index(structures), first=walls.get(key(start));
  if(!first)return {stones:[],liberties:[]};
  const visited=new Set(), liberties=new Map(), stones=[], queue=[first];
  while(queue.length){
    const p=queue.pop();if(visited.has(key(p)))continue;visited.add(key(p));stones.push(p);
    for(const n of neighbors(p)){
      const wall=walls.get(key(n));
      if(!wall)liberties.set(key(n),n);
      else if(wall.owner===first.owner&&!visited.has(key(n)))queue.push(wall);
    }
  }
  return {stones,liberties:[...liberties.values()]};
}
function protectedSite(f,p,owner){return distance(p,owner===HUMAN?f.botHome:f.home)<=1;}
function build(f,owner,p,kind='outpost') {
  if(!inside(p))return {error:'That tile is outside the world.'};
  if(!['outpost','path'].includes(kind))return {error:'Choose an outpost or a path.'};
  if(f.structures.length>=MAX_STRUCTURES)return {error:'This prototype supports 256 structures. Dismantle some of your structures first.'};
  if(protectedSite(f,p,owner))return {error:'The rival camp and its four entrances are a protected refuge.'};
  const existing=f.structures.find(q=>same(q,p));
  if(existing && (existing.kind==='outpost'||kind==='path'))return {error:'There is already a structure here.'};
  const field=owner===HUMAN?'timber':'botTimber', cost=kind==='outpost'?2:1;
  if(f[field]<cost)return {error:`Need ${cost} timber. Gather timber first.`};
  let structures=f.structures.filter(q=>!same(q,p));structures.push({...p,owner,kind});
  let captured=[];
  if(kind==='outpost'){
    for(const n of neighbors(p)){
      const enemy=structures.find(q=>same(q,n)&&q.kind==='outpost'&&q.owner!==owner);
      if(enemy){const g=group(structures,enemy);if(!g.liberties.length){captured.push(...g.stones);const keys=new Set(g.stones.map(key));structures=structures.filter(q=>!keys.has(key(q)));}}
    }
    if(!group(structures,p).liberties.length)return {error:'That outpost would have no liberties. Leave breathing room or capture an enemy group first.'};
  }
  return {frontier:{...f,structures,[field]:Math.min(MAX_TIMBER,f[field]-cost+captured.length),
    [owner===HUMAN?'captures':'botCaptures']:f[owner===HUMAN?'captures':'botCaptures']+captured.length},captured:captured.length};
}
// True only for a completely closed enemy fence (or fence against a world edge).
// Search stops upon reaching the enemy fence's bounding rectangle: beyond it
// there can be no enemy outpost. Friendly buildings and paths remain traversable.
function enclosed(f,actor,owner) {
  const home=owner===HUMAN?f.home:f.botHome;
  if(distance(actor,home)<=1)return false;
  const enemyHome=owner===HUMAN?f.botHome:f.home;
  const enemy=[...f.structures.filter(p=>p.kind==='outpost'&&p.owner!==owner),enemyHome,...neighbors(enemyHome)];
  const minX=Math.min(...enemy.map(p=>p.x)),maxX=Math.max(...enemy.map(p=>p.x));
  const minY=Math.min(...enemy.map(p=>p.y)),maxY=Math.max(...enemy.map(p=>p.y));
  const rows=new Map(),columns=new Map();
  for(const p of enemy){
    const row=rows.get(p.y)||[Infinity,-Infinity],col=columns.get(p.x)||[Infinity,-Infinity];
    rows.set(p.y,[Math.min(row[0],p.x),Math.max(row[1],p.x)]);
    columns.set(p.x,[Math.min(col[0],p.y),Math.max(col[1],p.y)]);
  }
  const blocked=new Set(enemy.map(key)), seen=new Set([key(actor)]), queue=[actor];
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    // Fewer walls than the map width cannot span opposite world edges. Any
    // enclosed pocket (including corner pockets) fits within n² tiles. Once
    // more than that is reachable, this is the open world, not a siege. This
    // also handles sparse walls on all four outer edges without a huge flood.
    if(enemy.length<world.SIZE&&seen.size>enemy.length*enemy.length)return false;
    if(p.x<minX||p.x>maxX||p.y<minY||p.y>maxY||distance(p,home)<=1)return false;
    // An unobstructed straight route beyond all enemy buildings proves escape.
    // This avoids flooding millions of empty tiles between distant structures.
    const row=rows.get(p.y)||[Infinity,-Infinity],col=columns.get(p.x)||[Infinity,-Infinity];
    if((minX>0&&row[0]>=p.x)||(maxX<world.SIZE-1&&row[1]<=p.x)||
       (minY>0&&col[0]>=p.y)||(maxY<world.SIZE-1&&col[1]<=p.y))return false;
    for(const n of neighbors(p))if(!blocked.has(key(n))&&!seen.has(key(n))){seen.add(key(n));queue.push(n);}
  }
  return true;
}
function occupied(f,p,owner,player) {
  return protectedSite(f,p,owner) || f.structures.some(q=>same(q,p)&&q.kind==='outpost'&&q.owner!==owner) || same(p,owner===HUMAN?f.bot:player);
}
function pathStep(f,start,goal,player) {
  // Bot only navigates locally; it never teleports or acts outside its own reach.
  const queue=[{p:start,first:null}],seen=new Set([key(start)]);
  for(let i=0;i<queue.length;i++){
    const {p,first}=queue[i];
    if(goal(p))return first;
    for(const n of neighbors(p)){
      if(distance(n,start)>12||seen.has(key(n))||occupied(f,n,BOT,player))continue;
      seen.add(key(n));queue.push({p:n,first:first||n});
    }
  }
  return null;
}
function botAct(f,player) {
  if(f.botTimber<2)return {...f,botTimber:Math.min(MAX_TIMBER,f.botTimber+3),botMessage:'The bot gathers three timber.'};
  const targets=[];
  // Defend its own group when possible, or finish capturing a nearby human group.
  for(const wall of f.structures.filter(p=>p.kind==='outpost')){
    const g=group(f.structures,wall);
    if(g.liberties.length===1)targets.push({...g.liberties[0],priority:wall.owner===BOT?0:1});
  }
  // Build around the explorer, but respect the safe camp. Far away, expand locally.
  const focus=distance(player,f.bot)<=12&&distance(player,f.home)>1?player:f.botHome;
  for(const p of neighbors(focus))targets.push({...p,priority:2});
  if(focus===f.botHome){
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(Math.abs(dx)+Math.abs(dy)===3)targets.push({x:f.botHome.x+dx,y:f.botHome.y+dy,priority:3});
  }
  const possible=targets.filter(p=>inside(p)&&!same(p,player)&&!protectedSite(f,p,BOT)&&
    !f.structures.some(q=>same(q,p)&&q.kind==='outpost'));
  possible.sort((a,b)=>a.priority-b.priority||distance(a,f.bot)-distance(b,f.bot));
  for(const target of possible){
    if(distance(target,f.bot)===1){
      const result=build(f,BOT,{x:target.x,y:target.y});
      if(result.frontier)return {...result.frontier,botMessage:`The bot builds at ${target.x}, ${target.y}.${result.captured?` It captures ${result.captured} of your outposts!`:''}`};
    }
  }
  for(const target of possible){
    const step=pathStep(f,f.bot,p=>distance(p,target)===1,player);
    if(step)return {...f,bot:step,botMessage:`The bot walks to ${step.x}, ${step.y}.`};
  }
  return {...f,botMessage:'The bot waits. It cannot find a legal nearby building site.'};
}
function advance(s) {
  let f=botAct(s.frontier,s);f={...f,tick:f.tick+1};
  f.siege=enclosed(f,s,HUMAN)?f.siege+1:0;
  f.botSiege=enclosed(f,f.bot,BOT)?f.botSiege+1:0;
  let message=s.message;
  if(f.siege>=3){
    s={...s,x:f.home.x,y:f.home.y,energy:100};f={...f,siege:0,defeats:f.defeats+1,timber:Math.floor(f.timber/2)};
    message='Your character was surrounded and defeated. You respawn at camp, losing half your timber; discoveries and other supplies are safe.';
  }else if(f.siege)message+=` SURROUNDED: ${3-f.siege} actions until defeat. Break the fence or retreat to camp.`;
  if(f.botSiege>=3){
    f={...f,bot:{...f.botHome},botSiege:0,botDefeats:f.botDefeats+1,botTimber:Math.floor(f.botTimber/2),botMessage:'You surrounded and defeated the bot! It respawns at its refuge with half its timber.'};
  }else if(f.botSiege)f.botMessage+=` Bot surrounded: ${3-f.botSiege} actions until defeat.`;
  return {...s,frontier:f,message};
}
function act(input,action) {
  const s=upgrade(input),f=s.frontier;
  const fail=message=>({...s,message});
  const takeTurn=next=>advance({...next,turn:s.turn+1});
  if(action.type==='build'){
    const p={x:action.x,y:action.y};
    if(distance(p,s)!==1)return fail('Walk closer: you can build only one tile north, south, east or west of your character.');
    if(same(p,f.bot))return fail('The bot is standing there. Surround it; you cannot build on a character.');
    const result=build(f,HUMAN,p,action.kind);
    if(result.error)return fail(result.error);
    return takeTurn({...s,frontier:result.frontier,message:`Built ${action.kind} at ${p.x}, ${p.y}.${result.captured?` Captured ${result.captured} enemy outposts!`:''}`});
  }
  if(action.type==='dismantle'){
    const p={x:action.x,y:action.y};
    if(distance(p,s)>1)return fail('Stand next to your structure to dismantle it.');
    const structure=f.structures.find(q=>same(q,p)&&q.owner===HUMAN);
    if(!structure)return fail('You can dismantle only your own structures.');
    return takeTurn({...s,frontier:{...f,structures:f.structures.filter(q=>q!==structure),timber:Math.min(MAX_TIMBER,f.timber+1)},message:'Dismantled your structure. Recovered one timber.'});
  }
  if(action.type==='gather')return takeTurn({...s,frontier:{...f,timber:Math.min(MAX_TIMBER,f.timber+3)},message:'Salvaged three timber from the surroundings (capacity 30). The bot takes its turn.'});
  if(action.type==='retreat')return takeTurn({...s,x:f.home.x,y:f.home.y,energy:100,frontier:{...f,timber:Math.floor(f.timber/2),siege:0},message:'You retreat to your protected camp, leaving half your timber behind.'});
  if(action.type==='move'){
    let dx=Math.sign(action.dx),dy=Math.sign(action.dy);
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!dx&&!dy))return s;
    // Cardinal movement: diagonal gaps do not let characters slip through a fence.
    if(dx&&dy){if(Math.abs(action.dx)>=Math.abs(action.dy))dy=0;else dx=0;}
    const p={x:s.x+dx,y:s.y+dy};
    if(!inside(p))return fail('You reached the edge of the atlas.');
    if(occupied(f,p,HUMAN,s))return fail('An enemy outpost, the bot or its protected refuge blocks this tile. Find another route or surround its outposts.');
    const road=f.structures.some(q=>same(q,p)&&q.kind==='path');
    if(road){const moved=world.act({...s,energy:Math.max(2,s.energy)},{type:'move',dx,dy});return advance({...moved,energy:s.energy});}
    const moved=world.act(s,{type:'move',dx,dy});
    return moved.turn===s.turn?moved:advance(moved);
  }
  const next=world.act(s,action);
  // Inspecting/marking a location without consuming a world turn never moves the bot.
  if(next.turn!==s.turn||(action.type==='eat'&&next.fruit!==s.fruit))return takeTurn(next);
  return next;
}
function valid(s) {
  if(!world.valid(s))return false;
  if(!s.frontier)return true; // Migration from the exploration-only save.
  const f=s.frontier,number=n=>Number.isInteger(n)&&n>=0;
  return f.version===1&&[f.home,f.botHome,f.bot].every(p=>p&&inside(p))&&
    ['timber','botTimber','tick','siege','botSiege','captures','botCaptures','defeats','botDefeats'].every(k=>number(f[k]))&&
    f.timber<=MAX_TIMBER&&f.botTimber<=MAX_TIMBER&&f.siege<3&&f.botSiege<3&&typeof f.botMessage==='string'&&
    Array.isArray(f.structures)&&f.structures.length<=MAX_STRUCTURES&&f.structures.every(p=>p&&inside(p)&&[1,2].includes(p.owner)&&['outpost','path'].includes(p.kind))&&
    new Set(f.structures.map(key)).size===f.structures.length;
}
module.exports={...world,HUMAN,BOT,MAX_STRUCTURES,fresh,upgrade,act,valid,neighbors,group,enclosed,build,botAct};
