import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
let activeMap;
let cartographyUnavailable=false;
const franca = [-20.5386, -47.4009];
// Sample locations illustrate the workflow; they are not geocoded addresses.
const locations = [[-20.532,-47.402],[-20.536,-47.396],[-20.545,-47.390],[-20.548,-47.406],[-20.539,-47.412]];
export function disposeMap(){activeMap?.remove();activeMap=null;}
export function mapMarkup(demo=true){return `<div class="embedded-map"><div id="journey-map" aria-label="Mapa interativo de Franca${demo?' com posições fictícias das entregas':''}"></div><div class="map-disclaimer">${demo?'Posições de exemplo · não usar para dirigir':'Endereços com localização não confirmada'}</div><p id="map-network" class="map-network" role="status" hidden>Mapa de ruas indisponível: o provedor pode ter bloqueado o acesso ou a conexão falhou. A lista de entregas continua funcionando.</p></div>`;}
export function mountMap(deliveries,selected,onSelect,{demo=true,geometry=null,attribution=false}={}){
 const el=document.getElementById('journey-map');if(!el)return;
 activeMap=L.map(el,{scrollWheelZoom:false}).setView(franca,14);
 // Send the real website origin; never spoof another application's Referer.
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  referrerPolicy:'strict-origin-when-cross-origin',
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
 });
 function showUnavailable(){
  const warning=document.getElementById('map-network');if(warning)warning.hidden=false;
  el.classList.add('cartography-unavailable');
 }
 tiles.on('tileerror',()=>{
  if(cartographyUnavailable)return;
  cartographyUnavailable=true;
  // Stop fetching rather than retrying a blocked provider after every delivery.
  if(activeMap?.hasLayer(tiles))activeMap.removeLayer(tiles);
  showUnavailable();
 });
 if(cartographyUnavailable||!navigator.onLine)showUnavailable();else tiles.addTo(activeMap);
 // Attribution remains visible even after removing a rejected layer.
 activeMap.attributionControl.addAttribution(tiles.options.attribution);
 if(attribution)activeMap.attributionControl.addAttribution('<a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>');
 if(geometry)L.geoJSON({type:'Feature',properties:{},geometry},{style:{color:'#174b3f',weight:5,opacity:.8}}).addTo(activeMap);
 const points=[];
 for(const [i,d] of deliveries.entries()){
  const point=d.point?[d.point[1],d.point[0]]:demo?locations[d.id-1]:null;if(!point)continue;
  points.push(point);
  const label=d.status==='done'?'✓':d.status==='failed'?'!':String(i+1);
  const icon=L.divIcon({className:`delivery-marker ${d.status} ${d.id===selected?'selected':''}`,html:`<span>${label}</span>`,iconSize:[48,48],iconAnchor:[24,24]});
  const marker=L.marker(point,{icon,keyboard:true,title:`Parada ${i+1}: ${d.name}`,alt:`Selecionar ${d.name}`}).addTo(activeMap);
  const tooltip=document.createElement('span');tooltip.textContent=d.name+(d.point?' · ponto confirmado':' · posição fictícia');marker.bindTooltip(tooltip);
  marker.on('click',()=>onSelect(d.id));
 }
 // No line is drawn: a straight line would not be a navigable road route.
 if(points.length)activeMap.fitBounds(L.latLngBounds(points),{padding:[42,42],maxZoom:14});
 const chosen=deliveries.find(d=>d.id===selected),current=chosen?.point?[chosen.point[1],chosen.point[0]]:demo?locations[selected-1]:null;if(current)activeMap.setView(current,14,{animate:false});
 requestAnimationFrame(()=>activeMap?.invalidateSize());
}
export function locateDriver(coords){
 if(!activeMap)return;
 L.circle([coords.latitude,coords.longitude],{radius:coords.accuracy,color:coords.accuracy>100?'#a76b27':'#174b3f',fillOpacity:.12}).addTo(activeMap).bindTooltip(`Você · precisão ±${Math.round(coords.accuracy)} m`);
 activeMap.setView([coords.latitude,coords.longitude],15);
}
