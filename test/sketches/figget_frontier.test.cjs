const {test}=require('node:test');
const assert=require('node:assert/strict');
const g=require('../../src/sketches/figget_frontier.js');
const base=require('../../src/sketches/figget_world.js');
const post=(x,y,owner=2)=>({x,y,owner,kind:'outpost'});
function elapse(s,ms){for(let n=0;n<ms;n+=g.STEP_MS)s=g.step(s);return s;}
function away(){const s=g.fresh();return {...s,x:275,y:275,frontier:{...s.frontier,bot:{x:300,y:300},botHome:{x:300,y:300}}};}
test('migrates old saves without losing expedition progress',()=>{
 const old={...base.fresh(),ore:5,scanner:true};const s=g.upgrade(old);
 assert.equal(s.ore,5);assert.ok(s.scanner);assert.ok(g.valid(s));assert.ok(g.valid(old));assert.deepEqual(g.upgrade(s),s);
});
test('building is adjacent, spends timber and does not trigger a bot action',()=>{
 const s=g.fresh(),original=JSON.stringify(s);
 assert.equal(g.act(s,{type:'build',x:260,y:260,kind:'outpost'}).frontier.tick,0);
 const next=g.act(s,{type:'build',x:256,y:257,kind:'outpost'});
 assert.ok(next.frontier.structures.some(p=>p.x===256&&p.y===257&&p.owner===1));
 assert.equal(next.frontier.timber,10);assert.equal(next.frontier.tick,0);assert.equal(JSON.stringify(s),original);
 const bot=g.act(s,{type:'move',dx:1,dy:0}).frontier;
 assert.ok(Math.abs(bot.bot.x-s.frontier.bot.x)+Math.abs(bot.bot.y-s.frontier.bot.y)<=1);
});
test('outposts block enemies but not their owner; movement is cardinal',()=>{
 let s=away();s.frontier.structures=[post(276,275)];
 assert.equal(g.act(s,{type:'move',dx:1,dy:0}).x,275);
 s.frontier.structures[0].owner=1;assert.equal(g.act(s,{type:'move',dx:1,dy:0}).x,276);
 const moved=g.act(away(),{type:'move',dx:1,dy:1});assert.equal(Math.abs(moved.x-275)+Math.abs(moved.y-275),1);
});
test('bot walks and builds only adjacent, independently of player actions',()=>{
 let s=away();s.frontier.bot={x:279,y:275};
 for(let i=0;i<10;i++){
  const before=s.frontier; s=elapse(s,g.BOT_INTERVAL_MS);
  const added=s.frontier.structures.filter(p=>!before.structures.some(q=>q.x===p.x&&q.y===p.y));
  added.forEach(p=>assert.equal(Math.abs(p.x-before.bot.x)+Math.abs(p.y-before.bot.y),1));
  assert.ok(Math.abs(s.frontier.bot.x-before.bot.x)+Math.abs(s.frontier.bot.y-before.bot.y)<=1);
  assert.ok(g.valid(s));
 }
 assert.ok(s.frontier.structures.some(p=>p.owner===2));
});
test('outpost groups share liberties, captures remove enemy group, suicide rejected',()=>{
 let f=away().frontier;f.structures=[post(275,275),post(274,275,1),post(275,274,1),post(276,275,1)];
 assert.equal(g.group(f.structures,{x:275,y:275}).liberties.length,1);
 const result=g.build(f,1,{x:275,y:276});assert.equal(result.captured,1);assert.equal(result.frontier.captures,1);
 f.structures=[post(274,275),post(275,274),post(276,275),post(275,276)];
 assert.match(g.build(f,1,{x:275,y:275}).error,/liberties/);
});
test('closed fence traps a character, a single opening allows escape, friendly fences do not trap',()=>{
 const s=away(),p={x:275,y:275};s.frontier.structures=g.neighbors(p).map(n=>post(n.x,n.y));
 assert.ok(g.enclosed(s.frontier,p,1));
 assert.ok(!g.enclosed({...s.frontier,structures:s.frontier.structures.slice(1)},p,1));
 assert.ok(!g.enclosed(s.frontier,p,2));
 const fence=[];for(let x=273;x<=277;x++){fence.push(post(x,273),post(x,277));}for(let y=274;y<=276;y++)fence.push(post(273,y),post(277,y));
 assert.ok(g.enclosed({...s.frontier,structures:fence},p,1));
});
test('world edges close fences but sparse distant walls do not enclose empty land',()=>{
 const f=away().frontier;
 assert.ok(g.enclosed({...f,structures:[post(1,0),post(0,1)]},{x:0,y:0},1));
 assert.ok(!g.enclosed({...f,structures:[post(1,0)]},{x:0,y:0},1));
 const distant=[post(0,1000),post(2047,1000),post(1000,0),post(1000,2047)];
 assert.ok(!g.enclosed({...f,structures:distant},{x:1000,y:1000},1));
 assert.equal(g.SIZE*g.SIZE,4194304);
});
test('twelve real simulation seconds defeat an idle besieged explorer, preserving discoveries',()=>{
 let s=away();s.ore=5;s.frontier.structures=g.neighbors(s).map(n=>post(n.x,n.y));
 s=elapse(s,6000);assert.equal(s.frontier.siege,6000);
 s=elapse(s,5750);assert.equal(s.frontier.defeats,0);
 s=g.step(s);assert.equal(s.frontier.defeats,1);assert.equal(s.x,s.frontier.home.x);assert.equal(s.ore,5);assert.equal(s.frontier.timber,6);
 assert.match(s.message,/defeated/);
});
test('bot also gets defeated inside a friendly fence',()=>{
 let s=away();s.frontier.bot={x:280,y:280};s.frontier.structures=g.neighbors(s.frontier.bot).map(n=>post(n.x,n.y,1));
 s=elapse(s,g.SIEGE_MS);
 assert.equal(s.frontier.botDefeats,1);assert.deepEqual(s.frontier.bot,s.frontier.botHome);
});
test('paths save energy, dismantling recovers timber and no action occurs on invalid input',()=>{
 let s=away();s.energy=0;s.frontier.structures=[{x:276,y:275,kind:'path',owner:1}];
 const moved=g.act(s,{type:'move',dx:1,dy:0});assert.equal(moved.x,276);assert.equal(moved.energy,0);
 const dismantled=g.act(s,{type:'dismantle',x:276,y:275});assert.equal(dismantled.frontier.timber,13);
 assert.ok(!dismantled.frontier.structures.some(p=>p.x===276&&p.y===275));
 const blocked=g.act(s,{type:'move',dx:0,dy:1});assert.equal(blocked.frontier.tick,0);assert.match(blocked.message,/Rest/);
});
test('gathering advances resource regrowth; inspection and failed building do not advance the bot',()=>{
 let s=g.fresh();s={...s,x:248,y:260};s=g.act(s,{type:'investigate'});assert.equal(s.fruit,2);
 const tick=s.frontier.tick;
 s=g.act(s,{type:'mark'});assert.equal(s.frontier.tick,tick);
 s=g.act(s,{type:'build',kind:'outpost',x:999,y:999});assert.equal(s.frontier.tick,tick);
 for(let i=0;i<12;i++)s=g.act(elapse(s,1500),{type:'gather'});
 s=g.act(elapse(s,1500),{type:'investigate'});assert.equal(s.fruit,4);
});
test('safe refuges cannot be fenced by the enemy and malformed saves are rejected',()=>{
 const s=g.fresh();assert.ok(g.build(s.frontier,2,{x:s.x,y:s.y}).error);
 assert.ok(g.build(s.frontier,1,s.frontier.botHome).error);
 const near={...s,x:s.frontier.botHome.x-2};
 assert.equal(g.act(near,{type:'move',dx:1,dy:0}).x,near.x);
 assert.ok(!g.valid({...s,frontier:{...s.frontier,bot:null}}));
 assert.ok(!g.valid({...s,frontier:{...s.frontier,timber:-1}}));
 const p=post(270,270);assert.ok(!g.valid({...s,frontier:{...s.frontier,structures:[p,p]}}));
});
