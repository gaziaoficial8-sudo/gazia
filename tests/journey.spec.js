import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const key='girovia-pilot-v2',csv='nome;endereco;tipo;horario;pacote\n';
async function open(page){await page.goto('/');await page.getByRole('button',{name:'Entendi, começar'}).click();}
const nav=(p,n)=>p.getByRole('navigation',{name:'Menu principal'}).getByRole('button',{name:n,exact:true});
async function upload(p,body){await p.locator('#csv-file').setInputFiles({name:'test.csv',mimeType:'text/csv',buffer:Buffer.from(body)});}
const confirm=p=>p.getByRole('button',{name:'Confirmar',exact:true}).click();
test.beforeEach(async({page})=>page.route('**/tile.openstreetmap.org/**',r=>r.abort()));

test('registration without type or hours, editing and persisted progress',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await page.screenshot({path:info.outputPath('home.png'),fullPage:true});
 await nav(page,'Entregas').click();await expect(page.locator('.delivery-card')).toHaveCount(5);
 await page.getByRole('button',{name:'Nova entrega'}).click();
 await expect(page.locator('[name=type],[name=from],[name=until]')).toHaveCount(0);
 await page.getByLabel('Nome do destino').fill('Loja de teste');await page.getByLabel('Endereço completo').fill('Rua Exemplo, 100');await page.getByLabel('Pacote',{exact:true}).fill('A01');await page.getByRole('button',{name:'Adicionar entrega'}).click();await expect(page.locator('#form-error')).toContainText('duplicata');await expect(page.getByLabel('Nome do destino')).toHaveValue('Loja de teste');
 await page.getByLabel('Pacote',{exact:true}).fill('B01');await page.getByRole('button',{name:'Adicionar entrega'}).click();await expect(page.locator('.delivery-card')).toHaveCount(6);
 await page.getByRole('button',{name:'Editar Loja de teste',exact:true}).click();await page.getByLabel('Endereço completo').fill('Rua Corrigida, 200');await page.getByRole('button',{name:'Salvar entrega',exact:true}).click();await expect(page.locator('.delivery-card').filter({hasText:'Loja de teste'})).toContainText('Rua Corrigida, 200');
 await page.getByRole('button',{name:'Conferir endereços'}).click();await page.getByRole('button',{name:'Usar sequência manual'}).click();await page.getByRole('button',{name:'Marcar entregue'}).click();await page.reload();await expect(page.locator('.current-stop h2')).toHaveText('Marina Oliveira');
 await nav(page,'Resumo').click();await expect(page.getByText('1 de 6 entregas concluídas.',{exact:false})).toBeVisible();expect(errors).toEqual([]);
});

test('CSV preview validates rows, flags duplicates and escapes markup',async({page})=>{
 await open(page);await nav(page,'Entregas').click();await upload(page,'nome,codigo\nfoo,bar');await expect(page.locator('.toast')).toContainText('Use o modelo CSV');
 await upload(page,'nome;endereco;pacote\nLoja;;B01');await expect(page.getByRole('dialog')).toContainText('Linha 2');await expect(page.getByRole('button',{name:'Confirmar importação'})).toBeDisabled();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await upload(page,csv+'<img src=x onerror=alert(1)>;Rua Teste 20;Comércio;09:00–17:00;B01\nDuplicata;Rua D;Residência;09:00–18:00;A01');await expect(page.locator('.delivery-card')).toHaveCount(5);await expect(page.getByRole('dialog')).toContainText('Possível duplicata');await page.getByRole('button',{name:'Confirmar importação'}).click();await expect(page.locator('.delivery-card')).toHaveCount(6);await expect(page.locator('.delivery-card img')).toHaveCount(0);await expect(page.getByText('<img src=x onerror=alert(1)>',{exact:true})).toBeVisible();
});

test('mixed results, reasons, retry, correction and repeated tap',async({page})=>{
 await open(page);await nav(page,'Jornada').click();await page.locator('[data-done]').evaluate(b=>{b.click();b.click();});
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).demo.events.length,key)).toBe(1);
 await page.getByRole('button',{name:'Não consegui entregar',exact:true}).click();await page.getByLabel('Motivo',{exact:true}).selectOption('Estabelecimento fechado');await page.getByRole('button',{name:'Salvar tentativa e avançar'}).click();await page.reload();
 for(const name of ['Ateliê dos Calçados','Rafael Santos','Café da Esquina']){await expect(page.locator('.current-stop h2')).toHaveText(name);await page.getByRole('button',{name:'Marcar entregue'}).click();}
 await expect(page.getByRole('heading',{name:'Todas as paradas foram visitadas.'})).toBeVisible();await expect(page.getByText('4 de 5 entregas concluídas.',{exact:false})).toBeVisible();
 const row=page.locator('.history-row').filter({hasText:'Marina Oliveira'});await expect(row).toContainText('Estabelecimento fechado');await row.getByRole('button',{name:'Tentar novamente'}).click();await confirm(page);await page.getByRole('button',{name:'Marcar entregue'}).click();await expect(page.getByRole('heading',{name:'Jornada concluída. Bom descanso!'})).toBeVisible();
 await page.locator('.history-row').filter({hasText:'Papelaria Horizonte'}).getByRole('button',{name:'Corrigir resultado'}).click();await confirm(page);await expect(page.locator('.current-stop h2')).toHaveText('Papelaria Horizonte');
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).demo.events.filter(e=>e.deliveryId===1).map(e=>e.to),key)).toEqual(['done','pending']);
});

test('storage failure rolls back and keeps the current stop',async({page})=>{
 await open(page);await nav(page,'Jornada').click();await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError');};});await page.getByRole('button',{name:'Marcar entregue'}).click();await expect(page.locator('.toast')).toContainText('Nenhuma alteração foi confirmada');await expect(page.locator('.current-stop h2')).toHaveText('Papelaria Horizonte');expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).demo.deliveries[0].status,key)).toBe('pending');
});

