// GPU geometry, segment intersections, and analytic light sprites for La Cross.
const shader = `
struct Settings { viewport: vec4f, info: vec4f, ends: array<vec4f, 8> }
@group(0) @binding(0) var<uniform> settings: Settings;
@group(0) @binding(1) var<storage, read> trails: array<vec4f>;
struct Vertex { @builtin(position) position: vec4f, @location(0) uv: vec2f,
  @location(1) color: vec4f, @location(2) age: f32 }
fn clip(p: vec2f) -> vec4f {
  return vec4f(p / settings.viewport.xy * vec2f(2., -2.) + vec2f(-1., 1.), 0., 1.);
}
fn tint(t: f32) -> vec3f { return mix(vec3f(0.49,0.85,0.86), vec3f(0.94,0.73,0.55), t); }
@vertex fn background(@builtin(vertex_index) i: u32) -> Vertex {
  var corners = array<vec2f, 3>(vec2f(-1.,-1.), vec2f(3.,-1.), vec2f(-1.,3.));
  var v: Vertex; v.position = vec4f(corners[i],0.,1.); v.uv = corners[i]; return v;
}
@fragment fn backdrop(v: Vertex) -> @location(0) vec4f {
  let radial = 1. - smoothstep(0.,1.6,length(v.uv));
  return vec4f(vec3f(0.025,0.043,0.065) + radial * vec3f(0.008,0.016,0.021),1.);
}
@vertex fn lineVertex(@builtin(vertex_index) index: u32) -> Vertex {
  let i = index + select(32u,0u,settings.viewport.w >= 2.);
  var p: vec2f; var t: f32; var alpha = 0.18;
  if (i < 32u) {
    let pair = i / 2u; let a = pair / 4u; let b = pair % 4u;
    p = settings.ends[select(a,b+4u,i%2u==1u)].xy; t = f32((a+b)%2u);
  } else {
    let j = i-32u; let body = j/4u;
    var order = array<u32,4>(0u,2u,1u,3u);
    p = settings.ends[body*4u + order[j%4u]].xy; t = 1.-f32(body); alpha = 0.7;
  }
  var v: Vertex; v.position = clip(p); v.color = vec4f(tint(t),alpha); return v;
}
@fragment fn lineLight(v: Vertex) -> @location(0) vec4f { return v.color; }
fn sprite(i: u32, p: vec2f, radius: f32) -> Vertex {
  var corners = array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),
    vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  var v: Vertex; v.uv = corners[i]; v.position = clip(p + v.uv*radius); return v;
}
@vertex fn trailVertex(@builtin(vertex_index) i: u32, @builtin(instance_index) instance: u32) -> Vertex {
  let point = trails[instance]; var v = sprite(i, point.xy, 5.5);
  v.age = point.z; v.color = vec4f(tint(point.z),0.12+0.6*point.z*point.z); return v;
}
@fragment fn trailLight(v: Vertex) -> @location(0) vec4f {
  let d = length(v.uv); let core = exp(-d*d*60.); let halo = exp(-d*d*7.)*0.16;
  return vec4f(v.color.rgb,(core+halo)*v.color.a);
}
fn det(a: vec2f,b: vec2f) -> f32 { return a.x*b.y-a.y*b.x; }
@vertex fn intersectionVertex(@builtin(vertex_index) i: u32, @builtin(instance_index) pair: u32) -> Vertex {
  let a = pair/2u; let b = pair%2u;
  let p = settings.ends[a].xy; let r = settings.ends[a+2u].xy-p;
  let q = settings.ends[b+4u].xy; let s = settings.ends[b+6u].xy-q;
  let divisor = det(r,s);
  let safe = select(divisor,1.,abs(divisor)<0.00001);
  let t = det(q-p,s)/safe; let u = det(q-p,r)/safe;
  let valid = abs(divisor)>=0.00001 && t>=0. && t<=1. && u>=0. && u<=1.;
  var v = sprite(i,p+t*r,40.); v.age=f32(pair);
  v.color=vec4f(tint(f32(pair)/3.),select(0.,1.,valid));
  if (!valid) { v.position=vec4f(3.,3.,0.,1.); } return v;
}
@fragment fn intersectionLight(v: Vertex) -> @location(0) vec4f {
  let d = length(v.uv); let time = settings.viewport.z;
  let pulse = 0.5+0.5*sin(time*3.+v.age*1.7);
  let core = exp(-d*d*750.);
  let bloom = exp(-d*d*16.)*(0.14+0.08*pulse);
  let radius = 0.22+0.13*pulse;
  let ring = exp(-pow((d-radius)*100.,2.))*(0.12+0.08*pulse);
  let rays = (exp(-abs(v.uv.x)*100.)+exp(-abs(v.uv.y)*100.))*exp(-d*10.)*0.2;
  let color = mix(v.color.rgb,vec3f(1.,0.97,0.85),clamp(core+rays,0.,1.));
  return vec4f(color,min(1.,core+bloom+ring+rays)*v.color.a);
}`;

