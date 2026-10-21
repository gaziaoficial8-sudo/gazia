export const STORE_KEY = 'girovia-pilot-v2';
export const validWindow = value => {
 const m = /^(\d{2}):(\d{2})[–-](\d{2}):(\d{2})$/.exec(value);
 return Boolean(m && +m[1]<24 && +m[3]<24 && +m[2]<60 && +m[4]<60 && m[1]+m[2]<m[3]+m[4]);
};
export function emptyJourney() {
 return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),deliveries:[],selected:null,planned:false,page:'home',events:[]};
}
export function validateData(v) {
 const goodJourney=j=>j&&typeof j.id==='string'&&Array.isArray(j.events)&&Array.isArray(j.deliveries)&&j.deliveries.length<=100&&new Set(j.deliveries.map(d=>String(d.id))).size===j.deliveries.length&&j.deliveries.every(d=>(typeof d.id==='string'||Number.isSafeInteger(d.id))&&['name','address','package'].every(k=>typeof d[k]==='string')&&d.name.trim()&&d.name.length<=80&&d.address.trim()&&d.address.length<=240&&d.package.trim()&&d.package.length<=64&&['pending','done','failed'].includes(d.status)&&(!d.priority||['normal','high'].includes(d.priority))&&(!d.point||(Array.isArray(d.point)&&d.point.length===2&&d.point.every(Number.isFinite)&&Math.abs(d.point[0])<=180&&Math.abs(d.point[1])<=90)));
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
export const normalized=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function duplicateOf(row,other){return normalized(row.package)===normalized(other.package);}
export function groupStops(deliveries){const groups=new Map();for(const d of deliveries){const key=normalized(d.address);if(!groups.has(key))groups.set(key,{id:String(d.id),address:d.address,deliveries:[]});groups.get(key).deliveries.push(d);}return [...groups.values()].map(g=>({...g,point:g.deliveries.every(d=>d.point&&JSON.stringify(d.point)===JSON.stringify(g.deliveries[0].point))?g.deliveries[0].point:null}));}
function csvRows(text,separator){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}if(quoted)throw Error('Aspas sem fechamento na lista.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;}
export function parseCSV(raw,existing=[]) {
 if(raw.length>500000)throw Error('Arquivo muito grande. Use até 100 entregas e 500 KB.');
 raw=raw.replace(/^\uFEFF/,'').trim();
 const first=raw.split(/\r?\n/)[0]||'',separator=first.includes('\t')?'\t':first.includes(';')?';':',';
 const lines=csvRows(raw,separator),headers=(lines.shift()||[]).map(normalized);
 const index=names=>headers.findIndex(h=>names.includes(h));
 const addressIndex=index(['endereco','endereço','address']),nameIndex=index(['nome','destinatario','destino','name']),packageIndex=index(['pacote','codigo','rastreio','tracking','package']);
 if(addressIndex<0)throw Error('Use o modelo CSV com as colunas nome;endereco;pacote. Você também pode colar uma lista de endereços.');
 const rows=[],errors=[];
 lines.forEach((r,i)=>{
  const extras=['complemento','bairro','cidade','uf','cep'].map(k=>{const n=index([k]);return n<0?'':r[n];}).filter(Boolean);
  const address=[r[addressIndex],...extras].filter(Boolean).join(', '),pkg=r[packageIndex]||`P${String(existing.length+i+1).padStart(3,'0')}`,name=r[nameIndex]||pkg;
  if(r.length!==headers.length||!address||name.length>80||address.length>240||pkg.length>64){errors.push(`Linha ${i+2}: confira endereço, colunas e tamanho dos campos.`);return;}
  const row={id:crypto.randomUUID(),name,address,package:pkg,status:'pending',priority:'normal',source:'list'};
  const duplicate=[...existing,...rows].some(other=>duplicateOf(row,other));
  rows.push({...row,duplicate,line:i+2});
 });
 if(!rows.length&&!errors.length)errors.push('Nenhuma entrega no arquivo.');
 if(rows.length>100)errors.push('O limite é de 100 entregas por jornada.');
 return {rows,errors};
}
export function parsePastedList(raw,existing=[]){
 if(raw.length>500000)throw Error('Lista muito grande.');
 if(/^(?:[^\n]*[;\t,])?[^\n]*(?:endereco|endereço|address)/i.test(raw.split(/\r?\n/)[0]||''))return parseCSV(raw,existing);
 const lines=raw.trim().split(/\r?\n/).filter(l=>l.trim());
 return parseCSV('endereco\n'+lines.map(l=>'"'+l.trim().replaceAll('"','""')+'"').join('\n'),existing);
}
// Formula-like cells are neutralized for spreadsheet programs; all fields are quoted.
export function reportCSV(deliveries) {
 const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 return '\uFEFF'+[['destino','endereco','pacote','resultado','motivo','registrado_em'],...deliveries.map(d=>[d.name,d.address,d.package,{done:'Entregue',failed:'Sem sucesso',pending:'Pendente'}[d.status],d.reason,d.completedAt])].map(row=>row.map(cell).join(';')).join('\r\n');
}
