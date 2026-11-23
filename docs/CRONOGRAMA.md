# Cronograma executado

Cronograma reconstruído a partir do histórico de commits do repositório, do estado atual do código e
da documentação. As datas indicam quando os marcos aparecem no histórico versionado; não são
estimativas nem datas de entrega acadêmica.

| Período       | Atividades realizadas                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 27–29/10/2026 | Criação e importação da estrutura inicial do projeto; configuração inicial do Node.js e MySQL; elaboração do primeiro guia de arquivos.                                                   |
| 06–10/11/2026 | Implementação de operações de cadastro e atendimento e evolução da conexão com Oracle e MySQL; preparação dos schemas, configuração Docker Compose e ajustes na inicialização dos bancos. |
| 12/11/2026    | Implementação do registro de triagem e atualização da documentação de visão geral e execução.                                                                                             |
| 15/11/2026    | Construção e revisão das telas de triagem e classificação de risco selecionada pela enfermagem.                                                                                           |
| 16–17/11/2026 | Integração do fluxo de triagem com a fila e registro da consulta médica; inclusão do MER, do fluxo e dos requisitos; correções complementares.                                            |
| 19–21/11/2026 | Desenvolvimento e integração de telas complementares, apresentação visual das classificações e consolidação do fluxo médico.                                                              |
| 21–23/11/2026 | Implementação de registro e consulta de medicações, resumo e encerramento; correção de conversão de CLOB no Oracle; ajustes de validação de CPF e preparação da versão final.             |
| 23/11/2026    | Revisão da documentação para refletir o estado implementado; criação desta conclusão e do cronograma executado.                                                                           |

## Entregas consolidadas

- Aplicação Node.js com interface web integrada.
- Fluxo de autenticação e permissões para os perfis de demonstração.
- Cadastro e busca de pacientes e abertura de atendimento.
- Registro de triagem, classificação informada pela enfermagem e fila médica.
- Registro de consulta, medicações, resumo e encerramento idempotente.
- Schemas e scripts de preparação de bancos Oracle e MySQL, além de execução local com Docker.
- Testes automatizados e documentação de configuração, modelo, requisitos, verificações e limites.

Para consultar a origem cronológica dos marcos, use `git log --date=short --reverse` na raiz do
repositório. O histórico é a fonte das datas; os títulos e períodos foram agrupados para facilitar a
leitura.
