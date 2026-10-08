'use strict';
(()=>{
 if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
 let installPrompt;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
 $('install').onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').hidden=true;};
 window.addEventListener('appinstalled',()=>{$('install').hidden=true;notify('ChocoHertz installed. Your studio is ready to travel.');});
 navigator.serviceWorker.register('./sw.js').then(reg=>{
  const update=()=>{if(reg.waiting){$('update-app').hidden=false;$('update-app').onclick=()=>{studio.stopAll();stop(true);reg.waiting.postMessage('activate');};}};
  update();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',update);});
  navigator.serviceWorker.ready.then(()=>{document.documentElement.dataset.offline='ready';});
 }).catch(()=>notify('Offline installation could not finish. Reopen while connected to try again.'));
 let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!$('update-app').hidden&&!refreshing){refreshing=true;location.reload();}});
})();
