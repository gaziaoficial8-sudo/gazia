import {test,expect} from '@playwright/test';
test('journey, validation, registration and persistence',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Seu dia tem um bom caminho.'})).toBeVisible();
 await page.screenshot({path:`/tmp/girovia-${info.project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Preparar minhas entregas'}).click();
 await expect(page.locator('tbody tr')).toHaveCount(5);
 await page.getByRole('button',{name:'Nova entrega'}).click();
 await page.getByRole('textbox',{name:'Nome do destino'}).fill('Loja de teste');
 await page.getByRole('textbox',{name:'Endereço em Franca'}).fill('Rua Exemplo, 100 · Centro');
 await page.getByRole('textbox',{name:'Pacote',exact:true}).fill('B01');
 await page.locator('[name=from]').fill('18:00');
 await page.locator('[name=until]').fill('09:00');
 await page.getByRole('button',{name:'Adicionar entrega'}).click();
 await expect(page.getByRole('status')).toContainText('horário final');
 await expect(page.getByRole('textbox',{name:'Nome do destino'})).toHaveValue('Loja de teste');
 await page.locator('[name=from]').fill('09:00');
 await page.locator('[name=until]').fill('18:00');
 await page.getByRole('button',{name:'Adicionar entrega'}).click();
 await expect(page.locator('tbody tr')).toHaveCount(6);
 await page.getByRole('button',{name:'Conferir entregas'}).click();
 await page.getByRole('button',{name:'Ver rota de exemplo'}).click();
 await expect(page.getByText('Rota demonstrativa.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Marcar entregue'}).click();
 await page.reload();
 await page.getByRole('button',{name:'Resumo do dia'}).click();
 await expect(page.getByText('1 de 6 entregas concluídas.',{exact:false})).toBeVisible();
 expect(errors).toEqual([]);
});
test('CSV import validates input and escapes markup',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Preparar minhas entregas'}).click();
 await page.locator('#csv-file').setInputFiles({name:'wrong.csv',mimeType:'text/csv',buffer:Buffer.from('nome,endereco\nfoo,bar')});
 await expect(page.getByRole('status')).toContainText('Use o modelo CSV');
 await expect(page.locator('tbody tr')).toHaveCount(5);
 await page.locator('#csv-file').setInputFiles({name:'valid.csv',mimeType:'text/csv',buffer:Buffer.from('nome;endereco;tipo;horario;pacote\n<img src=x onerror=alert(1)>;Rua Teste 20;Comércio;09:00–17:00;B01')});
 await expect(page.locator('tbody tr')).toHaveCount(6);
 await expect(page.locator('tbody img')).toHaveCount(0);
 await expect(page.getByText('<img src=x onerror=alert(1)>',{exact:true})).toBeVisible();
});

test('embedded map and automatic progression retain failures and finish the journey',async({page})=>{
 await page.route('**/tile.openstreetmap.org/**',route=>route.abort());
 await page.goto('/');
 await page.getByRole('button',{name:'Minha rota',exact:true}).click();
 await expect(page.locator('#journey-map.leaflet-container')).toBeVisible();
 await expect(page.locator('#map-network')).toBeVisible();
 await expect(page.getByRole('link',{name:'Abrir navegação'})).toHaveCount(0);
 await expect(page.locator('.current-stop h2')).toHaveText('Papelaria Horizonte');
 await page.getByRole('button',{name:'Marcar entregue'}).click();
 await expect(page.locator('.current-stop h2')).toHaveText('Marina Oliveira');
 await page.getByRole('button',{name:'Não consegui entregar',exact:true}).click();
 await expect(page.locator('.current-stop h2')).toHaveText('Ateliê dos Calçados');
 await expect(page.locator('.stop').filter({hasText:'Marina Oliveira'})).toContainText('Sem sucesso');
 await page.reload();
 await page.getByRole('button',{name:'Minha rota',exact:true}).click();
 await expect(page.locator('.current-stop h2')).toHaveText('Ateliê dos Calçados');
 for(const name of ['Ateliê dos Calçados','Rafael Santos','Café da Esquina']){
  await expect(page.locator('.current-stop h2')).toHaveText(name);
  await page.getByRole('button',{name:'Marcar entregue'}).click();
 }
 await expect(page.getByRole('heading',{name:'Todas as paradas foram visitadas.'})).toBeVisible();
 await expect(page.getByText('4 de 5 entregas concluídas.',{exact:false})).toBeVisible();
 await expect(page.locator('.history-row').filter({hasText:'Marina Oliveira'})).toContainText('Tentativa sem sucesso');
 await page.getByRole('button',{name:'Voltar à rota'}).click();
 await page.locator('.stop').filter({hasText:'Marina Oliveira'}).click();
 await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
 await expect(page.locator('.current-stop h2')).toHaveText('Marina Oliveira');
 await page.getByRole('button',{name:'Marcar entregue'}).click();
 await expect(page.getByRole('heading',{name:'Jornada concluída. Bom descanso!'})).toBeVisible();
 await expect(page.getByText('5 de 5 entregas concluídas.',{exact:false})).toBeVisible();
});

test('map sends actual origin and applies explicit referrer policy',async({page})=>{
 const requests=[];
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6N9sAAAAASUVORK5CYII=','base64');
 await page.route('**/tile.openstreetmap.org/**',async route=>{
  requests.push(route.request());
  await route.fulfill({status:200,contentType:'image/png',body:png});
 });
 await page.goto('/');
 await expect.poll(()=>requests.length).toBeGreaterThan(0);
 await expect(page.locator('.leaflet-tile').first()).toHaveAttribute('referrerpolicy','strict-origin-when-cross-origin');
 expect(requests[0].headers().referer).toBe('http://127.0.0.1:5173/');
 await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
 await expect(page.locator('#map-network')).toBeHidden();
});

test('403 removes rejected imagery and stops automatic retries across deliveries',async({page})=>{
 let calls=0;
 await page.route('**/tile.openstreetmap.org/**',async route=>{calls++;await route.fulfill({status:403,contentType:'text/plain',body:'Access blocked'});});
 await page.goto('/');
 await expect(page.locator('#map-network')).toBeVisible();
 await expect(page.locator('.leaflet-tile')).toHaveCount(0);
 const before=calls;
 await page.getByRole('button',{name:'Minha rota',exact:true}).click();
 await page.getByRole('button',{name:'Marcar entregue'}).click();
 await expect(page.locator('.current-stop h2')).toHaveText('Marina Oliveira');
 await expect(page.locator('#map-network')).toBeVisible();
 expect(calls).toBe(before);
});
