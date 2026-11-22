const {test}=require('node:test');
const assert=require('node:assert/strict');
const garden=require('../../src/rendering/garden.js');
const gpu=require('../../src/rendering/garden_gpu.js');
const model=require('../../src/rendering/garden_model.js');

test('failed GPU fallback restores the checkpoint generation even with a frame pending',()=>{
  const width=16,height=16,data=model.field(width,height);
  const app={
    root:{isConnected:true},canvas:{width,height},gpuCanvas:{},
    gpu:{pending:true,failed:true,error:'validation failed',device:{destroy(){}}},
    generation:118,checkpointGeneration:106,data,width,height,brushes:[],
    speed:6,speedSlider:{},lastFrame:-Infinity,lastStats:Infinity,toast:{},
    offscreen:{width,height},
    offctx:{createImageData:()=>({data:new Uint8ClampedArray(data.length)}),putImageData(){}},
    ctx:{drawImage(){}}
  };
  garden.frame(app,width,height,true);
  assert.equal(app.backend,'CPU');
  assert.equal(app.generation,106);
  assert.equal(app.data,data);
  assert.equal(app.gpuError,'GPU unavailable / validation failed');
});

test('a scoped WebGPU validation error marks a submitted frame as failed',async()=>{
  const pass={setPipeline(){},setBindGroup(){},draw(){},end(){}};
  const scopes=[];
  const renderer={
    width:16,height:16,groups:[{}],current:0,
    context:{getCurrentTexture:()=>({createView(){}})},
    device:{
      pushErrorScope:scope=>scopes.push(scope),
      popErrorScope:async()=>({message:'invalid submission'}),
      createCommandEncoder:()=>({beginRenderPass:()=>pass,finish(){}}),
      queue:{writeBuffer(){},submit(){},onSubmittedWorkDone:async()=>{}}
    }
  };
  gpu.frame(renderer,model.presets.reef,0,0);
  assert.equal(renderer.pending,true);
  await renderer.frameDone;
  assert.deepEqual(scopes,['validation']);
  assert.equal(renderer.pending,false);
  assert.equal(renderer.failed,true);
  assert.equal(renderer.error,'invalid submission');
  assert.throws(()=>gpu.frame(renderer,model.presets.reef,0,0),/GPU unavailable/);
});
