# Entreguei · piloto mobile v0.3

Nome provisório escolhido para a evolução do Girovia. Não houve confirmação de disponibilidade de marca ou domínio. Mantidos JavaScript, Vite, Leaflet e o núcleo de jornada existente.

Prévia privada: https://girovia-piloto.softcomet65.chatgpt.site — a URL anterior foi preservada. Se solicitado, entre na mesma conta do ChatGPT proprietária do Site. Não foi aberto o acesso a outros motoristas.

## Fluxo principal

1. **Tenho uma lista:** importar CSV da empresa ou colar uma tabela/lista de endereços.
2. **Não tenho lista:** fotografar as etiquetas, ler o texto localmente e confirmar os dados de cada pacote antes de adicionar. As duas entradas alimentam a mesma jornada.
3. Conferir os endereços e a saída; escolher terminar na última entrega ou voltar à saída.
4. Organizar a rota com o provedor configurado, ou usar explicitamente a sequência manual.
5. Registrar entregas e tentativas, corrigir resultados e consultar o resumo.

Tipo de imóvel, recebimento e alertas de horário foram retirados do fluxo. Endereços comerciais são destinos normais. Campos antigos continuam preservados nos dados e backups, mas não interferem na organização.

## O que está pronto

- Entrada por CSV, tabela colada ou endereço completo por linha, com prévia e erros antes de importar.
- Cadastro e edição manuais simplificados: endereço e identificação do pacote; nome opcional.
- Leitura **real de texto** de fotos com Tesseract.js em português, executada em Web Worker no próprio aparelho. Uma etiqueta por vez, contador, conferência e continuidade para a próxima.
- Avisos para leitura incerta/bloco de destinatário não identificado; foto ruim pode exigir nova leitura ou preenchimento manual.
- Detecção de código de pacote repetido; pacotes diferentes no mesmo endereço são permitidos.
- Agrupamento pelo endereço completo (incluindo complemento), preservando cada pacote. É possível registrar os pendentes de um endereço juntos ou individualmente.
- Confirmação explícita de candidatos de endereço, saída/retorno e integração de planejamento e traçado de ruas com Geoapify.
- Jornada offline, motivos, avanço, retentativa, correção, histórico, CSV de resultados e backup JSON restaurável.
- Demonstração e jornada própria separadas; proteção contra falha de armazenamento, toque repetido e gravações detectadas em outra aba.
- PWA com atualização solicitada pelo usuário e dados preservados.

**O cálculo real ainda não está ativado na prévia porque não existe uma chave Geoapify configurada.** A integração está implementada e seus contratos foram testados com respostas simuladas. Até configurar e validar uma chave, a interface informa essa limitação e permite sequência manual; não inventa coordenadas, quilômetros ou uma rota otimizada.

## Abrir no notebook

Node.js 22.12+ e npm; validado com Node 24 e Chrome no Windows. No PowerShell, use `npm.cmd`:

