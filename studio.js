'use strict';
const studioBase=structuredClone(state);
class StudioApps {
 constructor(){this.seqTimer=null;this.seqToken=0;this.noiseToken=0;this.sweepToken=0;this.scheduledSteps=[];this.recipes=[];this.sweepProgress=0;this.lastSweep=0;this.freqData=null;this.bind();this.readRecipes();this.renderRecipes();this.refreshSequence();}
 close(id){
  if(id==='sequence')this.stopSequence();
  if(id==='noise'){state.noise.running=false;this.noiseToken++;this.updateNoise();}
  if(id==='sweep'||id==='tone')this.stopSweep();
  if(id==='volume')this.stopAll();
  if(id==='echo'){state.echo.enabled=false;$('echo-enabled').checked=false;}
  if(id==='filter'){state.filter.enabled=false;$('filter-enabled').checked=false;}
 }
 stopAll(){this.stopSequence();this.stopSweep();state.noise.running=false;this.noiseToken++;this.updateNoise();}
 dial(target,value){if(target==='filter-cutoff')state.filter.cutoff=value;if(target==='sweep-from')state.sweep.from=value;if(target==='sweep-to')state.sweep.to=value;if(target.startsWith('sweep-')){this.stopSweep();$('sweep-current').textContent=`${state.sweep.from} → ${state.sweep.to} Hz`;}}
 bind(){
  bindRange('echo-time',n=>state.echo.time=n/1000,' ms');bindRange('echo-feedback',n=>state.echo.feedback=n/100,'%');bindRange('echo-mix',n=>state.echo.mix=n/100,'%');bindRange('echo-reverb',n=>state.echo.reverb=n/100,'%');bindRange('echo-decay',n=>state.echo.decay=n,' s');
  $('echo-enabled').onchange=e=>{state.echo.enabled=e.target.checked;audio.sync();};$('filter-enabled').onchange=e=>{state.filter.enabled=e.target.checked;audio.sync();};$('filter-type').onchange=e=>{state.filter.type=e.target.value;audio.sync();};bindRange('filter-q',n=>state.filter.q=n);
  for(const kind of ['white','pink','brown'])bindRange('noise-'+kind,n=>state.noise[kind]=n/100,'%');
  $('noise-play').onclick=()=>this.toggleNoise();
  bindRange('seq-bpm',n=>state.sequence.bpm=n,' BPM');$('seq-division').onchange=e=>state.sequence.division=+e.target.value;$('seq-gate').oninput=e=>state.sequence.gate=+e.target.value/100;
  $('seq-grid').onchange=e=>{if(e.target.dataset.step!==undefined)state.sequence.steps[+e.target.dataset.step]=e.target.value||null;};$('seq-play').onclick=()=>state.sequence.running?this.stopSequence():this.startSequence();
  bindRange('sweep-duration',n=>{state.sweep.duration=n;this.stopSweep();},' s');$('sweep-mode').onchange=e=>{state.sweep.mode=e.target.value;this.stopSweep();};$('sweep-play').onclick=()=>state.sweep.running?this.stopSweep():this.startSweep();
  $('spectrum-mode').onchange=e=>state.spectrum.mode=e.target.value;bindRange('spectrum-floor',n=>state.spectrum.floor=n,' dB');
  $('recipe-save').onclick=()=>this.saveRecipe();$('recipe-list').onclick=e=>{const b=e.target.closest('[data-recipe-action]');if(!b)return;const item=this.recipes.find(r=>r.id===b.dataset.id);if(!item)return;if(b.dataset.recipeAction==='load')this.loadRecipe(item);else{const next=this.recipes.filter(r=>r!==item);if(this.persistRecipes(next)){this.recipes=next;this.renderRecipes();}}};
  $('recipe-export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'ChocoHertz',version:1,recipes:this.recipes.map(({name,snapshot})=>({name,snapshot}))},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ChocoHertz-recipes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('recipe-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('Choose a recipe file under 1 MB.');const data=JSON.parse(await file.text());if(data.format!=='ChocoHertz'||data.version!==1||!Array.isArray(data.recipes))throw new Error('This is not a ChocoHertz recipe file.');if(this.recipes.length+data.recipes.length>30)throw new Error('Keep up to 30 recipes. Remove a few before importing.');const imported=data.recipes.map(r=>({id:crypto.randomUUID(),name:String(r.name||'Imported recipe').slice(0,60),snapshot:ChocoRecipes.clean(r.snapshot,studioBase,specs.map(s=>s[0]))}));const next=[...this.recipes,...imported];if(this.persistRecipes(next)){this.recipes=next;this.renderRecipes();$('recipe-status').textContent=`Imported ${imported.length} recipes.`;}}catch(err){$('recipe-status').textContent=err.message;}finally{e.target.value='';}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.stopAll();audio.sync();}});window.addEventListener('pagehide',()=>this.stopAll());
 }
 refreshSequence(){
  const keys=new Set(macros.map(m=>m.key));state.sequence.steps=state.sequence.steps.map(k=>keys.has(k)?k:null);
  $('seq-grid').innerHTML=state.sequence.steps.map((key,i)=>`<label class="seq-step" data-seq-cell="${i}"><span>${String(i+1).padStart(2,'0')}</span><select data-step="${i}" aria-label="Sequence step ${i+1}"><option value="">—</option>${macros.map(m=>`<option value="${m.key}" ${m.key===key?'selected':''}>${m.key.toUpperCase()}</option>`).join('')}</select></label>`).join('');
 }
 async startSequence(){
  if(!state.open.volume){notify('Open Master volume first.');return;}if(!macros.length){notify('Add a key sound before sequencing.');return;}
  const token=++this.seqToken;try{await audio.init();if(token!==this.seqToken||!state.open.sequence||!state.open.volume||document.hidden)return;state.sequence.running=true;this.nextStep=0;this.nextTime=audio.ctx.currentTime+.06;this.scheduledSteps=[];$('seq-play').textContent='■ Stop sequence';this.tickSequence();this.seqTimer=setInterval(()=>this.tickSequence(),25);}catch(e){notify(e.message);}
 }
 tickSequence(){
  if(!state.sequence.running||!state.open.sequence||!state.open.volume){this.stopSequence();return;}
  const now=audio.ctx.currentTime;if(this.nextTime<now-.2)this.nextTime=now+.03;
  while(this.nextTime<now+.12){const index=this.nextStep,key=state.sequence.steps[index],spec=macros.find(m=>m.key===key),length=60/state.sequence.bpm/state.sequence.division;
   if(spec)audio.scheduleNote(spec,this.nextTime,length*state.sequence.gate);
   this.scheduledSteps.push({index,time:this.nextTime});this.nextTime+=length;this.nextStep=(index+1)%16;
  }
 }
 stopSequence(){this.seqToken++;clearInterval(this.seqTimer);this.seqTimer=null;state.sequence.running=false;audio.stopSequence();this.scheduledSteps=[];$('seq-play').textContent='▶ Play sequence';$('seq-position').textContent='STOPPED';document.querySelectorAll('.seq-step.active').forEach(el=>el.classList.remove('active'));audio.sync();}
 async toggleNoise(){
  if(state.noise.running){state.noise.running=false;this.noiseToken++;audio.sync();this.updateNoise();return;}
  if(!state.open.volume){notify('Open Master volume first.');return;}const token=++this.noiseToken;
  try{await audio.init();if(token!==this.noiseToken||!state.open.noise||!state.open.volume||document.hidden)return;state.noise.running=true;audio.sync();this.updateNoise();}catch(e){notify(e.message);}
 }
 updateNoise(){$('noise-play').textContent=state.noise.running?'■ Stop noise':'▶ Start noise';$('noise-state').textContent=state.noise.running?'BREWING':'STOPPED';}
 async startSweep(){
  if(!state.open.tone||!state.open.volume){notify('Open Frequency and Master volume first.');return;}const token=++this.sweepToken;
  if(!playing)await start();if(token!==this.sweepToken||!playing||!state.open.sweep||document.hidden)return;
  state.sweep.running=true;this.sweepStart=audio.ctx.currentTime;this.lastSweep=0;$('sweep-play').textContent='■ Stop sweep';
 }
 stopSweep(){this.sweepToken++;if(state.sweep)state.sweep.running=false;if($('sweep-play'))$('sweep-play').textContent='▶ Start sweep';}
 snapshot(){const s=structuredClone(state);for(const group of ['noise','sweep','sequence'])s[group].running=false;const layout={};panels.forEach((p,id)=>layout[id]={x:parseFloat(p.style.left)||0,y:parseFloat(p.style.top)||0,w:parseFloat(p.style.width)||304,h:parseFloat(p.style.height)||400});return {version:1,state:s,macros:structuredClone(macros),layout};}
 readRecipes(){try{const stored=JSON.parse(localStorage.getItem('chocohertz-recipes')||'[]');if(!Array.isArray(stored))throw new Error();this.recipes=stored.slice(0,30).map(r=>({id:crypto.randomUUID(),name:String(r.name||'Recipe').slice(0,60),snapshot:ChocoRecipes.clean(r.snapshot,studioBase,specs.map(s=>s[0]))}));}catch{$('recipe-status').textContent='Saved recipes could not be read. Existing storage has not been changed.';}}
 persistRecipes(next){try{localStorage.setItem('chocohertz-recipes',JSON.stringify(next));return true;}catch{$('recipe-status').textContent='Device storage is unavailable or full. Export recipes to keep a copy.';return false;}}
 saveRecipe(){const name=$('recipe-name').value.trim();if(!name){$('recipe-status').textContent='Give this recipe a name first.';return;}if(this.recipes.length>=30){$('recipe-status').textContent='You can keep 30 recipes. Export or remove one first.';return;}const next=[...this.recipes,{id:crypto.randomUUID(),name:name.slice(0,60),snapshot:this.snapshot()}];if(this.persistRecipes(next)){this.recipes=next;$('recipe-name').value='';this.renderRecipes();$('recipe-status').textContent=`Saved “${name}”.`;}}
 renderRecipes(){const list=$('recipe-list');list.replaceChildren();if(!this.recipes.length){const text=document.createElement('p');text.className='hint';text.textContent='Your saved rooms will appear here.';list.append(text);}for(const r of this.recipes){const row=document.createElement('div');row.className='recipe-row';const name=document.createElement('span');name.textContent=r.name;row.append(name);for(const [action,label]of [['load','Load'],['delete','×']]){const b=document.createElement('button');b.textContent=label;b.dataset.recipeAction=action;b.dataset.id=r.id;b.setAttribute('aria-label',`${action==='load'?'Load':'Delete'} recipe ${r.name}`);row.append(b);}list.append(row);}$('recipe-export').disabled=!this.recipes.length;}
 loadRecipe(item,options={}){
  const snapshot=ChocoRecipes.clean(item.snapshot,studioBase,specs.map(s=>s[0]));this.stopAll();clearKeys();stop(true);audio.reset();Object.assign(state,snapshot.state);macros=snapshot.macros;voiceId=state.voices.length;macroId=macros.length;if(options.keepRecipeOpen!==false)state.open.recipes=true;
  for(const [id,p]of panels){p.hidden=!state.open[id];document.querySelector(`[data-open="${id}"]`).setAttribute('aria-expanded',String(state.open[id]));const layout=snapshot.layout[id];if(layout)Object.assign(p.style,{left:layout.x+'px',top:layout.y+'px',width:layout.w+'px',height:layout.h+'px'});}
  frequency(state.frequency);paintDial('main-volume',state.mainLevel*100);paintDial('master-volume',state.master*100);document.querySelectorAll('[data-wave]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wave===state.wave)));renderVoices();renderMacros();saveMacros();
  const rangeValues={'lfo-rate':[state.lfo.rate,' Hz'],'lfo-depth':[state.lfo.depth*100,'%'],rolloff:[state.spatial.rolloff,''],'orbit-speed':[state.spatial.speed,' Hz'],attack:[state.adsr.a,' s'],decay:[state.adsr.d,' s'],sustain:[state.adsr.s*100,'%'],release:[state.adsr.r,' s'],'echo-time':[state.echo.time*1000,' ms'],'echo-feedback':[state.echo.feedback*100,'%'],'echo-mix':[state.echo.mix*100,'%'],'echo-reverb':[state.echo.reverb*100,'%'],'echo-decay':[state.echo.decay,' s'],'filter-q':[state.filter.q,''],'noise-white':[state.noise.white*100,'%'],'noise-pink':[state.noise.pink*100,'%'],'noise-brown':[state.noise.brown*100,'%'],'seq-bpm':[state.sequence.bpm,' BPM'],'sweep-duration':[state.sweep.duration,' s'],'spectrum-floor':[state.spectrum.floor,' dB']};
  for(const [id,[value,unit]]of Object.entries(rangeValues)){$(id).value=value;$(id+'-out').textContent=value+unit;}
  for(const [id,value]of [['spatial-enabled',state.spatial.enabled],['orbit',state.spatial.orbit],['lfo-enabled',state.lfo.enabled],['echo-enabled',state.echo.enabled],['filter-enabled',state.filter.enabled]])$(id).checked=value;
  for(const axis of ['x','y','z'])$('pos-'+axis).value=state.spatial[axis];orbitAngle=Math.atan2(state.spatial.x,-state.spatial.z);
  $('filter-type').value=state.filter.type;$('sweep-mode').value=state.sweep.mode;$('spectrum-mode').value=state.spectrum.mode;$('seq-division').value=state.sequence.division;$('seq-gate').value=state.sequence.gate*100;
  paintDial('filter-cutoff',state.filter.cutoff);paintDial('sweep-from',state.sweep.from);paintDial('sweep-to',state.sweep.to);this.updateNoise();this.refreshSequence();
  $('mute').setAttribute('aria-pressed',String(state.muted));$('mute').setAttribute('aria-label',state.muted?'Unmute all':'Mute all');$('panel-mute').textContent=state.muted?'Unmute all':'Mute all';$('panel-mute').setAttribute('aria-pressed',String(state.muted));
  constrain();audio.sync();if(options.announce!==false)$('recipe-status').textContent=`Loaded “${item.name}” silently.`;
 }
 frame(timestamp){
  if(state.sequence.running&&state.open.sequence){while(this.scheduledSteps.length&&this.scheduledSteps[0].time<=audio.ctx.currentTime){const {index}=this.scheduledSteps.shift();document.querySelectorAll('.seq-step').forEach((el,i)=>el.classList.toggle('active',i===index));$('seq-position').textContent=`${index+1} / 16`;}}
  if(state.sweep.running&&state.open.sweep&&playing&&timestamp-this.lastSweep>30){this.lastSweep=timestamp;const elapsed=(audio.ctx.currentTime-this.sweepStart)/state.sweep.duration,cycle=Math.floor(elapsed);let t=elapsed%1;if(state.sweep.mode==='bounce'&&cycle%2)t=1-t;if(state.sweep.mode==='once')t=Math.min(1,elapsed);this.sweepProgress=t;const hz=state.sweep.from*Math.pow(state.sweep.to/state.sweep.from,t);frequency(Math.round(hz*100)/100,true);$('sweep-current').textContent=`${hz.toFixed(1)} Hz`;if(state.sweep.mode==='once'&&elapsed>=1)this.stopSweep();}
  if(state.open.noise)audioTrace($('noise-scope'),state.noise.running?samples(audio.noiseMeter):null,()=>0,'#a9946c');
  if(state.open.echo)this.drawEcho();if(state.open.filter)this.drawFilter();if(state.open.sweep)this.drawSweep();if(state.open.spectrum)this.drawSpectrum();
 }
 drawEcho(){const screen=surface($('echo-scope'));if(!screen)return;const {p,w,h}=screen,s=state.echo;p.strokeStyle='#b5804b';p.lineWidth=3;for(let i=0;i<7;i++){const x=12+i*s.time/1.5*(w-24)/2,amp=Math.pow(s.feedback,i)*(h-14);p.globalAlpha=state.echo.enabled?1:.35;p.beginPath();p.moveTo(x,h-7);p.lineTo(x,h-7-amp);p.stroke();}p.globalAlpha=1;}
 drawFilter(){const screen=surface($('filter-scope'));if(!screen)return;const {p,w,h}=screen,n=128,freq=new Float32Array(n),mag=new Float32Array(n),phase=new Float32Array(n);for(let i=0;i<n;i++)freq[i]=20*Math.pow(1000,i/(n-1));if(audio.filter)audio.filter.getFrequencyResponse(freq,mag,phase);else for(let i=0;i<n;i++){const ratio=freq[i]/state.filter.cutoff;mag[i]=state.filter.type==='lowpass'?1/Math.sqrt(1+ratio**4):state.filter.type==='highpass'?1/Math.sqrt(1+(1/ratio)**4):Math.min(ratio,1/ratio);}
  p.strokeStyle='#b5804b';p.lineWidth=1.6;p.beginPath();for(let i=0;i<n;i++){const x=i/(n-1)*w,y=h-8-clamp((20*Math.log10(Math.max(mag[i],.0001))+60)/75,0,1)*(h-16);if(i)p.lineTo(x,y);else p.moveTo(x,y);}p.stroke();}
 drawSweep(){const screen=surface($('sweep-scope'));if(!screen)return;const {p,w,h}=screen,up=state.sweep.to>=state.sweep.from;p.strokeStyle='#695034';p.beginPath();p.moveTo(8,up?h-9:9);p.lineTo(w-8,up?9:h-9);p.stroke();const t=this.sweepProgress||0;p.fillStyle='#b5804b';p.beginPath();p.arc(8+t*(w-16),up?h-9-t*(h-18):9+t*(h-18),4,0,Math.PI*2);p.fill();}
 drawSpectrum(){const screen=surface($('spectrum-scope'));if(!screen)return;const {p,w,h}=screen;let peak=-Infinity,peakIndex=0;if(audio.analyser){if(!this.freqData||this.freqData.length!==audio.analyser.frequencyBinCount)this.freqData=new Float32Array(audio.analyser.frequencyBinCount);if(audio.ctx.state==='suspended')this.freqData.fill(-Infinity);else audio.analyser.getFloatFrequencyData(this.freqData);for(let i=1;i<this.freqData.length;i++)if(this.freqData[i]>peak){peak=this.freqData[i];peakIndex=i;}}
  const rate=audio.ctx?.sampleRate||48000,bins=audio.analyser?.fftSize||2048,count=64,top=Math.min(20000,rate/2);p.strokeStyle='#b5804b';p.fillStyle='#986b40';p.lineWidth=1.5;p.beginPath();
  for(let i=0;i<count;i++){const f0=20*Math.pow(top/20,i/count),f1=20*Math.pow(top/20,(i+1)/count),lo=Math.floor(f0/rate*bins),hi=Math.max(lo+1,Math.ceil(f1/rate*bins));let db=-Infinity;for(let j=lo;j<hi;j++)db=Math.max(db,this.freqData?.[j]??-Infinity);const level=clamp((db-state.spectrum.floor)/(0-state.spectrum.floor),0,1),x=i/count*w,y=h-5-level*(h-10);if(state.spectrum.mode==='bars')p.fillRect(x,h-5-level*(h-10),Math.max(1,w/count-2),level*(h-10));else if(i)p.lineTo(x,y);else p.moveTo(x,y);}if(state.spectrum.mode==='line')p.stroke();$('spectrum-peak').textContent=peak<-85||!Number.isFinite(peak)?'SILENCE':`~${Math.round(peakIndex*rate/bins)} Hz`;
 }
}
window.studio=new StudioApps();
