const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../../src/rendering/garden_model.js');
function random(){let state=123;return ()=>((state=Math.imul(state,1664525)+1013904223)>>>0)/4294967296;}
function evolve(data,width,height,rule,steps){let a=data,b=new Float32Array(data.length);for(let n=0;n<steps;n++){model.step(a,b,width,height,rule);[a,b]=[b,a];}return a;}
test('an unseeded nutrient field stays empty rather than inventing organisms',()=>{
 const initial=model.field(32,24),next=evolve(initial,32,24,model.rules(model.presets.reef),100);
 assert.deepEqual(next,initial);
});
test('all presets sustain structured activity after 2,000 local updates',()=>{
 for(const preset of Object.values(model.presets)){
  const data=evolve(model.seed(80,80,random()),80,80,model.rules(preset),2000);
  const stats=model.measure(data);
  assert(stats.coverage>0.03 && stats.coverage<0.95,`${preset.name} coverage ${stats.coverage}`);
  for(const value of data)assert(Number.isFinite(value)&&value>=0&&value<=1);
 }
});
test('walls block exchange, survive evolution, and erase reopens them',()=>{
 const a=model.field(32,32);model.paint(a,32,32,0.5,0.5,3,'wall');
 model.paint(a,32,32,0.5,0.5,2,'seed');
 const next=evolve(a,32,32,model.rules(model.presets.reef),100),i=(16*32+16)*4;
 assert.equal(next[i+3],1);assert.equal(next[i+1],0);
 model.paint(next,32,32,0.5,0.5,3,'erase');assert.equal(next[i+3],0);
 model.paint(next,32,32,0.5,0.5,2,'seed');assert(next[i+1]>0);
});
test('feed changes nutrients without clearing established activity',()=>{
 const data=model.field(32,32);model.paint(data,32,32,0.5,0.5,2,'seed');
 const i=(16*32+16)*4,v=data[i+1];model.paint(data,32,32,0.5,0.5,2,'feed');
 assert.equal(data[i],1);assert.equal(data[i+1],v);
});
test('the local stencil wraps at the boundary',()=>{
 const data=model.field(16,16),out=new Float32Array(data.length);
 model.paint(data,16,16,0,0.5,0.1,'seed');model.step(data,out,16,16,model.rules(model.presets.reef));
 assert(out[(8*16+15)*4+1]>0);assert.equal(out[(8*16+8)*4+1],0);
});
test('rule changes genuinely alter outcomes and bounded extremes remain finite',()=>{
 const seed=model.seed(24,24,random());
 const low=model.rules({feed:-99,decay:99,spread:99,supply:0,growth:99});
 assert.equal(low.feed,model.bounds.feed[0]);assert.equal(low.decay,model.bounds.decay[1]);
 const a=evolve(new Float32Array(seed),24,24,model.rules(model.presets.reef),200),b=evolve(new Float32Array(seed),24,24,low,200);
 assert.notDeepEqual(a,b);for(const value of b)assert(Number.isFinite(value)&&value>=0&&value<=1);
});
test('nutrient diffusion defaults to the original rate and can be disabled independently',()=>{
 const width=16,height=16,initial=model.field(width,height);
 model.paint(initial,width,height,0,0.5,0.1,'seed');
 const opposite=(8*width+15)*4;
 const legacy=model.rules({feed:0.0545});
 const local=model.rules({...legacy,nutrientDiffusion:0});
 assert.equal(legacy.nutrientDiffusion,1);
 const diffused=evolve(initial.slice(),width,height,legacy,1);
 const stationary=evolve(initial.slice(),width,height,local,1);
 assert(diffused[opposite]<1);
 assert.equal(stationary[opposite],1);
 assert(stationary[opposite+1]>0);
 assert.equal(stationary[opposite+1],diffused[opposite+1]);
});
test('fertility persists and changes only local nutrient renewal',()=>{
 const width=16,height=16,initial=model.field(width,height);
 const locations=[0.25,0.5,0.75];
 for(const [x,tool] of locations.map((x,i)=>[x,['fertility-poor','fertility-normal','fertility-rich'][i]])){
  model.paint(initial,width,height,x,0.5,0.1,tool);
  model.paint(initial,width,height,x,0.5,0.1,'seed');
 }
 const indices=locations.map(x=>(8*width+x*width)*4);
 const rule=model.rules({nutrientDiffusion:0});
 const next=evolve(initial.slice(),width,height,rule,1);
 const [poor,normal,rich]=indices;
 assert(next[poor]<next[normal]&&next[normal]<next[rich]);
 for(const i of indices){
  assert.equal(next[i+1],next[normal+1]);
  assert.equal(next[i+3],initial[i+3]);
 }
 model.paint(next,width,height,0.75,0.5,0.1,'fertility-normal');
 assert.deepEqual(next.slice(rich,rich+4),Float32Array.of(next[rich],next[rich+1],next[rich+2],0));
 model.paint(next,width,height,0.25,0.5,0.1,'wall');
 model.paint(next,width,height,0.25,0.5,0.1,'fertility-rich');
 assert.equal(next[poor+3],1);
 model.paint(next,width,height,0.25,0.5,0.1,'erase');
 assert.deepEqual(next.slice(poor,poor+4),Float32Array.of(1,0,0,0));
});