test('manual order, confirmation and mode separation',async({page})=>{
 await open(page);await nav(page,'Entregas').click();await page.getByRole('button',{name:'Subir Marina Oliveira',exact:true}).click();await expect(page.locator('.delivery-card h3').first()).toHaveText('Marina Oliveira');
 await page.getByRole('button',{name:'Excluir Café da Esquina',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.locator('.delivery-card')).toHaveCount(5);
 await page.getByRole('button',{name:'Excluir Café da Esquina',exact:true}).click();await confirm(page);await expect(page.locator('.delivery-card')).toHaveCount(4);
 await page.getByRole('button',{name:'Usar minha jornada',exact:true}).click();await nav(page,'Entregas').click();await expect(page.locator('.delivery-card')).toHaveCount(0);await upload(page,csv+'Loja própria;Rua Teste;Comércio;09:00–17:00;X01');await page.getByRole('button',{name:'Confirmar importação'}).click();
 await nav(page,'Resumo').click();await page.getByRole('button',{name:'Arquivar e começar outra'}).click();await confirm(page);await nav(page,'Resumo').click();const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();expect((await dl).suggestedFilename()).toBe('girovia-historico.csv');
 await page.getByRole('button',{name:'Ver demonstração',exact:true}).click();await nav(page,'Entregas').click();await expect(page.locator('.delivery-card')).toHaveCount(4);
});

test('consent required, simulated 403 halts requests, attribution persists',async({page})=>{
 let calls=0;await page.route('**/tile.openstreetmap.org/**',async r=>{calls++;await r.fulfill({status:403,body:'Blocked'});});await open(page);expect(calls).toBe(0);await nav(page,'Jornada').click();expect(calls).toBe(0);await page.getByRole('button',{name:'Carregar mapa de ruas'}).click();await expect(page.locator('#map-network')).toBeVisible();await expect(page.locator('.leaflet-tile')).toHaveCount(0);const before=calls;await page.getByRole('button',{name:'Marcar entregue'}).click();expect(calls).toBe(before);await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
});

test('simulated map uses true origin and explicit referrer policy',async({page})=>{
 const requests=[],png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6N9sAAAAASUVORK5CYII=','base64');await page.route('**/tile.openstreetmap.org/**',async r=>{requests.push(r.request());await r.fulfill({status:200,contentType:'image/png',body:png});});await open(page);await nav(page,'Jornada').click();await page.getByRole('button',{name:'Carregar mapa de ruas'}).click();await expect.poll(()=>requests.length).toBeGreaterThan(0);await expect(page.locator('.leaflet-tile').first()).toHaveAttribute('referrerpolicy','strict-origin-when-cross-origin');expect(requests[0].headers().referer).toBe('http://127.0.0.1:5173/');await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
});

test('location denied and low precision are handled without blocking deliveries',async({page})=>{
 await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=(_ok,fail)=>fail({code:1});});await open(page);await nav(page,'Jornada').click();await page.getByRole('button',{name:'Usar minha localização'}).click();await expect(page.locator('#location-status')).toContainText('Permissão de localização negada');await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=ok=>ok({coords:{latitude:-20.53,longitude:-47.4,accuracy:500}});});await page.getByRole('button',{name:'Usar minha localização'}).click();await expect(page.locator('#location-status')).toContainText('baixa precisão');
});

test('legacy migration and corrupt data protection',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('girovia-demo-v1',JSON.stringify({deliveries:[{id:88,name:'Legado',address:'Rua Antiga',package:'L01',type:'Comércio',window:'09:00–18:00',status:'pending'}],selected:88,planned:true})));await open(page);await nav(page,'Jornada').click();await expect(page.locator('.current-stop h2')).toHaveText('Legado');expect(await page.evaluate(()=>Boolean(localStorage.getItem('girovia-demo-v1')))).toBe(true);await page.evaluate(k=>localStorage.setItem(k,'broken JSON'),key);await page.reload();await expect(page.getByRole('alert')).toContainText('não foram sobrescritos');expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe('broken JSON');
});

test('all screens fit width and primary controls have touch size',async({page},info)=>{
 await open(page);for(const name of ['Entregas','Conferência','Jornada','Resumo','Início']){await nav(page,name).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(info.project.name!=='desktop')await expect(page.getByRole('navigation')).toBeInViewport();}
 await nav(page,'Jornada').click();expect((await page.getByRole('button',{name:'Marcar entregue'}).boundingBox()).height).toBeGreaterThanOrEqual(48);await page.screenshot({path:info.outputPath('journey.png'),fullPage:true});
});

test('backup downloads and restores data after explicit confirmation',async({page})=>{
 await open(page);await nav(page,'Jornada').click();await page.getByRole('button',{name:'Marcar entregue'}).click();await page.getByRole('button',{name:'Ajuda e instalação',exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar backup JSON',exact:true}).click();const download=await pending,raw=await readFile(await download.path());expect(JSON.parse(raw).demo.deliveries[0].status).toBe('done');
 await page.getByRole('button',{name:'Reiniciar demonstração',exact:true}).click();await confirm(page);await page.getByRole('button',{name:'Ajuda e instalação',exact:true}).click();await page.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:raw});await expect(page.getByRole('dialog')).toContainText('Restaurar este backup?');await confirm(page);await nav(page,'Resumo').click();await expect(page.getByText('1 de 5 entregas concluídas.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Ajuda e instalação',exact:true}).click();await page.locator('#backup-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":2}')});await expect(page.locator('.toast')).toContainText('Backup inválido');
});
