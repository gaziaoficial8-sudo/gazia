import {test,expect} from '@playwright/test';
import {parseLabelText} from '../src/labels.js';
import {parseCSV,groupStops} from '../src/pilot-data.js';
const nav=(p,n)=>p.getByRole('navigation').getByRole('button',{name:n,exact:true});
async function open(p){await p.goto('/');await p.getByRole('button',{name:'Entendi, começar'}).click();}
async function paste(p,text){await p.getByRole('button',{name:'Colar lista',exact:true}).click();await p.getByLabel('Lista de endereços').fill(text);await p.getByRole('button',{name:'Conferir lista',exact:true}).click();await p.getByRole('button',{name:'Confirmar importação'}).click();}
test.beforeEach(async({page})=>{await page.route('**/tile.openstreetmap.org/**',r=>r.abort());});

test('pasted lists and quoted CSV keep multiple packages at one address',async({page})=>{
 await open(page);await page.getByRole('button',{name:'Usar minha jornada',exact:true}).click();await nav(page,'Entregas').click();
 await expect(page.getByRole('button',{name:'Tenho uma lista'})).toBeVisible();await expect(page.getByRole('button',{name:'Não tenho lista'})).toBeVisible();
 await paste(page,'nome;endereco;pacote\nMaria;"Rua Teste, 100, Franca";X1\nMaria;"Rua Teste, 100, Franca";X2');await expect(page.locator('.delivery-card')).toHaveCount(2);await expect(page.locator('.section-heading').first()).toContainText('1 endereços');
 await expect(page.locator('.delivery-card')).not.toContainText(['Recebimento','Residência']);
 await paste(page,'Rua Nova, 25, Franca - SP\nAv Brasil, 50, Franca - SP');await expect(page.locator('.delivery-card')).toHaveCount(4);
 await nav(page,'Jornada').click();await page.getByRole('button',{name:'Entregar 2 pacotes deste endereço',exact:true}).click();await expect(page.locator('.current-stop h2')).toHaveText('P003');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('girovia-pilot-v2')));expect(saved.work.deliveries.filter(d=>d.status==='done')).toHaveLength(2);
 const old=parseCSV('nome;endereco;tipo;horario;pacote\nAntigo;Rua A;Comércio;qualquer;L1');expect(old.errors).toEqual([]);expect(old.rows[0].package).toBe('L1');
});

test('local OCR reads a real image and requires review before adding',async({page},info)=>{
 test.setTimeout(120000);const outbound=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173'))outbound.push(r.url());});
 await open(page);await page.getByRole('button',{name:'Não tenho lista'}).click();
 await page.locator('#label-photo').setInputFiles('tests/fixtures/etiqueta.png');await expect(page.locator('#label-form')).toBeVisible({timeout:90000});
 await expect(page.locator('.ocr-text')).toContainText(/Maria Teste/i);await expect(page.getByLabel('Endereço completo')).toHaveValue(/Rua das Flores/i);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('girovia-pilot-v2')).demo.deliveries.length)).toBe(5);
 await page.getByLabel('Código do pacote').fill('TESTE0001');await page.getByRole('button',{name:'Confirmar e ler próxima etiqueta'}).click();await expect(page.locator('.scan-counter')).toContainText('1 etiqueta');
 await page.locator('#label-photo').setInputFiles('tests/fixtures/etiqueta.png');await expect(page.locator('#label-form')).toBeVisible({timeout:90000});await page.getByLabel('Código do pacote').fill('TESTE0001');await page.getByRole('button',{name:'Confirmar e ler próxima etiqueta'}).click();await expect(page.locator('#label-error')).toContainText('já está na lista');
 await page.screenshot({path:info.outputPath('label-review.png'),fullPage:true});expect(outbound).toEqual([]);
 const saved=await page.evaluate(()=>localStorage.getItem('girovia-pilot-v2'));expect(saved).not.toContain('data:image');expect(saved).not.toContain('blob:');
 const parsed=parseLabelText('REMETENTE\nRua Errada 999\nDESTINATARIO: Fulana\nRua Certa 123\nFranca SP\nPacote: ABC12345');expect(parsed.address).toContain('Rua Certa');expect(parsed.address).not.toContain('Errada');
});

test('provider contract: consent, address confirmation, grouping and road route',async({page})=>{
 const geocodes=[],plans=[];
 await page.route('https://api.geoapify.com/v1/geocode/search?**',async r=>{const text=new URL(r.request().url()).searchParams.get('text');geocodes.push(text);await r.fulfill({json:{results:[{formatted:text,lon:text.includes('Nova')?-47.39:-47.4,lat:-20.53,rank:{confidence:1},result_type:'building'}]}});});
 await page.route('https://api.geoapify.com/v1/routeplanner?**',async r=>{const body=r.request().postDataJSON();plans.push(body);await r.fulfill({json:{type:'FeatureCollection',features:[{properties:{agent_index:0,distance:2400,time:600,actions:[{type:'start'},...body.jobs.map((j,i)=>({job_id:j.id,job_index:i})).reverse()]}}]}});});
 await page.route('https://api.geoapify.com/v1/routing?**',r=>r.fulfill({json:{features:[{geometry:{type:'LineString',coordinates:[[-47.4,-20.53],[-47.39,-20.53]]}}]}}));
 await open(page);await page.getByRole('button',{name:'Usar minha jornada',exact:true}).click();await nav(page,'Entregas').click();await paste(page,'nome;endereco;pacote\nA;Rua Teste 100 Franca;P1\nB;Rua Teste 100 Franca;P2\nC;Rua Nova 200 Franca;P3');await nav(page,'Conferência').click();
 async function choose(){await page.getByRole('button',{name:'Buscar endereço no provedor'}).click();await expect(page.getByRole('button',{name:'Usar este ponto'})).toBeVisible();await page.getByLabel('Conferi que o ponto corresponde ao destino.').check();await page.getByRole('button',{name:'Usar este ponto'}).click();}
 for(let i=0;i<2;i++){await page.getByRole('button',{name:'Confirmar endereço',exact:true}).first().click();expect(geocodes.length).toBe(i);await choose();}
 await page.getByLabel('Local de saída',{exact:true}).fill('Base Franca');await page.getByRole('button',{name:'Confirmar local de saída'}).click();await choose();await page.getByLabel('Voltar ao local de saída').check();
 await page.getByRole('button',{name:'Organizar rota',exact:true}).click();expect(plans).toHaveLength(0);await page.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(page.getByText('Sequência calculada pelo Geoapify.',{exact:false})).toBeVisible();
 expect(plans[0].jobs).toHaveLength(2);expect(plans[0].agents[0].end_location).toEqual(plans[0].agents[0].start_location);expect(JSON.stringify(plans[0])).not.toContain('Rua Teste');expect(JSON.stringify(plans[0])).not.toContain('P1');
 await page.getByRole('button',{name:'Iniciar jornada',exact:true}).click();await expect(page.locator('.current-stop h2')).toHaveText('C');await page.reload();await expect(page.locator('.current-stop h2')).toHaveText('C');
 await page.getByRole('button',{name:'Marcar entregue'}).click();await expect(page.locator('.current-stop h2')).toHaveText('A');
});
