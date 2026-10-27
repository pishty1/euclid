const {test}=require('node:test');
const assert=require('node:assert/strict');
const m=require('../../src/rendering/figget_life_model.js');
const steps=(w,n)=>{for(let i=0;i<n;i++)m.step(w);return w;};
test('seeded worlds and learning trajectories are reproducible',()=>{
 const a=m.fresh(12,32),b=m.fresh(12,32);steps(a,120);steps(b,120);assert.deepEqual(a,b);assert.ok(m.valid(a));
});
test('Q-learning updates toward reward plus future value; terminal updates do not bootstrap',()=>{
 const a=m.fresh(1,8).bots[0];a.q.fill(0);a.alpha=.5;a.gamma=.9;a.q[9]=4;
 m.learn(a,0,2,2,1);assert.ok(Math.abs(a.q[2]-2.8)<1e-5);assert.equal(a.updates,1);
 a.q[2]=0;m.learn(a,0,2,2,1,true);assert.equal(a.q[2],1);
});
test('independent bots accumulate experience and change their own policies',()=>{
 const w=m.fresh(8,32),old=w.bots.map(b=>new Float32Array(b.q));steps(w,160);
 assert.ok(w.totalUpdates>1000);assert.ok(w.bots.every(b=>b.updates>0));assert.ok(w.bots.every((b,i)=>b.q.some((q,j)=>q!==old[i][j])));
 assert.ok(w.bots.reduce((n,b)=>n+b.gathers,0)>0);
});
test('disabling learning freezes policies and selection, not movement or economy',()=>{
 const w=m.fresh(8,16);w.learning=false;const q=w.bots.map(b=>new Float32Array(b.q));steps(w,800);
 assert.equal(w.generation,1);assert.equal(w.totalUpdates,0);assert.ok(w.bots.some(b=>b.gathers>0));w.bots.forEach((b,i)=>assert.deepEqual(b.q,q[i]));
});
test('selection inherits elite policies with independent tables and mutation; juveniles are protected',()=>{
 const w=m.fresh(99,16);w.bots.forEach((b,i)=>{b.age=100;b.fitness=i;b.q.fill(i);});w.bots[0].age=0;
 const juvenile=w.bots[0],before=[...w.bots],elite=before.slice(-4);m.evolve(w);
 assert.equal(w.bots[0],juvenile);assert.equal(w.generation,2);
 const child=w.bots.find((b,i)=>b!==before[i]);assert.ok(child);assert.equal(child.generation,2);assert.ok(elite.some(p=>p.lineage===child.lineage));
 assert.ok(elite.every(p=>p.q!==child.q));assert.ok(child.q.some(q=>Math.abs(q-Math.round(q))>.0001));
});
test('resources are finite, carrying capacity applies and distance checks prevent remote gathering',()=>{
 const w=m.fresh(1,8),p=w.player,n=w.nodes.find(n=>n.kind==='wood');let stock=n.stock;
 m.playerAction(w,{type:'gather',x:n.x,y:n.y});assert.equal(n.stock,stock);
 p.x=n.x;p.y=n.y;p.last=-1;m.playerAction(w,{type:'gather',x:n.x,y:n.y});assert.equal(n.stock,stock-1);assert.equal(p.wood,5);
 p.wood=27;p.food=2;p.ore=1;p.last=-1;m.playerAction(w,{type:'gather',x:n.x,y:n.y});assert.equal(n.stock,stock-1);
});
test('regional richness and harvest pressure affect regeneration; recovery is bounded',()=>{
 const w=m.fresh(1,8),n=w.nodes[0];assert.ok(new Set(w.nodes.filter(n=>n.kind==='food').map(n=>n.interval)).size>1);
 n.stock=0;n.next=.25;n.soil=.5;m.step(w);assert.equal(n.stock,1);assert.ok(n.next-w.time>n.interval*1.9);
 steps(w,1000);assert.ok(w.nodes.every(n=>n.stock<=5&&n.soil<=1));
});
test('depots consume supplies, serve other lineages and expire unless maintained',()=>{
 const w=m.fresh(1,8),p=w.player;p.x=10;p.y=10;p.wood=8;p.ore=2;
 assert.match(m.playerAction(w,{type:'build'}),/built/);assert.equal(p.wood,2);assert.equal(p.ore,1);assert.equal(w.buildings.length,1);
 p.last=-1;m.playerAction(w,{type:'supply',x:10,y:10});assert.equal(w.buildings[0].food,1);assert.equal(p.food,1);assert.equal(p.wood,1);
 const b=w.bots[0];b.x=10;b.y=10;b.food=0;b.health=40;b.epsilon=0;b.q.fill(-5);for(let s=0;s<m.STATES;s++)b.q[s*9+6]=5;
 m.step(w);assert.ok(b.health>69.9);assert.equal(w.buildings[0].food,0);assert.equal(b.food,0);
 w.buildings[0].expires=w.time+.25;m.step(w);assert.equal(w.buildings.length,0);
});
test('combat spends ore, respects sanctuary/respawn protection, respawns and conserves bounded loot',()=>{
 const w=m.fresh(1,8),p=w.player,b=w.bots[0];p.x=10;p.y=10;p.shield=0;b.x=11;b.y=10;b.shield=0;b.health=20;b.wood=6;b.food=3;b.ore=2;
 const ore=p.ore;m.playerAction(w,{type:'attack',x:11,y:10});assert.equal(p.kills,1);assert.equal(b.deaths,1);assert.equal(b.health,100);assert.ok(b.shield>0);assert.equal(p.ore,ore-1+2);assert.ok(p.wood+p.food+p.ore<=30);
 p.x=48;p.y=48;p.last=-1;b.x=49;b.y=48;b.shield=0;const health=b.health;m.playerAction(w,{type:'attack',x:49,y:48});assert.equal(b.health,health);
});
test('player death preserves buildings, loses carried supplies and returns to home',()=>{
 const w=m.fresh(1,8),p=w.player,n=w.nodes.find(n=>n.kind==='ore');p.x=n.x;p.y=n.y;p.health=8;p.wood=9;p.food=3;p.ore=4;
 m.playerAction(w,{type:'gather',x:n.x,y:n.y});assert.equal(p.x,48);assert.equal(p.y,48);assert.equal(p.health,100);assert.equal(p.deaths,1);assert.equal(p.wood,4);assert.equal(p.food,1);assert.equal(p.ore,2);
});
test('worker snapshots omit policy tables; structured-clone saves retain exact learning and RNG',()=>{
 const w=steps(m.fresh(4,16),100),saved=structuredClone(w),view=m.view(w);
 assert.ok(!('q' in view.bots[0]));assert.ok(!('pending' in view.bots[0]));assert.ok(m.valid(saved));steps(w,40);steps(saved,40);assert.deepEqual(w,saved);
 const bad=structuredClone(saved);bad.bots[0].q[0]=NaN;assert.equal(m.valid(bad),false);assert.equal(m.valid({version:1}),false);
});
test('population limits and long runs remain finite at 512 bots',()=>{
 const w=m.fresh(42,9999);assert.equal(w.bots.length,512);steps(w,2400);assert.ok(m.valid(w));assert.ok(w.generation>=3);assert.ok(w.totalUpdates>200000);assert.ok(w.events.length<=100);assert.ok(w.buildings.length<=1024);
 m.setPopulation(w,64);assert.equal(w.bots.length,64);assert.equal(w.retired,448);assert.ok(m.valid(w));
});
