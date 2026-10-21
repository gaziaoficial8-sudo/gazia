// Text is a suggestion, never a verified delivery address. Always require review.
export function parseLabelText(text){
 const all=text.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean);
 const destination=all.findIndex(l=>/^(destinat[aá]rio|destino|entregar (?:para|em)|recebedor)\b/i.test(l));
 let lines=destination>=0?all.slice(destination):all;
 const sender=lines.findIndex((l,i)=>i>0&&/^(remetente|origem|devolu[cç][aã]o)\b/i.test(l));if(sender>=0)lines=lines.slice(0,sender);
 const street=lines.findIndex(l=>/\b(rua|r\.|avenida|av\.|av |travessa|alameda|estrada|rodovia|pra[cç]a)\b/i.test(l));
 const address=street>=0?lines.slice(street,street+4).filter(l=>!/^(cpf|cnpj|telefone|tel|peso|pedido|rastreio|c[oó]digo)\b/i.test(l)).join(', ').slice(0,240):'';
 const name=destination>=0?(lines[0].replace(/^(destinat[aá]rio|destino|entregar (?:para|em)|recebedor)\s*[:\-]?\s*/i,'')||lines[1]||''):'';
 const code=all.join('\n').match(/(?:pacote|rastreio|c[oó]digo(?: de rastreio)?|tracking)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,63})/i)?.[1]||all.find(l=>/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(l))||'';
 return {name:name.slice(0,80),address,package:code,warnings:[destination<0?'Não identifiquei com certeza o bloco do destinatário. Confira se não é o remetente.':'',!address?'Endereço não identificado. Preencha ou fotografe novamente.':''].filter(Boolean)};
}
let worker,starting,generation=0,progressCallback=()=>{};
export async function readLabel(file,onProgress=()=>{}){
 if(!file.type.startsWith('image/')||file.size>15*1024*1024)throw Error('Use uma foto de até 15 MB (JPEG, PNG ou WebP).');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>48000000){bitmap.close();throw Error('Imagem muito grande. Tire uma foto menor.');}
 const canvas=document.createElement('canvas'),scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const current=generation;progressCallback=onProgress;
 if(!worker){starting??=import('tesseract.js').then(({createWorker})=>createWorker('por',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',workerBlobURL:false,logger:m=>{if(m.status==='recognizing text')progressCallback(Math.round(m.progress*100));}}));try{const ready=await starting;if(current!==generation){await ready.terminate();throw Error('Leitura cancelada.');}worker=ready;}catch(e){starting=null;throw e;}}
 const result=await worker.recognize(canvas);return {text:result.data.text,...parseLabelText(result.data.text),confidence:result.data.confidence};
}
export async function stopLabelReader(){generation++;const current=worker;worker=null;starting=null;await current?.terminate();}
