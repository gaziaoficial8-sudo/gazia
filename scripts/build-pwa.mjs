import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});const nested=await Promise.all(entries.map(e=>e.isDirectory()?files(`${dir}/${e.name}`):`${dir}/${e.name}`));return nested.flat();}
const assets=(await files('dist')).filter(f=>!f.endsWith('/sw.js')).sort();
const hash=createHash('sha256');for(const f of assets)hash.update(await readFile(f));
const version=hash.digest('hex').slice(0,16);
const urls=assets.map(f=>'/'+f.slice(5));
const worker=`const CACHE='girovia-shell-${version}';
const SHELL=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
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
 if(event.request.mode==='navigate'){
  // Serve matching HTML and hashed assets from one release. An update waits for consent.
  event.respondWith(caches.open(CACHE).then(cache=>cache.match('/index.html')).then(cached=>cached||fetch(event.request)));return;
 }
 if(SHELL.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(event.request)));
});
`;
await writeFile('dist/sw.js',worker);
console.log(`PWA ${version}: ${urls.length} interface files; no map caching.`);
