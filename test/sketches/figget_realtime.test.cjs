const {test}=require('node:test');
const assert=require('node:assert/strict');
const g=require('../../src/sketches/figget_frontier.js');
const {createClock}=require('../../src/sketches/figget_clock.js');
function elapse(s,ms){for(let i=0;i<ms;i+=g.STEP_MS)s=g.step(s);return s;}
test('bot acts on a fixed cadence without human input',()=>{
 const initial=g.fresh(),json=JSON.stringify(initial);
 let s=elapse(initial,1250);assert.equal(s.frontier.tick,0);
 s=g.step(s);assert.equal(s.frontier.tick,1);assert.ok(s.frontier.structures.some(p=>p.owner===2));
 assert.equal(JSON.stringify(initial),json);assert.ok(g.valid(s));
});
test('player inputs do not accelerate time; cooldown blocks action spam',()=>{
 let s=g.act(g.fresh(),{type:'gather'});assert.equal(s.frontier.timber,15);
 for(let i=0;i<100;i++)s=g.act(s,{type:'gather'});
 assert.equal(s.frontier.timber,15);assert.equal(s.frontier.elapsedMs,0);assert.equal(s.frontier.tick,0);
 s=g.act(elapse(s,1500),{type:'gather'});assert.equal(s.frontier.timber,18);assert.equal(s.frontier.tick,1);
});
test('movement cooldown is shorter and failed actions do not start cooldowns',()=>{
 let s=g.fresh();s=g.act(s,{type:'build',kind:'outpost',x:999,y:999});assert.equal(s.frontier.cooldownMs,0);
 s=g.act(s,{type:'move',dx:-1,dy:0});assert.equal(s.x,255);
 assert.equal(g.act(s,{type:'move',dx:-1,dy:0}).x,255);
 s=g.act(g.step(s),{type:'move',dx:-1,dy:0});assert.equal(s.x,254);
});
test('emergency retreat remains available during action cooldowns',()=>{
 let s=g.fresh();s.x+=3;s.frontier.cooldownMs=1500;s.frontier.siege=10000;
 s=g.act(s,{type:'retreat'});assert.equal(s.x,s.frontier.home.x);assert.equal(s.frontier.siege,0);assert.equal(s.frontier.timber,6);
});
test('turn-based saves migrate without replaying time or losing buildings',()=>{
 const old=g.fresh();old.frontier.version=1;old.frontier.siege=2;old.frontier.botSiege=1;
 old.frontier.structures=[{x:257,y:257,owner:1,kind:'path'}];
 delete old.frontier.elapsedMs;delete old.frontier.cooldownMs;delete old.frontier.botElapsedMs;
 assert.ok(g.valid(old));const s=g.upgrade(old);assert.equal(s.frontier.version,2);
 assert.equal(s.frontier.siege,0);assert.equal(s.frontier.elapsedMs,0);assert.deepEqual(s.frontier.structures,old.frontier.structures);
 assert.ok(g.valid(JSON.parse(JSON.stringify(s))));
 assert.ok(!g.valid({...s,frontier:{...s.frontier,botElapsedMs:1500}}));
});
test('opening a siege fence resets its timer rather than retaining stale damage',()=>{
 let s=g.fresh();s.x=275;s.y=275;s.frontier.bot={x:300,y:300};s.frontier.botHome={x:300,y:300};
 s.frontier.structures=g.neighbors(s).map(p=>({...p,owner:2,kind:'outpost'}));
 s=elapse(s,6000);assert.equal(s.frontier.siege,6000);
 s={...s,frontier:{...s.frontier,structures:s.frontier.structures.filter(p=>!(p.x===274&&p.y===275))}};
 s=g.step(s);assert.equal(s.frontier.siege,0);
});
test('clock is frame-rate independent, discards long gaps and never catches up after pause',()=>{
 const c=createClock();assert.equal(c.advance(0),0);assert.equal(c.advance(100),0);assert.equal(c.advance(250),1);
 assert.equal(c.advance(1000),3);assert.equal(c.advance(61000),0);assert.equal(c.advance(61250),1);
 assert.equal(c.advance(61300,true),0);assert.equal(c.advance(90000),0);assert.equal(c.advance(90250),1);
 c.reset();assert.equal(c.advance(200000),0);assert.equal(c.advance(199000),0);
});
test('clock produces the same simulation at 30Hz and 60Hz',()=>{
 function run(hz){const c=createClock();let count=0;for(let i=0;i<=hz*10;i++)count+=c.advance(i*1000/hz);return count;}
 assert.equal(run(30),40);assert.equal(run(60),40);
});
