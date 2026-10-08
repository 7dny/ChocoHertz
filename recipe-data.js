'use strict';
window.ChocoRecipes={
 clean(raw,base,ids){
  if(!raw||raw.version!==1||!raw.state||typeof raw.state!=='object')throw new Error('Unsupported recipe format.');
  const result={version:1,state:structuredClone(base),macros:[],layout:{}},s=result.state,r=raw.state;
  const num=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  const bool=(v,fallback=false)=>typeof v==='boolean'?v:fallback;
  const choice=(v,options,fallback)=>options.includes(v)?v:fallback;
  s.frequency=num(r.frequency,20,20000,440);s.wave=choice(r.wave,['sine','triangle','square','sawtooth'],'sine');s.mainLevel=num(r.mainLevel,0,1,.8);s.master=num(r.master,0,1,.2);s.muted=bool(r.muted);
  for(const id of ids)s.open[id]=bool(r.open?.[id],id==='tone'||id==='volume');
  s.voices=(Array.isArray(r.voices)?r.voices:[]).filter(v=>v&&typeof v==='object').slice(0,5).map((v,i)=>({id:'v'+(i+1),frequency:num(v.frequency,20,20000,440),wave:choice(v.wave,['sine','triangle','square','sawtooth'],'sine'),level:num(v.level,0,1,.45),enabled:bool(v.enabled,true)}));
  const seen=new Set();result.macros=(Array.isArray(raw.macros)?raw.macros:[]).filter(m=>{if(!m||!/^[a-z0-9]$/.test(m.key)||seen.has(m.key))return false;seen.add(m.key);return true;}).slice(0,20).map((m,i)=>({id:'m'+(i+1),key:m.key,hz:num(m.hz,20,20000,440),wave:choice(m.wave,['sine','triangle','square','sawtooth'],'sine'),level:num(m.level,0,1,.65)}));
  const fields={spatial:{x:[-5,5],y:[-5,5],z:[-5,5],rolloff:[0,3],speed:[.02,1]},lfo:{rate:[.05,10],depth:[0,1]},adsr:{a:[.01,5],d:[.01,5],s:[0,1],r:[.02,8]},echo:{time:[.04,1.5],feedback:[0,.7],mix:[0,.6],reverb:[0,.6],decay:[.3,4]},filter:{cutoff:[20,20000],q:[.1,15]},noise:{white:[0,1],pink:[0,1],brown:[0,1]},sweep:{from:[20,20000],to:[20,20000],duration:[1,60]},sequence:{bpm:[40,240],gate:[.1,.95]},spectrum:{floor:[-110,-50]}};
  for(const [group,props]of Object.entries(fields))for(const [key,[lo,hi]]of Object.entries(props))s[group][key]=num(r[group]?.[key],lo,hi,s[group][key]);
  for(const group of ['spatial','lfo','echo','filter'])s[group].enabled=bool(r[group]?.enabled);
  s.spatial.orbit=bool(r.spatial?.orbit);s.filter.type=choice(r.filter?.type,['lowpass','highpass','bandpass'],'lowpass');s.sweep.mode=choice(r.sweep?.mode,['bounce','loop','once'],'bounce');s.spectrum.mode=choice(r.spectrum?.mode,['bars','line'],'bars');s.sequence.division=choice(r.sequence?.division,[2,4],4);
  const keys=new Set(result.macros.map(m=>m.key));s.sequence.steps=Array.from({length:16},(_,i)=>keys.has(r.sequence?.steps?.[i])?r.sequence.steps[i]:null);
  for(const group of ['noise','sweep','sequence'])s[group].running=false;
  for(const id of ids){const p=raw.layout?.[id];if(p&&typeof p==='object')result.layout[id]={x:num(p.x,0,5000,0),y:num(p.y,0,5000,0),w:num(p.w,260,2000,304),h:num(p.h,230,1000,400)};}
  return result;
 }
};
