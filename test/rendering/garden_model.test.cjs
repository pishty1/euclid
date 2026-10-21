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
