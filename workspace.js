'use strict';
// One history entry per gesture; automatic animation never fills the undo stack.
(()=>{
 const KEY='chocohertz-workspace-v1',past=[],future=[];let before=null,timer,applying=false,warned=false,lastSaved='';
 const snapshot=()=>studio.snapshot();
 const clean=s=>ChocoRecipes.clean(s,studioBase,specs.map(s=>s[0]));
 const fingerprint=s=>JSON.stringify(s,(key,value)=>key==='id'?undefined:value);
 const buttons=()=>{$('undo').disabled=!past.length;$('redo').disabled=!future.length;};
 function save(){try{const current=snapshot(),data=JSON.stringify({version:1,current,past:past.slice(-50),future:future.slice(-50)});if(data!==lastSaved){localStorage.setItem(KEY,data);lastSaved=data;}}catch{if(!warned){warned=true;notify('Local storage is unavailable or full. Export recipes to keep a copy.');}}}
 function commit(){clearTimeout(timer);if(applying)return;if(before){const after=snapshot();if(fingerprint(before)!==fingerprint(after)){past.push(before);if(past.length>50)past.shift();future.length=0;}before=null;}buttons();save();}
 function begin(){if(!applying&&!before)before=snapshot();}
 function finish(delay=0){clearTimeout(timer);timer=setTimeout(commit,delay);}
 function restore(s){applying=true;try{studio.loadRecipe({snapshot:s},{keepRecipeOpen:false,announce:false});}finally{applying=false;}}
 function travel(from,to){commit();if(!from.length)return;to.push(snapshot());restore(from.pop());buttons();save();notify('Workspace restored. Press play when you’re ready.');}
 try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data?.version===1){restore(clean(data.current));for(const [source,target]of [[data.past,past],[data.future,future]])if(Array.isArray(source))for(const s of source.slice(-50)){try{target.push(clean(s));}catch{}}}}catch{notify('Your previous workspace could not be read. Saved recipes are still available.');}
 $('undo').onclick=()=>travel(past,future);$('redo').onclick=()=>travel(future,past);
 const relevant=e=>e.target instanceof Element&&!e.target.closest('#undo,#redo,#install,#update-app,.brand')&&e.target.closest('button,input,select,.knob,.panel-header,.spatial-map');
 document.addEventListener('pointerdown',e=>{if(relevant(e))begin();},true);
 document.addEventListener('pointerup',()=>finish());document.addEventListener('pointercancel',()=>finish());
 document.addEventListener('click',e=>{if(relevant(e))begin();},true);document.addEventListener('click',e=>{if(relevant(e))finish();});
 document.addEventListener('input',e=>{if(relevant(e))begin();},true);document.addEventListener('input',()=>finish(450));
 document.addEventListener('change',e=>{if(relevant(e))begin();},true);document.addEventListener('change',()=>finish());
 document.addEventListener('keydown',e=>{
  const editing=e.target.closest('input,textarea,select,[contenteditable=true]');
  if((e.ctrlKey||e.metaKey)&&!editing&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();travel(e.key.toLowerCase()==='y'||e.shiftKey?future:past,e.key.toLowerCase()==='y'||e.shiftKey?past:future);return;}
  if(relevant(e)&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){begin();finish(250);}
 },true);
 window.addEventListener('pagehide',commit);document.addEventListener('visibilitychange',()=>{if(document.hidden)commit();});
 setInterval(()=>{if(!before&&!applying)save();},2000);buttons();
})();
