# Girovia · protótipo

Nome provisório, sem disponibilidade de marca ou domínio confirmada. Assistente de entregas com cinco telas em português, exemplos de Franca/SP e layout adaptável para celular e computador.

## Executar

Pré-requisito: Node.js 22.12+ (validado com Node 24) e npm.

```sh
cd /workspace/gazia
npm ci --cache /tmp/girovia-npm-cache
npm run dev -- --port 5173
```

Use a porta 5173 no encaminhamento de portas do seu ambiente. Em um computador local, abra o endereço mostrado pelo Vite. Esta versão não foi publicada na internet.

```sh
npm run build
npx playwright test
```

Testes usam Chromium em `/usr/bin/chromium` neste ambiente. Em outra máquina, ajuste `playwright.config.js` para o navegador instalado ou use o navegador gerenciado pelo Playwright.

## Experimentar

1. Na visão geral, escolha “Preparar minhas entregas”.
2. Adicione uma entrega fictícia ou baixe e importe o modelo CSV.
3. Confira horários e escolha “Ver rota de exemplo”.
4. No mapa interno, registre a entrega ou uma tentativa sem sucesso. A próxima pendente é selecionada automaticamente.
5. Ao visitar todas as paradas, o resumo abre. Para revisitar uma falha, volte à rota, selecione a parada e toque em “Tentar novamente”.
6. Consulte o resumo e recarregue a página para conferir a persistência local.

O CSV utiliza ponto e vírgula, sem delimitadores ou quebras de linha dentro dos campos. Colunas: `nome;endereco;tipo;horario;pacote`. Tipos aceitos: `Comércio` e `Residência`. Horários como `09:00–18:00`. Limite de importação: 100 entregas no total.

## Limites desta versão

- Mapa interno interativo com Leaflet e cartografia OpenStreetMap. As cinco posições são fictícias, sem relação validada com os endereços de exemplo. Novos endereços não recebem coordenadas automaticamente. Não há geocodificação, cálculo de trajeto, distância, otimização ou orientação por GPS.
- Clima é fictício; não há consulta de trânsito nem confirmação automática de horários comerciais.
- Não é necessário abrir um aplicativo externo para acompanhar o fluxo. A versão atual ainda não oferece navegação curva a curva.
- Cartografia depende de conexão com `tile.openstreetmap.org`. Em caso de falha, o aplicativo mostra um aviso e mantém lista e registros utilizáveis. A atribuição OpenStreetMap permanece visível. Antes de produção, revisar política de uso, capacidade, privacidade e custos de um provedor de mapas; o serviço público não tem garantia de disponibilidade.
- Dados ficam somente no armazenamento deste navegador. Limpar os dados do site apaga a jornada. Não há conta, servidor, sincronização ou compartilhamento entre dispositivos.
- Use apenas dados fictícios. O produto ainda não está preparado para operação com dados pessoais reais.
- Responsivo para web; ainda não é um PWA instalável, não possui service worker e o recarregamento offline não está implementado.
- Sem publicação em lojas, contratação de serviços ou cobrança.

## Próximas etapas

Validar o protótipo com motoristas, escolher o nome após consulta de disponibilidade, avaliar provedores de mapas e seus custos, implementar endereços reais e otimização com janelas de recebimento, depois persistência segura e funcionamento offline.

Veja [o planejamento](docs/PRODUTO.md) e [o registro da pesquisa de nomes](docs/NOMES.md).
