'use strict';
class ChocoStudioAudio extends ChocoAudio {
 constructor(state){super(state);this.noiseNodes=new Map();this.sequenceNodes=new Map();this.sequenceId=0;}
 extraCount(){return this.noiseNodes.size+this.sequenceNodes.size;}
 ensureEffects(){
  if(this.filter)return;const c=this.ctx;
  this.filter=c.createBiquadFilter();this.safety=c.createDynamicsCompressor();
  this.safety.threshold.value=-3;this.safety.knee.value=6;this.safety.ratio.value=12;this.safety.attack.value=.003;this.safety.release.value=.12;
  this.noiseMeter=c.createAnalyser();this.noiseMeter.fftSize=2048;this.noiseMeter.connect(this.sum);
 }
 impulse(seconds){
  const length=Math.ceil(this.ctx.sampleRate*seconds),buffer=this.ctx.createBuffer(2,length,this.ctx.sampleRate);
  for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2.5);}
  return buffer;
 }
 createEcho(){
  const c=this.ctx,e=this.echoNodes={input:c.createGain(),out:c.createGain(),delay:c.createDelay(2),feedback:c.createGain(),delayWet:c.createGain(),reverb:c.createConvolver(),reverbWet:c.createGain()};
  e.feedback.gain.value=0;e.delayWet.gain.value=0;e.reverbWet.gain.value=0;
  e.input.connect(e.out);e.input.connect(e.delay);e.delay.connect(e.feedback).connect(e.delay);e.delay.connect(e.delayWet).connect(e.out);
  e.input.connect(e.reverb).connect(e.reverbWet).connect(e.out);this.echoDecay=0;
 }
 destroyEcho(){if(!this.echoNodes)return;for(const node of Object.values(this.echoNodes))node.disconnect();this.echoNodes=null;this.echoDecay=0;}
 route(){
  this.ensureEffects();const space=!!(this.s.open.space&&this.s.spatial.enabled),pan=!!(this.s.open.lfo&&this.s.lfo.enabled),filter=!!(this.s.open.filter&&this.s.filter.enabled),echo=!!(this.s.open.echo&&this.s.echo.enabled);
  const key=[space,pan,filter,echo].join(':');if(key===this.routeKey)return;
  this.sum.disconnect();this.panner.disconnect();this.stereo.disconnect();this.filter.disconnect();this.safety.disconnect();
  if(!echo)this.destroyEcho();else if(!this.echoNodes)this.createEcho();else this.echoNodes.out.disconnect();
  let tail=this.sum;if(filter)tail=tail.connect(this.filter);if(space)tail=tail.connect(this.panner);if(pan)tail=tail.connect(this.stereo);
  if(echo){tail.connect(this.echoNodes.input);tail=this.echoNodes.out;}
  tail.connect(this.safety).connect(this.master);this.routeKey=key;
 }
 syncEffects(){
  this.filter.type=this.s.filter.type;this.smooth(this.filter.frequency,Math.min(this.s.filter.cutoff,this.ctx.sampleRate/2-1));this.smooth(this.filter.Q,this.s.filter.q);
  if(this.echoNodes){const e=this.echoNodes,s=this.s.echo;this.smooth(e.delay.delayTime,s.time,.05);this.smooth(e.feedback.gain,s.feedback);this.smooth(e.delayWet.gain,s.mix);this.smooth(e.reverbWet.gain,s.reverb);if(this.echoDecay!==s.decay){e.reverb.buffer=this.impulse(s.decay);this.echoDecay=s.decay;}}
 }
 noiseBuffer(kind){
  this.noiseBuffers ||= {};if(this.noiseBuffers[kind])return this.noiseBuffers[kind];
  const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate),data=buffer.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,brown=0;
  for(let i=0;i<data.length;i++){const w=Math.random()*2-1;let value=w;
   if(kind==='pink'){b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;value=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;}
   if(kind==='brown'){brown=(brown+.02*w)/1.02;value=brown*3.5;}
   data[i]=value*.35;
  }
  this.noiseBuffers[kind]=buffer;return buffer;
 }
 syncNoise(){
  this.ensureEffects();const enabled=this.s.open.noise&&this.s.open.volume&&this.s.noise.running;
  for(const kind of ['white','pink','brown']){const level=enabled?this.s.noise[kind]:0;let v=this.noiseNodes.get(kind);
   if(level>0&&!v){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();gain.gain.value=0;source.buffer=this.noiseBuffer(kind);source.loop=true;source.connect(gain).connect(this.noiseMeter);source.start();v={source,gain};this.noiseNodes.set(kind,v);}
   if(v&&level>0)this.smooth(v.gain.gain,level);
   if(v&&level===0){this.smooth(v.gain.gain,0,.008);v.source.stop(this.ctx.currentTime+.04);v.source.onended=()=>{v.source.disconnect();v.gain.disconnect();};this.noiseNodes.delete(kind);}
  }
 }
 sync(){if(!this.ctx)return;this.syncNoise();if(!this.s.open.sequence||!this.s.open.volume)this.stopSequence();super.sync();this.syncEffects();this.smooth(this.sum.gain,1/Math.max(6,this.voices.size+this.macros.size+this.tails.size+this.extraCount()));this.syncLfo();this.scheduleIdle();}
 syncLfo(){
  const enabled=this.s.open.lfo&&this.s.lfo.enabled&&(this.voices.size+this.macros.size+this.tails.size+this.extraCount()>0);
  if(enabled&&!this.lfo){this.lfo=this.ctx.createOscillator();this.lfoGain=this.ctx.createGain();this.lfoGain.gain.value=0;this.lfo.connect(this.lfoGain);this.lfoGain.connect(this.stereo.pan);this.lfoGain.connect(this.lfoMeter);this.lfo.start();}
  if(!enabled&&this.lfo){this.lfo.stop();this.lfo.disconnect();this.lfoGain.disconnect();this.lfo=null;this.lfoGain=null;this.stereo.pan.setValueAtTime(0,this.ctx.currentTime);}
  if(this.lfo){this.smooth(this.lfo.frequency,this.s.lfo.rate);this.smooth(this.lfoGain.gain,this.s.lfo.depth);}
 }
 scheduleNote(spec,when,hold){
  if(!this.ctx||!this.s.open.volume||!this.s.open.sequence||!this.s.sequence.running||this.sequenceNodes.size>=160)return;
  clearTimeout(this.idleTimer);const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),settings=this.envelopeSettings(),a=Math.min(settings.a,hold*.4),d=Math.min(settings.d,hold*.4),r=settings.r,id=++this.sequenceId;
  osc.type=spec.wave;osc.frequency.value=Math.min(window.ChocoMusic?ChocoMusic.snap(spec.hz,this.s):spec.hz,c.sampleRate/2-1);gain.gain.value=0;osc.connect(gain).connect(this.sum);
  gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(spec.level,when+a);gain.gain.linearRampToValueAtTime(spec.level*settings.s,when+a+d);gain.gain.setValueAtTime(spec.level*settings.s,when+hold);gain.gain.linearRampToValueAtTime(0,when+hold+r);
  const v={osc,gain};this.sequenceNodes.set(id,v);osc.start(when);osc.stop(when+hold+r+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();this.sequenceNodes.delete(id);this.sync();};
  this.smooth(this.sum.gain,1/Math.max(6,this.voices.size+this.macros.size+this.tails.size+this.extraCount()));this.syncLfo();
 }
 stopSequence(){if(!this.ctx)return;for(const v of this.sequenceNodes.values()){v.gain.gain.cancelScheduledValues(this.ctx.currentTime);v.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.006);v.osc.stop(this.ctx.currentTime+.025);}this.sequenceNodes.clear();}
 scheduleIdle(delay=120){
  clearTimeout(this.idleTimer);if(!this.ctx||this.voices.size||this.macros.size||this.tails.size||this.extraCount()||this.s.sequence?.running)return;
  if(this.echoNodes){const s=this.s.echo,echoTail=s.time*Math.ceil(Math.log(.001)/Math.log(Math.max(.01,s.feedback)));delay=Math.max(delay,Math.min(20,echoTail+s.decay)*1000);}
  this.idleTimer=setTimeout(()=>{if(!this.voices.size&&!this.macros.size&&!this.tails.size&&!this.extraCount()&&!this.s.sequence.running)this.ctx.suspend?.();},delay);
 }
 reset(){
  if(!this.ctx){this.phase="idle";return;}
  this.token++;clearTimeout(this.releaseTimer);this.stopSequence();this.s.noise.running=false;this.syncNoise();this.stopMacros();
  for(const v of this.voices.values())this.disposeVoice(v);this.voices.clear();this.phase='idle';if(this.ctx){this.env.gain.cancelScheduledValues(this.ctx.currentTime);this.env.gain.setValueAtTime(0,this.ctx.currentTime);this.destroyEcho();this.routeKey='';}
 }
}
window.ChocoStudioAudio=ChocoStudioAudio;
