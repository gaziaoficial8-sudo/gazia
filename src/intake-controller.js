import {scannerView,pasteView,escape} from './intake-ui.js';
import {readLabel,stopLabelReader} from './labels.js';
import {parsePastedList,duplicateOf,normalized,groupStops} from './pilot-data.js';
import {findAddress,organizeRoute,routingKey} from './routing.js';

export function createIntake(ctx){
 let scan={count:0,busy:false,result:null,photo:null,status:''},ticket=0,busy=false,query=null,candidates=[],searchError='',abort;
 const $=s=>document.querySelector(s),e=escape;
 const active=()=>ctx.getState().journey;
 const list=()=>active().deliveries;
 const invalidate=()=>{active().routePlan=null;active().planned=false;};
 function releasePhoto(){if(scan.photo)URL.revokeObjectURL(scan.photo);scan.photo=null;}
 function stop(){ticket++;abort?.abort();abort=null;void stopLabelReader();scan.busy=false;releasePhoto();}
 function guard(){if(busy){ctx.toast('Aguarde a consulta terminar antes de alterar a jornada.');return true;}return false;}
 function settings(){const form=$('#route-settings');if(!form)return true;const values=Object.fromEntries(new FormData(form));return ctx.transact(()=>{const previous=active().routeSettings||{},address=values.startAddress.trim();if(address!==previous.startAddress||Boolean(values.returnToStart)!==Boolean(previous.returnToStart))invalidate();active().routeSettings={...previous,startAddress:address,startPoint:address===previous.startAddress?previous.startPoint:null,returnToStart:Boolean(values.returnToStart)};},{refresh:false});}
 function prepareSearch(address,id){if(!routingKey()){ctx.toast('Para confirmar endereços e organizar rotas reais, falta a chave pública Geoapify. Veja as instruções do projeto.');return;}query={address,id,journeyId:active().id};candidates=[];searchError='';ctx.open('geocode');}
 function markup(modal){
  if(modal==='scanner')return {title:'Ler etiquetas',content:scannerView(scan)};
  if(modal==='paste')return {title:'Colar lista de entregas',content:pasteView()};
  if(modal==='geocode')return {title:'Confirmar endereço',content:`<p><strong>${e(query?.address)}</strong></p><p>A busca envia este endereço à Geoapify. O provedor recebe seu IP e a consulta consome sua cota. Nome do destinatário e código do pacote não são enviados.</p><button class="button full" data-action="provider-search" ${busy?'disabled':''}>${busy?'Buscando…':'Buscar endereço no provedor'}</button>${searchError?`<p class="error-box" role="alert">${e(searchError)}</p>`:''}${candidates.length?`<p>Confira o número e a cidade. Um resultado de rua ou bairro pode ser aproximado.</p><label class="checkbox-label"><input id="confirm-geopoint" type="checkbox"/> Conferi que o ponto corresponde ao destino.</label>${candidates.map((c,i)=>`<div class="geo-candidate"><p>${e(c.address)}</p><small>Tipo: ${e(c.level)} · ${c.point[1].toFixed(6)}, ${c.point[0].toFixed(6)}</small><button class="button secondary full" data-candidate="${i}">Usar este ponto</button></div>`).join('')}`:''}<p class="provider-attribution">Geoapify · © OpenStreetMap contributors</p>`};
  return null;
 }
 function bind(){
  const paste=$('#paste-form');if(paste)paste.onsubmit=event=>{event.preventDefault();try{const parsed=parsePastedList(paste.elements.list.value,list());ctx.setPreview(parsed);ctx.open('preview');}catch(error){$('#paste-error').textContent=error.message;}};
  const photo=$('#label-photo');if(photo)photo.onchange=async()=>{
   const file=photo.files[0];if(!file)return;if(scan.busy)return;
   const current=++ticket;releasePhoto();scan.photo=URL.createObjectURL(file);scan.result=null;scan.busy=true;scan.status='Preparando leitura local…';ctx.render();
   try{const result=await readLabel(file,progress=>{if(current===ticket&&$('#scan-status'))$('#scan-status').textContent=`Lendo texto: ${progress}%`;});if(current!==ticket)return;scan.result=result;scan.status=result.confidence<65?'Leitura com baixa confiança. Revise todos os campos antes de confirmar.':'Leitura concluída. Confira os dados do destinatário.';}
   catch(error){if(current!==ticket)return;scan.status='Não consegui ler esta foto. Tente outra imagem ou cadastre manualmente. '+error.message;}
   finally{if(current===ticket){scan.busy=false;ctx.render();}}
  };
  const form=$('#label-form');if(form)form.onsubmit=event=>{
   event.preventDefault();const v=Object.fromEntries(new FormData(form)),pkg=v.package.trim(),address=v.address.trim(),name=v.name.trim()||pkg;
   const fail=message=>$('#label-error').textContent=message;
   if(!pkg||!address)return fail('Confira o endereço e o código do pacote.');
   if(list().length>=100)return fail('Limite de 100 pacotes por jornada.');
   const row={id:crypto.randomUUID(),name,address,package:pkg,status:'pending',source:'label',priority:'normal'};
   if(list().some(d=>duplicateOf(row,d)))return fail('Este pacote já está na lista. Confira se a etiqueta foi lida novamente.');
   if(ctx.transact(()=>{list().push(row);active().selected??=row.id;invalidate();},{refresh:false})){scan.count++;scan.result=null;releasePhoto();scan.status='Pacote salvo. Fotografe a próxima etiqueta.';ctx.render();}
  };
  const route=$('#route-settings');if(route){route.onchange=settings;route.onsubmit=event=>{event.preventDefault();if(settings()){const address=active().routeSettings.startAddress;if(!address)return ctx.toast('Informe o local de saída.');prepareSearch(address,'start');}};}
  document.querySelectorAll('[data-verify]').forEach(button=>button.onclick=()=>{const d=list().find(d=>String(d.id)===button.dataset.verify);if(d)prepareSearch(d.address,String(d.id));});
  document.querySelectorAll('[data-candidate]').forEach(button=>button.onclick=()=>{
   if(!$('#confirm-geopoint')?.checked)return ctx.toast('Confira o destino e marque a confirmação antes de usar o ponto.');
   if(query.journeyId!==active().id)return ctx.toast('A jornada mudou. Faça a conferência novamente.');
   const c=candidates[Number(button.dataset.candidate)];if(!c)return;
   if(ctx.transact(()=>{if(query.id==='start')active().routeSettings={...active().routeSettings,startPoint:c.point};else for(const d of list())if(normalized(d.address)===normalized(query.address)){d.point=c.point;d.pointConfirmedAt=new Date().toISOString();}invalidate();},{refresh:false}))ctx.close();
  });
 }
 async function action(a){
  if(a==='scan'){if(guard())return true;scan={count:0,busy:false,result:null,photo:null,status:''};ctx.open('scanner');return true;}
  if(a==='paste'){ctx.open('paste');return true;}
  if(a==='label-photo'){$('#label-photo').click();return true;}
  if(a==='provider-search'){
   if(busy)return true;busy=true;searchError='';abort=new AbortController();ctx.render();
   try{candidates=await findAddress(query.address,abort.signal);if(!candidates.length)searchError='Não encontrei esse endereço. Corrija rua, número e cidade e tente novamente.';}catch(error){searchError=error.message;}finally{busy=false;ctx.render();}return true;
  }
  if(a==='optimize'){
   if(guard()||!settings())return true;
   if(!routingKey()){ctx.toast('A organização real aguarda a chave pública Geoapify. A sequência manual continua disponível.');return true;}
   const pending=list().filter(d=>d.status==='pending');if(!pending.length)return true;
   if(pending.some(d=>!d.point)||!active().routeSettings?.startPoint){ctx.toast('Confirme cada endereço e o local de saída antes de organizar.');return true;}
   ctx.ask('Organizar as entregas pendentes? O cálculo enviará as coordenadas confirmadas à Geoapify e consumirá a cota do provedor. Resultados já registrados serão preservados.',()=>{void optimize();return true;});return true;
  }
  return false;
 }
 async function optimize(){busy=true;const current=active().id,signature=JSON.stringify([list(),active().routeSettings]);ctx.render();try{const result=await organizeRoute(list(),active().routeSettings);if(current!==active().id||signature!==JSON.stringify([list(),active().routeSettings]))throw Error('As entregas ou a saída mudaram durante o cálculo. Refaça a organização.');if(ctx.transact(()=>{const ordered=result.orderedIds.map(id=>list().find(d=>d.id===id));active().deliveries=[...ordered,...list().filter(d=>!result.orderedIds.includes(d.id))];active().routePlan=result;active().selected=ordered[0].id;active().planned=true;},{refresh:false}))ctx.toast('Sequência calculada. Confira e inicie a jornada.');}catch(error){ctx.toast(error.message);}finally{busy=false;ctx.render();}}
 return {markup,bind,action,onClose:stop,isBusy:()=>busy,guard,invalidate};
}
