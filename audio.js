'use strict';
class ChocoAudio {
  constructor(state) {
    this.s=state; this.voices=new Map(); this.macros=new Map(); this.tails=new Set(); this.phase='idle';
    this.started=0; this.releaseLevel=0; this.releaseAt=0; this.releaseDuration=.025; this.token=0;
  }
  async init() {
    clearTimeout(this.idleTimer);
    if(!this.ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('Web Audio is unavailable in this browser.');
      const c=this.ctx=new Audio();
      this.mix=c.createGain();this.env=c.createGain();this.env.gain.value=0;
      this.sum=c.createGain();this.sum.gain.value=1/6;
      this.panner=c.createPanner();this.panner.panningModel='HRTF';this.panner.distanceModel='inverse';this.panner.refDistance=1;
      this.stereo=c.createStereoPanner();this.master=c.createGain();this.master.gain.value=0;
      this.analyser=c.createAnalyser();this.analyser.fftSize=2048;
      this.lfoMeter=c.createAnalyser();this.lfoMeter.fftSize=256;
      this.mix.connect(this.env).connect(this.sum);
      this.master.connect(this.analyser).connect(c.destination);
      this.routeKey='';this.sync();
    }
    await this.ctx.resume();
    if(this.ctx.state!=='running')throw new Error('Audio is paused. Try Start again.');
  }
  smooth(param,value,time=.012){param.setTargetAtTime(value,this.ctx.currentTime,time);}
  route(){
    const space=this.s.open.space&&this.s.spatial.enabled,pan=this.s.open.lfo&&this.s.lfo.enabled;
    const key=`${space}:${pan}`;if(key===this.routeKey)return;
    this.sum.disconnect();this.panner.disconnect();this.stereo.disconnect();
    let tail=this.sum;if(space)tail=tail.connect(this.panner);if(pan)tail=tail.connect(this.stereo);tail.connect(this.master);this.routeKey=key;
  }
  syncLfo(){
    const enabled=this.s.open.lfo&&this.s.lfo.enabled&&(this.voices.size+this.macros.size+this.tails.size>0);
    if(enabled&&!this.lfo){this.lfo=this.ctx.createOscillator();this.lfoGain=this.ctx.createGain();this.lfoGain.gain.value=0;this.lfo.connect(this.lfoGain);this.lfoGain.connect(this.stereo.pan);this.lfoGain.connect(this.lfoMeter);this.lfo.start();}
    if(!enabled&&this.lfo){this.lfo.stop();this.lfo.disconnect();this.lfoGain.disconnect();this.lfo=null;this.lfoGain=null;this.stereo.pan.setValueAtTime(0,this.ctx.currentTime);}
    if(this.lfo){this.smooth(this.lfo.frequency,this.s.lfo.rate);this.smooth(this.lfoGain.gain,this.s.lfo.depth);}
  }
  createVoice(spec,destination){
    const osc=this.ctx.createOscillator(),level=this.ctx.createGain(),analyser=this.ctx.createAnalyser();
    analyser.fftSize=2048;level.gain.value=0;osc.type=spec.wave;osc.frequency.value=Math.min(window.ChocoMusic?ChocoMusic.snap(spec.frequency,this.s):spec.frequency,this.ctx.sampleRate/2-1);
    osc.connect(level).connect(analyser).connect(destination);osc.start();return {osc,level,analyser};
  }
  sync(){
    if(!this.ctx)return;
    this.smooth(this.master.gain,!this.s.open.volume||this.s.muted?0:this.s.master);
    this.route();this.panner.rolloffFactor=this.s.spatial.rolloff;this.position(this.s.spatial.x,this.s.spatial.y,this.s.spatial.z);
    const wanted=new Map();
    if(this.s.open.volume&&this.phase!=='idle'){
      if(this.s.open.tone)wanted.set('main',{frequency:this.s.frequency,wave:this.s.wave,level:this.s.mainLevel,enabled:true});
      if(this.s.open.harmonics)for(const v of this.s.voices)if(v.enabled)wanted.set(v.id,v);
    }
    for(const [id,v] of this.voices)if(!wanted.has(id)){this.disposeVoice(v);this.voices.delete(id);}
    for(const [id,spec] of wanted){let v=this.voices.get(id);if(!v){v=this.createVoice(spec,this.mix);this.voices.set(id,v);}v.osc.type=spec.wave;this.smooth(v.osc.frequency,Math.min(window.ChocoMusic?ChocoMusic.snap(spec.frequency,this.s):spec.frequency,this.ctx.sampleRate/2-1));this.smooth(v.level.gain,spec.level);}
    if(!this.s.open.macros||!this.s.open.volume)this.stopMacros();
    this.smooth(this.sum.gain,1/Math.max(6,this.voices.size+this.macros.size+this.tails.size));
    this.syncLfo();this.scheduleIdle();
  }
  position(x,y,z){if(!this.ctx||!this.s.open.space||!this.s.spatial.enabled)return;this.smooth(this.panner.positionX,x);this.smooth(this.panner.positionY,y);this.smooth(this.panner.positionZ,z);}
  envelopeSettings(){return this.s.open.envelope?this.s.adsr:{a:.015,d:.01,s:1,r:.035};}
  envelopeLevel(){
    if(!this.ctx||this.phase==='idle')return 0;const now=this.ctx.currentTime;
    if(this.phase==='release')return this.releaseLevel*Math.max(0,1-(now-this.releaseAt)/this.releaseDuration);
    const {a,d,s}=this.activeEnvelope,t=Math.max(0,now-this.started);if(t<a)return t/a;if(t<a+d)return 1+(s-1)*(t-a)/d;return s;
  }
  trigger(){
    if(!this.ctx||!this.s.open.volume)return;
    this.token++;clearTimeout(this.releaseTimer);clearTimeout(this.idleTimer);
    const now=this.ctx.currentTime,value=this.envelopeLevel(),{a,d,s}=this.envelopeSettings();
    this.env.gain.cancelScheduledValues(now);this.env.gain.setValueAtTime(value,now);this.env.gain.linearRampToValueAtTime(0,now+.006);
    this.env.gain.linearRampToValueAtTime(1,now+.006+a);this.env.gain.linearRampToValueAtTime(s,now+.006+a+d);
    this.started=now+.006;this.activeEnvelope={a,d,s};this.phase='held';this.sync();
  }
  release(immediate=false){
    if(!this.ctx||this.phase==='idle')return;const now=this.ctx.currentTime,value=Math.max(0,this.envelopeLevel());
    this.releaseLevel=value;this.releaseAt=now;this.releaseDuration=immediate?.025:this.envelopeSettings().r;
    this.env.gain.cancelScheduledValues(now);this.env.gain.setValueAtTime(value,now);this.env.gain.linearRampToValueAtTime(0,now+this.releaseDuration);this.phase='release';
    const token=++this.token;clearTimeout(this.releaseTimer);this.releaseTimer=setTimeout(()=>{if(token!==this.token)return;for(const v of this.voices.values())this.disposeVoice(v);this.voices.clear();this.phase='idle';this.sync();},this.releaseDuration*1000+40);
  }
  // Macro notes have their own envelopes and never alter the continuous-tone envelope.
  noteOn(key,spec){
    if(!this.ctx||!this.s.open.macros||!this.s.open.volume||this.macros.has(key))return;
    clearTimeout(this.idleTimer);const v=this.createVoice({frequency:spec.hz,wave:spec.wave},this.sum),now=this.ctx.currentTime;
    const env=this.envelopeSettings();v.envelope=env;v.started=now;v.spec={...spec};
    v.level.gain.setValueAtTime(0,now);v.level.gain.linearRampToValueAtTime(spec.level,now+env.a);v.level.gain.linearRampToValueAtTime(spec.level*env.s,now+env.a+env.d);
    this.macros.set(key,v);this.sync();
  }
  noteOff(key,immediate=false){
    const v=this.macros.get(key);if(!v)return;this.macros.delete(key);this.tails.add(v);
    const now=this.ctx.currentTime,{a,d,s,r}=v.envelope,t=now-v.started,level=v.spec.level*(t<a?t/a:t<a+d?1+(s-1)*(t-a)/d:s),release=immediate?.025:r;
    v.level.gain.cancelScheduledValues(now);v.level.gain.setValueAtTime(Math.max(0,level),now);v.level.gain.linearRampToValueAtTime(0,now+release);v.osc.stop(now+release+.02);v.osc.onended=()=>{v.osc.disconnect();v.level.disconnect();v.analyser.disconnect();this.tails.delete(v);this.sync();};
    this.syncLfo();this.scheduleIdle(release*1000+100);
  }
  stopMacros(){for(const key of Array.from(this.macros.keys()))this.noteOff(key,true);if(this.ctx)for(const v of this.tails){v.level.gain.cancelScheduledValues(this.ctx.currentTime);v.level.gain.setTargetAtTime(0,this.ctx.currentTime,.006);v.osc.stop(this.ctx.currentTime+.035);}}
  disableEnvelope(){if(!this.ctx)return;if(this.phase==='release')this.release(true);for(const v of this.tails){v.level.gain.cancelScheduledValues(this.ctx.currentTime);v.level.gain.setTargetAtTime(0,this.ctx.currentTime,.006);v.osc.stop(this.ctx.currentTime+.035);}if(this.phase==='held'){const now=this.ctx.currentTime;this.env.gain.cancelScheduledValues(now);this.env.gain.setValueAtTime(Math.max(0,this.envelopeLevel()),now);this.env.gain.linearRampToValueAtTime(1,now+.02);this.activeEnvelope={a:.02,d:.01,s:1};this.started=now;}for(const v of this.macros.values()){v.level.gain.cancelScheduledValues(this.ctx.currentTime);this.smooth(v.level.gain,v.spec.level);v.envelope={a:.01,d:.01,s:1,r:.035};v.started=this.ctx.currentTime-.02;}}
  disposeVoice(v){const now=this.ctx.currentTime;v.level.gain.cancelScheduledValues(now);v.level.gain.setTargetAtTime(0,now,.006);v.osc.stop(now+.04);v.osc.onended=()=>{v.osc.disconnect();v.level.disconnect();v.analyser.disconnect();};}
  scheduleIdle(delay=120){clearTimeout(this.idleTimer);if(this.voices.size||this.macros.size||this.tails.size)return;this.idleTimer=setTimeout(()=>{if(!this.voices.size&&!this.macros.size&&!this.tails.size)this.ctx.suspend?.();},delay);}
  updateEnvelope(){if(this.phase==='held')this.trigger();}
}
window.ChocoAudio=ChocoAudio;
