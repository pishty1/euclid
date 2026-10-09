// Procedural soundtrack and effects; no assets, downloads, or third-party audio.
let context=null, music=null, effects=null, master=null, noiseBuffer=null;
let unlocked=false, mode='ready', wave=1, clear=false, blocked=true;
let timer=null, suspendTimer=null, observer=null, owner=null, step=0, nextBeat=0, duckUntil=0;
let lastPreview=-Infinity;
const voices=new Set();
const defaults={music:0.25,effects:0.6,muted:false};
let preferences={...defaults};
try {
  const saved=JSON.parse(localStorage.getItem('euclid-addventure-audio')||'null');
  if(saved){
    for(const key of ['music','effects']) if(Number.isFinite(saved[key])) preferences[key]=Math.max(0,Math.min(1,saved[key]));
    preferences.muted=saved.muted===true;
  }
} catch (_) {}

function supported(){return !!(window.AudioContext||window.webkitAudioContext);}
function settingsOpen(){return document.getElementById('venture-audio')?.open===true;}
function available(){return unlocked && context && context.state==='running' && !preferences.muted && !blocked && !document.hidden;}
function save(){try{localStorage.setItem('euclid-addventure-audio',JSON.stringify(preferences));}catch(_) {}}
function ui(){
  const mute=document.getElementById('venture-mute'),status=document.getElementById('venture-audio-status');
  if(mute){mute.textContent=preferences.muted?'Unmute':'Mute';mute.setAttribute('aria-pressed',String(preferences.muted));mute.disabled=!supported();}
  if(status)status.textContent=!supported()?'Sound unavailable':preferences.muted?'Muted':!unlocked?'Starts on launch':mode==='playing'&&!blocked?(settingsOpen()?'Gameplay paused · audio preview':'Sound on'):'Sound paused';
}
function levels(){
  if(!context)return;
  const now=context.currentTime;
  music.gain.setTargetAtTime(preferences.muted?0:preferences.music*(duckUntil>now?0.65:1),now,0.025);
  effects.gain.setTargetAtTime(preferences.muted?0:preferences.effects,now,0.015);
}
function stopVoices(bus){
  for(const voice of [...voices]) if(!bus||voice.bus===bus){try{voice.source.stop();}catch(_){}voice.cleanup();}
}
function connect(source,gain,bus){
  source.connect(gain);gain.connect(bus==='music'?music:effects);
  const voice={source,bus,cleanup:()=>{voices.delete(voice);source.disconnect();gain.disconnect();}};
  source.onended=voice.cleanup;voices.add(voice);
}
function tone(start,end,duration,amplitude,type,bus,at){
  if(!context||voices.size>=96)return;
  const oscillator=context.createOscillator(),gain=context.createGain(),time=at??context.currentTime;
  oscillator.type=type;oscillator.frequency.setValueAtTime(Math.max(20,start),time);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);
  gain.gain.setValueAtTime(0.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,amplitude),time+0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);
  connect(oscillator,gain,bus);oscillator.start(time);oscillator.stop(time+duration+0.015);
}
function noise(duration,amplitude,cutoff,bus,at){
  if(!context||voices.size>=96)return;
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  const time=at??context.currentTime;source.buffer=noiseBuffer;filter.type='lowpass';filter.frequency.value=cutoff;
  source.connect(filter);filter.connect(gain);gain.connect(bus==='music'?music:effects);
  gain.gain.setValueAtTime(amplitude,time);gain.gain.exponentialRampToValueAtTime(0.0001,time+duration);
  const voice={source,bus,cleanup:()=>{voices.delete(voice);source.disconnect();filter.disconnect();gain.disconnect();}};
  source.onended=voice.cleanup;voices.add(voice);source.start(time);source.stop(time+duration);
}
function stopMusic(){if(timer)clearInterval(timer);timer=null;stopVoices('music');}
function suspend(){
  stopMusic();stopVoices();if(suspendTimer)clearTimeout(suspendTimer);suspendTimer=null;
  if(context&&context.state==='running')context.suspend().catch(()=>{});
}
function schedule(){
  if(!available()||mode!=='playing'||preferences.music===0){stopMusic();return;}
  const now=context.currentTime;levels();
  if(nextBeat<now)nextBeat=now+0.015;
  while(nextBeat<now+0.12){
    const roots=[45,41,48,43],root=roots[Math.floor(step/16)%4],pattern=[0,7,12,3,7,15,12,7];
    const frequency=midi=>440*Math.pow(2,(midi-69)/12);
    tone(frequency(root+12+pattern[step%8]),frequency(root+12+pattern[step%8]),0.13,0.065,'triangle','music',nextBeat);
    if(step%4===0)tone(frequency(root),frequency(root),0.35,0.19,'sine','music',nextBeat);
    if(wave>=2&&step%2===1)noise(0.025,0.035,6500,'music',nextBeat);
    if(wave>=3&&step%4===0)tone(110,32,0.15,0.12,'sine','music',nextBeat);
    if(wave>=5&&step%8===4)noise(0.08,0.065,2800,'music',nextBeat);
    nextBeat+=60/(124+Math.min(8,wave)*2)/2;step++;
  }
}
function reconcile(){
  ui();levels();
  if(blocked||document.hidden||preferences.muted||!unlocked){suspend();return;}
  if(mode==='playing'){
    if(suspendTimer)clearTimeout(suspendTimer);suspendTimer=null;
    if(context.state==='suspended'){context.resume().then(reconcile).catch(()=>{});return;}
    if(preferences.music>0&&!timer){nextBeat=context.currentTime+0.02;timer=setInterval(schedule,25);schedule();}
    if(preferences.music===0)stopMusic();
  }else if(mode!=='over'){suspend();}
}
function unlock(){
  if(!supported())return;
  try {
    if(!context){
      const Audio=window.AudioContext||window.webkitAudioContext;context=new Audio();
      music=context.createGain();effects=context.createGain();master=context.createGain();
      const compressor=context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=6;
      master.gain.value=0.65;music.connect(master);effects.connect(master);master.connect(compressor);compressor.connect(context.destination);
      noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
      const channel=noiseBuffer.getChannelData(0);for(let i=0;i<channel.length;i++)channel[i]=Math.random()*2-1;
      context.addEventListener('statechange',ui);
    }
    unlocked=true;levels();context.resume().then(reconcile).catch(()=>{unlocked=false;ui();});
  }catch(_){unlocked=false;}
  ui();
}
function play(kind,operation){
  if(!available()||preferences.effects===0)return;
  const time=context.currentTime+0.003;
  if(kind==='restore')for(let i=0;i<3;i++)tone(440*Math.pow(2,i/3),440*Math.pow(2,i/3),0.16,0.09,'sine','effects',time+i*0.1);
  if(kind==='player')tone(1050,190,0.14,0.16,'triangle','effects',time);
  if(kind==='enemy'){
    if(operation==='add')for(let i=0;i<3;i++)tone(380,160,0.06,0.09,'square','effects',time+i*0.055);
    if(operation==='subtract'){tone(1200,65,0.16,0.13,'sawtooth','effects',time);noise(0.055,0.1,5000,'effects',time);}
    if(operation==='multiply')for(let i=0;i<4;i++)tone(240+i*90,70+i*25,0.12,0.075,'triangle','effects',time+i*0.02);
    if(operation==='divide'){tone(620,160,0.22,0.1,'sine','effects',time);tone(180,700,0.22,0.1,'sine','effects',time+0.04);}
  }
  if(kind==='blast'){noise(0.32,0.13,1300,'effects',time);tone(95,26,0.3,0.16,'sine','effects',time);duckUntil=time+0.2;levels();}
  if(kind==='shield'){noise(0.16,0.15,2600,'effects',time);tone(360,65,0.24,0.13,'sawtooth','effects',time);tone(820,420,0.12,0.06,'sine','effects',time);}
  if(kind==='wave')for(let i=0;i<3;i++)tone([660,880,1100][i],[660,880,1100][i],0.2,0.11,'triangle','effects',time+i*0.12);
  if(kind==='over')for(let i=0;i<4;i++)tone([440,330,220,110][i],[440,330,220,110][i],0.3,0.12,'triangle','effects',time+i*0.18);
}
function sync(nextMode,nextWave,menuOpen,sectorClear){
  const previous=mode,previousClear=clear;
  mode=nextMode;wave=nextWave;clear=sectorClear;blocked=menuOpen||!owner||!owner.isConnected||document.body.dataset.sketch!=='Add Venture';
  if(mode==='playing'&&previous!=='playing'&&previous!=='paused'){step=0;stopMusic();stopVoices('effects');}
  if(mode==='over'&&previous==='playing'){
    stopMusic();play('over','');suspendTimer=setTimeout(suspend,1100);
  }
  if(mode==='playing'&&clear&&!previousClear)play('wave','');
  reconcile();
}
function init(host,toolbar){
  suspend();mode='ready';clear=false;blocked=true;
  if(observer)observer.disconnect();owner=host.querySelector('canvas:not([data-venture-gpu])');
  observer=new window.MutationObserver(()=>{
    if(!owner?.isConnected||document.body.dataset.sketch!=='Add Venture'){blocked=true;suspend();ui();}
  });observer.observe(host,{childList:true});observer.observe(document.body,{attributes:true,attributeFilter:['data-sketch']});
  if(!document.getElementById('venture-mute')){
    const mute=document.createElement('button');mute.id='venture-mute';mute.type='button';mute.setAttribute('aria-label','Mute game audio');
    mute.addEventListener('click',()=>{preferences.muted=!preferences.muted;save();if(!preferences.muted)unlock();reconcile();});
    const panel=document.createElement('details');panel.id='venture-audio';
    panel.addEventListener('toggle',ui);
    const summary=document.createElement('summary');summary.textContent='Settings';panel.appendChild(summary);
    const content=document.createElement('div');content.className='audio-settings';content.appendChild(mute);
    for(const [key,label] of [['music','Music volume'],['effects','Effects volume']]){
      const row=document.createElement('label');row.textContent=label;
      const input=document.createElement('input');input.type='range';input.min='0';input.max='100';input.step='1';input.value=String(Math.round(preferences[key]*100));input.setAttribute('aria-label',label);
      input.addEventListener('input',()=>{
        preferences[key]=Number(input.value)/100;save();levels();reconcile();
        if(key==='effects'&&available()&&context.currentTime-lastPreview>0.2){lastPreview=context.currentTime;play('player','');}
      });row.appendChild(input);content.appendChild(row);
    }
    const note=document.createElement('p');note.textContent='Gameplay pauses while Settings is open. Close it to continue.';note.style.cssText='font-size:11px;line-height:1.5;color:#86b6bd;margin:0 0 10px';content.appendChild(note);
    const status=document.createElement('div');status.id='venture-audio-status';status.setAttribute('role','status');content.appendChild(status);panel.appendChild(content);toolbar.appendChild(panel);
  }
  document.getElementById('venture-audio').open=false;
  ui();
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',reconcile);
module.exports={init,unlock,sync,play,settingsOpen};
