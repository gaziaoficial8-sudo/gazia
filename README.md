# Girovia · piloto mobile v0.2

Assistente de entregas para Franca e região. Nome provisório, sem marca ou domínio confirmado. Evolução da base JavaScript/Vite/Leaflet existente, sem migração de framework ou contratação de serviços.

**Prévia privada HTTPS:** [abrir Girovia](https://girovia-piloto.softcomet65.chatgpt.site). Se solicitado, entre na mesma conta do ChatGPT que publicou o Site. Consulte [acesso e publicação](docs/PUBLICACAO.md). Instalação física Android/iPhone ainda não foi verificada.

## Abrir no notebook

Node.js 22.12+ e npm. Validado com Node 24.21.0 e Chrome instalado no Windows. No PowerShell, use `npm.cmd` para evitar a restrição de execução do `npm.ps1`:

```powershell
cd C:\Users\DELL\Documents\Codex\girovia
npm.cmd ci
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Abra http://127.0.0.1:4173. Mantenha o terminal do servidor aberto. `npm run dev` serve para desenvolvimento; o service worker é ativado somente no build de produção. Em Linux/macOS, use `npm` no lugar de `npm.cmd`.

## Usar e instalar no celular

O build em `dist` deve ser publicado em uma hospedagem **HTTPS**, na raiz do domínio, com fallback para `index.html`. `sw.js` precisa ser servido como JavaScript e com revalidação (`Cache-Control: no-cache`); não encaminhar pedidos de arquivos inexistentes para HTML. Assets com hash podem receber cache longo. A prévia acima foi publicada privadamente pelo recurso Sites; nenhuma hospedagem externa paga foi contratada.

1. Abra o endereço HTTPS no celular, conectado à internet.
2. Espere aparecer “Interface pronta para abrir sem internet”.
3. **Android/Chrome:** use “Instalar aplicativo” ou “Adicionar à tela inicial” no menu. O botão de instalação depende da disponibilidade oferecida pelo navegador.
4. **iPhone/Safari:** Compartilhar → Adicionar à Tela de Início → confirmar. O menu varia entre versões. Não há promessa de instalação idêntica ao Android.
5. Abra pelo ícone, carregue a jornada e teste novamente sem conexão. Exporte backup antes de limpar dados ou trocar de aparelho.

O endereço `127.0.0.1` acima vale apenas para o notebook. Abrir pelo IP da rede em HTTP pode servir à inspeção visual, mas não valida PWA, localização ou funcionamento offline; essas funções exigem contexto seguro. Instalação em Android e iPhone físicos ainda precisa ser testada.

## O que funciona

- Cinco telas: Início, Entregas, Conferência, Jornada e Resumo; navegação inferior e áreas seguras no celular.
- Cadastro e edição de destino, endereço, pacote, tipo, prioridade e recebimento. Validação mantém os campos quando ocorre erro.
- Ordem manual das paradas e botão explícito para priorizar. Não há otimização automática.
- Importação CSV com prévia, erros por linha e possíveis duplicatas; duplicatas são ignoradas por padrão e podem ser incluídas explicitamente.
- Alertas de recebimento encerrado ou próximo do fim (até 60 minutos), pelo relógio local. Sem cálculo do tempo necessário para chegar.
- Entregue, tentativa com motivo, seleção da próxima pendente, retentativa e correção com confirmação e histórico de alterações.
- Proteção contra registros repetidos e pausa de 700 ms antes de registrar a próxima parada.
- Persistência antes de avançar: se o armazenamento falhar, o resultado é revertido e a parada não muda.
- Histórico de jornadas arquivadas, resultados CSV, backup JSON e restauração validada com confirmação.
- Demonstração e jornada própria separadas. Reiniciar demonstração não apaga a jornada própria.
- Interface e registros previamente carregados acessíveis sem internet. Atualização do PWA espera escolha do usuário e não troca a versão enquanto ele preenche um formulário.
- Localização solicitada por botão, com tratamento de permissão negada, indisponibilidade, timeout e baixa precisão. Sem acompanhamento em segundo plano.

## Experimentar

1. Leia a orientação inicial e feche em “Entendi, começar”.
2. Em Entregas, teste cadastro, edição, prioridade, setas de ordenação e o modelo CSV.
3. Em Conferência, ajuste e salve horários; depois inicie a jornada.
4. Registre uma entrega e uma falha com motivo. Recarregue para confirmar a parada atual.
5. No resumo, corrija um resultado ou selecione “Tentar novamente”. Falhas não retornam sozinhas à fila e não contam como entregas.
6. Exporte resultados e backup. Arquive a jornada para começar outra, preservando o histórico local.
7. Use “Usar minha jornada” para uma lista própria vazia; os exemplos continuam separados.

## CSV

Modelo: `nome;endereco;tipo;horario;pacote`. Tipos: `Comércio` ou `Residência`; recebimento no mesmo dia, como `09:00–18:00` ou `09:00-18:00` (início antes do fim). Até 100 paradas por jornada e arquivo de até 500 KB. Nome até 80 caracteres, endereço até 160, pacote até 20. O importador simples não aceita delimitadores ou quebras de linha dentro dos campos.

Possível duplicata = mesmo identificador de pacote, ou mesmo nome e endereço, ignorando acentos, caixa e espaços repetidos. Isso é uma indicação, não uma confirmação de erro. Erros bloqueiam a importação inteira; revise o arquivo e tente novamente. Exportação de resultados usa campos entre aspas e neutraliza início de fórmulas para planilhas; ela é um relatório, diferente do modelo de importação. Backup JSON é a opção para restaurar jornadas completas.

## Mapa, localização e limites

O mapa de ruas só carrega após escolha explícita; usa `tile.openstreetmap.org` com referência à origem real e atribuição visível. O provedor recebe IP, origem e área visualizada. Nomes, endereços e resultados não são enviados. Ao exibir a localização obtida pelo botão, a área visualizada pode revelar sua posição ao provedor.

Em 20/10/2026, uma verificação real no Chrome deste notebook recebeu HTTP 200 em imagens do mapa (zoom 14). Dentro do sandbox, a rede foi negada; a verificação externa autorizada carregou imagens. Isso não comprova disponibilidade no Codespaces, em celulares ou em produção. Testes automatizados de 403, origem e carregamento usam respostas simuladas.

Ao ocorrer erro, a camada é removida e não há novas tentativas automáticas durante a sessão. Recarregar pode iniciar uma nova tentativa. Registros continuam disponíveis sem mapa. Não há alternância de domínios, falsificação de Referer ou contorno de bloqueio.

O serviço público é uma opção para validação pequena conforme sua [política oficial](https://operations.osmfoundation.org/policies/tiles/), sem garantia de disponibilidade e sujeito a bloqueio. O navegador respeita seu cache HTTP normal. O service worker não armazena imagens externas, não faz download antecipado e não oferece mapas offline. Antes de uso comercial em escala, definir volume, contato público e provedor autorizado; calcular regras/cotas/custos e avaliar serviço contratado ou hospedagem própria. Nenhuma chave ou cartão foi cadastrado.

| Recurso | Situação |
| --- | --- |
| Mapa de ruas | online, após escolha, sujeito ao provedor |
| Posição do motorista | obtida por botão; precisão informada; não salva |
| Endereço convertido em coordenadas | não implementado |
| Trajeto dirigível | não implementado; nenhuma linha reta é apresentada como trajeto |
| Otimização de sequência | não implementada; ordem manual |
| Navegação curva a curva | não implementada |

Os cinco pontos de demonstração são fictícios, sem correspondência validada com os endereços. Jornadas próprias não herdam esses pontos. Novos endereços ficam com **localização não confirmada**. Clima e trânsito fictícios foram retirados da interface.

## Dados e privacidade

- Jornadas, seleção, página, resultados, alterações e histórico ficam no `localStorage`, chave `girovia-pilot-v2`, na origem deste navegador. Não há conta, backend ou sincronização em nuvem.
- Migração da chave anterior `girovia-demo-v1` para demonstração, mantendo a chave original intacta. A chave original pode continuar contendo registros antigos; para removê-la, depois de exportar uma cópia, use a limpeza de dados do site do navegador. Isso também apaga os dados atuais e o acesso offline.
- Dados ilegíveis não são sobrescritos automaticamente: em Ajuda, exporte os dados originais e restaure um backup válido, após confirmação. O arquivo de “dados originais” é para diagnóstico, não substitui o backup JSON restaurável.
- Ajuda oferece exportação, restauração, reinício da demonstração e exclusão confirmada de toda a jornada própria e seu histórico. Não é possível recuperar uma exclusão sem backup.
- Backup não tem criptografia e pode conter endereços. Guarde-o em local seguro. O app não envia esse arquivo automaticamente.
- Localização não é persistida; pontos do motorista desaparecem ao sair da tela. Não há coleta contínua, analytics ou envio de endereços para geocodificação.
- Alterações detectadas em outra aba bloqueiam novas gravações nesta aba até recarregar. Use uma aba por vez; não há colaboração simultânea.
- Cache do service worker contém apenas arquivos essenciais da interface. Versões anteriores podem ser mantidas para abas ainda abertas; uma ativação futura sem clientes antigos pode limpá-las. Ele nunca apaga o `localStorage`.
- Use dados fictícios nos primeiros testes. Este piloto não equivale a conformidade completa com a LGPD ou liberação para operação comercial ampla.

## Testes

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:pwa
```

Windows: usa Chrome instalado. Em Linux/macOS, instale Chromium do Playwright (`npx playwright install chromium`) ou informe `CHROMIUM_PATH` para um executável existente. Os testes PWA dependem do build atualizado e usam a porta 4173; os testes de fluxo usam 5173. Em ambientes restritos, o Chrome e o encerramento dos servidores podem exigir permissão do ambiente. Não ignore falhas para obter resultados positivos.

Validação de referência: Chrome desktop no Windows e emulação touch de 360×844, 390×844 e 430×844; desktop 1440×1060. Fluxos cobrem cadastro/edição, validação, CSV/duplicatas/escape de HTML, resultados mistos, seleção e persistência, retentativa/correção, toque repetido, falha de armazenamento, sequência/prioridade, exclusão confirmada, separação de modos, arquivo/exportação, backup/restauração, migração/dados corrompidos, mapa 403, política de referência, localização negada/baixa precisão e larguras sem rolagem horizontal. Testes de produção exercitam service worker real, recarregamento offline, registro offline e atualização aguardando o usuário com jornada preservada.

**Não foram testados aparelhos físicos, Safari/iOS ou instalação manual em celular.** A publicação privada foi confirmada pelo Sites; os testes de comportamento ocorreram localmente. Consulte [a validação](docs/VALIDACAO.md), [o plano comercial](docs/COMERCIALIZACAO.md) e [a implementação](docs/IMPLEMENTACAO.md).
