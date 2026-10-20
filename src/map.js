import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
let activeMap;
const franca = [-20.5386, -47.4009];
// Sample locations illustrate the workflow; they are not geocoded addresses.
const locations = [[-20.532,-47.402],[-20.536,-47.396],[-20.545,-47.390],[-20.548,-47.406],[-20.539,-47.412]];
export function disposeMap(){activeMap?.remove();activeMap=null;}
export function mapMarkup(){return `<div class="embedded-map"><div id="journey-map" aria-label="Mapa interativo de Franca com posições fictícias das entregas"></div><div class="map-disclaimer">Posições de exemplo · não usar para dirigir</div><p id="map-network" class="map-network" role="status" hidden>O mapa de ruas não carregou. Verifique a conexão. As paradas continuam disponíveis.</p></div>`;}
export function mountMap(deliveries,selected,onSelect){
 const el=document.getElementById('journey-map');if(!el)return;
 activeMap=L.map(el,{scrollWheelZoom:false}).setView(franca,14);
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(activeMap);
 const failed=new Set();
 function networkStatus(){const warning=document.getElementById('map-network');if(warning)warning.hidden=!failed.size;}
 tiles.on('tileerror',e=>{failed.add(e.tile.src);networkStatus();});
 tiles.on('tileload',e=>{failed.delete(e.tile.src);networkStatus();});
 const points=[];
 for(const [i,d] of deliveries.entries()){
  const point=locations[d.id-1];if(!point)continue;
  points.push(point);
  const label=d.status==='done'?'✓':d.status==='failed'?'!':String(i+1);
  const icon=L.divIcon({className:`delivery-marker ${d.status} ${d.id===selected?'selected':''}`,html:`<span>${label}</span>`,iconSize:[34,34],iconAnchor:[17,17]});
  const marker=L.marker(point,{icon,keyboard:true,title:`Parada ${i+1}: ${d.name}`,alt:`Selecionar ${d.name}`}).addTo(activeMap);
  const tooltip=document.createElement('span');tooltip.textContent=d.name+' · posição fictícia';marker.bindTooltip(tooltip);
  marker.on('click',()=>onSelect(d.id));
 }
 // No line is drawn: a straight line would not be a navigable road route.
 if(points.length)activeMap.fitBounds(L.latLngBounds(points),{padding:[42,42],maxZoom:14});
 const current=locations[selected-1];if(current)activeMap.setView(current,14,{animate:false});
 requestAnimationFrame(()=>activeMap?.invalidateSize());
}
