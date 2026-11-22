const {test} = require('node:test');
const assert = require('node:assert/strict');
const model = require('../../src/rendering/figget_life_model.js');
const tile = (x,y) => y*model.SIZE+x;

function action(w,type,extra={}) {
  w.player.readyAt=0;
  return model.playerAction(w,{type,...extra});
}
function build(w,x,y) {
  Object.assign(w.player,{x,y,wood:6,ore:1});
  assert.match(action(w,'build'),/Depot built/);
  return w.buildings.at(-1);
}

test('meals at a distance trace back to the original and final depot across a relay and save',()=>{
  const w=model.fresh(42,8),p=w.player;
  const a=build(w,10,10);
  p.food=1;
  action(w,'store',{x:a.x,y:a.y,kind:'food'});
  action(w,'take',{x:a.x,y:a.y,kind:'food'});
  const b=build(w,12,10);
  action(w,'store',{x:b.x,y:b.y,kind:'food'});
  action(w,'take',{x:b.x,y:b.y,kind:'food'});
  const saved=model.restore(structuredClone(w));
  Object.assign(saved.player,{x:14,y:10,health:60});
  assert.match(action(saved,'eat'),/Recovered 30/);
  const logs=model.view(saved).depotLogs;
  for (const x of [10,12]) {
    const site=logs[tile(x,10)][0],entries=site.visits;
    assert.equal(site.retired,false);
    assert.deepEqual(entries.map(e=>e.type),['deposit','withdraw','meal']);
    assert.deepEqual(entries.map(e=>e.actor),[0,0,0]);
    assert.deepEqual([entries[2].x,entries[2].y,entries[2].health],[14,10,30]);
    assert.equal(entries[0].amount,1);
  }
  assert.equal(saved.stats.services,0);
});

test('an expired depot keeps its own visitors when another depot occupies the same tile',()=>{
  const w=model.fresh(42,8),a=build(w,10,10);
  w.player.food=1;
  action(w,'store',{x:10,y:10,kind:'food'});
  action(w,'take',{x:10,y:10,kind:'food'});
  a.expires=0;
  model.step(w);
  build(w,10,10);
  w.player.health=60;
  action(w,'eat');
  const [current,old]=model.view(w).depotLogs[tile(10,10)];
  assert.deepEqual(current.visits,[]);
  assert.equal(old.retired,true);
  assert.deepEqual(old.visits.map(v=>v.type),['deposit','withdraw','meal']);
  assert.notEqual(old.builtAt,current.builtAt);
});

test('legacy depots start a bounded journal and uncredited food stays uncredited',()=>{
  const w=model.fresh(20,8),b=build(w,10,10);
  delete w.retiredDepotLogs;delete b.builtAt;delete b.visits;
  b.food=1;b.foodOwners=[null];w.player.food=0;w.player.health=60;
  const loaded=model.restore(w);
  assert.deepEqual(model.view(loaded).depotLogs[tile(10,10)][0].visits,[]);
  action(loaded,'take',{x:10,y:10,kind:'food'});action(loaded,'eat');
  assert.equal(loaded.stats.services,0);
  loaded.player.wood=5;
  for(let n=0;n<7;n++){
    action(loaded,'store',{x:10,y:10,kind:'wood'});
    action(loaded,'take',{x:10,y:10,kind:'wood'});
  }
  const site=model.view(loaded).depotLogs[tile(10,10)][0];
  assert.equal(site.visits.length,8);
  assert.equal(site.visits.at(-1).type,'withdraw');
});

test('the depot names the bot delivering food and the player who eats it directly',()=>{
  const w=model.fresh(5,8),b=build(w,10,10),bot=w.bots[0];
  Object.assign(bot,{x:10,y:10,food:3,wood:1,ore:0,epsilon:0});
  bot.q.fill(-2);
  for(let s=0;s<model.STATES;s++)bot.q[s*model.ACTIONS.length+4]=2;
  Object.assign(w.player,{food:0,health:50});
  model.step(w);
  assert.equal(b.food,1);
  assert.match(action(w,'eat'),/Recovered 30/);
  const [drop,meal]=model.view(w).depotLogs[tile(10,10)][0].visits;
  assert.deepEqual([drop.type,drop.actor,drop.kind,drop.amount],['deposit',bot.id,'food',1]);
  assert.deepEqual([meal.type,meal.actor,meal.health],['meal',0,30]);
  assert.equal(b.visits.length,2);
});