let active = null;
function dispose(r) {
  if (!r || r.stopped) return;
  r.stopped=true; r.ready=false;
  if (r.observer) r.observer.disconnect();
  r.canvas.remove();
  if (r.device) r.device.destroy();
  if (active===r) active=null;
}
function create(host,overlay) {
  dispose(active);
  const canvas=document.createElement('canvas');
  canvas.setAttribute('data-cross-gpu',''); canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText='position:absolute;inset:0;pointer-events:none;display:none;max-width:100vw;max-height:100vh';
  host.insertBefore(canvas,overlay); overlay.style.position='relative';
  const r={canvas,ready:false,stopped:false,label:'Canvas'}; active=r;
  r.observer=new MutationObserver(()=>{if(!canvas.isConnected || !overlay.isConnected) dispose(r);});
  r.observer.observe(host,{childList:true});
  (async()=>{
    try {
      r.api=navigator.gpu; if(!r.api) return;
      r.label='Starting WebGPU'; r.adapter=await r.api.requestAdapter();
      if (!r.adapter || r.stopped) {r.label='Canvas';return;}
      const device=await r.adapter.requestDevice();
      if(r.stopped){device.destroy();return;} r.device=device;
      device.lost.then(()=>dispose(r)); device.addEventListener('uncapturederror',()=>dispose(r));
      r.context=canvas.getContext('webgpu'); if(!r.context) throw Error('No GPU context');
      const format=r.api.getPreferredCanvasFormat(); r.context.configure({device,format,alphaMode:'opaque'});
      const module=device.createShaderModule({code:shader});
      const info=await module.getCompilationInfo();
      if(info.messages.some(m=>m.type==='error')) throw Error('Invalid shader');
      const layout=device.createBindGroupLayout({entries:[
        {binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
        {binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}}]});
      const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
      const blend={color:{srcFactor:'src-alpha',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
      const pipeline=(vertex,fragment,topology)=>device.createRenderPipelineAsync({layout:pipelineLayout,
        vertex:{module,entryPoint:vertex},fragment:{module,entryPoint:fragment,targets:[{format,blend}]},primitive:{topology}});
      [r.background,r.lines,r.trails,r.intersections]=await Promise.all([
        pipeline('background','backdrop','triangle-list'),pipeline('lineVertex','lineLight','line-list'),
        pipeline('trailVertex','trailLight','triangle-list'),pipeline('intersectionVertex','intersectionLight','triangle-list')]);
      if(r.stopped) return;
      r.settings=new Float32Array(40); r.points=new Float32Array(1200*4);
      r.uniform=device.createBuffer({size:160,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      r.storage=device.createBuffer({size:r.points.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
      r.group=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:r.uniform}},{binding:1,resource:{buffer:r.storage}}]});
      r.ready=true; r.label='WebGPU';
    } catch (_) {dispose(r);}
  })();
  return r;
}
function draw(r,width,height,phase,mode,endpoints,traces) {
  if(!r || !r.ready || r.stopped) return false;
  try {
    if(!r.canvas.isConnected){dispose(r);return false;}
    if(r.canvas.width!==width || r.canvas.height!==height){r.canvas.width=width;r.canvas.height=height;}
    r.settings.set([width,height,phase,mode,traces.length,0,0,0]);
    for(let i=0;i<8;i++) r.settings.set([endpoints[i][0],endpoints[i][1],0,0],8+i*4);
    const count=Math.min(traces.length,1200);
    for(let i=0;i<count;i++) r.points.set([traces[i][0],traces[i][1],i/Math.max(1,count-1),0],i*4);
    const device=r.device;device.queue.writeBuffer(r.uniform,0,r.settings);
    if(count) device.queue.writeBuffer(r.storage,0,r.points,0,count*4);
    const encoder=device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:r.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    pass.setBindGroup(0,r.group);pass.setPipeline(r.background);pass.draw(3);
    if(mode!==0){pass.setPipeline(r.lines);pass.draw(mode>=2?40:8);}
    if(mode!==2 && count){pass.setPipeline(r.trails);pass.draw(6,count);}
    pass.setPipeline(r.intersections);pass.draw(6,4);
    pass.end();device.queue.submit([encoder.finish()]);r.canvas.style.display='block';return true;
  } catch (_){dispose(r);return false;}
}
function status(r){return r && !r.stopped?r.label:'Canvas';}
module.exports={create,draw,status,dispose};
