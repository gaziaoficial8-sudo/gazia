import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});const nested=await Promise.all(entries.map(e=>e.isDirectory()?files(`${dir}/${e.name}`):`${dir}/${e.name}`));return nested.flat();}
const assets=(await files('dist')).filter(f=>!f.endsWith('/sw.js')).sort();
const hash=createHash('sha256').update('normalized-navigation-v2');for(const f of assets)hash.update(await readFile(f));
const version=hash.digest('hex').slice(0,16);
const urls=assets.filter(f=>!f.startsWith('dist/ocr/')).map(f=>'/'+f.slice(5));
const optional=assets.filter(f=>f.startsWith('dist/ocr/')).map(f=>'/'+f.slice(5));
const worker=`const CACHE='girovia-shell-${version}';
const SHELL=${JSON.stringify(urls)};
const OCR=${JSON.stringify(optional)};
// Redirect metadata cannot be returned for Safari navigation requests.
async function safeResponse(response){
 if(!response.ok||response.type==='opaque'||(response.url&&new URL(response.url).origin!==self.location.origin))throw new Error('Invalid shell response');
 if(!response.redirected)return response;
 const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');
 return new Response(await response.arrayBuffer(),{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 let broken=false;
 for(const key of await caches.keys())if(key.startsWith('girovia-shell-')&&key!==CACHE){const old=await (await caches.open(key)).match('/index.html');if(old?.redirected)broken=true;}
 const cache=await caches.open(CACHE);
 // Fetch the canonical HTML URL while retaining its stable offline cache key.
 await Promise.all(SHELL.map(async path=>{const response=await fetch(path==='/index.html'?'/':path,{cache:'reload'});await cache.put(path,await safeResponse(response));}));
 // Repair unusable legacy caches without reloading open forms or touching delivery data.
 if(broken)await self.skipWaiting();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Keep previous versioned assets for tabs that still run the previous code.
 // They are removed only on a later fresh activation when no old tab exists.
 const clients=await self.clients.matchAll({type:'window'});
 if(!clients.length){for(const key of await caches.keys())if(key.startsWith('girovia-shell-')&&key!==CACHE)await caches.delete(key);}
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // No third-party caching, map downloads, API responses or user-data caches.
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
  // Serve matching HTML and hashed assets from one release. An update waits for consent.
  event.respondWith(caches.open(CACHE).then(cache=>cache.match('/index.html')).then(cached=>cached?safeResponse(cached):fetch(event.request)));return;
 }
 if(OCR.includes(url.pathname)){event.respondWith(caches.open(CACHE).then(async cache=>{const found=await cache.match(url.pathname);if(found)return found;const response=await fetch(event.request);if(response.ok)await cache.put(url.pathname,response.clone());return response;}));return;}
 if(SHELL.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(event.request)));
});
`;
await writeFile('dist/sw.js',worker);
console.log(`PWA ${version}: ${urls.length} interface files; no map caching.`);
