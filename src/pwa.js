let registration, deferredPrompt, status=import.meta.env.DEV?'Modo de desenvolvimento · offline disponível no build de produção.':'Preparando acesso offline…';
let changed=()=>{};
export const pwaStatus=()=>status;
function notify(message){status=message;changed();}
export async function setupPWA(onChange){
 changed=onChange;
 addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;});
 addEventListener('appinstalled',()=>{deferredPrompt=null;});
 if(import.meta.env.DEV)return;
 if(!('serviceWorker' in navigator)||!isSecureContext){notify('Para instalação e acesso offline, abra por HTTPS ou localhost.');return;}
 try{
  registration=await navigator.serviceWorker.register('/sw.js');
  const check=()=>{if(registration.waiting)notify('Atualização disponível.');};
  check();
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)check();else notify('Interface pronta para abrir sem internet. Mapas dependem de conexão.');}});});
  await navigator.serviceWorker.ready;
  if(!registration.waiting)notify('Interface pronta para abrir sem internet. Mapas dependem de conexão.');
 }catch{notify('Não foi possível preparar o acesso offline. Conecte-se e abra novamente antes de sair.');}
}
export async function installApp(toast){
 if(deferredPrompt){const prompt=deferredPrompt;deferredPrompt=null;await prompt.prompt();await prompt.userChoice;}
 else toast('Android: menu do Chrome → Instalar aplicativo ou Adicionar à tela inicial. iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Use HTTPS.');
}
export async function applyUpdate(toast){
 if(!registration?.waiting){toast('Nenhuma atualização pronta no momento.');return;}
 // Wait for the user. Never replace a worker while forms are being filled.
 let reloaded=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloaded){reloaded=true;location.reload();}},{once:true});
 registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
}
