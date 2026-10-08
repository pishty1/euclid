// WebGPU is optional: Canvas remains available during startup and after failure.
const shader = `
struct Settings { viewport: vec4f, colors: array<vec4f, 3> }
@group(0) @binding(0) var<uniform> settings: Settings;
@group(0) @binding(1) var<storage, read> cells: array<vec4f>;
struct Vertex { @builtin(position) position: vec4f, @location(0) color: vec4f, @location(1) uv: vec2f }
fn clip(p: vec2f) -> vec4f {
  return vec4f(p / settings.viewport.xy * vec2f(2., -2.) + vec2f(-1., 1.), 0., 1.);
}
@vertex fn background(@builtin(vertex_index) i: u32) -> Vertex {
  var points = array<vec2f, 3>(vec2f(-1., -1.), vec2f(3., -1.), vec2f(-1., 3.));
  var v: Vertex; v.position = vec4f(points[i], 0., 1.);
  v.uv = points[i] * vec2f(0.5, -0.5) + vec2f(0.5);
  v.color = vec4f(1.); return v;
}
@fragment fn backdrop(v: Vertex) -> @location(0) vec4f {
  let t = clamp((v.uv.x + v.uv.y) * 0.5, 0., 1.);
  return vec4f(mix(vec3f(5.,14.,37.), vec3f(6.,36.,66.), t) / 255., 1.);
}
@vertex fn bond(@builtin(vertex_index) i: u32) -> Vertex {
  let cell = cells[i]; var v: Vertex;
  v.position = clip(cell.xy); v.color = settings.colors[u32(cell.z)];
  v.color.a = 0.24; v.uv = vec2f(0.); return v;
}
@fragment fn line(v: Vertex) -> @location(0) vec4f { return v.color; }
@vertex fn cell(@builtin(vertex_index) i: u32, @builtin(instance_index) instance: u32) -> Vertex {
  var corners = array<vec2f, 6>(vec2f(-1.,-1.), vec2f(1.,-1.), vec2f(-1.,1.),
                             vec2f(-1.,1.), vec2f(1.,-1.), vec2f(1.,1.));
  let c = cells[instance]; var v: Vertex; v.uv = corners[i] * 7.;
  v.position = clip(c.xy + v.uv); v.color = settings.colors[u32(c.z)];
  v.color.a = select(1.9, 1.65, u32(c.z) == 2u); return v;
}
@fragment fn glow(v: Vertex) -> @location(0) vec4f {
  let edge = abs(length(v.uv) - v.color.a);
  let ring = 1. - smoothstep(0.15, 0.85, edge);
  let halo = 0.08 * (1. - smoothstep(0.5, 3., edge));
  return vec4f(v.color.rgb, ring * 0.85 + halo);
}`;

let active = null;
function dispose(renderer) {
  if (!renderer || renderer.stopped) return;
  renderer.stopped = true;
  renderer.ready = false;
  if (renderer.observer) renderer.observer.disconnect();
  renderer.canvas.remove();
  if (renderer.device) renderer.device.destroy();
  if (active === renderer) active = null;
}

