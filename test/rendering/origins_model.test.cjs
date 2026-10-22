const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../../src/rendering/origins_model.js');
function advance(world,steps,events){for(let n=0;n<steps;n++)model.step(world,events);return world;}
test('same seed and interventions replay exactly, including paused end-step edits',()=>{
 const world=model.create(42);advance(world,20);model.change(world,'food',0.7);model.intervene(world,'food',300,200);advance(world,40);model.intervene(world,'microbes',600,300);advance(world,100);model.intervene(world,'food',100,100);
 const data=model.exportData(world),replay=model.create(data.seed,data.initialRules,data.control);
 advance(replay,data.steps,data.events);model.applyEvents(replay,data.events,true);
 assert.deepEqual(replay.cells,world.cells);assert.deepEqual(replay.microbes,world.microbes);assert.deepEqual(replay.food,world.food);assert.equal(replay.rng,world.rng);assert.deepEqual(model.exportData(replay),data);
});
test('all controls start with identical cells and matching environmental fields',()=>{
 const evolving=model.create(42);
 for(const control of ['fixed','no-microbes','no-cost']){
  const world=model.create(42,{},control);assert.deepEqual(world.cells,evolving.cells);assert.deepEqual(world.food,evolving.food);assert.equal(world.rng,evolving.rng);
 }
 const fixed=model.create(42,{},'fixed');assert.equal(fixed.config.mutation,0);
 const noCost=model.create(42,{},'no-cost');assert.equal(noCost.config.defenceCost,0);
 const noMicrobes=model.create(42,{},'no-microbes');advance(noMicrobes,100);assert.equal(noMicrobes.microbes.length,0);
});
test('offspring inherit lineage, parentage and unmutated traits when mutation is off',()=>{
 const world=model.create(17,{},'fixed'),parent=world.cells[0];parent.energy=2;const energy=parent.energy,child=model.reproduce(world,parent);
 assert(child);assert.equal(child.parent,parent.id);assert.equal(child.lineage,parent.lineage);assert.equal(child.generation,parent.generation+1);
 assert.deepEqual(child.genes,parent.genes);assert.deepEqual(child.brain,parent.brain);assert.notEqual(child.genes,parent.genes);
 assert(Math.abs(parent.energy+child.energy-(energy-0.16))<1e-10);assert.equal(world.births,1);
});
test('mutations produce bounded inherited variation without assigning cell roles',()=>{
 const world=model.create(19,{mutation:.3}),parent=world.cells[0];let changes=0;
 for(let n=0;n<40;n++){parent.energy=2;const child=model.reproduce(world,parent);for(let i=0;i<6;i++){assert(child.genes[i]>=0&&child.genes[i]<=1);if(child.genes[i]!==parent.genes[i])changes++;}for(const w of child.brain)assert(w>=-2&&w<=2);}
 assert(changes>20);assert.equal(Object.hasOwn(parent,'role'),false);
});
test('defence has a real energy cost and the no-cost control removes it',()=>{
 function solo(defence,cost){const world=model.create(1,{defenceCost:cost}),c=world.cells[0];world.cells=[c];world.microbes=[];world.food.fill(0);world.capacity.fill(0);c.genes.fill(0);c.genes[4]=defence;c.brain.fill(0);c.energy=1;c.age=0;advance(world,10);return c.energy;}
 assert(solo(.9,1)<solo(.1,1));assert.equal(solo(.9,0),solo(.1,0));
});
test('kin sharing redistributes energy conservatively between relatives',()=>{
 function pair(sharing){const world=model.create(3,{sharing}),a=world.cells[0],b=world.cells[1];world.cells=[a,b];world.microbes=[];world.food.fill(0);world.capacity.fill(0);for(const c of world.cells){c.genes.fill(0);c.genes[3]=1;c.brain.fill(0);c.age=0;c.x=100;c.y=100;}b.x=115;a.energy=.2;b.energy=1.4;model.step(world);return [a.energy,b.energy];}
 const on=pair(1),off=pair(0);assert(on[0]>off[0]);assert(on[1]<off[1]);assert(Math.abs(on[0]+on[1]-off[0]-off[1])<1e-10);
});
test('extinct cells are not silently reseeded; inoculation is explicit and recorded',()=>{
 const world=model.create(5);world.cells=[];world.microbes=[];advance(world,40);assert.equal(world.cells.length,0);assert.equal(world.microbes.length,0);
 model.intervene(world,'microbes',400,300);assert.equal(world.microbes.length,24);assert.equal(world.events.at(-1).type,'microbes');
});
test('a five-minute ecology stays finite and bounded while generations turn over',()=>{
 for(const seed of [42,13]){
  const world=advance(model.create(seed),6000);assert(world.births>100);assert(world.deaths>100);assert(world.engulfed>100);assert(world.history.at(-1).generation>=4);
  assert(world.cells.length>0&&world.cells.length<=model.CELL_CAP);assert(world.microbes.length<=model.MICROBE_CAP);
  for(const c of world.cells){assert(Number.isFinite(c.energy));assert(c.x>=0&&c.x<model.WIDTH);assert(c.y>=0&&c.y<model.HEIGHT);}
  for(const value of world.food)assert(Number.isFinite(value)&&value>=0&&value<=1);
 }
});

test('replay records only interventions already delivered, not future plans',()=>{
 const source=model.create(11);advance(source,20);model.intervene(source,'food',400,300);advance(source,20);model.change(source,'pressure',1.5);
 const data=model.exportData(source),world=model.create(data.seed,data.initialRules,data.control);
 advance(world,10,data.events);assert.equal(world.events.length,0);
 advance(world,15,data.events);assert.equal(world.events.length,1);assert.equal(world.events[0].step,20);
});
