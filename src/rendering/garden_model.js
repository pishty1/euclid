// Local Gray–Scott cells. Colony shapes are outcomes of the rules, not entities.
const presets = {
  'reef': {name: 'Reef', 'feed': 0.0545, 'decay': 0.062, 'spread': 0.5, 'supply': 1, 'growth': 1},
  'threads': {name: 'Threads', 'feed': 0.029, 'decay': 0.057, 'spread': 0.5, 'supply': 1, 'growth': 1},
  'pearls': {name: 'Pearls', 'feed': 0.035, 'decay': 0.065, 'spread': 0.5, 'supply': 1, 'growth': 1},
  'waves': {name: 'Waves', 'feed': 0.018, 'decay': 0.051, 'spread': 0.5, 'supply': 1, 'growth': 1}
};
const bounds = {'feed': [0.005, 0.085], 'decay': [0.025, 0.08], 'spread': [0.15, 0.8], 'supply': [0.3, 1], 'growth': [0.65, 1.35]};
function rules(values) {
  const result = {};
  for (const [key, [low, high]] of Object.entries(bounds)) {
    const value = Number(values[key]);
    result[key] = Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : presets['reef'][key];
  }
  return result;
}
function field(width, height) {
  const data = new Float32Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data[i] = 1;
  return data;
}
function paint(data, width, height, x, y, radius, tool) {
  const cx = x * width, cy = y * height;
  for (let yy = Math.max(0, Math.floor(cy-radius)); yy <= Math.min(height-1, Math.ceil(cy+radius)); yy++) {
    for (let xx = Math.max(0, Math.floor(cx-radius)); xx <= Math.min(width-1, Math.ceil(cx+radius)); xx++) {
      if (Math.hypot(xx-cx, yy-cy) > radius) continue;
      const i = (yy * width + xx) * 4;
      if (tool === 'wall') { data[i]=1; data[i+1]=0; data[i+2]=0; data[i+3]=1; }
      else if (tool === 'erase') { data[i]=1; data[i+1]=0; data[i+2]=0; data[i+3]=0; }
      else if (!data[i+3]) {
        if (tool === 'feed') data[i]=1;
        else { data[i]=0.5; data[i+1]=0.32; }
      }
    }
  }
}
function seed(width, height, random = Math.random) {
  const data = field(width, height);
  // Small broken clusters, never an explicit organism or trajectory.
  for (let c=0; c<7; c++) {
    const x=0.15+random()*0.7, y=0.17+random()*0.66;
    for (let p=0; p<5; p++) paint(data,width,height,x+(random()-0.5)*0.065,y+(random()-0.5)*0.065,2+random()*2.5,'seed');
  }
  return data;
}
function step(input, output, width, height, rule) {
  const feed=rule['feed'],decay=rule['decay'],spread=rule['spread'],supply=rule['supply'],growth=rule['growth'];
  for (let y=0;y<height;y++) {
    const up=((y+height-1)%height)*width, down=((y+1)%height)*width, row=y*width;
    for (let x=0;x<width;x++) {
      const i=(row+x)*4, u=input[i], v=input[i+1];
      if(input[i+3]>0.5){output[i]=1;output[i+1]=0;output[i+2]=0;output[i+3]=1;continue;}
      const left=(x+width-1)%width,right=(x+1)%width;
      let lu=-u,lv=-v;
      const neighbors=[(row+left)*4,(row+right)*4,(up+x)*4,(down+x)*4,
                       (up+left)*4,(up+right)*4,(down+left)*4,(down+right)*4];
      for(let n=0;n<8;n++) {
        const j=neighbors[n],w=n<4?0.2:0.05,wall=input[j+3]>0.5;
        lu+=w*(wall?u:input[j]);lv+=w*(wall?v:input[j+1]);
      }
      const reaction=growth*u*v*v;
      const next=Math.max(0,Math.min(1,v+spread*lv+reaction-(feed+decay)*v));
      output[i]=Math.max(0,Math.min(1,u+lu-reaction+feed*(supply-u)));
      output[i+1]=next;output[i+2]=Math.abs(next-v);output[i+3]=0;
    }
  }
  return output;
}
function measure(data) {
  let alive=0,change=0,food=0,open=0;
  for(let i=0;i<data.length;i+=4) if(data[i+3]<0.5){open++;alive+=data[i+1]>0.12?1:0;change+=data[i+2];food+=data[i];}
  return {coverage:alive/Math.max(1,open),activity:change/Math.max(1,open),food:food/Math.max(1,open)};
}
module.exports={presets,bounds,rules,field,paint,seed,step,measure};
