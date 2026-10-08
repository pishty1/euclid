// Transparent combat layer: ship/enemies, text, and gameplay stay in Quil.
const shader=`
struct Settings { viewport: vec4f }
struct Effect { ends: vec4f, info: vec4f }
@group(0) @binding(0) var<uniform> settings: Settings;
@group(0) @binding(1) var<storage,read> effects: array<Effect>;
struct Vertex { @builtin(position) position: vec4f, @location(0) uv: vec2f,
 @location(1) info: vec4f, @location(2) extra: vec2f }
fn clip(p:vec2f)->vec4f { return vec4f(p/settings.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.); }
fn corner(i:u32)->vec2f {
 var c=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.)); return c[i];
}
fn tint(op:f32)->vec3f {
 if(op<0.5){return vec3f(1.,0.7,0.3);} if(op<1.5){return vec3f(1.,0.35,0.5);}
 if(op<2.5){return vec3f(0.72,0.5,1.);} return vec3f(0.3,0.77,1.);
}
@vertex fn boltVertex(@builtin(vertex_index) i:u32,@builtin(instance_index) instance:u32)->Vertex {
 let e=effects[instance]; let delta=e.ends.zw-e.ends.xy; let distance=max(1.,length(delta));
 let direction=delta/distance; let normal=vec2f(-direction.y,direction.x); let c=corner(i);
 var v:Vertex; v.uv=vec2f((c.x+1.)*0.5*distance,c.y*20.);
 v.position=clip(e.ends.xy+direction*v.uv.x+normal*v.uv.y); v.info=e.info;v.extra=vec2f(distance,0.); return v;
}
@fragment fn boltLight(v:Vertex)->@location(0) vec4f {
 let age=v.info.x; let duration=v.info.y; let op=v.info.z; let kind=v.info.w;
 if(kind>1.5 || age>=duration){return vec4f(0.);}
 let t=clamp(age/duration,0.,1.); let front=t*v.extra.x; var light=0.;var color=tint(op);
 if(kind<0.5){
   color=vec3f(0.5,1.,0.87);light=exp(-v.uv.y*v.uv.y*0.5)*step(v.uv.x,front)*0.75
     + exp(-pow((v.uv.x-front)/7.,2.)-v.uv.y*v.uv.y*0.1);
 } else if(op<0.5){
   for(var j=0u;j<3u;j=j+1u){let p=front-f32(j)*18.;light+=exp(-pow((v.uv.x-p)/5.,2.)-v.uv.y*v.uv.y*0.12);}
 } else if(op<1.5){
   light=exp(-v.uv.y*v.uv.y*1.2)*step(v.uv.x,front)*0.9
     +exp(-pow((v.uv.x-front)/12.,2.)-v.uv.y*v.uv.y*0.1);
 } else if(op<2.5){
   for(var j=0u;j<4u;j=j+1u){let spread=(f32(j)-1.5)*10.*sin(t*3.14159);
     light+=exp(-pow((v.uv.x-front)/7.,2.)-pow((v.uv.y-spread)/2.5,2.));}
 } else {
   let offset=sin(t*25.)*9.*sin(t*3.14159);
   light=exp(-pow((v.uv.x-front)/8.,2.)-pow((v.uv.y-offset)/2.5,2.))
     +exp(-pow((v.uv.x-front)/8.,2.)-pow((v.uv.y+offset)/2.5,2.));
 }
 let halo=light*0.35; return vec4f(mix(color,vec3f(1.),min(0.6,light*0.3)),min(1.,light+halo));
}
@vertex fn blastVertex(@builtin(vertex_index) i:u32,@builtin(instance_index) instance:u32)->Vertex {
 let e=effects[instance/32u];let seed=instance%32u;
 let age=select(e.info.x-e.info.y,e.info.x,e.info.w>1.5); let visible=e.info.w!=1. && age>=0. && age<0.8;
 let op=e.info.z;let angle=f32(seed)*2.39996+op*0.8;
 var offset=vec2f(cos(angle),sin(angle))*(8.+max(0.,age)*(45.+f32(seed%7u)*14.));
 if(op>0.5 && op<1.5){offset.x*=1.6;offset.y*=0.3;}
 if(op>1.5 && op<2.5){offset*=0.6+0.4*abs(sin(angle*2.+age*7.));}
 if(op>2.5){let a=angle+age*6.;offset=vec2f(cos(a),sin(a))*length(offset);}
 var radius=4.; if(seed==0u){offset=vec2f(0.);radius=80.;}
 var v:Vertex;v.uv=corner(i);v.position=clip(e.ends.zw+offset+v.uv*radius);
 v.info=vec4f(age,op,f32(seed),select(0.,1.,visible));v.extra=vec2f(radius,0.);
 if(!visible){v.position=vec4f(3.,3.,0.,1.);}return v;
}
@fragment fn blastLight(v:Vertex)->@location(0) vec4f {
 let age=v.info.x;let d=length(v.uv);let fade=pow(max(0.,1.-age/0.8),2.);var light=0.;
 if(v.info.z<0.5){
   let ring=exp(-pow((d-(0.12+age*0.85))*90.,2.));
   light=(ring*0.55+exp(-d*d*18.)*exp(-age*9.)*0.8)*fade;
 }else{light=exp(-d*d*8.)*fade;}
 return vec4f(mix(tint(v.info.y),vec3f(1.,0.95,0.85),0.25),light*v.info.w);
}`;
let active=null;
function dispose(r){
 if(!r || r.stopped)return;r.stopped=true;r.ready=false;
 if(r.observer)r.observer.disconnect();r.canvas.remove();if(r.device)r.device.destroy();if(active===r)active=null;
}
function create(host,overlay){
 dispose(active);const canvas=document.createElement('canvas');
 canvas.setAttribute('data-venture-gpu','');canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;z-index:1;pointer-events:none;display:none;max-width:100vw;max-height:100vh';
 host.appendChild(canvas);overlay.style.position='relative';
 const r={canvas,ready:false,stopped:false,label:'Canvas'};active=r;
 r.observer=new MutationObserver(()=>{if(!canvas.isConnected || !overlay.isConnected)dispose(r);});r.observer.observe(host,{childList:true});
 (async()=>{try{
   r.api=navigator.gpu;if(!r.api)return;r.label='Starting WebGPU';r.adapter=await r.api.requestAdapter();
   if(!r.adapter || r.stopped){r.label='Canvas';return;}const device=await r.adapter.requestDevice();
   if(r.stopped){device.destroy();return;}r.device=device;device.lost.then(()=>dispose(r));device.addEventListener('uncapturederror',()=>dispose(r));
   r.context=canvas.getContext('webgpu');if(!r.context)throw Error('No GPU context');
   const format=r.api.getPreferredCanvasFormat();r.context.configure({device,format,alphaMode:'premultiplied'});
   const module=device.createShaderModule({code:shader});const info=await module.getCompilationInfo();
   if(info.messages.some(m=>m.type==='error'))throw Error('Invalid shader');
   const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:'uniform'}},
     {binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}}]});
   const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
   const blend={color:{srcFactor:'src-alpha',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
   const pipeline=(vertex,fragment)=>device.createRenderPipelineAsync({layout:pipelineLayout,vertex:{module,entryPoint:vertex},fragment:{module,entryPoint:fragment,targets:[{format,blend}]},primitive:{topology:'triangle-list'}});
   [r.bolts,r.blasts]=await Promise.all([pipeline('boltVertex','boltLight'),pipeline('blastVertex','blastLight')]);if(r.stopped)return;
   r.settings=new Float32Array(4);r.effects=new Float32Array(256*8);
   r.uniform=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
   r.storage=device.createBuffer({size:r.effects.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
   r.group=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:r.uniform}},{binding:1,resource:{buffer:r.storage}}]});r.ready=true;r.label='WebGPU';
 }catch(_){dispose(r);}})();return r;
}
function draw(r,width,height,effects){
 if(!r || !r.ready || r.stopped)return false;
 try{
   if(!r.canvas.isConnected){dispose(r);return false;}if(r.canvas.width!==width || r.canvas.height!==height){r.canvas.width=width;r.canvas.height=height;}
   const count=Math.min(256,effects.length);r.settings.set([width,height,0,0]);
   for(let i=0;i<count;i++)r.effects.set(effects[i],i*8);
   const device=r.device;device.queue.writeBuffer(r.uniform,0,r.settings);if(count)device.queue.writeBuffer(r.storage,0,r.effects,0,count*8);
   const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:r.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});
   if(count){pass.setBindGroup(0,r.group);pass.setPipeline(r.bolts);pass.draw(6,count);pass.setPipeline(r.blasts);pass.draw(6,count*32);}
   pass.end();device.queue.submit([encoder.finish()]);r.canvas.style.display='block';return true;
 }catch(_){dispose(r);return false;}
}
function status(r){return r && !r.stopped?r.label:'Canvas';}
module.exports={create,draw,status,dispose};
