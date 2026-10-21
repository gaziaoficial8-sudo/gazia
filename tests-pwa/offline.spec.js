import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const key='girovia-pilot-v2';
async function ready(page){await page.goto('/');await page.getByRole('button',{name:'Entendi, começar'}).click();await expect(page.locator('.offline-ready')).toContainText('Interface pronta');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();}
const nav=(page,name)=>page.getByRole('navigation').getByRole('button',{name,exact:true});
test('production manifest and offline reload preserve registrations',async({page,context})=>{
 await ready(page);const manifest=await (await page.request.get('/manifest.webmanifest')).json();expect(manifest.short_name).toBe('Entreguei');expect(manifest.display).toBe('standalone');expect(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable')).toBe(true);
 await nav(page,'Jornada').click();await page.getByRole('button',{name:'Marcar entregue'}).click();await context.setOffline(true);await page.reload();await expect(page.locator('.connection')).toContainText('Sem conexão');await expect(page.locator('.current-stop h2')).toHaveText('Marina Oliveira');
 await page.getByRole('button',{name:'Não consegui entregar',exact:true}).click();await page.getByRole('button',{name:'Salvar tentativa e avançar'}).click();await page.reload();await expect(page.locator('.current-stop h2')).toHaveText('Ateliê dos Calçados');
 const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);expect(saved.demo.deliveries[0].status).toBe('done');expect(saved.demo.deliveries[1].status).toBe('failed');
 const urls=await page.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('girovia-shell-')));return (await cache.keys()).map(r=>r.url);});expect(urls.every(url=>url.startsWith('http://127.0.0.1:4173/'))).toBe(true);expect(urls.some(url=>url.includes('tile.openstreetmap'))).toBe(false);
});

test('OCR assets loaded online remain available for a new offline reading',async({page,context})=>{
 test.setTimeout(120000);await ready(page);await page.getByRole('button',{name:'Não tenho lista'}).click();await page.locator('#label-photo').setInputFiles('tests/fixtures/etiqueta.png');await expect(page.locator('#label-form')).toBeVisible({timeout:90000});await page.getByRole('button',{name:'Concluir leitura',exact:true}).click();
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Não tenho lista'}).click();await page.locator('#label-photo').setInputFiles('tests/fixtures/etiqueta.png');await expect(page.locator('#label-form')).toBeVisible({timeout:90000});await expect(page.getByLabel('Endereço completo')).toHaveValue(/Rua das Flores/i);
});

test('waiting service worker updates only on request, keeping form and journey',async({page})=>{
 const original=await readFile('dist/sw.js','utf8');
 try{
  await ready(page);await nav(page,'Jornada').click();await page.getByRole('button',{name:'Marcar entregue'}).click();await nav(page,'Entregas').click();await page.getByRole('button',{name:'Nova entrega'}).click();await page.getByLabel('Nome do destino').fill('Rascunho preservado');
  // Real worker lifecycle with a changed build revision, served by the preview server.
  await writeFile('dist/sw.js',original.replace(/girovia-shell-([a-f0-9]+)/,'girovia-shell-update-$1'));
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await expect(page.getByText('Nova versão disponível. Sua jornada será preservada.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Nome do destino')).toHaveValue('Rascunho preservado');
  await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Atualizar agora'}).click();
  await expect(page.locator('.offline-ready')).toContainText('Interface pronta');await nav(page,'Jornada').click();await expect(page.locator('.current-stop h2')).toHaveText('Marina Oliveira');
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).demo.deliveries[0].status,key)).toBe('done');
 }finally{await writeFile('dist/sw.js',original);}
});
