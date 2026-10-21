# Girovia: preparação para comercialização

## Atualização v0.3 · Entreguei (provisório)

O posicionamento agora é entrada rápida de entregas: lista da empresa ou, se não houver lista, leitura das etiquetas. Tipo de imóvel e recebimento foram removidos do fluxo por decisão do proprietário. Não considerar a ênfase histórica em horários abaixo como requisito atual.

A leitura de texto é local, em português, com conferência obrigatória e detecção de pacote repetido. A organização real foi integrada ao Geoapify, mas não está ativada na prévia sem chave. Antes de oferecer esse recurso comercialmente: configurar conta/plano, restringir chave pública à origem, validar custos por jornada e testar endereços e rotas reais. Não se escolheu um servidor público de demonstração como infraestrutura comercial.

Validar etiquetas efetivamente usadas pelos motoristas: qualidade da câmera, disposição de remetente/destinatário, códigos longos, endereços incompletos e tempo de conferência. O teste automatizado com etiqueta fictícia não comprova leitura de todas as transportadoras. Validar arquivos reais de listas e só depois ampliar formatos além de CSV/colar.

Entreguei continua sugestão de nome: conferir disponibilidade antes de investir em marca. O link privado anterior foi preservado.

## Posicionamento a validar

Assistente de jornada para motoristas autônomos de Franca e região: reunir paradas, conferir recebimento e registrar cada resultado. Os diferenciais propostos são clareza de horários, facilidade de corrigir erros e continuidade dos registros sem internet. São hipóteses de valor; ainda não há evidência de redução de quilômetros, combustível ou entregas frustradas.

## Entrega atual

PWA local, demonstração separada da jornada própria, cartões no celular, cadastro/editoração de destinos, prioridades, sequência manual, CSV com prévia e possíveis duplicatas, alertas de fechamento da janela, motivos, retentativa, correções, histórico, exportação e restauração de backup. O mapa é opcional e não impede registrar resultados. Sem serviços pagos contratados, backend ou dependências novas.

## Piloto sugerido

1. De 3 a 5 motoristas, começando com exemplos fictícios e tarefas supervisionadas.
2. Observar cadastro, importação, correção de recebimento, registro de falha, retentativa e recuperação após fechar o aplicativo.
3. Registrar navegador, aparelho, versão do sistema, erros e necessidade de ajuda. Confirmar instalação e offline em aparelhos físicos.
4. Perguntar quanto tempo levam para preparar uma jornada hoje e que parte do aplicativo ajuda. Medir o mesmo processo no piloto, sem prometer economia antes dos resultados.
5. Avaliar disposição a pagar e volume de entregas. Não anunciar preço definitivo ou plano ilimitado antes de conhecer custos e suporte.

## Antes de cobrar ou operar amplamente com dados reais

- Conferir nome/marca/domínio; Girovia continua provisório.
- Publicar em hospedagem HTTPS, com contato e canal de suporte reais. Configurar segurança, processo de atualização e recuperação; testar restauração de backup.
- Escolher provedor autorizado para o volume comercial, avaliar cotas, chave pública restrita por domínio, termos e custos. Separar mapa, geocodificação e cálculo de trajeto.
- Implementar confirmação de endereços/coordenadas com tratamento de ambiguidades. Hoje não há geocodificação nem pontos verificados das entregas.
- Definir necessidade de conta e backup em nuvem; se houver, implementar autenticação, separação entre clientes, autorização e recuperação. Não incluir chaves secretas no frontend.
- Revisar dados estritamente necessários, retenção, segurança, política de privacidade e termos com orientação adequada. Não declarar conformidade completa com a LGPD.
- Fazer testes físicos Android/iPhone e teste de perda de dados, quotas e restauração. As validações desta entrega usam Chrome desktop e emulação.

## Custos a levantar

| Item | Fator de custo a medir |
| --- | --- |
| Hospedagem e domínio | tráfego, armazenamento e renovação |
| Mapa | visualizações e condições do provedor |
| Geocodificação | consultas novas, correções e licença de armazenamento |
| Trajetos/otimização futura | quantidade de paradas, consultas e restrições |
| Nuvem futura | usuários ativos, backups, armazenamento e recuperação |
| Operação | suporte, manutenção, impostos e pagamentos futuros |

Definir preço somente após medir custo médio e cenário de maior uso por motorista, incluindo margem para suporte. Cobrança automática e planos pagos não foram implementados nesta etapa.

## Fora desta etapa

Painel de empresas, equipes em tempo real, marketplaces, etiquetas, assinaturas e navegação curva a curva. Trânsito e clima fictícios foram retirados da interface para evitar interpretação como serviço real.
