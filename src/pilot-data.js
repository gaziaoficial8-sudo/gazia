export const STORE_KEY = 'girovia-pilot-v2';
export const validWindow = value => {
 const m = /^(\d{2}):(\d{2})[–-](\d{2}):(\d{2})$/.exec(value);
 return Boolean(m && +m[1]<24 && +m[3]<24 && +m[2]<60 && +m[4]<60 && m[1]+m[2]<m[3]+m[4]);
};
export function emptyJourney() {
 return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),deliveries:[],selected:null,planned:false,page:'home',events:[]};
}
export function validateData(v) {
 const goodJourney=j=>j&&typeof j.id==='string'&&Array.isArray(j.events)&&Array.isArray(j.deliveries)&&j.deliveries.length<=100&&new Set(j.deliveries.map(d=>String(d.id))).size===j.deliveries.length&&j.deliveries.every(d=>(typeof d.id==='string'||Number.isSafeInteger(d.id))&&['name','address','package','window','type'].every(k=>typeof d[k]==='string')&&d.name.trim()&&d.name.length<=80&&d.address.trim()&&d.address.length<=160&&d.package.trim()&&d.package.length<=20&&validWindow(d.window)&&['pending','done','failed'].includes(d.status)&&['Residência','Comércio'].includes(d.type)&&(!d.priority||['normal','high'].includes(d.priority)));
 if(v.version!==2||!Number.isSafeInteger(v.revision)||v.revision<0||!['demo','work'].includes(v.mode)||!goodJourney(v.demo)||!goodJourney(v.work)||!Array.isArray(v.history)||v.history.some(h=>!goodJourney(h)||!['demo','work'].includes(h.mode)))throw Error('Dados inválidos.');
}
export function loadData(initial) {
 const demo = {...emptyJourney(),deliveries:structuredClone(initial),selected:1};
 const fresh = {version:2,revision:0,mode:'demo',demo,work:emptyJourney(),history:[],mapConsent:false,onboarded:false};
 try {
  const raw=localStorage.getItem(STORE_KEY);
  if(raw){const data=JSON.parse(raw);validateData(data);return {data};}
  const legacy=localStorage.getItem('girovia-demo-v1');
  if(legacy){const previous=JSON.parse(legacy);if(!Array.isArray(previous.deliveries))throw Error();fresh.demo={...demo,...previous,page:'home',events:[]};}
  validateData(fresh);return {data:fresh};
 }catch{return {data:fresh,error:'Não foi possível ler os dados salvos. Eles não foram sobrescritos. Exporte os dados originais em Ajuda antes de tentar recuperar.'};}
}
// A single write commits the whole journey. Callers roll back memory if this fails.
export function saveData(data) {
 const current=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
 if(current && current.revision!==data.revision)throw Error('Outra aba alterou a jornada. Recarregue esta página antes de continuar.');
 const next={...data,revision:data.revision+1};
 localStorage.setItem(STORE_KEY,JSON.stringify(next));
 data.revision=next.revision;
}
export function windowAlert(delivery, date=new Date()) {
 if(delivery.status!=='pending'||!validWindow(delivery.window))return '';
 const [,end]=delivery.window.split(/[–-]/),[h,m]=end.split(':').map(Number);
 const delta=h*60+m-date.getHours()*60-date.getMinutes();
 return delta<0?'Janela encerrada hoje':delta<=60?`Recebimento termina em ${delta} min`:'';
}
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function duplicateOf(row,other){return normalized(row.package)===normalized(other.package)||(normalized(row.name)===normalized(other.name)&&normalized(row.address)===normalized(other.address));}
export function parseCSV(raw,existing=[]) {
 if(raw.length>500000)throw Error('Arquivo muito grande. Use até 100 entregas e 500 KB.');
 const lines=raw.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 if(lines[0]?.trim()!=='nome;endereco;tipo;horario;pacote')throw Error('Use o modelo CSV: nome;endereco;tipo;horario;pacote.');
 const rows=[],errors=[];
 lines.slice(1).forEach((line,i)=>{
  if(!line.trim())return;
  const r=line.split(';').map(v=>v.trim());
  if(r.length!==5||r.some(v=>!v)||r[0]?.length>80||r[1]?.length>160||r[4]?.length>20||!['Comércio','Residência'].includes(r[2])||!validWindow(r[3])){errors.push(`Linha ${i+2}: confira campos, limites, tipo e horários.`);return;}
  const row={id:crypto.randomUUID(),name:r[0],address:r[1],type:r[2],window:r[3],package:r[4],status:'pending',priority:'normal'};
  const duplicate=[...existing,...rows].some(other=>duplicateOf(row,other));
  rows.push({...row,duplicate,line:i+2});
 });
 if(!rows.length&&!errors.length)errors.push('Nenhuma entrega no arquivo.');
 if(rows.length>100)errors.push('O limite é de 100 entregas por jornada.');
 return {rows,errors};
}
// Formula-like cells are neutralized for spreadsheet programs; all fields are quoted.
export function reportCSV(deliveries) {
 const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 return '\uFEFF'+[['destino','endereco','pacote','recebimento','resultado','motivo','registrado_em'],...deliveries.map(d=>[d.name,d.address,d.package,d.window,{done:'Entregue',failed:'Sem sucesso',pending:'Pendente'}[d.status],d.reason,d.completedAt])].map(row=>row.map(cell).join(';')).join('\r\n');
}
