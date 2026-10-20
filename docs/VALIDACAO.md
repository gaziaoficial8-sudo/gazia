# Validação do piloto · 20/10/2026

## Ambiente

Windows, Node 24.21.0, npm com lockfile existente e Chrome instalado. Testes de fluxo em desktop 1440×1060 e emulação touch 360×844, 390×844 e 430×844. Emulação não equivale a teste em Android ou iPhone físico.

## Comandos e cobertura

| Verificação | Cobertura |
| --- | --- |
| `npm.cmd run build` | bundle Vite, manifesto/ícones públicos e service worker com hash do conteúdo |
| `npm.cmd test -- --reporter=line` | 11 cenários × 4 configurações = 44 aprovados (31,0 s) |
| `npm.cmd run test:pwa -- --reporter=line` | 2 aprovados (6,4 s), em produção, com service worker real |
| `git diff --check` | whitespace e integridade do patch |

Os fluxos verificam cadastro e edição, manutenção de dados após erro, recebimento inválido, prévia CSV, bloqueio de linhas inválidas, possíveis duplicatas, escape de HTML, conclusão e falha com motivo, fim com resultados mistos, retomada da seleção, retentativa e correção, toque repetido, falha de armazenamento sem avanço, ordenação/prioridade, exclusão confirmada, separação de modos, arquivo de jornadas e download de relatório, exportação/restauração de backup, rejeição de backup inválido, migração e proteção de dados corrompidos. Incluem largura sem overflow nas cinco telas e tamanho do botão principal.

Os testes PWA carregam o build, aguardam a ativação, desconectam a rede do contexto, recarregam e registram uma tentativa offline. Confirmam persistência após novo recarregamento e cache só da própria origem. O teste de atualização altera temporariamente a revisão do service worker gerado, executa o ciclo de instalação real, confirma que o rascunho do formulário permanece e aplica a atualização depois de fechar o formulário; a jornada e a próxima parada permanecem. O arquivo do worker é restaurado ao fim do teste. Não há simulação do ciclo do service worker.

## Serviços simulados

- Imagens OpenStreetMap com HTTP 200 controlado para verificar política de referência/origem.
- Imagens OpenStreetMap com HTTP 403 e falha de rede para verificar interrupção de consultas e continuidade do registro.
- Geolocalização negada e coordenadas com baixa precisão para conferir mensagens e continuidade do app.
- Quota de armazenamento excedida para confirmar reversão da alteração.

Esses testes não comprovam disponibilidade de provedores, permissão real do GPS ou instalação em aparelho.

## Acesso real ao mapa

Uma abertura real do aplicativo no Chrome deste notebook, após o consentimento da interface, recebeu HTTP 200 para imagens de `https://tile.openstreetmap.org/14/6034/9146.png` e `/14/6034/9147.png`. A imagem carregou e o aviso permaneceu oculto. A tentativa inicial dentro do sandbox retornou `ERR_NETWORK_ACCESS_DENIED`; a verificação autorizada fora da restrição de rede funcionou. Nenhuma origem foi falsificada e não houve troca de domínios ou repetição automática contínua.

Isso é evidência limitada ao notebook e à origem local, não uma garantia do provedor nem uma verificação do Codespaces. A [política oficial do OSM](https://operations.osmfoundation.org/policies/tiles/) permite acesso sujeito às condições e não oferece SLA. O cache HTTP normal do navegador permanece; imagens externas não entram no cache offline do app.

## Pendências de validação

- Instalação e reabertura standalone em Android/Chrome e iPhone/Safari físicos.
- Teclado, recortes, acessibilidade com leitores de tela e permissões reais em aparelhos.
- Publicação HTTPS e atualização entre duas versões publicadas; os testes atuais usam servidor local de produção.
- Perda de aparelho, limpeza de dados, quotas reais, restauração pelo usuário e volume de histórico a longo prazo.
- Provedor, disponibilidade no ambiente final, endereços reais, cálculo de trajeto e otimização.

Capturas automatizadas de Início e Jornada são geradas nos diretórios de resultados do Playwright. Não desabilitar verificações para obter aprovação.

Após o ajuste final dos controles para alvos de toque de 48 px, mais oito verificações de mapa e largura passaram (5,9 s), e o build foi gerado novamente. O caminho de screenshots usa o diretório de resultados do Playwright, compatível com Windows.
