import {groupStops} from './pilot-data.js';
export const routingKey=()=>import.meta.env.VITE_GEOAPIFY_API_KEY||'';
async function request(url,options={}){if(!navigator.onLine)throw Error('Conecte-se à internet para buscar endereços ou organizar a rota.');let response;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);options.signal?.addEventListener('abort',()=>controller.abort(),{once:true});try{response=await fetch(url,{...options,signal:controller.signal,referrerPolicy:'strict-origin-when-cross-origin'});if(!response.ok)throw Error(response.status===429?'Limite do provedor atingido. Aguarde e confira sua cota.':response.status===401||response.status===403?'O provedor recusou a chave ou a origem. Confira a configuração.':'O serviço de rotas está indisponível. Tente novamente quando houver conexão.');return await response.json();}catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('Não consegui acessar o serviço de rotas. Os registros foram preservados.');throw error;}finally{clearTimeout(timer);}}
function key(){const value=routingKey();if(!value)throw Error('Falta configurar a chave pública Geoapify para ativar endereços e rotas reais.');return value;}
export async function findAddress(address,signal){const url=new URL('https://api.geoapify.com/v1/geocode/search');url.search=new URLSearchParams({text:address,format:'json',lang:'pt',filter:'countrycode:br',limit:'3',apiKey:key()});const result=await request(url,{signal});return (result.results||[]).filter(r=>Number.isFinite(r.lon)&&Number.isFinite(r.lat)).map(r=>({point:[r.lon,r.lat],address:r.formatted||address,confidence:r.rank?.confidence||0,level:r.result_type||''}));}
export async function organizeRoute(deliveries,settings){
 const token=key(),pending=deliveries.filter(d=>d.status==='pending'),groups=groupStops(pending);
 if(!groups.length)throw Error('Adicione entregas pendentes para organizar a rota.');
 if(groups.some(g=>!g.point)||!settings.startPoint)throw Error('Confirme os endereços e o local de saída antes de organizar a rota.');
 const agent={start_location:settings.startPoint};if(settings.returnToStart)agent.end_location=settings.startPoint;
 const result=await request('https://api.geoapify.com/v1/routeplanner?apiKey='+encodeURIComponent(token),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'drive',agents:[agent],jobs:groups.map(g=>({id:g.id,location:g.point,duration:0}))})});
 const feature=result.features?.find(f=>f.properties?.agent_index===0)||result.features?.[0];
 const actions=feature?.properties?.actions||[],order=[];
 for(const a of actions){const group=a.job_id!==undefined?groups.find(g=>g.id===String(a.job_id)):Number.isInteger(a.job_index)?groups[a.job_index]:null;if(group&&!order.includes(group))order.push(group);}
 if(order.length!==groups.length)throw Error('O provedor não incluiu todas as paradas. Nenhuma entrega foi removida ou reordenada. Confira os endereços.');
 const orderedIds=order.flatMap(g=>g.deliveries.map(d=>d.id)),points=[settings.startPoint,...order.map(g=>g.point),...(settings.returnToStart?[settings.startPoint]:[])];
 // Planner geometry may be straight segments. Only Routing API geometry may be drawn.
 let geometry=null,geometryWarning='';
 try{const url=new URL('https://api.geoapify.com/v1/routing');url.search=new URLSearchParams({waypoints:points.map(p=>p[1]+','+p[0]).join('|'),mode:'drive',apiKey:token});const road=await request(url);const candidate=road.features?.[0]?.geometry;if(['LineString','MultiLineString'].includes(candidate?.type))geometry=candidate;else geometryWarning='Traçado de ruas indisponível; sequência calculada preservada.';}catch{geometryWarning='Traçado de ruas indisponível; sequência calculada preservada.';}
 return {orderedIds,geometry,geometryWarning,distance:feature.properties.distance,time:feature.properties.time,calculatedAt:new Date().toISOString(),provider:'Geoapify',returnToStart:Boolean(settings.returnToStart)};
}
