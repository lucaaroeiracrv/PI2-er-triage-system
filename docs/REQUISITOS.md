# Requisitos do sistema completo

Este documento descreve o comportamento esperado do sistema ao final do projeto, incluindo
funcionalidades planejadas para depois das tarefas 32, 33 e 34. Ele é uma especificação-alvo, não um
relatório do que já está implementado.

## Requisitos funcionais

| Código | Requisito                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| RF01   | O sistema deve permitir que usuários realizem login utilizando usuário e senha.                                      |
| RF02   | O sistema deve identificar o perfil do usuário autenticado.                                                          |
| RF03   | O sistema deve permitir acesso conforme os perfis de recepção, enfermagem e médico.                                  |
| RF04   | O sistema deve permitir o cadastro de pacientes.                                                                     |
| RF05   | O sistema deve validar os dados cadastrais, incluindo nome, data de nascimento e CPF.                                |
| RF06   | O sistema deve impedir o cadastro de pacientes com CPF já existente.                                                 |
| RF07   | O sistema deve permitir a busca de pacientes cadastrados pelo nome ou documento.                                     |
| RF08   | O sistema deve permitir que a recepção abra um atendimento para um paciente cadastrado.                              |
| RF09   | O sistema deve registrar a data, o horário e a situação inicial do atendimento.                                      |
| RF10   | O sistema deve disponibilizar os atendimentos que aguardam triagem para a enfermagem.                                |
| RF11   | O sistema deve permitir o registro da queixa principal e dos sinais vitais do paciente.                              |
| RF12   | O sistema deve permitir que a enfermagem informe a classificação de risco da triagem.                                |
| RF13   | O sistema deve armazenar a triagem vinculada ao atendimento correspondente.                                          |
| RF14   | O sistema deve apresentar o resultado da triagem e sua classificação após o salvamento.                              |
| RF15   | O sistema deve atualizar a situação do atendimento para `aguardando_medico` após o registro da triagem.              |
| RF16   | O sistema deve disponibilizar ao médico a lista de atendimentos que aguardam atendimento.                            |
| RF17   | O sistema deve apresentar na fila médica os dados do paciente, a classificação de risco e as informações da triagem. |
| RF18   | O sistema deve organizar a fila médica conforme a ordem de atendimento definida nos requisitos do projeto.           |
| RF19   | O sistema deve permitir que o médico selecione um atendimento da fila.                                               |
| RF20   | O sistema deve permitir o registro das informações da consulta médica.                                               |
| RF21   | O sistema deve salvar a consulta vinculada ao paciente e ao atendimento correspondente.                              |
| RF22   | O sistema deve permitir o registro de medicações associadas ao atendimento.                                          |
| RF23   | O sistema deve permitir a consulta dos registros de medicação de um atendimento.                                     |
| RF24   | O sistema deve permitir a visualização de um resumo do atendimento antes de seu encerramento.                        |
| RF25   | O sistema deve permitir a finalização de um atendimento, registrando sua situação final.                             |
| RF26   | O sistema deve informar o resultado das operações de cadastro, consulta, triagem, medicação e encerramento.          |
| RF27   | O sistema deve informar quando não houver pacientes ou atendimentos disponíveis nas filas.                           |
| RF28   | O sistema deve impedir que usuários executem operações não autorizadas para seus perfis.                             |

## Requisitos não funcionais

| Código | Requisito                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| RNF01  | O sistema deve possuir interface web de fácil utilização e navegação intuitiva.                                    |
| RNF02  | As telas devem manter um padrão visual consistente de cores, fontes, botões e campos.                              |
| RNF03  | O backend deve utilizar Node.js e o frontend deve utilizar HTML, CSS e JavaScript.                                 |
| RNF04  | O sistema deve oferecer compatibilidade com MySQL e Oracle Database.                                               |
| RNF05  | O banco utilizado deve ser selecionado por meio da variável de ambiente `DB_ENGINE`.                               |
| RNF06  | As consultas ao banco devem utilizar parâmetros para evitar SQL Injection.                                         |
| RNF07  | As senhas dos usuários devem ser armazenadas utilizando hash seguro, sem armazenamento em texto puro.              |
| RNF08  | As permissões devem ser verificadas no backend, não apenas na interface.                                           |
| RNF09  | O banco deve garantir a integridade referencial por meio de chaves primárias e estrangeiras.                       |
| RNF10  | Operações que envolvam múltiplas alterações relacionadas devem utilizar transações para evitar gravações parciais. |
| RNF11  | O sistema deve validar os dados antes de realizar operações de persistência.                                       |
| RNF12  | O sistema deve apresentar mensagens claras de sucesso e erro.                                                      |
| RNF13  | O sistema deve evitar duplicidade de registros decorrente de operações repetidas.                                  |
| RNF14  | O sistema deve possuir testes automatizados para validação das principais regras de negócio.                       |
| RNF15  | O sistema deve permitir sua execução em ambiente local utilizando Docker e Docker Compose.                         |
| RNF16  | As credenciais de conexão devem ser armazenadas em variáveis de ambiente, não diretamente no código-fonte.         |
| RNF17  | O sistema deve utilizar dados fictícios durante o desenvolvimento e as demonstrações acadêmicas.                   |
| RNF18  | O sistema deve manter os dados e as estruturas conceitualmente compatíveis entre MySQL e Oracle.                   |

## Regras de negócio e escopo final

- A classificação de risco é informada pela enfermagem após avaliação profissional. O sistema não
  calcula a classificação nem substitui a avaliação clínica.
- A fila de espera médica prioriza as classificações nesta ordem: Vermelho, Laranja, Amarelo, Verde
  e Azul. Entre atendimentos da mesma classificação, a ordem é FIFO por `triagens.criado_em` e,
  em caso de empate, por `atendimentos.id`.
- A consulta médica contém o registro textual `registro_consulta`, associado ao atendimento e ao
  médico autenticado. Os campos definitivos devem seguir a especificação oficial do grupo.
- Os registros de medicação incluem os campos previstos nos diagramas fornecidos: `medicacao`,
  `dose`, `via` e `observacoes`, além do atendimento, profissional responsável e data/hora.
- O perfil autorizado para registrar medicações e o perfil autorizado para encerrar atendimentos
  precisam ser confirmados formalmente antes da implementação dessas permissões.
- O resumo pré-encerramento deve reunir os dados relevantes já registrados no atendimento; não há
  requisito para persistir o resumo como uma entidade separada.

## Documentos relacionados

- O modelo conceitual final está em [MER.md](MER.md).
- O percurso completo entre perfis está em [FLUXO_ESPERADO.md](FLUXO_ESPERADO.md).
- As verificações do estado atual do código e limitações de execução ficam em
  [VERIFICACAO.md](VERIFICACAO.md).
