# Plano inicial

## Objetivo

Ajudar motoristas de entrega a organizar paradas e respeitar horários de recebimento, com preço acessível e foco inicial em Franca e região. Expandir para empresas e outras regiões após validar o fluxo individual.

## Telas do protótipo

Visão geral → Entregas (manual/CSV) → Conferência → Rota demonstrativa → Resumo.

## Decisões

- Começar pela web responsiva, depois avaliar PWA e aplicativo nativo conforme uso real.
- Recebimento comercial é uma janela a confirmar, diferente do funcionamento da loja.
- Trânsito, clima e otimização reais dependem de avaliação de qualidade, licença e custo dos provedores.
- Não contratar serviços pagos antes de calcular custos e obter decisão do responsável.
- Não prometer preço ou economia de quilômetros antes de validar custos e resultados.
- Empresas usarão o mesmo núcleo futuramente; distribuição de frota fica fora do piloto.

## Validação

Convidar de 3 a 5 motoristas para testar o protótipo com dados fictícios. Observar facilidade de inserir entregas, corrigir horários e registrar tentativas. Antes de operação real, validar geocodificação, cálculo de rota, restrições, proteção de dados e recuperação de falhas. Medir tempo de planejamento e entregas frustradas por horário em um piloto posterior com autorização.

## Fluxo de execução atualizado

O motorista acompanha um mapa dentro do aplicativo. “Marcar entregue” e “Não consegui entregar” registram o resultado e avançam para a próxima pendente na sequência, sem revisitar automaticamente tentativas frustradas. No fim, abre o resumo. Uma falha pode ser recolocada como pendente por “Tentar novamente”. O destino selecionado e resultados persistem neste navegador.

O protótipo usa mapa real de ruas, mas pontos fictícios e nenhum trajeto calculado. Navegação interna por GPS, instruções de conversão e recálculo após desvio fazem parte do produto pretendido e exigem implementação e avaliação de provedor.