function create(host, overlay, capacity) {
  dispose(active);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('data-ecosystem-gpu', '');
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none;max-width:100vw;max-height:100vh';
  host.insertBefore(canvas, overlay);
  overlay.style.position = 'relative';
  const r = {canvas, ready:false, stopped:false, label:'Canvas', device:null};
  active = r;
  r.observer = new MutationObserver(() => {
    if (!canvas.isConnected || !overlay.isConnected) dispose(r);
  });
  r.observer.observe(host, {childList:true});
  async function initialize() {
    try {
      const api = navigator.gpu;
      if (!api) return;
      r.api = api;
      r.label = 'Starting WebGPU';
      const adapter = await api.requestAdapter();
      if (!adapter || r.stopped) { r.label = 'Canvas'; return; }
      r.adapter = adapter;
      const device = await adapter.requestDevice();
      if (r.stopped) { device.destroy(); return; }
      r.device = device;
      device.lost.then(() => {
        if (!r.stopped) { r.label = 'Canvas'; dispose(r); }
      });
      device.addEventListener('uncapturederror', () => {
        r.label = 'Canvas'; dispose(r);
      });
      const context = canvas.getContext('webgpu');
      if (!context) throw new Error('WebGPU context unavailable');
      const format = api.getPreferredCanvasFormat();
      context.configure({device, format, alphaMode:'opaque'});
      const module = device.createShaderModule({code:shader});
      const compilation = await module.getCompilationInfo();
      if (compilation.messages.some(m => m.type === 'error')) throw new Error('WebGPU shader compilation failed');
      const layout = device.createBindGroupLayout({entries:[
        {binding:0, visibility:GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer:{type:'uniform'}},
        {binding:1, visibility:GPUShaderStage.VERTEX, buffer:{type:'read-only-storage'}}
      ]});
      const pipelineLayout = device.createPipelineLayout({bindGroupLayouts:[layout]});
      const blend = {color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha',operation:'add'},
                     alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
      const makePipeline = (vertex, fragment, topology) => device.createRenderPipelineAsync({
        layout:pipelineLayout, vertex:{module,entryPoint:vertex},
        fragment:{module,entryPoint:fragment,targets:[{format,blend}]}, primitive:{topology}
      });
      [r.background, r.bonds, r.cells] = await Promise.all([
        makePipeline('background','backdrop','triangle-list'),
        makePipeline('bond','line','line-list'), makePipeline('cell','glow','triangle-list')
      ]);
      if (r.stopped) return;
      r.positions = new Float32Array(capacity * 4);
      r.indices = new Uint32Array(capacity * 12);
      r.settings = new Float32Array(16);
      r.positionBuffer = device.createBuffer({size:r.positions.byteLength,usage:GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
      r.indexBuffer = device.createBuffer({size:r.indices.byteLength,usage:GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST});
      r.settingsBuffer = device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
      r.group = device.createBindGroup({layout,entries:[
        {binding:0,resource:{buffer:r.settingsBuffer}}, {binding:1,resource:{buffer:r.positionBuffer}}
      ]});
      r.context = context; r.ready = true; r.label = 'WebGPU';
    } catch (_) {
      r.label = 'Canvas'; dispose(r);
    }
  }
  initialize();
  return r;
}

function draw(r, world, palette) {
  if (!r || !r.ready || r.stopped) return false;
  try {
    const {canvas, device} = r;
    if (!canvas.isConnected) { dispose(r); return false; }
    const width = world["width"], height = world["height"];
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    r.settings[0] = width; r.settings[1] = height;
    for (let k = 0; k < 3; k++) {
      const color = parseInt(palette[k].slice(1),16);
      r.settings.set([(color >> 16 & 255)/255, (color >> 8 & 255)/255, (color & 255)/255, 1], 4+k*4);
    }
    for (let i = 0; i < world["n"]; i++) {
      r.positions[i*4] = world["x"][i]; r.positions[i*4+1] = world["y"][i]; r.positions[i*4+2] = world["kind"][i];
    }
    for (let i = 0; i < world["bn"]; i++) { r.indices[i*2] = world["ba"][i]; r.indices[i*2+1] = world["bb"][i]; }
    device.queue.writeBuffer(r.settingsBuffer,0,r.settings);
    if (world["n"]) device.queue.writeBuffer(r.positionBuffer,0,r.positions,0,world["n"]*4);
    if (world["bn"]) device.queue.writeBuffer(r.indexBuffer,0,r.indices,0,world["bn"]*2);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({colorAttachments:[{view:r.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    pass.setBindGroup(0,r.group);
    pass.setPipeline(r.background); pass.draw(3);
    if (world["bn"]) { pass.setPipeline(r.bonds); pass.setIndexBuffer(r.indexBuffer,'uint32'); pass.drawIndexed(world["bn"]*2); }
    if (world["n"]) { pass.setPipeline(r.cells); pass.draw(6,world["n"]); }
    pass.end(); device.queue.submit([encoder.finish()]);
    canvas.style.display = 'block';
    return true;
  } catch (_) { r.label = 'Canvas'; dispose(r); return false; }
}

function status(r) { return r && !r.stopped ? r.label : 'Canvas'; }
module.exports = {create, draw, status, dispose};