```powershell
cd C:\Users\DELL\Documents\Codex\girovia
npm.cmd ci
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Abra http://127.0.0.1:4173 e mantenha o servidor aberto. Em outros sistemas, use `npm` no lugar de `npm.cmd`. Desenvolvimento: `npm.cmd run dev`. O script prepara os arquivos do OCR a partir das dependências antes de iniciar o Vite.

## Lista da empresa

Modelo novo: `nome;endereco;pacote`. Separadores aceitos: ponto e vírgula, vírgula ou tabulação; campos entre aspas, aspas escapadas e linhas dentro de campos são interpretados. Colunas reconhecidas incluem nome/destinatario/destino, endereco/address e pacote/codigo/rastreio/tracking. Complemento, bairro, cidade, uf e cep podem estar em colunas separadas e são reunidos ao endereço.

Endereço é obrigatório. Sem nome, usa-se a identificação do pacote; sem código, é gerada uma identificação local, que não equivale a um código de rastreio da empresa. Confira esses identificadores na prévia. Até 100 pacotes por jornada e 500 KB por lista. Nome até 80, endereço até 240 e código até 64 caracteres. O modelo antigo de cinco colunas ainda é aceito; tipo e horário são ignorados na entrada nova.

Em “Colar lista”, uma tabela com cabeçalho é reconhecida ou cada linha vira um endereço. Arquivos Excel/PDF/imagens de uma lista ainda não são importados diretamente: exporte CSV ou cole os dados. O relatório CSV de resultados é diferente do modelo de entrada. Use backup JSON para restaurar uma jornada inteira.

## Etiquetas

Use “Não tenho lista” → fotografar/escolher etiqueta → conferir destinatário, rua, número, complemento, cidade e pacote → confirmar e ler a próxima. A foto não é enviada a serviços de OCR, não entra no backup e é descartada ao concluir/cancelar a leitura. O texto completo é mostrado para conferência, mas só os campos confirmados são persistidos.

A leitura usa o texto impresso; não depende de o código de barras conter o endereço. Decodificação de todos os formatos de código de barras/QR não foi implementada. Um código identificado no texto não consulta sistemas de transportadoras. Remetente e destinatário podem ser confundidos pelo OCR; confira sempre antes de salvar. Não há promessa de leitura universal de etiquetas.

Os arquivos de OCR são hospedados na própria origem, sem CDN em tempo de execução. O primeiro uso online baixa apenas os arquivos necessários. Depois de carregados, podem ser reutilizados offline (validado em teste de produção); isso depende de o navegador manter o cache. Não se pré-carregam todos os motores de OCR na instalação. Câmera física e etiquetas reais de empresas ainda precisam de validação em Android/iPhone.

## Ativar endereços e rotas reais

1. O proprietário deve criar seu próprio projeto no provedor, revisar plano, condições e cotas, sem contratar opção paga sem decisão explícita.
2. Obter uma chave **pública para navegador**, autorizada para Geocoding, Route Planner e Routing. Restringir a origem no painel ao domínio da prévia. Nunca colocar chave secreta/admin em `VITE_`.
3. Criar `.env.local` com `VITE_GEOAPIFY_API_KEY=sua_chave_publica`, conforme `.env.example`, e reconstruir/publicar. A chave não entra no backup; chaves `VITE_` são visíveis no bundle.
4. Conferir os candidatos dos endereços e o ponto de saída, depois solicitar a organização. Cada busca/cálculo informa o envio ao provedor e consome a cota da conta.

Documentação primária: [busca de endereço](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/), [planejamento](https://apidocs.geoapify.com/docs/route-planner/) e [roteamento](https://apidocs.geoapify.com/docs/routing/). Sem promessa de preço ou cota fixa: confirme o plano vigente antes de ativar.

O planejador recebe apenas coordenadas e IDs internos dos grupos, não nomes ou códigos dos pacotes. Buscas de endereço enviam o endereço informado. Só candidatos escolhidos pelo motorista são usados. O ponto pode corresponder a rua/bairro; confira número e cidade. O modo atual é carro (`drive`), sem trânsito em tempo real, garantia de melhor rota global, instruções curva a curva ou restrições específicas de moto/caminhão.

Uma resposta que omita paradas é recusada sem alterar a lista. Resultados já registrados são preservados na reorganização das pendentes. O traçado desenhado vem exclusivamente da API de Routing; a geometria do planejador não é tratada como trajeto de ruas. Se o traçado falhar, a sequência pode ser preservada com aviso. Alterar endereço, excluir/adicionar pacote, reordenar ou pedir retentativa invalida o plano anterior.

Não foram integrados Nominatim público ou o demo OSRM: as políticas e o perfil de um app comercial de entregas exigem outra solução. Não há contratação de serviço, conta criada, chave de demonstração embutida ou contorno de bloqueios.

## Mapas e privacidade

Mapa de ruas OpenStreetMap é opcional, com atribuição e origem verdadeira. Carregar o mapa envia IP/origem/área visualizada; localização do motorista só é solicitada por botão e não é salva. Erro de imagens remove a camada e interrompe novas consultas na sessão. Imagens de mapa não são armazenadas pelo service worker. [Política do provedor](https://operations.osmfoundation.org/policies/tiles/).

Jornadas ficam em `localStorage`, na chave anterior `girovia-pilot-v2`, preservada mesmo após a troca de nome. A migração de `girovia-demo-v1` continua disponível e mantém a chave original. Dados antigos e backups compatíveis não são apagados por retirar os horários.

Sem conta de motorista, nuvem ou sincronização. Cada origem/navegador tem seus dados. Exporte backup JSON antes de trocar de aparelho ou limpar o site; ele contém endereços sem criptografia e deve ser guardado com cuidado. Ajuda oferece exportação, restauração, recuperação de dados originais e exclusões confirmadas. Não há declaração de conformidade completa com LGPD ou liberação comercial ampla.

## Instalar no celular

Abra o link HTTPS online e espere a indicação de interface pronta para offline. Android/Chrome: menu → Instalar aplicativo ou Adicionar à tela inicial. iPhone/Safari: Compartilhar → Adicionar à Tela de Início. A prévia é privada e pode pedir a conta proprietária. A experiência standalone em aparelhos físicos ainda não foi verificada.

O build estático fica em `dist`, na raiz do domínio. `sw.js` precisa ser revalidado; assets com hash podem ter cache longo. Preserve a identidade e o acesso do Site descritos em [PUBLICACAO.md](docs/PUBLICACAO.md).

## Verificar

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:pwa
```

Chrome no Windows: desktop e emulação touch 360/390/430 px. OCR usa uma imagem de etiqueta fictícia de teste e o motor real local; testes do provedor usam uma chave fictícia somente no processo Vite de testes e respostas controladas, nunca em produção. A leitura offline e a atualização usam service worker real.

Não houve teste de câmera física, Safari/iOS ou chamada autenticada real ao Geoapify. Consulte [VALIDACAO.md](docs/VALIDACAO.md), [COMERCIALIZACAO.md](docs/COMERCIALIZACAO.md) e [IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md).
