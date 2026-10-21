// The CPU and GPU implement the same local rule. No learned weights or global solver.
const shader=`
struct Settings { size: vec4f, rule: vec4f, brush: vec4f, extra: vec4f }
@group(0) @binding(0) var<uniform> settings: Settings;
@group(0) @binding(1) var<storage,read> source: array<vec4f>;
@group(0) @binding(2) var<storage,read_write> nextCells: array<vec4f>;
@group(0) @binding(3) var<storage,read> brushes: array<vec4f>;
fn index(p:vec2i)->u32 {
  let size=vec2i(settings.size.xy);
  let q=(p+size)%size;
  return u32(q.y*size.x+q.x);
}
@compute @workgroup_size(8,8) fn paint(@builtin(global_invocation_id) id:vec3u) {
  let p=vec2i(id.xy);if(any(p>=vec2i(settings.size.xy))){return;}
  let i=index(p);var cell=source[i];
  for(var n=0u;n<u32(settings.extra.w);n++) {
    let brush=brushes[n];
    if(distance(vec2f(p),brush.xy)<=brush.z){
      let tool=u32(brush.w);
      if(tool==4u){cell=vec4f(1.,0.,0.,1.);}
      else if(tool==2u){cell=vec4f(1.,0.,0.,0.);}
      else if(cell.w<0.5){
        if(tool==3u){cell.x=1.;}else{cell.x=0.5;cell.y=0.32;}
      }
    }
  }
  nextCells[i]=cell;
}
@compute @workgroup_size(8,8) fn evolve(@builtin(global_invocation_id) id:vec3u) {
  let p=vec2i(id.xy);let size=vec2i(settings.size.xy);
  if(any(p>=size)){return;}
  let i=index(p);let cell=source[i];
  if(cell.w>0.5){nextCells[i]=vec4f(1.,0.,0.,1.);return;}
  var lap=-cell.xy;
  for(var dy=-1;dy<=1;dy++) {for(var dx=-1;dx<=1;dx++) {
    if(dx==0 && dy==0){continue;}
    let neighbor=source[index(p+vec2i(dx,dy))];
    let weight=select(0.05,0.2,dx==0 || dy==0);
    lap+=weight*select(neighbor.xy,cell.xy,neighbor.w>0.5);
  }}
  let reaction=settings.extra.x*cell.x*cell.y*cell.y;
  let u=clamp(cell.x+lap.x-reaction+settings.rule.x*(settings.rule.w-cell.x),0.,1.);
  let v=clamp(cell.y+settings.rule.z*lap.y+reaction-(settings.rule.x+settings.rule.y)*cell.y,0.,1.);
  nextCells[i]=vec4f(u,v,abs(v-cell.y),0.);
}
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f }
@vertex fn vertex(@builtin(vertex_index) i:u32)->Vertex {
  var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var v:Vertex;v.position=vec4f(p[i],0.,1.);v.uv=p[i]*vec2f(0.5,-0.5)+0.5;return v;
}
fn sampleField(uv:vec2f)->vec4f {
  let p=uv*settings.size.xy-0.5;let base=vec2i(floor(p));let f=fract(p);
  return mix(mix(source[index(base)],source[index(base+vec2i(1,0))],f.x),
             mix(source[index(base+vec2i(0,1))],source[index(base+vec2i(1,1))],f.x),f.y);
}
@fragment fn fragment(v:Vertex)->@location(0) vec4f {
  let c=sampleField(v.uv);let ink=smoothstep(0.025,0.38,c.y);
  let base=vec3f(0.0235,0.055,0.063);
  var color=mix(base,vec3f(0.1,0.38,0.34),ink*0.7);
  let membrane=exp(-pow((c.y-0.19)*16.,2.));
  color+=membrane*vec3f(0.18,0.63,0.48)+smoothstep(0.25,0.55,c.y)*vec3f(0.75,0.55,0.26);
  let mode=u32(settings.extra.y);
  if(mode==1u){color=mix(base,vec3f(1.,0.48,0.25),clamp(c.z*150.,0.,1.));color+=ink*vec3f(0.02,0.08,0.09);}
  if(mode==2u){color=mix(vec3f(0.04,0.09,0.12),vec3f(0.3,0.63,0.74),c.x);}
  if(c.w>0.5){color=vec3f(0.16,0.22,0.24);}
  // A restrained vignette keeps the field legible rather than adding false motion.
  color*=1.-0.2*length(v.uv-0.5);
  return vec4f(color,1.);
}`;
async function create(canvas,data,width,height) {
  const api=navigator.gpu;if(!api)return null;
  const adapter=await api.requestAdapter();if(!adapter)return null;
  const device=await adapter.requestDevice();
  try {
    const context=canvas.getContext('webgpu');if(!context){device.destroy();return null;}
    const format=api.getPreferredCanvasFormat();
    context.configure({device,format,alphaMode:'opaque'});
    const module=device.createShaderModule({code:shader});
    const errors=(await module.getCompilationInfo()).messages.filter(m=>m.type==='error');
    if(errors.length)throw new Error(errors.map(m=>m.message).join('\n'));
    const layout=device.createBindGroupLayout({entries:[
      {binding:0,visibility:GPUShaderStage.COMPUTE|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
      {binding:1,visibility:GPUShaderStage.COMPUTE|GPUShaderStage.FRAGMENT,buffer:{type:'read-only-storage'}},
      {binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},
      {binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}}]});
    const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
    const compute=await device.createComputePipelineAsync({layout:pipelineLayout,compute:{module,entryPoint:'evolve'}});
    const paint=await device.createComputePipelineAsync({layout:pipelineLayout,compute:{module,entryPoint:'paint'}});
    const render=await device.createRenderPipelineAsync({layout:pipelineLayout,vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}});
    const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const brushBuffer=device.createBuffer({size:96*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    const buffers=[0,1].map(()=>device.createBuffer({size:data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}));
    buffers.forEach(b=>device.queue.writeBuffer(b,0,data));
    const groups=buffers.map((b,i)=>device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:buffers[1-i]}},{binding:3,resource:{buffer:brushBuffer}}]}));
    const r={api,adapter,device,context,compute,paint,render,brushBuffer,buffers,groups,uniform,width,height,current:0,pending:false,stopped:false,lost:false};
    device.lost.then(info=>{r.lost=true;r.error=info.message;});
    device.addEventListener('uncapturederror',event=>{r.error=event.error.message;});
    return r;
  } catch(error){device.destroy();throw error;}
}
function frame(r,rule,steps,view,brushes=[]) {
  if(r.stopped||r.lost)throw new Error('GPU unavailable');
  const tool={'seed':1,'erase':2,'feed':3,'wall':4};
  const values=new Float32Array([r.width,r.height,0,0,rule['feed'],rule['decay'],rule['spread'],rule['supply'],
    0,0,0,0,rule['growth'],view,0,brushes.length]);
  r.device.queue.writeBuffer(r.uniform,0,values);
  if(brushes.length){
    const values=new Float32Array(brushes.length*4);
    brushes.forEach((brush,i)=>values.set([brush.x*r.width,brush.y*r.height,brush.radius,tool[brush.tool]],i*4));
    r.device.queue.writeBuffer(r.brushBuffer,0,values);
  }
  const encoder=r.device.createCommandEncoder();
  if(steps>0 || brushes.length){
    const pass=encoder.beginComputePass();
    if(brushes.length){pass.setPipeline(r.paint);pass.setBindGroup(0,r.groups[r.current]);pass.dispatchWorkgroups(Math.ceil(r.width/8),Math.ceil(r.height/8));r.current=1-r.current;}
    pass.setPipeline(r.compute);
    for(let n=0;n<steps;n++) {pass.setBindGroup(0,r.groups[r.current]);pass.dispatchWorkgroups(Math.ceil(r.width/8),Math.ceil(r.height/8));r.current=1-r.current;}
    pass.end();
  }
  const pass=encoder.beginRenderPass({colorAttachments:[{view:r.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
  pass.setPipeline(r.render);pass.setBindGroup(0,r.groups[r.current]);pass.draw(3);pass.end();
  r.device.queue.submit([encoder.finish()]);
  r.pending=true;r.device.queue.onSubmittedWorkDone().then(()=>r.pending=false,()=>{r.pending=false;r.lost=true;});
}
async function snapshot(r) {
  const buffer=r.device.createBuffer({size:r.width*r.height*16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  try {
    const encoder=r.device.createCommandEncoder();encoder.copyBufferToBuffer(r.buffers[r.current],0,buffer,0,buffer.size);
    r.device.queue.submit([encoder.finish()]);await buffer.mapAsync(GPUMapMode.READ);
    return new Float32Array(buffer.getMappedRange().slice(0));
  } finally {buffer.destroy();}
}
function upload(r,data){r.buffers.forEach(b=>r.device.queue.writeBuffer(b,0,data));r.current=0;}
function dispose(r){if(!r||r.stopped)return;r.stopped=true;r.device.destroy();}
module.exports={create,frame,snapshot,upload,dispose};
