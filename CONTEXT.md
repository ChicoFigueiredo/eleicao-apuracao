# Monitor Eleitoral 2026

Painel local de acompanhamento da apuração das eleições brasileiras de 2026, publicado no domínio pessoal do operador. Reúne dados oficiais, históricos de coleta e uma leitura editorial da composição política.

## Linguagem

**Monitor Eleitoral**:
O produto que coleta, preserva e apresenta o panorama de apuração das eleições de 2026.
_Evitar_: apurador, scraper

**Recorte Monitorado**:
Conjunto persistido de cargos, unidades federativas e candidaturas que o Monitor Eleitoral acompanha, administrado pelo operador no painel.
_Evitar_: cobertura nacional, lista de pessoas, arquivo de configuração

**Cobertura DF Completa**:
O Recorte Monitorado que inclui todos os cargos e candidaturas pertinentes ao Distrito Federal.
_Evitar_: DF parcial

**Coleta Agregada**:
Leitura oficial dos totais de apuração por cargo e unidade federativa, sem abrir o detalhe de cada candidatura.
_Evitar_: varredura de candidatos

**Candidatura Monitorada**:
Candidatura do Recorte Monitorado cujo detalhe de votos, percentual, situação e foto é preservado e exibido individualmente.
_Evitar_: político isolado, pessoa monitorada

**Inclusão Assistida pelo TSE**:
Fluxo do painel que consulta a identificação oficial de uma candidatura por nome ou número e a acrescenta ao Recorte Monitorado.
_Evitar_: cadastro livre, busca genérica

**Leitura de Espectro**:
Classificação editorial de partidos ou candidaturas em categorias políticas, separada dos dados oficiais e acompanhada de fonte e vigência.
_Evitar_: classificação do TSE, dado oficial de ideologia

**Composição Antes e Depois**:
Comparação entre a distribuição de cadeiras em exercício na véspera da eleição e a projeção ou resultado posterior, segundo a Leitura de Espectro.
_Evitar_: resultado político oficial

**Acesso Protegido**:
Entrada remota do Monitor Eleitoral por HTTPS, autenticada pelo Nginx com credenciais definidas fora do repositório.
_Evitar_: painel público, login da aplicação

**Leitura Histórica**:
Fotografia imutável de dados oficiais obtida em uma coleta, preservada durante todo o ciclo eleitoral de 2026.
_Evitar_: cache, estado atual

**Projeção Parcial**:
Composição Depois calculada a partir das candidaturas que a apuração oficial já apresenta como eleitas, identificada como não definitiva até o resultado oficial final.
_Evitar_: resultado final, previsão eleitoral

**Acompanhamento Desativado**:
Parte do Recorte Monitorado que não recebe novas coletas, mas cujas Leituras Históricas permanecem consultáveis.
_Evitar_: exclusão, apagar monitoramento

**Dado Envelhecido**:
Última informação oficial preservada quando uma coleta falha, exibida com seu horário e idade em vez de ser apresentada como atual.
_Evitar_: dado atual, valor vazio

**Turno**:
Etapa eleitoral com apuração e resultado próprios, cuja série histórica não se confunde com a de outro turno.
_Evitar_: reinício da eleição

**Leitura Verificada**:
Leitura Histórica cuja origem oficial e assinatura digital JWS foram validadas antes de persistência.
_Evitar_: dado oficial presumido

**Sugestão Editorial**:
Proposta de alteração da Leitura de Espectro baseada em fontes pesquisadas, sem efeito até a aprovação explícita do operador.
_Evitar_: atualização automática de ideologia
