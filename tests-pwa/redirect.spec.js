import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';

test('repairs redirected legacy HTML and preserves records without reloading a draft',async({page,context})=>{
 const fixed=await readFile('dist/sw.js','utf8');let legacy=true;
 const old=`const CACHE='girovia-shell-legacy';self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/index.html']))));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(caches.open(CACHE).then(c=>c.match('/index.html')));});`;
 const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm'};
 const server=createServer(async(req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/index.html'){res.writeHead(302,{Location:'/'});res.end();return;}
  if(path==='/sw.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(legacy?old:fixed);return;}
  const file=resolve('dist','.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(resolve('dist')+'/')&&!file.startsWith(resolve('dist')+'\\'))throw new Error('path');
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 try{
  await page.goto(url);await page.getByRole('button',{name:'Entendi, começar'}).click();await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  expect(await page.evaluate(async()=> (await (await caches.open('girovia-shell-legacy')).match('/index.html')).redirected)).toBe(true);
  await page.getByRole('navigation').getByRole('button',{name:'Jornada',exact:true}).click();await page.getByRole('button',{name:'Marcar entregue'}).click();
  await page.getByRole('navigation').getByRole('button',{name:'Entregas',exact:true}).click();await page.getByRole('button',{name:'Nova entrega'}).click();await page.getByLabel('Nome do destino').fill('Rascunho mantido');
  legacy=false;
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await new Promise(async(resolve,reject)=>{navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});try{await r.update();}catch(e){reject(e);}});});
  await expect(page.getByLabel('Nome do destino')).toHaveValue('Rascunho mantido');
  await page.reload();await expect(page.getByRole('heading',{name:'Como você recebeu os endereços?'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('girovia-pilot-v2')).demo.deliveries[0].status)).toBe('done');
  const flags=await page.evaluate(async()=>{const keys=(await caches.keys()).filter(k=>k!=='girovia-shell-legacy');return Promise.all(keys.map(async k=>(await (await caches.open(k)).match('/index.html')).redirected));});expect(flags).toEqual([false]);
  await context.setOffline(true);await page.reload();await expect(page.locator('.connection')).toContainText('Sem conexão');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
