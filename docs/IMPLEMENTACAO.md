# Implementação do piloto mobile

## Evolução v0.3

Fluxo de entrada implementado em `intake-ui.js`/`intake-controller.js`; reconhecimento real em `labels.js`, com Tesseract.js 7 e modelo português do pacote `@tesseract.js-data/por`. `prepare-ocr.mjs` gera os assets locais para dev/build. A biblioteca e o core usam licença Apache-2.0; o pacote do modelo declara MIT. Licenças do motor são distribuídas junto aos assets.

Horários/tipo deixam de ser obrigatórios, sem trocar a chave de armazenamento ou apagar dados antigos. Leitura de foto, revisão, contador, duplicatas, listas coladas/CSV com aspas e agrupamento por endereço foram integrados ao núcleo anterior. Resultados de cada pacote continuam separados, mesmo quando registrados em grupo.

`routing.js` implementa busca de candidatos, plano das pendentes e traçado de ruas via Geoapify, com timeout, tratamento de cota/erro, confirmação explícita e rejeição de planos incompletos. A configuração usa somente chave pública restrita por origem (`VITE_GEOAPIFY_API_KEY`), ausente na prévia. Nenhuma chamada real autenticada pôde ser validada. Não há troca por domínios de demonstração nem geocodificação pública indiscriminada.

PWA mantém a identidade/storage anteriores. OCR é cacheado sob demanda na própria origem; fotos, mapas e respostas externas não entram no cache. Foram preservados dados, backups, motivos, retentativa, correções, avanço e atualização sob escolha.

Base: clone limpo de `gaziaoficial8-sudo/gazia`, branch main, em 20/10/2026. Nenhum AGENTS.md no repositório ou nos diretórios pais consultados. Preservar JavaScript, Vite, Leaflet, npm e lockfile.

1. Executar build e testes existentes, adaptando somente a escolha do navegador ao Windows.
2. Fortalecer persistência transacional, migração, modo demonstração separado, motivos, correção, prioridade, ordem, histórico e exportação.
3. Melhorar telas pequenas, importação com prévia, horários, primeiro uso, instalação e privacidade.
4. Gerar manifesto e service worker a partir do build, testar offline e atualização sem apagar dados.
5. Validar larguras 360/390/430, falhas de armazenamento/mapa/localização, documentar limites e criar commits locais. Sem push ou contratação.

Conta, nuvem, cobrança e navegação real ficam fora desta entrega. Não prometer uso comercial com endereços verificados até resolver geocodificação e provedor.

## Resultado

- Build inicial aprovado. Dos dez casos antigos (cinco em duas configurações), oito passaram; dois falharam no caminho de captura `/tmp` que no Windows vira `C:\tmp`. Nenhuma falha de negócio foi identificada nessa linha de base. A restrição de encerramento dos servidores do Playwright no sandbox exigiu executar a validação autorizada fora dele para obter saída normal.
- Mantidos JavaScript, Vite, Leaflet, npm e lockfile. Nenhuma dependência adicionada. A interface foi organizada em `pilot-ui.js`, persistência/CSV em `pilot-data.js`, ciclo PWA em `pwa.js`; mapa e função de avanço existentes foram preservados e evoluídos.
- Formulário ganhou edição de destino/endereço/pacote, sem apagar resultados. Motivos e correções ficam no histórico; pausa após registro evita toques repetidos na parada seguinte.
- Ícones usam o símbolo de seta da identidade existente, desenhado localmente; não há recurso externo de imagem.
- Service worker gerado com hash do build, pré-cache dos arquivos locais e atualização sob escolha do usuário. Sem cache de mapas ou alteração dos dados da jornada.
- OpenStreetMap respondeu HTTP 200 no Chrome deste notebook após liberar a restrição de rede do ambiente. Isso não resolve nem verifica o bloqueio anterior no Codespaces.
- Verificação em aparelho físico, hospedagem HTTPS, geocodificação, provedor comercial, marca, conta/nuvem e cobrança continuam pendentes, conforme README.
