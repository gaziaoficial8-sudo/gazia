import {mapMarkup,mountMap,disposeMap,locateDriver} from './map.js';
import {nextPending} from './delivery-flow.js';
import {STORE_KEY,loadData,saveData,emptyJourney,validateData,parseCSV,duplicateOf,reportCSV,groupStops,normalized} from './pilot-data.js';
import {homeView,deliveriesView,deliveryForm,reviewView} from './intake-ui.js';
import {createIntake} from './intake-controller.js';
import {setupPWA,installApp,applyUpdate,pwaStatus} from './pwa.js';

export function start(initial) {
 const loaded=loadData(initial);
 let data=loaded.data, blocked=Boolean(loaded.error), page=data[data.mode].page||'home', modal=null, preview=null, confirmAction=null, lastFocus=null;
 let noticeTimer, locationMessage='', locating=false, resultReadyAt=0, editId=null;
 const intake=createIntake({getState:()=>({data,journey:journey()}),transact,open,close,render,toast,ask,setPreview:value=>preview=value});
 const reasons=['Destinatário ausente','Estabelecimento fechado','Endereço incorreto','Acesso impedido','Outro'];
 const journey=()=>data[data.mode];
 const items=()=>journey().deliveries;
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const byId=id=>items().find(d=>String(d.id)===String(id));
 const stamp=()=>new Date().toISOString();
 const label=status=>({pending:'Pendente',done:'Entregue',failed:'Sem sucesso'}[status]);
 function toast(message){$('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=message;document.body.append(el);clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.remove(),7000);}
 function transact(change,{refresh=true}={}) {
  if(blocked){toast('Dados protegidos. Exporte os dados originais em Ajuda e recarregue antes de continuar.');return false;}
  const before=structuredClone(data),previousPage=page;
  try{change();journey().page=page;saveData(data);if(refresh)render();return true;}
  catch(error){data=before;page=previousPage;toast(error.message.includes('Outra aba')?error.message:'Não foi possível salvar. Nenhuma alteração foi confirmada. Libere espaço ou exporte uma cópia em Ajuda.');return false;}
 }
 function record(d,status,reason=''){
  journey().events.push({id:crypto.randomUUID(),deliveryId:d.id,at:stamp(),from:d.status,to:status,reason});
  d.status=status;d.reason=reason;d.completedAt=status==='pending'?null:stamp();
 }
 function go(target){
  if(intake.isBusy())return intake.guard();
  if(modal){toast('Salve ou cancele a edição antes de navegar.');return;}
  if(transact(()=>{page=target;})){scrollTo(0,0);$('h1')?.focus({preventScroll:true});}
 }
 function header(title,subtitle,actions=''){return `<header class="page-header"><div><div class="eyebrow">PILOTO · FRANCA E REGIÃO</div><h1 tabindex="-1">${title}</h1><p>${subtitle}</p></div>${actions}</header>`;}
 function badge(d){return `<span class="badge ${d.status==='failed'?'orange':''}">${label(d.status)}</span>`;}

 function home(){return homeView({items:items(),planned:journey().planned,demo:data.mode==='demo'});}


 function deliveries(){return deliveriesView({items:items(),demo:data.mode==='demo'});}

 function review(){return reviewView({items:items(),settings:journey().routeSettings,routePlan:journey().routePlan,busy:intake.isBusy(),demo:data.mode==='demo'});}

 function mapBlock(){return data.mapConsent?mapMarkup(data.mode==='demo'): `<div class="map-consent"><span class="stat-icon mint">⌖</span><h2>Mapa dentro do aplicativo</h2><p>Ao carregar, o OpenStreetMap recebe seu IP, a origem da página e a área visualizada. Endereços e nomes das entregas não são enviados. O serviço depende de internet.</p><button class="button secondary" data-action="map-consent">Carregar mapa de ruas</button><small>Você pode registrar entregas sem carregar o mapa.</small></div>`;}
 function route(){const d=byId(journey().selected)||items().find(d=>d.status==='pending')||items()[0];const group=d?.status==='pending'?items().filter(x=>x.status==='pending'&&normalized(x.address)===normalized(d.address)):[];return `${header('Sua jornada, uma parada por vez.','Registre o resultado e siga para a próxima.',`<button class="button secondary" data-page="review">Ajustar jornada</button>`)}<div class="route-banner"><p><strong>${journey().routePlan?'Sequência calculada.':data.mode==='demo'?'Rota demonstrativa.':'Sequência manual.'}</strong> ${journey().routePlan?'Organizada pelo Geoapify, sem trânsito em tempo real.':data.mode==='demo'?'Pontos fictícios para testar o fluxo.':'Organização real ainda não foi calculada.'} Sem navegação curva a curva.</p><span class="badge">${items().filter(d=>d.status!=='pending').length}/${items().length} visitadas</span></div><div class="route-layout"><section class="panel route-list"><div class="section-heading"><div><h2>Suas paradas</h2><p>Falhas só voltam à fila quando você escolher.</p></div></div>${items().map((stop,i)=>`<button class="stop ${stop.id===d?.id?'active':''}" data-select="${esc(stop.id)}"><span class="stop-number ${stop.status==='done'?'complete':''}">${stop.status==='done'?'✓':stop.status==='failed'?'!':i+1}</span><span><strong>${stop.priority==='high'?'★ ':''}${esc(stop.name)}</strong><small>Pacote ${esc(stop.package)}</small><em>${label(stop.status)}</em></span><b>›</b></button>`).join('')}<button class="button secondary full" data-page="summary">Ver resumo da jornada →</button></section><section class="panel route-map">${d?`<div class="current-stop"><div><span class="eyebrow">${d.status==='pending'?'PARADA ATUAL':'PARADA VISITADA'} · ${esc(d.package)}</span><h2>${esc(d.name)}</h2><p>${esc(d.address)}</p><p class="location-note">${d.point?'Ponto confirmado por você.':data.mode==='demo'&&Number.isInteger(d.id)&&d.id<=5?'Ponto fictício para testar o fluxo.':'Localização não confirmada.'}</p>${d.reason?`<p>Motivo: ${esc(d.reason)}</p>`:''}</div><div class="stop-actions">${group.length>1?`<p class="grouped-current">${group.length} pacotes neste endereço: ${group.map(x=>esc(x.package)).join(" · ")}</p><button class="button" data-done-group="${esc(d.id)}">Entregar ${group.length} pacotes deste endereço</button>`:""}${d.status==='pending'?`<button class="button" data-done="${esc(d.id)}">✓ Marcar entregue</button><button class="button secondary unsuccessful" data-failed="${esc(d.id)}">Não consegui entregar</button><small>O resultado é salvo antes de avançar.</small>`:`${badge(d)}<button class="button secondary" data-retry="${esc(d.id)}">${d.status==='failed'?'Tentar novamente':'Corrigir resultado'}</button>`}</div></div>`:'<div class="empty-state">Adicione entregas para iniciar.</div>'}${mapBlock()}<div class="location-tools"><button class="button secondary" data-action="locate" ${locating?'disabled':''}>${locating?'Buscando localização…':'Usar minha localização'}</button><p role="status" id="location-status">${esc(locationMessage||'Localização só é solicitada ao tocar no botão. Não é salva nem acompanhada em segundo plano.')}</p></div></section></div>`;}
 function summary(){const total=items().length,finished=items().filter(d=>d.status==='done').length,failed=items().filter(d=>d.status==='failed').length;return `${header('Cada parada conta.','Resultados salvos neste navegador.',`<button class="button secondary" data-page="route">Voltar à rota ↗</button>`)}<section class="summary-hero"><span class="summary-check">✓</span><h2>${total&&finished===total?'Jornada concluída. Bom descanso!':total&&finished+failed===total?'Todas as paradas foram visitadas.':'Seu progresso está aqui.'}</h2><p>${finished} de ${total} entregas concluídas. ${failed} sem sucesso · ${total-finished-failed} pendentes.</p><div class="progress-track"><span style="width:${total?finished/total*100:0}%"></span></div></section><section class="panel summary-results"><div class="section-heading"><div><h2>Histórico desta jornada</h2><p>Correções ficam registradas no backup.</p></div><button class="button secondary" data-action="export-csv">Exportar resultados</button></div>${items().map(d=>`<div class="history-row"><div><strong>${esc(d.name)}</strong><small>Pacote ${esc(d.package)}${d.reason?' · '+esc(d.reason):''}</small>${d.completedAt?`<small>${esc(new Date(d.completedAt).toLocaleString('pt-BR'))}</small>`:''}</div><div class="result-actions">${badge(d)}${d.status!=='pending'?`<button class="text-button" data-retry="${esc(d.id)}">${d.status==='failed'?'Tentar novamente':'Corrigir resultado'}</button>`:''}</div></div>`).join('')||'<div class="empty-state">Nenhuma entrega registrada.</div>'}<footer class="panel-footer"><p>Arquive para manter uma cópia no histórico e começar outra jornada.</p><button class="button" data-action="archive" ${!total?'disabled':''}>Arquivar e começar outra</button></footer></section><section class="panel summary-results"><div class="section-heading"><div><h2>Jornadas anteriores</h2><p>Guardadas apenas neste navegador. Exporte seu backup.</p></div></div>${data.history.filter(h=>h.mode===data.mode).map(h=>`<div class="history-row"><div><strong>${esc(new Date(h.archivedAt).toLocaleString('pt-BR'))}</strong><small>${h.deliveries.length} paradas · ${h.deliveries.filter(d=>d.status==='done').length} entregues · ${h.deliveries.filter(d=>d.status==='failed').length} sem sucesso</small></div><button class="button secondary" data-report="${esc(h.id)}">Exportar CSV</button></div>`).join('')||'<div class="empty-state">Nenhuma jornada arquivada.</div>'}</section>`;}
 function dialog(content,title){return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close icon-button" data-action="close" aria-label="Fechar">×</button><h2 id="modal-title">${title}</h2>${content}</section></div>`;}
 function modalMarkup(){
  const entry=intake.markup(modal);if(entry)return dialog(entry.content,entry.title);
  if(modal==='add')return dialog(deliveryForm(),'Uma entrega a mais.');
  if(modal?.type==='failure')return dialog(`<p>${esc(byId(modal.id)?.name)} · a tentativa será salva antes de avançar.</p><form id="failure-form"><label>Motivo<select name="reason" aria-label="Motivo">${reasons.map(r=>`<option>${r}</option>`).join('')}</select></label><label>Observação opcional<input name="note" maxlength="160" placeholder="Evite dados pessoais desnecessários"/></label><button class="button full" type="submit">Salvar tentativa e avançar</button></form>`,'Não consegui entregar');
  if(modal==='confirm')return dialog(`<p>${esc(confirmAction.message)}</p><div class="dialog-actions"><button class="button secondary" data-action="close">Cancelar</button><button class="button" data-action="confirm">Confirmar</button></div>`,'Confirmar alteração');
  if(modal==='preview')return dialog(`<p>Confira antes de importar. Nenhuma entrega foi adicionada.</p>${preview.errors.length?`<div class="error-box" role="alert">${preview.errors.map(esc).join('<br>')}</div>`:''}<div class="import-preview">${preview.rows.map(r=>`<div class="history-row"><div><strong>${esc(r.name)}</strong><small>Linha ${r.line} · ${esc(r.package)}</small><small>${esc(r.address)}</small>${r.duplicate?'<span class="window-alert">Possível duplicata</span>':''}</div></div>`).join('')}</div>${preview.rows.some(r=>r.duplicate)?'<label class="checkbox-label"><input id="skip-duplicates" type="checkbox" checked/> Ignorar possíveis duplicatas</label>':''}<p id="import-error" role="alert"></p><button class="button full" data-action="confirm-import" ${preview.errors.length?'disabled':''}>Confirmar importação</button>`,'Prévia da importação');
  return dialog(`<p>Bem-vindo ao Entreguei. Importe a lista da empresa ou, se não houver lista, fotografe as etiquetas. Confira os endereços e registre cada parada. Você começa em demonstração com dados fictícios.</p><h3>Instalar no celular</h3><p><strong>Android (Chrome):</strong> abra pelo endereço HTTPS e use “Instalar aplicativo” ou “Adicionar à tela inicial” no menu.</p><p><strong>iPhone (Safari):</strong> use Compartilhar → Adicionar à Tela de Início e confirme. A interface pode variar por versão.</p><button class="button secondary full" data-action="install">Instalar aplicativo</button><p>${esc(pwaStatus())}</p><h3>Dados e privacidade</h3><p>Jornadas, resultados e histórico ficam somente neste navegador. Não há conta ou sincronização em nuvem. Limpar dados do site ou perder o aparelho pode apagar os registros. O backup JSON permite restaurar dados; guarde-o em local seguro.</p><p>Mapa de ruas usa OpenStreetMap após sua escolha. Sua localização só é solicitada pelo botão e não é salva. A leitura das etiquetas é local. Busca de endereços e organização de rotas usam Geoapify somente após escolha explícita e configuração da chave. Endereços e coordenadas são enviados ao provedor; fotos não são enviadas. Mapas e novos cálculos não estão disponíveis offline.</p><p>Nome provisório. Piloto para validação: ainda requer revisão de segurança, privacidade, endereços e provedor antes da venda ampla.</p><div class="help-actions"><button class="button secondary" data-action="backup">Exportar backup JSON</button><button class="button secondary" data-action="restore">Restaurar backup JSON</button><button class="button secondary" data-action="raw-backup">Exportar dados originais</button><button class="button secondary" data-action="revoke-map">Desativar mapa de ruas</button><button class="button secondary" data-action="reset">Reiniciar demonstração</button><button class="button secondary danger" data-action="erase">Apagar jornada própria e histórico</button></div><input id="backup-file" type="file" accept=".json,application/json" hidden/><button class="button full" data-action="close">Entendi, começar</button>`,'Seu primeiro giro');
 }
 function nav(target,text,icon){return `<button class="nav-item ${page===target?'active':''}" data-page="${target}" ${page===target?'aria-current="page"':''}><span aria-hidden="true">${icon}</span>${text}</button>`;}
 function render(){
  disposeMap();const pages={home,deliveries,review,route,summary};
  $('#app').innerHTML=`<aside class="sidebar"><a class="brand" href="#home" aria-label="Entreguei início"><span class="brand-mark">↗</span>entreguei<span class="brand-dot">.</span></a><span class="workspace-label">SEU ESPAÇO</span><nav aria-label="Menu principal">${nav('home','Início','⌂')}${nav('deliveries','Entregas','▣')}${nav('review','Conferência','◷')}${nav('route','Jornada','↗')}${nav('summary','Resumo','▥')}</nav><div class="sidebar-bottom"><div class="pilot"><strong>Uma parada por vez.</strong><p>Construído para quem entrega.</p><span class="pilot-label">PILOTO · FRANCA, SP</span></div><button class="button secondary full" data-action="help">Ajuda e meus dados</button></div></aside><main><div class="topbar"><a class="mobile-brand" href="#home">entreguei.</a><span class="connection ${navigator.onLine?'':'offline'}">${navigator.onLine?'● Conectado':'● Sem conexão · registros locais'}</span><button class="text-button" data-action="help">Ajuda e instalação</button></div><div class="mode-bar"><span>${data.mode==='demo'?'DEMONSTRAÇÃO · DADOS FICTÍCIOS':'JORNADA PRÓPRIA · PILOTO LOCAL'}</span><button class="text-button" data-action="switch">${data.mode==='demo'?'Usar minha jornada':'Ver demonstração'}</button></div><div id="pwa-banner"></div>${blocked?`<div class="error-box" role="alert">${esc(loaded.error)} <button class="button secondary" data-action="raw-backup">Exportar dados originais</button></div>`:''}<div class="content">${(pages[page]||home)()}</div><footer class="app-footer"><span>entreguei. <small>Sua jornada, mais leve.</small></span><small>Nome provisório · Piloto v0.3 · Sem nuvem</small></footer></main>${modal?modalMarkup():''}`;
  bind();intake.bind();if(data.mapConsent)mountMap(items(),journey().selected,id=>{transact(()=>journey().selected=id);},{demo:data.mode==='demo',geometry:journey().routePlan?.geometry,attribution:Boolean(journey().routePlan)});
  if(Date.now()<resultReadyAt){document.querySelectorAll('[data-done],[data-done-group],[data-failed]').forEach(b=>b.disabled=true);setTimeout(()=>document.querySelectorAll('[data-done],[data-done-group],[data-failed]').forEach(b=>b.disabled=false),resultReadyAt-Date.now());}
  updateBanner();
  if(modal){requestAnimationFrame(()=>$('.modal input:not([type=file]), .modal select, .modal textarea, .modal button:not(.modal-close)')?.focus());}
 }
 function open(value){lastFocus=document.activeElement?.getAttribute('data-action')||null;modal=value;render();}
 function close(){intake.onClose();modal=null;editId=null;preview=null;confirmAction=null;render();if(lastFocus)$(`[data-action="${lastFocus}"]`)?.focus();}
 function ask(message,run){confirmAction={message,run};open('confirm');}
 function download(contents,name,type){const url=URL.createObjectURL(new Blob([contents],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function finish(id,status,reason=''){
  const d=byId(id);if(!d||d.status!=='pending'||Date.now()<resultReadyAt)return;
  if(transact(()=>{record(d,status,reason);const next=nextPending(items(),d.id);if(next!==null)journey().selected=next;else page='summary';},{refresh:false})){resultReadyAt=Date.now()+700;modal=null;render();toast(status==='done'?'Entrega registrada.':'Tentativa registrada. Próxima pendente selecionada.');}
 }
 function finishGroup(id){
  const current=byId(id);if(!current||current.status!=='pending'||Date.now()<resultReadyAt)return;
  const group=items().filter(d=>d.status==='pending'&&normalized(d.address)===normalized(current.address));
  if(transact(()=>{for(const d of group)record(d,'done');const next=nextPending(items(),current.id);if(next===null)page='summary';else journey().selected=next;},{refresh:false})){resultReadyAt=Date.now()+700;render();toast(`${group.length} pacotes registrados como entregues neste endereço.`);}
 }

 function bind(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));
  document.querySelectorAll('.brand,.mobile-brand').forEach(b=>b.onclick=e=>{e.preventDefault();go('home');});
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
  document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>transact(()=>journey().selected=byId(b.dataset.select).id));
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>ask(`Excluir ${byId(b.dataset.remove).name} e seus registros desta jornada?`,()=>transact(()=>{const id=byId(b.dataset.remove).id;journey().deliveries=items().filter(d=>d.id!==id);journey().events=journey().events.filter(e=>e.deliveryId!==id);if(journey().selected===id)journey().selected=items().find(d=>d.status==='pending')?.id??null;intake.invalidate();},{refresh:false})));
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>transact(()=>{const i=items().findIndex(d=>String(d.id)===b.dataset.move),j=i+Number(b.dataset.direction);if(j>=0&&j<items().length)[items()[i],items()[j]]=[items()[j],items()[i]];intake.invalidate();}));
  document.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>finish(b.dataset.done,'done'));
  document.querySelectorAll('[data-done-group]').forEach(b=>b.onclick=()=>finishGroup(b.dataset.doneGroup));
  document.querySelectorAll('[data-failed]').forEach(b=>b.onclick=()=>open({type:'failure',id:b.dataset.failed}));
  document.querySelectorAll('[data-retry]').forEach(b=>b.onclick=()=>ask('Recolocar esta parada como pendente? O resultado anterior ficará no histórico de alterações.',()=>transact(()=>{const d=byId(b.dataset.retry);record(d,'pending');journey().selected=d.id;intake.invalidate();page='route';},{refresh:false})));
  document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>download(reportCSV(data.history.find(h=>h.id===b.dataset.report).deliveries),'girovia-historico.csv','text/csv;charset=utf-8'));
  const form=$('#delivery-form');if(form)form.onsubmit=e=>{
   e.preventDefault();const v=Object.fromEntries(new FormData(form)),err=$('#form-error');
   const fail=m=>{err.textContent=m;toast(m);};
   if(!v.address.trim()||!v.package.trim())return fail('Preencha o endereço e o código do pacote.');
   if(items().length>=100&&!editId)return fail('O limite é de 100 entregas por jornada.');
   const row={id:crypto.randomUUID(),name:v.name.trim()||v.package.trim(),address:v.address.trim(),package:v.package.trim(),priority:'normal',status:'pending',source:'manual'};
   if(items().some(d=>d.id!==editId&&duplicateOf(row,d)))return fail('Possível duplicata: confira o pacote e o destino já cadastrado.');
   if(transact(()=>{if(editId){const previous=byId(editId);if(previous.address!==row.address){delete previous.point;delete previous.pointConfirmedAt;}Object.assign(previous,{...row,id:editId,status:previous.status});journey().events.push({type:'details-edited',deliveryId:editId,at:stamp()});}else{items().push(row);journey().selected??=row.id;}intake.invalidate();},{refresh:false})){const wasEdit=Boolean(editId);close();toast(wasEdit?'Dados da entrega atualizados.':'Entrega adicionada. Localização não confirmada.');}
  };
  if(form&&editId){const d=byId(editId);for(const [k,v] of Object.entries({name:d.name,address:d.address,package:d.package}))form.elements.namedItem(k).value=v;$('#modal-title').textContent='Editar entrega';form.querySelector('[type="submit"]').textContent='Salvar entrega';}
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editId=byId(b.dataset.edit).id;open('add');});
  const failure=$('#failure-form');if(failure)failure.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(failure));finish(modal.id,'failed',v.reason+(v.note.trim()?' · '+v.note.trim():''));};
  const file=$('#csv-file');if(file)file.onchange=async()=>{const f=file.files[0];if(!f)return;try{if(f.size>500000)throw Error('Arquivo muito grande. Use até 500 KB.');preview=parseCSV(await f.text(),items());open('preview');}catch(error){toast(error.message);}finally{file.value='';}};
  const restore=$('#backup-file');if(restore)restore.onchange=async()=>{try{const f=restore.files[0];if(!f)return;if(f.size>5000000)throw Error('Backup muito grande (máximo 5 MB).');const incoming=JSON.parse(await f.text());validateData(incoming);ask('Restaurar este backup? Ele substituirá as jornadas e o histórico atuais. Exporte uma cópia antes de confirmar.',()=>restoreBackup(incoming));}catch{toast('Backup inválido ou incompatível. Nenhum dado foi alterado.');}};
  $('.modal')?.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const focusables=[...$('.modal').querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&el.type!=='file'&&el.offsetParent!==null),first=focusables[0],last=focusables.at(-1);if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}});
 }
 function restoreBackup(incoming){
  if(blocked&&loaded.error){
   // Explicitly confirmed recovery may replace unreadable data; ordinary writes never do.
   const next={...incoming,revision:incoming.revision+1,mapConsent:false,onboarded:true};
   try{localStorage.setItem(STORE_KEY,JSON.stringify(next));data=next;blocked=false;page='home';return true;}catch{toast('Não foi possível salvar a restauração. Os dados originais foram preservados.');return false;}
  }
  return transact(()=>{const rev=data.revision;data={...incoming,revision:rev,mapConsent:false,onboarded:true};page='home';},{refresh:false});
 }
 async function action(a){
  if(await intake.action(a))return;
  if(intake.isBusy()&&a!=='confirm')return intake.guard();
  if(a==='close'){if(!data.onboarded&&!blocked&&!transact(()=>data.onboarded=true,{refresh:false}))return;close();}
  if(a==='help')open('help');
  if(a==='add'){if(items().length>=100)return toast('O limite é de 100 entregas por jornada.');open('add');}
  if(a==='confirm'){if(!confirmAction)return;const run=confirmAction.run;if(run())close();}
  if(a==='plan'){transact(()=>{journey().planned=true;journey().selected=items().find(d=>d.status==='pending')?.id??journey().selected;page='route';});}
  if(a==='import')$('#csv-file').click();
  if(a==='sample')download('\uFEFFnome;endereco;pacote\nDestino Exemplo;Rua Exemplo 100 Centro Franca SP;B01\n','girovia-modelo.csv','text/csv;charset=utf-8');
  if(a==='confirm-import'){
   const skip=$('#skip-duplicates')?.checked,rows=preview.rows.filter(r=>!skip||!r.duplicate);
   if(!rows.length){$('#import-error').textContent='Nenhuma entrega nova selecionada.';return;}
   if(rows.length+items().length>100){$('#import-error').textContent='O limite é de 100 entregas por jornada.';return;}
   if(transact(()=>{items().push(...rows.map(({duplicate,line,...r})=>r));journey().selected??=rows[0].id;intake.invalidate();},{refresh:false})){close();toast(`${rows.length} entrega(s) importada(s). Confira os endereços.`);}
  }
  if(a==='switch'){transact(()=>{data.mode=data.mode==='demo'?'work':'demo';page=journey().page||'home';});}
  if(a==='archive')ask('Arquivar esta jornada e começar uma lista vazia? Pendentes também serão arquivadas. Você poderá exportar os resultados no histórico.',()=>transact(()=>{data.history.push({...structuredClone(journey()),id:crypto.randomUUID(),mode:data.mode,archivedAt:stamp()});data[data.mode]=emptyJourney();page='deliveries';},{refresh:false}));
  if(a==='reset')ask('Reiniciar somente a demonstração? Os exemplos atuais serão substituídos. Sua jornada própria será preservada.',()=>transact(()=>{data.demo={...emptyJourney(),deliveries:structuredClone(initial),selected:1};if(data.mode==='demo')page='home';},{refresh:false}));
  if(a==='erase')ask('Apagar a jornada própria e todo o histórico de jornadas próprias deste navegador? Esta ação não pode ser desfeita. Exporte um backup antes.',()=>transact(()=>{data.work=emptyJourney();data.history=data.history.filter(h=>h.mode!=='work');if(data.mode==='work')page='home';},{refresh:false}));
  if(a==='export-csv')download(reportCSV(items()),'girovia-resultados.csv','text/csv;charset=utf-8');
  if(a==='backup')download(JSON.stringify(data,null,2),'girovia-backup.json','application/json');
  if(a==='raw-backup'){try{download(JSON.stringify({pilot:localStorage.getItem(STORE_KEY),legacy:localStorage.getItem('girovia-demo-v1')},null,2),'girovia-dados-originais.json','application/json');}catch{toast('O navegador bloqueou a leitura do armazenamento.');}}
  if(a==='restore')$('#backup-file').click();
  if(a==='map-consent')transact(()=>data.mapConsent=true);
  if(a==='revoke-map'){if(transact(()=>data.mapConsent=false,{refresh:false})){close();toast('Mapa desativado. Nenhuma nova imagem será solicitada.');}}
  if(a==='locate'){
   if(!navigator.geolocation)return toast('Este navegador não oferece localização. Os registros continuam disponíveis.');
   locating=true;locationMessage='Buscando sinal de localização…';render();
   navigator.geolocation.getCurrentPosition(position=>{locating=false;const c=position.coords;locationMessage=c.accuracy>100?`Sinal com baixa precisão (±${Math.round(c.accuracy)} m). Não use este ponto como referência exata.`:`Localização obtida (±${Math.round(c.accuracy)} m). ${data.mapConsent?'Ponto exibido no mapa.':'Carregue o mapa se quiser visualizar; a posição não foi salva.'}`;if($('#location-status'))$('#location-status').textContent=locationMessage;const button=$('[data-action="locate"]');if(button){button.disabled=false;button.textContent='Usar minha localização';}if(data.mapConsent)locateDriver(c);},error=>{locating=false;locationMessage=error.code===1?'Permissão de localização negada. Você pode continuar registrando entregas.':error.code===3?'Tempo de localização esgotado. Tente novamente quando houver sinal.':'Localização indisponível. Confira o sinal e as configurações do aparelho.';const statusNode=document.querySelector('#location-status');if(statusNode)statusNode.textContent=locationMessage;const locationButton=document.querySelector('[data-action=locate]');if(locationButton){locationButton.disabled=false;locationButton.textContent='Usar minha localização';}},{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  }
  if(a==='install')await installApp(toast);
  if(a==='update'){if(modal)return toast('Termine a edição antes de atualizar.');if(transact(()=>{},{refresh:false}))await applyUpdate(toast);}
 }
 function updateBanner(){const el=$('#pwa-banner');if(!el)return;el.innerHTML=pwaStatus()==='Atualização disponível.'?'<div class="update-banner">Nova versão disponível. Sua jornada será preservada. <button class="button secondary" id="apply-update">Atualizar agora</button></div>':`<p class="offline-ready">${esc(pwaStatus())}</p>`;$('#apply-update')?.addEventListener('click',()=>action('update'));}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal)action('close');});
 addEventListener('beforeunload',e=>{if(modal==='add'||modal==='scanner'||modal==='paste'||modal?.type==='failure'){e.preventDefault();e.returnValue='';}});
 addEventListener('storage',e=>{if(e.key===STORE_KEY){blocked=true;toast('Outra aba alterou os dados. Exporte edições pendentes e recarregue para continuar.');}});
 for(const event of ['online','offline'])addEventListener(event,()=>{const el=$('.connection');if(el){el.classList.toggle('offline',!navigator.onLine);el.textContent=navigator.onLine?'● Conectado':'● Sem conexão · registros locais';}updateBanner();});
 setInterval(()=>{if(page==='home'&&!modal)render();},60000);
 render();setupPWA(updateBanner);if(!data.onboarded&&!blocked)open('help');
}
