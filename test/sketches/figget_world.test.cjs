const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fresh,act,tile,valid,SIZE}=require('../../src/sketches/figget_world.js');
const investigate=s=>act(s,{type:'investigate'});
function travel(s,x,y){while(s.x!==x||s.y!==y){if(s.energy<2)s=act(s,{type:'rest'});s=act(s,{type:'move',dx:x-s.x,dy:y-s.y});}return s;}
test('world is deterministic and new expeditions have valid revealed state',()=>{
  assert.deepEqual(fresh(),fresh());assert.deepEqual(tile(10,20),tile(10,20));
  assert.ok(valid(fresh()));assert.ok(fresh().seen.includes('256,256'));
  assert.ok(!valid({...fresh(),x:SIZE}));assert.ok(!valid({...fresh(),energy:NaN}));
});
test('solo expedition can finish without other players',()=>{
  let s=travel(fresh(),252,253);
  s=investigate(s);assert.equal(s.ore,0);
  s=investigate(investigate(s));assert.equal(s.ore,2);
  s=travel(s,262,259);const before=s.seen.length;
  s=investigate(s);assert.ok(s.scanner);assert.equal(s.ore,0);assert.ok(s.seen.length>before);
  s=investigate(travel(s,267,248));assert.ok(s.tower);
  s=investigate(travel(s,273,242));assert.match(s.message,/expedition is complete/);
  assert.ok(valid(JSON.parse(JSON.stringify(s))));
});
test('resources cannot be harvested without limit and orchard regrows',()=>{
  let s=travel(fresh(),252,253);
  for(let i=0;i<10;i++)s=investigate(s);
  assert.equal(s.ore,3);
  s=travel(s,248,260);s=investigate(s);assert.equal(s.fruit,2);
  s=investigate(s);assert.equal(s.fruit,2);
  for(let i=0;i<12;i++)s=act(s,{type:'rest'});
  s=investigate(s);assert.equal(s.fruit,4);
});
test('movement respects bounds, rest prevents softlocks, actions do not mutate input',()=>{
  const original=fresh();const before=JSON.stringify(original);
  const moved=act(original,{type:'move',dx:1,dy:0});assert.equal(moved.x,257);
  assert.equal(JSON.stringify(original),before);
  let s={...fresh(),energy:0,x:0,y:0};s=act(s,{type:'move',dx:-1,dy:-1});assert.equal(s.energy,0);
  s=act(s,{type:'rest'});assert.ok(s.energy>0);
  s=act(s,{type:'move',dx:-1,dy:-1});assert.equal(s.x,0);assert.equal(s.y,0);
  s=act(s,{type:'mark'});s=act(s,{type:'mark'});assert.equal(s.markers.length,1);
});
